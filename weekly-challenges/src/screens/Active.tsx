import { useEffect } from 'react'
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { Ctx } from '../App'
import { MEAL_LABEL } from '../challenges'
import { Pill, TopBar, WeekDots } from '../components'
import { ResultSummary } from './Result'
import { avg } from '../glucose'
import {
  baselineSpike, challengeForWeek, currentJoin, fmt, sensorOut, thisWeek, today, WEEKDAYS, weekDays, weekRange,
} from '../state'

export default function Active({ ctx }: { ctx: Ctx }) {
  const { state, go } = ctx
  useEffect(() => { ctx.showPausedPopup() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const join = currentJoin(state)
  if (!join) {
    return (
      <div>
        <TopBar onBack={() => go({ name: 'home' })} />
        <p className="muted center">You haven't joined this week's challenge yet.</p>
        <button className="btn btn-primary btn-block" onClick={() => go({ name: 'details', source: 'home' })}>See this week's challenge</button>
      </div>
    )
  }
  const w = thisWeek(state)
  const ch = challengeForWeek(w)
  const days = weekDays(state, w)
  const idx = today(state)
  const doneToday = join.done.includes(idx)
  const baseline = baselineSpike(ch, w)

  const chartData = days.map((d) => ({
    label: WEEKDAYS[d.idx].slice(0, 2),
    spike: d.spike === null ? 0 : Math.round(d.spike * 10) / 10,
    done: d.status === 'done' || d.status === 'today-done',
  }))
  const doneSpikes = days.filter((d) => d.spike !== null && (d.status === 'done' || d.status === 'today-done')).map((d) => d.spike!)
  const insightPct = doneSpikes.length ? Math.round((1 - avg(doneSpikes) / baseline) * 100) : null
  // Sunday and checked in: every day is marked, so show the results right away.
  const finished = idx === 6 && doneToday
  const showInsight = doneSpikes.length >= 2 && insightPct !== null && insightPct > 0

  return (
    <div className="active">
      <TopBar onBack={() => go({ name: 'home' })} />
      <div className="confirm-hero">{ch.icon}</div>
      <p className="kicker center">This week's challenge</p>
      <h1 className="screen-title center">{ch.title}</h1>
      <div className="center pills">
        <Pill>{weekRange(w)}</Pill>
        <Pill>{idx === 6 ? 'Last day' : `${7 - idx} days left`}</Pill>
      </div>

      <section className="card">
        <h3 className="card-title">Your week</h3>
        <WeekDots days={days} size="lg" />
      </section>

      {sensorOut(state) ? (
        <p className="paused-note">
          ⏸ Paused — no cartridge today.{' '}
          {state.extended ? 'A new one arrives tomorrow 📦' : <button className="link-btn" onClick={() => ctx.openPaywall('paused')}>Extend subscription</button>}
        </p>
      ) : (
        <button className={`btn btn-big btn-block ${doneToday ? 'btn-done' : 'btn-primary'}`} disabled={doneToday} onClick={ctx.checkIn}>
          {doneToday ? '✓ Done' : 'Done today'}
        </button>
      )}

      {finished && <ResultSummary state={state} week={w} />}

      {showInsight && !finished && (
        <section className="card insight">
          <span className="insight-icon">💡</span>
          <p>On {ch.dayLabel} your {MEAL_LABEL[ch.targetMeal]} spike is <strong>{insightPct}% lower</strong> so far</p>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">Spike after {MEAL_LABEL[ch.targetMeal]}, mmol/L</h3>
        {!doneToday && !sensorOut(state) && <p className="muted small">Today's bar appears after you check in</p>}
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis domain={[0, Math.ceil(baseline + 1)]} tickLine={false} axisLine={false} fontSize={11} />
            <ReferenceLine y={Math.round(baseline * 10) / 10} stroke="var(--muted)" strokeDasharray="4 4"
              label={{ value: `week before ${fmt(baseline)}`, position: 'insideTopRight', fontSize: 10, fill: 'var(--muted)' }} />
            <Bar dataKey="spike" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {chartData.map((d) => <Cell key={d.label + d.spike} fill={d.done ? 'var(--accent)' : 'var(--grey)'} />)}
              <LabelList dataKey="spike" position="top" fontSize={10} formatter={(v: number) => (v ? v.toFixed(1) : '')} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="legend small">
          <span><i className="sw sw-accent" /> done</span>
          <span><i className="sw sw-grey" /> missed</span>
        </div>
      </section>

    </div>
  )
}
