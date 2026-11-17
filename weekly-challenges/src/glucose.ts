// Mock CGM data. Everything is deterministic: same day number + same effect => same readings.
import { Challenge, Meal } from './challenges'

export type RealMeal = 'breakfast' | 'lunch' | 'dinner'
export const REAL_MEALS: RealMeal[] = ['breakfast', 'lunch', 'dinner']
export const MEAL_MINUTE: Record<RealMeal, number> = { breakfast: 8 * 60, lunch: 13 * 60, dinner: 19 * 60 }
const BASE_SPIKE: Record<RealMeal, number> = { breakfast: 2.0, lunch: 2.4, dinner: 3.1 }

export const STEP = 5 // minutes between readings
export const POINTS_PER_DAY = (24 * 60) / STEP // 288
const SEED = 20261117

/** Share of each meal's spike removed on a given day. */
export type Reductions = Partial<Record<RealMeal, number>>

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Spike shape: rises over ~45 min, back to baseline at 120 min. Peak = 1. */
function shape(t: number): number {
  if (t < 0 || t > 120) return 0
  if (t <= 45) return Math.sin((Math.PI / 2) * (t / 45))
  return 0.5 * (1 + Math.cos((Math.PI * (t - 45)) / 75))
}

const cache = new Map<string, number[]>()

/** 288 readings (mmol/L), one every 5 min from 00:00, for a given sensor day. */
export function dayReadings(day: number, red: Reductions = {}): number[] {
  const key = `${day}|${red.breakfast ?? 0}|${red.lunch ?? 0}|${red.dinner ?? 0}`
  const hit = cache.get(key)
  if (hit) return hit

  // Draw all random numbers in a fixed order so a reduction never shifts the noise.
  const rng = mulberry32(SEED + day * 7919)
  const base = 5.0 + rng() * 0.5
  const amp: Record<RealMeal, number> = { breakfast: 0, lunch: 0, dinner: 0 }
  for (const m of REAL_MEALS) amp[m] = BASE_SPIKE[m] * (1 + (rng() - 0.5) * 0.2)
  for (const m of REAL_MEALS) {
    const wobble = 1 + (rng() - 0.5) * 0.3 // ± a bit of noise on the effect
    const r = red[m] ?? 0
    amp[m] *= 1 - Math.min(0.9, r * wobble)
  }
  const out: number[] = []
  let noise = 0
  for (let i = 0; i < POINTS_PER_DAY; i++) {
    noise = 0.75 * noise + (rng() - 0.5) * 0.12
    const minute = i * STEP
    let v = base + noise
    for (const m of REAL_MEALS) v += amp[m] * shape(minute - MEAL_MINUTE[m])
    out.push(Math.round(v * 100) / 100)
  }
  cache.set(key, out)
  return out
}

/** Spike = max glucose within 120 min after the meal − glucose at meal time. */
export function spikeOf(readings: number[], meal: RealMeal): number {
  const start = MEAL_MINUTE[meal] / STEP
  const atMeal = readings[start]
  let max = atMeal
  for (let i = start; i <= start + 120 / STEP; i++) max = Math.max(max, readings[i])
  return max - atMeal
}

/** Glucose curve 0–120 min after the meal (25 points). */
export function curveOf(readings: number[], meal: RealMeal): number[] {
  const start = MEAL_MINUTE[meal] / STEP
  return readings.slice(start, start + 120 / STEP + 1)
}

/** Which real meals we measure for a challenge's target. */
export function measuredMeals(target: Meal): RealMeal[] {
  if (target === 'night') return ['breakfast'] // morning glucose
  if (target === 'all_day') return REAL_MEALS
  return [target]
}

export function reductionsFor(ch: Challenge, done: boolean): Reductions {
  if (!done) return {}
  const r: Reductions = {}
  for (const m of measuredMeals(ch.targetMeal)) r[m] = ch.expectedSpikeReduction
  return r
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Spike for a challenge's target on one day (averaged over measured meals). */
export function targetSpike(ch: Challenge, readings: number[]): number {
  return avg(measuredMeals(ch.targetMeal).map((m) => spikeOf(readings, m)))
}

export function targetCurve(ch: Challenge, readings: number[]): number[] {
  const curves = measuredMeals(ch.targetMeal).map((m) => curveOf(readings, m))
  return curves[0].map((_, i) => avg(curves.map((c) => c[i])))
}

/** Average spike per meal over the 7 days before `day` (no challenge effect). */
export function lastWeekSpikes(day: number): Record<RealMeal, number> {
  const days = Array.from({ length: 7 }, (_, i) => dayReadings(day - 7 + i))
  const res = {} as Record<RealMeal, number>
  for (const m of REAL_MEALS) res[m] = avg(days.map((r) => spikeOf(r, m)))
  return res
}
