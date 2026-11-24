import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CARTRIDGE_DAYS, cartridgeLeft, challengeForWeek, clearState, computeResult, currentJoin, daysLeft, initialState, loadState,
  mondayOf, saveState, sensorOut, State, thisWeek, today, WEEKDAYS, withEvent,
} from './state'
import Home from './screens/Home'
import Details from './screens/Details'
import Active from './screens/Active'
import Result from './screens/Result'
import Settings from './screens/Settings'
import DemoPanel from './DemoPanel'
import Paywall, { PaywallMode, PlanId } from './Paywall'

export type JoinSource = 'home' | 'notification' | 'result'

export type Screen =
  | { name: 'home' }
  | { name: 'details'; source: JoinSource }
  | { name: 'active' }
  | { name: 'result'; week: number }
  | { name: 'settings' }

type BannerKind = 'new_challenge' | 'join_nudge' | 'daily' | 'result' | 'cartridge_low' | 'cartridge_empty'
export interface Banner { kind: BannerKind; text: string }

export interface Ctx {
  state: State
  go: (s: Screen) => void
  log: (name: string, props?: Record<string, unknown>) => void
  /** Logs a view event at most once per sensor day (avoids noise on re-renders). */
  logOnce: (name: string, props?: Record<string, unknown>) => void
  join: (source: JoinSource, reminderTime: string) => void
  checkIn: () => void
  markResultViewed: (week: number) => void
  /** Opens the resubscribe paywall (all "Extend subscription" buttons). */
  openPaywall: (mode?: PaywallMode) => void
  /** Full-screen "challenge paused" pop-up, shown once a day when the challenge page opens without a sensor. */
  showPausedPopup: () => void
  setReminders: (on: boolean) => void
}

/* ---------- pure state steps ---------- */

function markDone(s: State, idx: number): State {
  const w = thisWeek(s)
  const j = s.joins[w]
  if (!j || idx < j.joinIdx || j.done.includes(idx) || sensorOut(s)) return s
  const next = { ...s, joins: { ...s.joins, [w]: { ...j, done: [...j.done, idx].sort((a, b) => a - b) } } }
  return withEvent(next, 'checkin_done', { challenge_id: j.challengeId, weekday: WEEKDAYS[idx] })
}

function completeWeek(s: State, w: number): State {
  const j = s.joins[w]
  if (!j || j.completed) return s
  const r = computeResult(s, w)!
  const completed = { daysDone: r.daysDone, daysAvailable: r.daysAvailable, win: r.win, pct: r.pct }
  const next = { ...s, joins: { ...s.joins, [w]: { ...j, completed } } }
  return withEvent(next, 'challenge_completed', {
    challenge_id: j.challengeId, days_done: r.daysDone, days_available: r.daysAvailable, win: r.win, spike_reduction_pct: r.pct,
  })
}

function notify(s: State, kind: BannerKind): { s: State; banner: Banner | null } {
  if (kind === 'cartridge_low' || kind === 'cartridge_empty') {
    // Service notice: sent in both variants and not affected by the challenge-reminder opt-out.
    const joined = s.variant === 'test' && !!currentJoin(s)
    const text = kind === 'cartridge_low'
      ? joined
        ? 'Your cartridge runs out tomorrow. Extend your subscription so your challenge isn\'t interrupted.'
        : 'Your cartridge runs out tomorrow. Extend your subscription to keep seeing your glucose.'
      : joined
        ? 'Your cartridge has run out. Your challenge is paused until a new one arrives.'
        : 'Your cartridge has run out. Extend your subscription to get a new one.'
    return { s: withEvent(s, 'reminder_shown', { type: kind, challenge_joined: joined }), banner: { kind, text } }
  }
  if (s.variant !== 'test') return { s, banner: null }
  if (!s.remindersOn && kind !== 'result') return { s, banner: null }
  const ch = challengeForWeek(thisWeek(s))
  const text = {
    new_challenge: `New challenge this week: ${ch.title} ${ch.icon}`,
    join_nudge: `${daysLeft(s)} days left to join this week's challenge`,
    daily: ch.reminderText,
    result: 'Your challenge results are ready 🎉',
  }[kind]
  const challenge_id = kind === 'result' ? challengeForWeek(thisWeek(s) - 1).id : ch.id
  return { s: withEvent(s, 'reminder_shown', { type: kind, challenge_id }), banner: { kind, text } }
}

