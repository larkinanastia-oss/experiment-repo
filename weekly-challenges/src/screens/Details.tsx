import { useEffect, useState } from 'react'
import type { Ctx, JoinSource } from '../App'
import { Pill, TopBar } from '../components'
import { challengeForWeek, currentJoin, daysLeft, thisWeek, today, WEEKDAYS, weekRange, whyForYou } from '../state'

export default function Details({ ctx, source }: { ctx: Ctx; source: JoinSource }) {
  const { state, go, logOnce } = ctx
  const w = thisWeek(state)
  const c = challengeForWeek(w)
  const [time, setTime] = useState(c.reminderTime)
  const idx = today(state)
  const left = daysLeft(state)
  const joined = !!currentJoin(state)

  useEffect(() => {
    logOnce('challenge_details_opened', { challenge_id: c.id, weekday: WEEKDAYS[idx], days_left: left })
  }, [c.id, idx, left, logOnce])

  return (
    <div className="confirm">
      <TopBar onBack={() => go({ name: 'home' })} />
      <div className="confirm-hero">{c.icon}</div>
      <p className="kicker center">This week's challenge</p>
      <h1 className="screen-title center">{c.title}</h1>
      <div className="center pills">
        <Pill>{weekRange(w)}</Pill>
        <Pill>{left === 1 ? 'Last day' : `${left} days left`}</Pill>
      </div>

      <section className="card about-card">
        <h3 className="card-title">What to do</h3>
        <p>{c.instruction}</p>
        <h3 className="card-title why-title">Why it matters</h3>
        <p>{whyForYou(c, w)}</p>
      </section>

      <section className="card">
        <label className="row-between">
          <span>
            <span className="card-title">Daily reminder</span>
            <br /><span className="muted small">A gentle nudge, once a day</span>
          </span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="time-input" />
        </label>
      </section>

      <button className="btn btn-primary btn-block btn-big" onClick={() => ctx.join(source, time)}>
        {joined ? 'Go to challenge' : 'Join challenge'}
      </button>

    </div>
  )
}
