import { byId, Challenge, SCHEDULE } from './challenges'
import { avg, dayReadings, lastWeekSpikes, REAL_MEALS, RealMeal, reductionsFor, targetCurve, targetSpike } from './glucose'

/* ---------- calendar ----------
 * "Sensor day" is the app's clock. Sensor day 56 = Wednesday 18 Nov 2026 (demo start),
 * close to the end of the user's second month (day 60), where month-3 retention is decided.
 * Week 0 (shown as "week 1") = Mon 16 – Sun 22 Nov = sensor days 54–60.
 */
export const FIRST_DAY = 56
const WEEK0_MONDAY_DAY = 54
const WEEK0_MONDAY_DATE = Date.UTC(2026, 10, 16)
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const weekOf = (day: number) => Math.floor((day - WEEK0_MONDAY_DAY) / 7)
export const weekdayOf = (day: number) => (((day - WEEK0_MONDAY_DAY) % 7) + 7) % 7 // 0 = Mon
export const mondayOf = (week: number) => WEEK0_MONDAY_DAY + week * 7

export function dateOf(day: number) {
  const d = new Date(WEEK0_MONDAY_DATE + (day - WEEK0_MONDAY_DAY) * 86400000)
  return { date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] }
}
export function dayLabel(day: number) {
  const { date, month } = dateOf(day)
  return `${WEEKDAYS[weekdayOf(day)]} ${date} ${month}`
}
/** "Mon 16 – Sun 22 Nov" or "Mon 30 Nov – Sun 6 Dec" */
export function weekRange(week: number) {
  const a = dateOf(mondayOf(week))
  const b = dateOf(mondayOf(week) + 6)
  return a.month === b.month ? `Mon ${a.date} – Sun ${b.date} ${b.month}` : `Mon ${a.date} ${a.month} – Sun ${b.date} ${b.month}`
}

export function challengeForWeek(week: number): Challenge {
  const n = SCHEDULE.length
  return byId(SCHEDULE[((week % n) + n) % n])
}

/* ---------- state ---------- */

export interface LogEvent {
  id: number
  time: string
  day: number
  name: string
  props?: Record<string, unknown>
}

export interface Join {
  challengeId: string
  joinIdx: number // weekday the user joined (0 = Mon)
  done: number[] // weekday indices checked in
  reminderTime: string
  completed?: { daysDone: number; daysAvailable: number; win: boolean; pct: number | null }
  resultViewed?: boolean
}

export interface State {
  variant: 'test' | 'control'
  sensorDay: number
  joins: Record<number, Join> // by week
  remindersOn: boolean
  /** First sensor day without a cartridge, unless the subscription is extended before then. */
  cartridgeEnd: number
  /** Subscription extended: the next cartridge is on its way and starts when the current one ends. */
  extended: boolean
  /** Sensor days with no cartridge (no glucose data, challenge paused). */
  noSensorDays: number[]
  willDo: boolean // demo panel: does the user do today's task before "Next day"?
  events: LogEvent[]
}

export const initialState: State = {
  variant: 'test',
  sensorDay: FIRST_DAY,
  joins: {},
  remindersOn: true,
  cartridgeEnd: FIRST_DAY + 3, // 3 days left on the demo start day: it runs out on Saturday, mid-challenge
  extended: false,
  noSensorDays: [],
  willDo: true,
  events: [],
}

const KEY = 'weekly-challenges-state-v4'

