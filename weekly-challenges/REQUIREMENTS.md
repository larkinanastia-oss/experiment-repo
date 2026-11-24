# Weekly Glucose Challenges — prototype requirements

Technical requirements for building a clickable prototype with Claude Code.
Context: Mira Growth PM test task. Goal of the product: increase **month-3 retention of weight-loss users** of a CGM (continuous glucose monitor) app.
Time budget: **1–2 hours**. Keep it simple — the prototype shows the idea, it is not production code.

---

## 1. What we are building

A mobile-sized web app that shows how a weight-loss user, close to the end of their second month with the CGM, is offered **this week's challenge** (e.g. "Walk 10 min after dinner"), joins it, checks in every day with one tap, and at the end of the week sees **proof from their own glucose data** (before / after chart).

The challenge works **like a weekly event in a game**:
- **The app pushes the challenge. The user doesn't choose it.** There is one challenge per calendar week, set by a fixed schedule (section 5).
- **Strict start and end.** Every challenge starts on **Monday** and ends on **Sunday** (local time). It doesn't move to fit the user.
- **Join any time during the week**, even on Sunday, the last day. Days before the user joined are not counted against them.
- When the week ends, the challenge closes, the results are ready, and the next week's challenge opens.
- The app shows **only this week's challenge**, plus a **teaser for next week's challenge**. There is no list or catalog of challenges.

All data is **mock data**. No backend, no login, no real sensor.

## 2. Tech stack

- Vite + React + TypeScript
- Recharts for charts
- Plain CSS or Tailwind (whatever is faster)
- State in React + `localStorage` (so a refresh keeps progress)
- Layout: mobile frame, ~390 px wide, centered on desktop
- Deploy: Vercel or GitHub Pages, so the prototype can be shared as a link
- Add a short `README.md` with how to run (`npm install`, `npm run dev`) and the live link

## 3. Screens

### 3.1 Home (Today)
- Header: "Good evening, Anna" (mock user), day counter "Day 56 with your sensor" (demo date: Tue 24 Nov) (close to the end of month 2, just before the month-3 retention point)
- Current glucose card: value (e.g. 5.8 mmol/L), trend arrow, small 24h line chart
- **This week's challenge card** (the entry point of the experiment). States:
  - **Not joined yet**: "This week's challenge" + icon and name + dates "Mon 23 – Sun 29 Nov" + time left ("6 days left to join") + a personal "why it matters for you" line from the user's data (e.g. "Your dinners caused your biggest spikes last week, +3.1 mmol/L on average") + button **"Join challenge"**
  - **Joined**: challenge name, day of the week ("Tuesday · ends Sunday"), Mon–Sun streak dots, button "Done today"
  - **Last day (Sunday), not joined**: same as "Not joined yet", with the copy "Last day — join and try it tonight"
