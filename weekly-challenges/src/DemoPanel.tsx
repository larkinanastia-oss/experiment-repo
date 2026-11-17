import { cartridgeLeft, challengeForWeek, currentJoin, dayLabel, sensorOut, State, thisWeek, today, WEEKDAYS } from './state'

interface Props {
  state: State
  setVariant: (v: State['variant']) => void
  setWillDo: (b: boolean) => void
  nextDay: () => void
  jumpToWeekday: (idx: number) => void
  jumpToEndOfWeek: () => void
  showReminder: () => void
  reset: () => void
}

export default function DemoPanel(p: Props) {
  const { state } = p
  const w = thisWeek(state)
  const join = currentJoin(state)
  const idx = today(state)
  const status = join
    ? `Joined ${WEEKDAYS[join.joinIdx]} · ${join.done.length} done`
    : 'Not joined'

  return (
    <aside className="panel">
      <h2>Demo controls</h2>
      <p className="panel-status">
        <b>{dayLabel(state.sensorDay)}</b> · week {w + 1} · sensor day {state.sensorDay}
        <br />{challengeForWeek(w).title} · {status}
        <br />Cartridge: {sensorOut(state) ? 'ran out' : `${cartridgeLeft(state)} days left`}{state.extended ? ' · subscription extended' : ''}
      </p>

      <div className="panel-group">
        <span className="panel-label">Variant</span>
        <div className="seg">
          <button className={state.variant === 'test' ? 'on' : ''} onClick={() => p.setVariant('test')}>Test · challenges</button>
          <button className={state.variant === 'control' ? 'on' : ''} onClick={() => p.setVariant('control')}>Control</button>
        </div>
      </div>

      <div className="panel-group">
        <span className="panel-label">Jump to weekday</span>
        <div className="seg seg-days">
          {WEEKDAYS.map((d, i) => (
            <button key={d} className={i === idx ? 'on' : ''} disabled={i < idx && !!join}
              title={i < idx && join ? 'Can’t go back after joining' : `Go to ${d}`}
              onClick={() => p.jumpToWeekday(i)}>{d.slice(0, 2)}</button>
          ))}
        </div>
      </div>

      <div className="panel-group">
        <span className="panel-label">Today the user…</span>
        <div className="seg">
          <button className={state.willDo ? 'on' : ''} onClick={() => p.setWillDo(true)}>did the task</button>
          <button className={!state.willDo ? 'on' : ''} onClick={() => p.setWillDo(false)}>didn't</button>
        </div>
      </div>

      <div className="panel-buttons">
        <button className="pbtn pbtn-main" onClick={p.nextDay}>Next day →</button>
        <button className="pbtn" onClick={p.jumpToEndOfWeek}>End of week ⏭</button>
        <button className="pbtn" onClick={p.showReminder} disabled={state.variant === 'control' || !state.remindersOn}>Show reminder</button>
        <button className="pbtn pbtn-danger" onClick={p.reset}>Reset</button>
      </div>

      <div className="panel-group log">
        <span className="panel-label">Event log ({state.events.length})</span>
        <ol className="events">
          {[...state.events].reverse().map((e) => (
            <li key={e.id}>
              <span className="ev-time">{e.time} · {dayLabel(e.day)}</span>
              <span className="ev-name">{e.name}</span>
              {e.props && Object.keys(e.props).length > 0 && <span className="ev-props">{JSON.stringify(e.props)}</span>}
            </li>
          ))}
          {state.events.length === 0 && <li className="ev-empty">No events yet</li>}
        </ol>
      </div>
    </aside>
  )
}
