# Weekly Glucose Challenges — prototype

Clickable prototype of a **weekly challenge** feature for weight-loss users of a CGM app.
Goal: month-3 retention. Like a weekly event in a game, the app pushes one challenge per
calendar week (Monday to Sunday, same for everyone). The user can join on any day, even Sunday,
checks in with one tap each day, and after Sunday sees before / after proof from their own
glucose data. Home shows only this week's challenge and a teaser for next week's.

All data is mock data (fixed random seed). No backend, no login, no real sensor.
Subscription plans and prices in the paywall are placeholders.

Full spec: [REQUIREMENTS.md](REQUIREMENTS.md).

**Live demo:** https://larkinanastia-oss.github.io/experiment-repo/weekly-challenges/demo/

## Run locally

```bash
cd weekly-challenges
npm install
npm run dev
```

## Build / deploy

```bash
npm run build
```

The build goes to `demo/`, which is committed. GitHub Pages serves the repo from `main`,
so pushing the rebuilt `demo/` folder updates the live link.

## How to demo

The demo starts on **Tuesday 24 Nov 2026** (week 1 = Mon 23 – Sun 29 Nov, sensor day 56, close to the end of month 2),
not joined, with 6 days left to join, so joining after the start is the default story. The panel on the right (below the phone on small screens):

- **Variant**: Test (with challenges) / Control (same app, no challenge or teaser cards)
- **Jump to weekday** — move forward within the week, e.g. to Sunday to show a last-day join
  (going back is only possible before joining)
- **Today the user… did / didn't** — decides whether moving forward counts today as done
- **Next day** — moves time forward a day; after Sunday the week closes and the next challenge opens
- **End of week** — jumps to next Monday and opens the results (if the user joined)
- **Show reminder** — daily reminder if joined, otherwise the "days left to join" nudge
- **Reset** — clears localStorage
- **Event log** — every analytics event with its properties (also in `console.log`)

**Cartridge story:** on Tuesday the cartridge has 3 days left, so it runs out on Friday, before the challenge ends.
- Tap **Extend subscription** on Home before Friday → a full-screen paywall opens (two mock plans). **Extend subscription** →
  the next cartridge starts on time and nothing is interrupted. **✕** closes it.
- Don't extend → Thursday shows a "runs out tomorrow" notice, Friday a "has run out" notice. There's no glucose data,
  the challenge is paused, and days without a sensor don't count toward the win rule. Extending then brings
  a new cartridge the next day.

## Where things are

| File | What |
|---|---|
| `src/challenges.ts` | The 7 challenges and the weekly `SCHEDULE` |
| `src/glucose.ts` | Mock CGM data: 5-min readings, meals at 08/13/19, spike maths |
| `src/state.ts` | Calendar (weeks, weekdays), app state, localStorage, win rule, result calculation |
| `src/App.tsx` | Navigation, actions, analytics events, notification banner |
| `src/screens/` | Home, Details (join), Active, Result, Settings |
| `src/DemoPanel.tsx` | Demo control panel and event log |

**Spike** = max glucose within 120 min after the meal − glucose at meal time.
**Result %** = 1 − (avg spike on done days / avg spike in the 7 days before the challenge's Monday).
**Win** = days done ≥ ceil(5/7 × days available since joining): 7 → 5, 4 → 3, 1 → 1.

## Analytics events

`challenge_card_viewed {challenge_id, state, weekday}`, `challenge_details_opened {challenge_id, weekday, days_left}`,
`challenge_joined {challenge_id, weekday, days_available, source}`, `teaser_viewed {next_challenge_id}`,
`checkin_done {challenge_id, weekday}`, `reminder_shown {type}` (incl. `cartridge_low` / `cartridge_empty`), `reminder_opt_out`,
`challenge_completed {challenge_id, days_done, days_available, win, spike_reduction_pct}`, `result_viewed`,
`paywall_viewed {type, source, cartridge_days_left, challenge_joined}`, `paywall_dismissed {type, source}`,
`subscription_extended {plan, source, cartridge_days_left, challenge_joined}`.

View events (`challenge_card_viewed`, `teaser_viewed`, `challenge_details_opened`) are logged once per day.
