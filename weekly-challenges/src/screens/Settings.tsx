import type { Ctx } from '../App'
import { TopBar } from '../components'
import { currentJoin } from '../state'

export default function Settings({ ctx }: { ctx: Ctx }) {
  const { state, go } = ctx
  return (
    <div>
      <TopBar title="Settings" onBack={() => go({ name: 'home' })} />
      <section className="card">
        <h3 className="card-title">Notifications</h3>
        <label className="row-between toggle-row">
          <span>
            Challenge reminders
            <br /><span className="muted small">{currentJoin(state) ? `Daily at ${currentJoin(state)!.reminderTime}` : 'New challenge, join nudge and daily nudges'}</span>
          </span>
          <input type="checkbox" className="switch" checked={state.remindersOn} onChange={(e) => ctx.setReminders(e.target.checked)} />
        </label>
        <label className="row-between toggle-row">
          <span>High / low glucose alerts</span>
          <input type="checkbox" className="switch" checked readOnly />
        </label>
      </section>
      <section className="card">
        <h3 className="card-title">Units</h3>
        <div className="row-between"><span>Glucose</span><span className="muted">mmol/L</span></div>
      </section>
    </div>
  )
}