- **Results card**: "Your results are ready" → Result screen, above this week's card. It appears on **Sunday as soon as the user checks in** ("This week's results"; every day is marked, so there's nothing left to wait for), or on the Monday after if they didn't open it yet ("Last week's results"). If they already saw the results on Sunday, Monday sends the "New challenge this week" notification instead of "Your results are ready".
- **Next week teaser card** (smaller, below this week's card): "Next week" + icon and name + dates "Mon 30 Nov – Sun 6 Dec" + "starts in 6 days". Not tappable to join. It can show one line of what it is about.
- Small cartridge status line: "Cartridge: 3 days left" (highlighted, so it is clear the user needs a new cartridge to finish the challenge) + button **"Extend subscription"** (see section 3.6)

### 3.2 Challenge details (join screen)
Opens when the user taps this week's challenge card before joining.
- Icon, name, difficulty, dates "Mon 23 – Sun 29 Nov"
- What to do, when (target meal / time of day)
- Why it matters for you (from the user's data)
- Time left: "6 days left". If the user joins late, explain: "You join from today. Earlier days don't count against you."
- Reminder time picker (default from the challenge config, e.g. 20:00 for dinner)
- Button **"Join challenge"**
- No way to pick a different challenge and no "See all challenges" link

### 3.3 Active challenge
- Challenge name, short instruction, dates and "ends Sunday"
- Week tracker: **7 circles labelled M T W T F S S**, with these states:
  - before joining (faded, not counted)
  - done / missed / today / upcoming
- Big one-tap button **"Done today"** (only for today; turns into "✓ Done" after tap). No check-ins for past days.
- Win rule shown as text, based on the days available since joining (see section 6): e.g. "5 of 7 days is a win", or "3 of 4 days is a win" for someone who joined on Thursday
- Mini chart: spike after the target meal for each day so far (bar per day, in mmol/L). Done days in one color, missed days in grey, days before joining empty.
- On Sunday, once the user checks in, the page shows the results right away (banner, before / after chart, stats), same as on the Result screen
- Early insight once there are 2+ done days with data: "On walk days your dinner spike is 28% lower so far"
- Next week teaser at the bottom (same as on Home)

### 3.4 Result screen (after Sunday ends)
Opens from the results card on Monday or from the result notification.
- Headline uses the days available since joining:
  - win: "You did it — 6 of 7 days" / "You did it — 3 of 4 days"
  - not a win: "Good try — 2 of 7 days" (still friendly, no "failed")
  - joined on Sunday: "1 of 1 day — great start"
- **Before / after chart** (main proof):
  - Line chart of the average glucose curve 0–120 min after the target meal
  - Line A: the week before the challenge (no challenge), line B: days the user did the challenge
  - Callout: "Your evening spikes were 31% lower on walk days"
  - With fewer than 3 done days, add a note: "Early signal, based on N days"
- Small stats: average spike before vs after (mmol/L), days done out of days available
- Button **"Join this week's challenge"**, which opens the details screen of the challenge that started this Monday
- Cartridge tie-in (only when 3 or fewer days are left, or the cartridge has run out, and the subscription isn't extended): "Your cartridge runs out in N days. Extend your subscription so this week's challenge isn't interrupted." + button "Extend subscription"
- If some days had no cartridge: "N days without a cartridge didn't count."

### 3.5 Notification mock
- In-app banner at the top of the phone frame that simulates a push:
  - Monday: "New challenge this week: Walk 10 min after dinner 🚶" (to everyone in the test group)
  - Mid-week, not joined (once, e.g. Thursday): "4 days left to join this week's challenge" (on Thursday)
  - Daily reminder after joining: "Time for your 10-min walk after dinner 🚶"
  - Monday after a joined week: "Your challenge results are ready"
  - Cartridge runs out tomorrow (not extended): "Your cartridge runs out tomorrow. Extend your subscription so your challenge isn't interrupted."
  - Cartridge has run out: "Your cartridge has run out. Your challenge is paused until a new one arrives."
  - Cartridge notices are service messages: they go to both variants and are not turned off by the challenge-reminder opt-out.
- Include a "Turn off challenge reminders" option in settings (to track the guardrail metric)

### 3.6 Cartridge runs out mid-challenge
On the demo start day (Tuesday) the cartridge has **3 days left**, so it runs out on Friday, before the challenge ends on Sunday.
- **Extend subscription** (button on Home while 3 or fewer days are left, and on the paused challenge and result screens) opens a **full-screen resubscribe paywall**, modeled on Runkeeper's: a **green page** that looks clearly different from the rest of the app, white plan cards, a white footer:
  - small label at the top ("Extend subscription" / "⏸ Challenge paused") and a close button (✕)
  - title **"Order new cartridges to continue your challenge"** (not joined: "Order new cartridges to keep tracking") + one short line: "3 days left on your cartridge." / "Your cartridge has run out."
  - **3 benefits**, each with an icon, a bold line and a short sub-line:
    - joined: 🚶 Finish this week's challenge · 📈 Your glucose 24/7, with no gaps · 📊 See your results on Monday
    - not joined: 📈 Your glucose 24/7, with no gaps · 🍽️ Learn which meals spike you · 🎯 A new challenge every Monday
  - "Select a plan": **3 months** (6 cartridges, ~~€357~~ €299, €99.67 / mo, "Best value" tag, selected by default) and 1 month (2 cartridges, €119); prices are placeholders
  - footer: fine print "Renews automatically. Cancel anytime." above the **"Extend subscription"** button (mock, shows a toast)
- After subscribing, the next cartridge starts when the current one ends, with no gap. The status line changes to "Cartridge: N days left · next one on its way".
- **Not extended**: from the first day without a cartridge:
  - Home header: "No cartridge left"; the glucose card shows no value ("––"), "No glucose data · your cartridge has run out" and a primary **"Extend subscription"** button
  - The challenge is **paused**: no "Done today" button, a note "Paused — no cartridge, so we can't measure today. Days without a sensor don't count against you."
  - Opening the challenge page shows the same paywall, labelled **"Challenge paused"** (once a day), with "New cartridge arrives tomorrow. Cancel anytime." above the button. After closing, the page shows a short "Paused — no cartridge today. Extend subscription" note
  - The week tracker shows those days as "no sensor" (striped), not "missed"
  - Extending while out: "New cartridge arrives tomorrow"; data and check-ins come back the next day
- Days without a cartridge are removed from the days available (section 6), so the user isn't punished for them

## 4. Demo control panel

Outside the phone frame (right side on desktop), a small panel for the interview demo:
- Variant toggle: **Test** (with challenges) / **Control** (same app without the challenge cards)
- Current demo date and weekday, e.g. "Tue 24 Nov · week 1"
- "Next day" button: moves time forward one day and generates that day's mock glucose. Going past Sunday closes the challenge and opens the next one.
- "Jump to weekday" (Mon … Sun within the current week), to show joining late, e.g. on Sunday
- Toggle "user did / didn't do today's task" before moving to the next day
- "Jump to end of week" button (goes to Monday and shows the results)
- "Reset" button (clears localStorage)
- **Event log**: list of analytics events fired (see section 7)

Demo start: **Tuesday 24 Nov 2026**, sensor day 56 (end of month 2), the day after this week's challenge started (Mon 23 Nov), not joined, 6 days left to join.

## 5. Challenges config and schedule

Static JSON/TS array, no backend. Each item: `id`, `title`, `instruction`, `targetMeal` (`breakfast` | `lunch` | `dinner` | `night` | `all_day`), `difficulty`, `expectedSpikeReduction` (used by the mock data), `reminderTime`, `teaser` (one line for the next-week card).

The **schedule** is a list of weeks. Each week has a `weekStart` date (a Monday) and a `challengeId`. The challenge for any date is the one whose week contains that date. The schedule is the same for every user, like a game event. Only the "why it matters for you" line is personal.

| Week | Dates | Challenge | Meal | Difficulty | Effect |
|---|---|---|---|---|---|
| 1 | Mon 23 – Sun 29 Nov | Walk 10 min after dinner | dinner | Easy | ~30% |
| 2 | Mon 30 Nov – Sun 6 Dec | Vegetables first at dinner | dinner | Easy | ~20% |
| 3 | Mon 7 – Sun 13 Dec | Eat protein before carbs at lunch | lunch | Easy | ~20% |
| 4 | Mon 14 – Sun 20 Dec | Swap sweet breakfast for eggs or yogurt | breakfast | Medium | ~35% |
| 5 | Mon 21 – Sun 27 Dec | No sugary drinks for 7 days | all_day | Medium | ~15% |
| 6 | Mon 28 Dec – Sun 3 Jan | Finish dinner 3 hours before bed | night (morning glucose) | Medium | ~10% |
| 7 | Mon 4 – Sun 10 Jan | Sleep 7+ hours | night (morning glucose) | Medium | ~10% |

After week 7 the schedule repeats (a later version could swap in harder versions, e.g. walk 15 min).

## 6. Mock glucose data and rules

- Generate readings every 5 minutes for each day (5 min × 288 per day), from 7 days before week 1 onward.
- Baseline: ~5.0–5.5 mmol/L with small random noise.
- Meals at 08:00, 13:00, 19:00. Each meal adds a spike: rise over ~45 min, back to baseline in ~2 h.
  - Typical spike sizes before any challenge: breakfast +2.0, lunch +2.4, dinner +3.1 mmol/L. These drive the "why it matters for you" line.
- On "done" days, the target meal's spike is reduced by `expectedSpikeReduction` (± a bit of noise). On missed days and days before joining, no reduction.
- **Spike** = max glucose within 120 min after the meal − glucose at meal time.
- **Before** = the 7 days before the challenge's Monday. **After** = the days the user marked done.
- **Result %** = 1 − (avg spike on done days / avg spike in the week before).
- **Days available** = days from the join day to Sunday, inclusive (join on Monday = 7, on Thursday = 4, on Sunday = 1), minus days without a cartridge.
- **Win** = days done ≥ ceil(5/7 × days available). So 7 → 5, 6 → 5, 5 → 4, 4 → 3, 3 → 3, 2 → 2, 1 → 1.
- Use a fixed random seed so the demo looks the same every time.
- Units: mmol/L (Finland / Europe).

## 7. Analytics events (shown in the event log)

Fire as `console.log` + push to the on-screen log, with timestamp and properties:
- `challenge_card_viewed` {challenge_id, state: not_joined / joined / last_day, weekday}
- `challenge_details_opened` {challenge_id, weekday, days_left}
- `challenge_joined` {challenge_id, weekday, days_available, source: home / notification / result}
- `teaser_viewed` {next_challenge_id}
- `checkin_done` {challenge_id, weekday}
- `reminder_shown` {type: new_challenge / join_nudge / daily / result / cartridge_low / cartridge_empty} / `reminder_opt_out`
- `challenge_completed` {challenge_id, days_done, days_available, win, spike_reduction_pct}, fired when the week ends, only for users who joined
- `result_viewed`
- `paywall_viewed` {type: sheet / paused, source, cartridge_days_left, challenge_joined} / `paywall_dismissed` {type, source}
- `subscription_extended` {plan, source, cartridge_days_left, challenge_joined}

These map to the metrics in the note: **join rate** (and which weekday people join), completion rate (win by the rule in section 6), **week-over-week join rate** (joined this week and next week), paywall conversion (paywall viewed → subscribed, and whether it happened before or after the cartridge ran out), and the guardrail (reminder opt-out).

## 8. Out of scope

- Choosing or swapping challenges, a challenge catalog, starting a challenge on a custom date
- Checking in for past days
- Joining next week's challenge early (the teaser is view only)
- Real sensor / Bluetooth / health data
- Login, accounts, backend, real push notifications
- Meal logging, AI coach, monthly goals
- Diabetes users' flows

## 9. Done when

- [ ] Home shows only this week's challenge and a teaser for next week's challenge. There is no way to choose a challenge.
- [ ] Every challenge runs Monday to Sunday by the calendar
- [ ] A user can join on any day of the week, including Sunday. Days before joining are shown as "not joined", not "missed".
- [ ] A user can go Home → join → check in → reach the end of the week → see the result with a before / after chart → join the next week's challenge
- [ ] The win rule uses the days available since joining; fewer days still gets a friendly result
- [ ] Before / after chart and % reduction are calculated from the mock data, not hard-coded
- [ ] Test / Control toggle works (Control has no challenge or teaser cards)
- [ ] Cartridge: 3 days left on the start day; extending avoids a gap; not extending pauses the challenge with a notification, and days without a sensor don't count
- [ ] Event log shows the events above
- [ ] Looks good in a ~390 px mobile frame
- [ ] Deployed and shareable by link; README with run steps
