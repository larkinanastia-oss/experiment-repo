import { useState } from 'react'
import { cartridgeLeft, challengeForWeek, currentJoin, sensorOut, State, thisWeek } from './state'

/** Mock plans: prices are placeholders for the prototype. */
export const PLANS = [
  { id: 'quarterly', name: '3 months', detail: '6 cartridges', price: '€299', was: '€357', perMonth: '€99.67 / mo', badge: 'Best value' },
  { id: 'monthly', name: '1 month', detail: '2 cartridges', price: '€119', was: null, perMonth: '€119 / mo', badge: null },
] as const
export type PlanId = (typeof PLANS)[number]['id']

export type PaywallMode = 'sheet' | 'paused'

interface Props {
  state: State
  /** sheet = opened from "Extend subscription"; paused = shown when the challenge page opens without a sensor */
  mode: PaywallMode
  onSubscribe: (plan: PlanId) => void
  onClose: () => void
}

/** Full-screen resubscribe paywall inside the phone frame. */
export default function Paywall({ state, mode, onSubscribe, onClose }: Props) {
  const [plan, setPlan] = useState<PlanId>('quarterly')
  const out = sensorOut(state)
  const left = cartridgeLeft(state)
  const joined = state.variant === 'test' && !!currentJoin(state)
  const ch = challengeForWeek(thisWeek(state))
  const paused = mode === 'paused'

  const title = joined ? 'Order new cartridges to continue your challenge' : 'Order new cartridges to keep tracking'
  const subtitle = paused || out
    ? 'Your cartridge has run out.'
    : `${left} ${left === 1 ? 'day' : 'days'} left on your cartridge.`

  const glucose = { icon: '📈', title: <>Your glucose 24/7, with no gaps</>, sub: 'See every spike, day and night' }
  const benefits = joined
    ? [
        { icon: ch.icon, title: <>Finish this week's challenge</>, sub: ch.title },
        glucose,
        { icon: '📊', title: <>See your results on Monday</>, sub: 'Before / after, from your own data' },
      ]
    : [
        glucose,
        { icon: '🍽️', title: <>Learn which meals spike you</>, sub: 'Personal insights from your data' },
        { icon: '🎯', title: <>A new challenge every Monday</>, sub: 'Small habits, proven by your glucose' },
      ]

  return (
    <div className="paywall" role="dialog" aria-modal="true">
      <div className="paywall-top">
        <span className="paywall-kicker">{paused ? '⏸ Challenge paused' : 'Extend subscription'}</span>
        <button className="paywall-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="paywall-body">
        <h2 className="paywall-title">{title}</h2>
        <p className="paywall-sub">{subtitle}</p>

        <ul className="paywall-benefits">
          {benefits.map((b, i) => (
            <li key={i}>
              <span className="benefit-icon">{b.icon}</span>
              <span className="benefit-text"><b>{b.title}</b><span>{b.sub}</span></span>
            </li>
          ))}
        </ul>

        <h3 className="paywall-section">Select a plan</h3>
        <div className="plans">
          {PLANS.map((p) => (
            <button key={p.id} className={`plan ${plan === p.id ? 'on' : ''}`} onClick={() => setPlan(p.id)}>
              {p.badge && <span className="plan-badge">{p.badge}</span>}
              <span className="plan-radio" />
              <span className="plan-body">
                <span className="plan-name">{p.name}</span>
                <span className="muted small">{p.detail}</span>
              </span>
              <span className="plan-price">
                <span>{p.was && <s className="muted">{p.was}</s>} <b>{p.price}</b></span>
                <span className="muted small">{p.perMonth}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="paywall-footer">
        <p className="muted small center">{out ? 'New cartridge arrives tomorrow.' : 'Renews automatically.'} Cancel anytime.</p>
        <button className="btn btn-primary btn-block btn-big" onClick={() => onSubscribe(plan)}>Extend subscription</button>
      </div>
    </div>
  )
}
