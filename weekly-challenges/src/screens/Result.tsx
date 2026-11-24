import { useEffect } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Ctx } from '../App'
import { byId, MEAL_ADJ, MEAL_LABEL } from '../challenges'
import { Pill, TopBar } from '../components'
import { cartridgeLeft, challengeForWeek, hasSensor, mondayOf, sensorOut, computeResult, currentJoin, fmt, resultReady, State, thisWeek, weekRange } from '../state'

export default function Result({ ctx, week }: { ctx: Ctx; week: number }) {
  const { state, go } = ctx
  const j = state.joins[week]
  const ready = resultReady(state, week)

  useEffect(() => {
    if (ready) ctx.markResultViewed(week)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, week])

  if (!ready) {
    return (
      <div>
        <TopBar onBack={() => go({ name: 'home' })} />
        <p className="muted center">Results appear after the challenge ends on Sunday.</p>
      </div>
    )
  }

  const ch = byId(j.challengeId)
  const r = computeResult(state, week)!
  const cartridge = cartridgeLeft(state)
  const noSensor = Array.from({ length: 7 - j.joinIdx }, (_, i) => mondayOf(week) + j.joinIdx + i).filter((d) => !hasSensor(state, d)).length
  const thisCh = challengeForWeek(thisWeek(state))
  const joinedThisWeek = !!currentJoin(state)
  const daysWord = r.daysAvailable === 1 ? 'day' : 'days'

  return (
    <div className="result">
      <TopBar onBack={() => go({ name: 'home' })} />
      <div className="confirm-hero">{ch.icon}</div>
      <p className="kicker center">{week < thisWeek(state) ? "Last week's challenge" : "This week's challenge"}</p>
      <h1 className="screen-title center">{ch.title}</h1>
      <div className="center pills">
        <Pill>{weekRange(week)}</Pill>
        <Pill>{r.daysDone} of {r.daysAvailable} {daysWord} done</Pill>
      </div>
      {noSensor > 0 && (
        <p className="muted small center">{noSensor} {noSensor === 1 ? 'day' : 'days'} without a cartridge didn't count.</p>
      )}

      <ResultSummary state={state} week={week} />

      <div className="actions">
        {week < thisWeek(state) && (
          <button className="btn btn-primary btn-block"
            onClick={() => go(joinedThisWeek ? { name: 'active' } : { name: 'details', source: 'result' })}>
            {joinedThisWeek ? `Go to this week's challenge` : `Join this week's challenge: ${thisCh.title} ${thisCh.icon}`}
          </button>
        )}
      </div>

      {(cartridge <= 3 || sensorOut(state)) && !state.extended && (
        <section className="card cartridge-card">
          <p>
            {sensorOut(state)
              ? 'Your cartridge has run out, so this week\'s challenge is paused.'
              : `Your cartridge runs out in ${cartridge} ${cartridge === 1 ? 'day' : 'days'}. Extend your subscription so this week's challenge isn't interrupted.`}
          </p>
          <button className="btn btn-block btn-secondary" onClick={() => ctx.openPaywall()}>Extend subscription</button>
        </section>
      )}
    </div>
  )
}

/** Result banner, before/after chart and stats. Used on the result screen and on the challenge page on Sunday once it's done. */
export function ResultSummary({ state, week }: { state: State; week: number }) {
  const ch = byId(state.joins[week].challengeId)
  const r = computeResult(state, week)!
  return (
    <>
        {r.pct !== null ? (
          <section className="callout">
            Your {MEAL_ADJ[ch.targetMeal]} spikes were <strong>{Math.abs(r.pct)}% {r.pct >= 0 ? 'lower' : 'higher'}</strong> on {ch.dayLabel}
            {r.daysDone < 3 && <span className="callout-note">Early signal, based on {r.daysDone} {r.daysDone === 1 ? 'day' : 'days'}</span>}
          </section>
        ) : (
          <section className="callout callout-soft">
            No check-ins this time, so there's nothing to compare yet. A new challenge has already started.
          </section>
        )}

        <section className="card">
          <h3 className="card-title">Glucose after {MEAL_LABEL[ch.targetMeal]}, mmol/L</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={r.curve} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="min" ticks={[0, 30, 60, 90, 120]} tickFormatter={(m) => `${m}m`} tickLine={false} axisLine={false} fontSize={11} />
              <YAxis domain={[4, (max: number) => Math.ceil(max + 0.3)]} allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip formatter={(v: number) => v?.toFixed(1)} labelFormatter={(m) => `${m} min after meal`} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line name="Week before" dataKey="before" stroke="var(--grey-dark)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              {r.afterSpike !== null && (
                <Line name="Challenge days" dataKey="after" stroke="var(--accent)" strokeWidth={3} dot={false} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </section>

        <div className="stats">
          <div className="stat"><span className="stat-v">+{fmt(r.beforeSpike)}</span><span className="muted small">avg spike before</span></div>
          <div className="stat"><span className="stat-v good">{r.afterSpike !== null ? `+${fmt(r.afterSpike)}` : '—'}</span><span className="muted small">avg spike on {ch.dayLabel}</span></div>
          <div className="stat"><span className="stat-v">{r.daysDone}/{r.daysAvailable}</span><span className="muted small">days done</span></div>
        </div>
    </>
  )
}