/** Moves the clock one day forward: auto check-in (demo toggle), week rollover, notifications. */
function stepDay(state: State): { s: State; banner: Banner | null } {
  let s = state
  if (s.willDo) s = markDone(s, today(s))
  const prevWeek = thisWeek(s)
  const day = s.sensorDay + 1
  s = { ...s, sensorDay: day }
  // Cartridge: switch to the new one if the subscription was extended, otherwise no sensor today.
  let cartridgeNotice: BannerKind | null = null
  if (day >= s.cartridgeEnd) {
    if (s.extended) s = { ...s, cartridgeEnd: day + CARTRIDGE_DAYS, extended: false }
    else {
      if (!s.noSensorDays.includes(day - 1)) cartridgeNotice = 'cartridge_empty'
      s = { ...s, noSensorDays: [...s.noSensorDays, day] }
    }
  } else if (cartridgeLeft(s) === 1 && !s.extended) cartridgeNotice = 'cartridge_low'
  if (thisWeek(s) !== prevWeek) {
    s = completeWeek(s, prevWeek)
    if (cartridgeNotice) return notify(s, cartridgeNotice)
    return notify(s, s.joins[prevWeek] && !s.joins[prevWeek].resultViewed ? 'result' : 'new_challenge')
  }
  if (cartridgeNotice) return notify(s, cartridgeNotice)
  if (sensorOut(s)) return { s, banner: null }
  if (currentJoin(s)) return notify(s, 'daily')
  if (today(s) === 3) return notify(s, 'join_nudge') // Thursday nudge, once a week
  return { s, banner: null }
}

