import { ReactNode, useEffect } from 'react'
import { Line, LineChart, ReferenceArea, ResponsiveContainer, YAxis } from 'recharts'
import type { Ctx } from './App'
import { challengeForWeek, DayStat, State, thisWeek, today, WEEKDAYS, weekRange } from './state'

export function TopBar({ title, onBack, right }: { title?: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      <button className="back" onClick={onBack} aria-label="Back">‹</button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-right">{right}</span>
    </div>
  )
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Mon–Sun tracker. Small = bars with letters, large = circles. */
export function WeekDots({ days, size = 'sm' }: { days: DayStat[]; size?: 'sm' | 'lg' }) {
  return (
    <div className={`week week-${size}`}>
      {days.map((d) => {
        const mark = d.status === 'done' || d.status === 'today-done' ? '✓' : d.status === 'missed' ? '–' : ''
        return (
          <div key={d.idx} className="wday">
            <span className={`dot dot-${d.status}`} title={`${WEEKDAYS[d.idx]}: ${d.status}`}>{size === 'lg' ? mark : ''}</span>
            <span className={`wday-letter ${d.status === 'today' || d.status === 'today-done' ? 'is-today' : ''}`}>{DAY_LETTERS[d.idx]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Small 24h line with the 3.9–7.8 mmol/L target range shaded. */
export function Sparkline({ values }: { values: (number | null)[] }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={70}>
      <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <YAxis hide domain={[3.5, 9.5]} />
        <ReferenceArea y1={3.9} y2={7.8} fill="var(--range)" fillOpacity={1} strokeOpacity={0} />
        <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'easy' | 'medium' | 'gold' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

/** "Next week" teaser: view only, you can't join early. */
export function Teaser({ ctx }: { ctx: Ctx }) {
  const { state, logOnce } = ctx
  const next = thisWeek(state) + 1
  const ch = challengeForWeek(next)
  const inDays = 7 - today(state)
  useEffect(() => { logOnce('teaser_viewed', { next_challenge_id: ch.id }) }, [ch.id, logOnce])
  return (
    <section className="card teaser">
      <div className="card-head">
        <span className="tag teaser-tag">Next week's challenge</span>
        <p className="week-meta">
          <span>{weekRange(next)}</span>
          <span>· {inDays === 1 ? 'starts tomorrow' : `starts in ${inDays} days`}</span>
        </p>
      </div>
      <h2>{ch.icon} {ch.title}</h2>
      <p className="muted small">{ch.teaser}</p>
    </section>
  )
}

export const difficultyTone = (d: string) => (d === 'Easy' ? 'easy' : 'medium') as 'easy' | 'medium'

export function daysLeftText(s: State): string {
  const left = 7 - today(s)
  if (left === 1) return 'Last day to join'
  return `${left} days left to join`
}
