import { useEffect } from 'react'
import type { Ctx } from '../App'
import { byId, MEAL_LABEL } from '../challenges'
import { daysLeftText, Sparkline, Teaser, WeekDots } from '../components'
import {
  cartridgeLeft, challengeForWeek, computeResult, hasSensor, sensorOut, currentJoin, pendingResultWeek, readingsFor, thisWeek, today,
  State, WEEKDAY_LONG, WEEKDAYS, weekDays, weekRange, whyForYou,
} from '../state'

const NOW_INDEX = (18 * 60 + 30) / 5 // demo clock: 18:30

export default function Home({ ctx }: { ctx: Ctx }) {
  const { state, go } = ctx
  const isTest = state.variant === 'test'

  // Last 24h ending at 18:30 today
  // Last 24h ending at 18:30 today; no line on days without a sensor
  const day = (d: number) => (hasSensor(state, d) ? readingsFor(state, d) : Array<number | null>(288).fill(null))
  const last24 = [...day(state.sensorDay - 1).slice(NOW_INDEX + 1), ...day(state.sensorDay).slice(0, NOW_INDEX + 1)]
  const out = sensorOut(state)
  const now = last24[last24.length - 1] ?? 0
  const diff = now - (last24[last24.length - 4] ?? now)
  const trendText = diff > 0.15 ? 'Rising' : diff < -0.15 ? 'Falling' : 'Steady'
  const cartridge = cartridgeLeft(state)
  const urgent = !state.extended && (cartridge <= 3 || out)
  const joined = isTest && !!currentJoin(state)
  const cartridgeNote = state.extended
    ? out ? null : 'Next cartridge is on its way 📦'
    : out && joined ? 'Your challenge is paused until a new one arrives.' : null
  const resultWeek = pendingResultWeek(state)

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <h1>Good evening, Anna</h1>
          <p className="head-meta">Day {state.sensorDay} with your sensor</p>
        </div>
        <button className="icon-btn" onClick={() => go({ name: 'settings' })} aria-label="Settings">⚙︎</button>
      </header>

      <section className={`card cartridge-banner ${urgent ? 'urgent' : ''}`}>
        <div className="cartridge-text">
          <span className="cartridge-title">
            {out
              ? state.extended ? 'No cartridge · new one arrives tomorrow' : 'No cartridge left'
              : <>Cartridge:<br />{cartridge} {cartridge === 1 ? 'day' : 'days'} left</>}
          </span>
          {cartridgeNote && <span className="cartridge-sub">{cartridgeNote}</span>}
        </div>
        {urgent && <button className="btn btn-small btn-primary" onClick={() => ctx.openPaywall()}>Extend subscription</button>}
      </section>

      {out ? (
        <section className="card glucose-card no-sensor">
          <div className="glucose-top">
            <div>
              <span className="glucose-value muted">––</span>
              <span className="glucose-unit"> mmol/L</span>
            </div>
          </div>
          <p className="warn small">No glucose data · your cartridge has run out</p>
          <Sparkline values={last24} />
        </section>
      ) : (
      <section className="card glucose-card">
        <div className="glucose-top">
          <div>
            <span className="glucose-value">{now.toFixed(1)}</span>
            <span className="glucose-unit"> mmol/L</span>
          </div>
        </div>
        <p className="muted small">{trendText} · in target range 3.9–7.8</p>
        <Sparkline values={last24} />
        <div className="axis-labels"><span>18:30 yesterday</span><span>now</span></div>
      </section>
      )}

      {isTest && resultWeek !== null && (
        <section className="card challenge-card challenge-done" onClick={() => go({ name: 'result', week: resultWeek })} role="button">
          <span className="tag tag-gold">{resultWeek === thisWeek(state) ? "This week's results" : "Last week's results"}</span>
          <h2>{byId(state.joins[resultWeek].challengeId).icon} Your results are ready</h2>
          <p className="muted">{resultTeaser(state, resultWeek)}</p>
          <button className="btn btn-gold">See my results</button>
        </section>
      )}

      {isTest && <ChallengeCard ctx={ctx} />}
      {isTest && <Teaser ctx={ctx} />}


    </div>
  )
}

function ChallengeCard({ ctx }: { ctx: Ctx }) {
  const { state, go, logOnce } = ctx
  const w = thisWeek(state)
  const ch = challengeForWeek(w)
  const join = currentJoin(state)
  const idx = today(state)
  const cardState = join ? 'joined' : idx === 6 ? 'last_day' : 'not_joined'

  useEffect(() => {
    logOnce('challenge_card_viewed', { challenge_id: ch.id, state: cardState, weekday: WEEKDAYS[idx] })
  }, [ch.id, cardState, idx, logOnce])

  if (!join) {
    return (
      <section className="card challenge-card challenge-new" onClick={() => go({ name: 'details', source: 'home' })} role="button">
        <div className="card-head">
          <span className="tag">This week's challenge</span>
          <p className="week-meta">
            <span>{weekRange(w)}</span>
            <span className={`time-left ${idx === 6 ? 'last' : ''}`}>· {daysLeftText(state)}</span>
          </p>
        </div>
        <h2>{ch.icon} {ch.title}</h2>
        <p className="why">{whyForYou(ch, w)}</p>
        <button className="btn btn-primary">Join challenge</button>
      </section>
    )
  }

  const doneToday = join.done.includes(idx)
  const out = sensorOut(state)
  return (
    <section className="card challenge-card" onClick={() => go({ name: 'active' })} role="button">
      <div className="row-between">
        <span className="tag">This week's challenge</span>
        <span className="muted small">{WEEKDAY_LONG[idx]} · {idx === 6 ? 'last day' : 'ends Sunday'}</span>
      </div>
      <h2>{ch.icon} {ch.title}</h2>
      <WeekDots days={weekDays(state, w)} />
      {out ? (
        <p className="paused-note">⏸ Paused — no cartridge, so we can't measure today. Days without a sensor don't count against you.</p>
      ) : (
        <button
          className={`btn ${doneToday ? 'btn-done' : 'btn-primary'}`}
          disabled={doneToday}
          onClick={(e) => { e.stopPropagation(); ctx.checkIn() }}
        >
          {doneToday ? '✓ Done today' : 'Done today'}
        </button>
      )}
    </section>
  )
}

/** A hint of the result without the number, so the user opens the result screen. */
function resultTeaser(s: State, week: number): string {
  const ch = byId(s.joins[week].challengeId)
  const r = computeResult(s, week)
  if (r && r.pct !== null && r.pct > 0) {
    return `Your ${MEAL_LABEL[ch.targetMeal]} spikes went down on ${ch.dayLabel} 📉 See by how much.`
  }
  return `See what ${ch.title.toLowerCase()} changed in your glucose.`
}