export default function App() {
  const [state, setState] = useState<State>(loadState)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [banner, setBanner] = useState<Banner | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [paywall, setPaywall] = useState<PaywallMode | null>(null)
  const pausedShown = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seen = useRef(new Set<string>())

  useEffect(() => saveState(state), [state])
  useEffect(() => { scrollRef.current?.scrollTo(0, 0) }, [screen])
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 6000)
    return () => clearTimeout(t)
  }, [banner])
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2500)
    return () => clearTimeout(t)
  }, [toastMsg])

  const go = useCallback((s: Screen) => setScreen(s), [])
  const log = useCallback((name: string, props?: Record<string, unknown>) => setState((s) => withEvent(s, name, props)), [])
  const logOnce = useCallback((name: string, props?: Record<string, unknown>) => {
    const key = `${name}|${state.sensorDay}|${state.variant}|${JSON.stringify(props ?? {})}`
    if (seen.current.has(key)) return
    seen.current.add(key)
    setState((s) => withEvent(s, name, props))
  }, [state.sensorDay, state.variant])

  const ctx: Ctx = {
    state,
    go,
    log,
    logOnce,
    join(source, reminderTime) {
      const w = thisWeek(state)
      if (state.joins[w]) { setScreen({ name: 'active' }); return }
      const ch = challengeForWeek(w)
      const s = { ...state, joins: { ...state.joins, [w]: { challengeId: ch.id, joinIdx: today(state), done: [], reminderTime } } }
      setState(withEvent(s, 'challenge_joined', {
        challenge_id: ch.id, weekday: WEEKDAYS[today(state)], days_available: daysLeft(state), source,
      }))
      setScreen({ name: 'active' })
    },
    checkIn() {
      setState(markDone(state, today(state)))
    },
    markResultViewed(week) {
      setState((s) => {
        const j = s.joins[week]
        if (!j) return s
        const next = j.resultViewed ? s : { ...s, joins: { ...s.joins, [week]: { ...j, resultViewed: true } } }
        return withEvent(next, 'result_viewed', { challenge_id: j.challengeId })
      })
    },
    openPaywall(mode = 'sheet') {
      if (state.extended) return
      setState((s) => withEvent(s, 'paywall_viewed', {
        type: mode, source: screen.name, cartridge_days_left: cartridgeLeft(state), challenge_joined: !!currentJoin(state),
      }))
      setPaywall(mode)
    },
    showPausedPopup() {
      if (state.extended || !sensorOut(state) || pausedShown.current === state.sensorDay) return
      pausedShown.current = state.sensorDay
      ctx.openPaywall('paused')
    },
    setReminders(on) {
      let s = { ...state, remindersOn: on }
      if (!on) s = withEvent(s, 'reminder_opt_out', { challenge_id: currentJoin(state)?.challengeId ?? null })
      setState(s)
    },
  }

  const subscribe = (plan: PlanId) => {
    const out = sensorOut(state)
    setState(withEvent({ ...state, extended: true }, 'subscription_extended', {
      plan, source: screen.name, cartridge_days_left: cartridgeLeft(state), challenge_joined: !!currentJoin(state),
    }))
    setPaywall(null)
    setToastMsg(out ? 'Subscribed — new cartridge arrives tomorrow 📦' : 'Subscribed — your next cartridge arrives in time 📦')
  }
  const closePaywall = () => {
    setState(withEvent(state, 'paywall_dismissed', { type: paywall, source: screen.name }))
    setPaywall(null)
  }

  /* ---------- demo panel actions ---------- */

  const advance = (n: number) => {
    let s = state
    let b: Banner | null = null
    for (let i = 0; i < n; i++) ({ s, banner: b } = stepDay(s))
    setState(s)
    setBanner(b)
    setPaywall(null)
    pausedShown.current = null
    const weekChanged = thisWeek(s) !== thisWeek(state)
    if (screen.name === 'details' || screen.name === 'result' || (screen.name === 'active' && weekChanged)) setScreen({ name: 'home' })
    return s
  }

  const jumpToWeekday = (target: number) => {
    const cur = today(state)
    if (target > cur) advance(target - cur)
    else if (target < cur && !currentJoin(state)) {
      // Going back is only allowed before joining (nothing to undo).
      const day = mondayOf(thisWeek(state)) + target
      setState({ ...state, sensorDay: day, noSensorDays: state.noSensorDays.filter((d) => d <= day) })
      setBanner(null)
    }
  }

  const jumpToEndOfWeek = () => {
    const joined = !!currentJoin(state)
    const w = thisWeek(state)
    const s = advance(daysLeft(state))
    setBanner(null)
    if (joined && s.variant === 'test') setScreen({ name: 'result', week: w })
  }

  const showReminder = () => {
    const { s, banner: b } = notify(state, currentJoin(state) ? 'daily' : 'join_nudge')
    setState(s)
    setBanner(b)
  }

  const reset = () => {
    clearState()
    seen.current.clear()
    setState({ ...initialState, events: [] })
    setPaywall(null)
    setScreen({ name: 'home' })
    setBanner(null)
  }

  const setVariant = (variant: State['variant']) => {
    setState({ ...state, variant })
    setScreen({ name: 'home' })
    setBanner(null)
  }

  const onBanner = () => {
    if (!banner) return
    setBanner(null)
    if (banner.kind === 'cartridge_low' || banner.kind === 'cartridge_empty') setScreen({ name: 'home' })
    else if (banner.kind === 'result') setScreen({ name: 'result', week: thisWeek(state) - 1 })
    else if (banner.kind === 'daily' || currentJoin(state)) setScreen({ name: 'active' })
    else setScreen({ name: 'details', source: 'notification' })
  }

  let content
  switch (screen.name) {
    case 'home': content = <Home ctx={ctx} />; break
    case 'details': content = <Details ctx={ctx} source={screen.source} />; break
    case 'active': content = <Active ctx={ctx} />; break
    case 'result': content = <Result ctx={ctx} week={screen.week} />; break
    case 'settings': content = <Settings ctx={ctx} />; break
  }

  return (
    <div className="stage">
      <div className="phone">
        <div className="statusbar"><span>18:30</span></div>
        {banner && (
          <button className="banner" onClick={onBanner}>
            <span className="banner-app">🩸 GLUCOSE · now</span>
            <span className="banner-text">{banner.text}</span>
          </button>
        )}
        <div className="screen" ref={scrollRef} key={JSON.stringify(screen) + state.sensorDay}>
          {content}
        </div>
        {paywall && <Paywall state={state} mode={paywall} onSubscribe={subscribe} onClose={closePaywall} />}
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
      <DemoPanel
        state={state}
        setWillDo={(willDo) => setState({ ...state, willDo })}
        setVariant={setVariant}
        nextDay={() => advance(1)}
        jumpToWeekday={jumpToWeekday}
        jumpToEndOfWeek={jumpToEndOfWeek}
        showReminder={showReminder}
        reset={reset}
      />
    </div>
  )
}