export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    // Ignore progress saved by an older version of the demo (it started on an earlier sensor day).
    if (saved && typeof saved.sensorDay === 'number' && saved.sensorDay >= FIRST_DAY) return { ...initialState, ...saved }
  } catch { /* private mode etc. */ }
  return initialState
}
export function saveState(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
export function clearState() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

let eventId = 0
export function withEvent(s: State, name: string, props?: Record<string, unknown>): State {
  console.log(`[analytics] ${name}`, props ?? {})
  const time = new Date().toLocaleTimeString('en-GB')
  return { ...s, events: [...s.events, { id: Date.now() * 100 + (eventId++ % 100), time, day: s.sensorDay, name, props }] }
}

/* ---------- derived ---------- */

export const thisWeek = (s: State) => weekOf(s.sensorDay)
export const today = (s: State) => weekdayOf(s.sensorDay)
export const currentJoin = (s: State): Join | undefined => s.joins[thisWeek(s)]
export const daysLeft = (s: State) => 7 - today(s) // including today

/** Last week's join whose results the user hasn't opened yet. */
export function pendingResultWeek(s: State): number | null {
  const w = thisWeek(s) - 1
  const j = s.joins[w]
  return j?.completed && !j.resultViewed ? w : null
}

/** Win = days done ≥ ceil(5/7 × days available). 7→5, 4→3, 1→1. */
export const winNeeded = (daysAvailable: number) => Math.ceil((5 / 7) * daysAvailable)

export const CARTRIDGE_DAYS = 14

/** Days left on the current cartridge (0 = ran out). */
export const cartridgeLeft = (s: State) => Math.max(0, s.cartridgeEnd - s.sensorDay)
export const hasSensor = (s: State, day: number) => !s.noSensorDays.includes(day)
/** No sensor today: the cartridge ran out and the new one hasn't started yet. */
export const sensorOut = (s: State) => !hasSensor(s, s.sensorDay)

/** Days the user could do the challenge: from the join day to Sunday, minus days without a sensor. */
export function daysAvailableFor(s: State, week: number, joinIdx: number): number {
  let n = 0
  for (let idx = joinIdx; idx < 7; idx++) if (hasSensor(s, mondayOf(week) + idx)) n++
  return n
}

/** Readings for a sensor day, with the challenge effect applied on done days. */
export function readingsFor(s: State, day: number): number[] {
  const j = s.joins[weekOf(day)]
  if (j) return dayReadings(day, reductionsFor(byId(j.challengeId), j.done.includes(weekdayOf(day))))
  return dayReadings(day)
}

export interface DayStat {
  idx: number
  status: 'before' | 'done' | 'missed' | 'today' | 'today-done' | 'upcoming' | 'nodata'
  spike: number | null
}

/** Mon–Sun tracker for a week. Days before joining are "before", not "missed". */
export function weekDays(s: State, week: number): DayStat[] {
  const j = s.joins[week]
  const ch = challengeForWeek(week)
  const cur = thisWeek(s)
  const todayIdx = week < cur ? 7 : week > cur ? -1 : today(s)
  return Array.from({ length: 7 }, (_, idx) => {
    const done = !!j?.done.includes(idx)
    let status: DayStat['status']
    if (!j || idx < j.joinIdx) status = idx < todayIdx ? 'before' : idx === todayIdx ? 'today' : 'upcoming'
    else if (idx < todayIdx) status = done ? 'done' : 'missed'
    else if (idx === todayIdx) status = done ? 'today-done' : 'today'
    else status = 'upcoming'
    if (status !== 'done' && status !== 'upcoming' && !hasSensor(s, mondayOf(week) + idx)) status = 'nodata'
    const hasData = j && idx >= j.joinIdx && (idx < todayIdx || (idx === todayIdx && done))
    const spike = hasData ? targetSpike(ch, readingsFor(s, mondayOf(week) + idx)) : null
    return { idx, status, spike }
  })
}

export function baselineSpike(ch: Challenge, week: number): number {
  const mon = mondayOf(week)
  return avg(Array.from({ length: 7 }, (_, i) => targetSpike(ch, dayReadings(mon - 7 + i))))
}

export interface ChallengeResult {
  daysDone: number
  daysAvailable: number
  win: boolean
  beforeSpike: number
  afterSpike: number | null
  pct: number | null
  curve: { min: number; before: number; after: number | null }[]
}

/** Before = 7 days before the challenge's Monday. After = days marked done. */
export function computeResult(s: State, week: number): ChallengeResult | null {
  const j = s.joins[week]
  if (!j) return null
  const ch = byId(j.challengeId)
  const mon = mondayOf(week)
  const before = Array.from({ length: 7 }, (_, i) => dayReadings(mon - 7 + i))
  const after = j.done.map((idx) => readingsFor(s, mon + idx))
  const beforeSpike = avg(before.map((r) => targetSpike(ch, r)))
  const afterSpike = after.length ? avg(after.map((r) => targetSpike(ch, r))) : null
  const pct = afterSpike === null ? null : Math.round((1 - afterSpike / beforeSpike) * 100)
  const bc = before.map((r) => targetCurve(ch, r))
  const ac = after.map((r) => targetCurve(ch, r))
  const curve = bc[0].map((_, i) => ({
    min: i * 5,
    before: round1(avg(bc.map((c) => c[i]))),
    after: ac.length ? round1(avg(ac.map((c) => c[i]))) : null,
  }))
  const daysAvailable = daysAvailableFor(s, week, j.joinIdx)
  return { daysDone: j.done.length, daysAvailable, win: daysAvailable > 0 && j.done.length >= winNeeded(daysAvailable), beforeSpike, afterSpike, pct, curve }
}

export const round1 = (x: number) => Math.round(x * 10) / 10
export const fmt = (x: number) => x.toFixed(1)

const MEAL_PLURAL: Record<RealMeal, string> = { breakfast: 'breakfasts', lunch: 'lunches', dinner: 'dinners' }

/** Personal "why it matters for you" line, from the week before the challenge. */
export function whyForYou(ch: Challenge, week: number): string {
  const spikes = lastWeekSpikes(mondayOf(week))
  const ranked = [...REAL_MEALS].sort((x, y) => spikes[y] - spikes[x])
  const x = (m: RealMeal) => fmt(spikes[m])
  switch (ch.targetMeal) {
    case 'night':
      return `Late meals and short sleep raise morning glucose. Your breakfast spikes averaged +${x('breakfast')} mmol/L last week.`
    case 'all_day':
      return `Sweet drinks add to every spike. Your meals averaged +${fmt(avg(REAL_MEALS.map((m) => spikes[m])))} mmol/L last week.`
    default: {
      const m = ch.targetMeal
      return ranked[0] === m
        ? `Your ${MEAL_PLURAL[m]} caused your biggest spikes last week (+${x(m)} mmol/L on average).`
        : `Your ${m} spikes averaged +${x(m)} mmol/L last week.`
    }
  }
}
