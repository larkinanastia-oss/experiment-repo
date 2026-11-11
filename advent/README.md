# Advent Quest

A Russian-language advent game for two children, 27–31 December 2026: up to 5 tasks a day, shown in the app (and on paper). Each correct answer unlocks the next task and, optionally, a hint to where it's hidden; the last one reveals the day's present.

Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages.

## Links

Once GitHub Pages is on (see below):

| Who | Link |
| --- | --- |
| Daria | `https://larkinanastia-oss.github.io/experiment-repo/advent/?kid=daria` |
| Seva | `https://larkinanastia-oss.github.io/experiment-repo/advent/?kid=seva` |
| Parent mode (all days open, answers, jump, reset) | add `&parent=1` to a child's link |
| Parent helper (fill in answers and hints) | `https://larkinanastia-oss.github.io/experiment-repo/advent/helper.html` |

## Files

| File | What it is |
| --- | --- |
| `index.html`, `style.css`, `app.js` | The game page |
| `shared.js` | Answer checking and encryption, used by the game and the helper |
| `helper.html`, `helper.js` | Parent helper that turns plain answers and hints into a content file |
| `daria.json`, `seva.json` | Each child's content, with answers hashed and hints encrypted |

## Filling in the real content

`daria.json` has Daria's real tasks, answers and hiding places (4 tasks per day). `seva.json` is still placeholder content. Both are protected by the parent password, which is kept outside this repository.

Only each day's first task text is readable in the public file. The later task texts, all hints and all answers are encrypted.

1. Open `helper.html`. At the top, choose `daria.json`, type the parent password and press **Открыть**. This loads the current content to edit; you can also start from an empty form.
2. For each day, fill in up to 5 tasks (text, answers, and optionally where the next task is hidden) and the prize hint. Separate several accepted answers with commas, e.g. `5, пять`. Under each field the helper shows what will be accepted.
3. Set a **new parent password** the children won't guess, then press **Создать файл**.
4. On GitHub, open `advent/daria.json`, click the pencil icon, replace the whole text with the copied output and commit. Alternatively, use **Add file → Upload files** with the downloaded file.
5. Repeat for Seva.

**Скачать черновик** saves the plain answers as a file for you to keep. Don't put that file in this repository, because the repository is public.

## How answers are hidden

For each accepted answer, the content file stores a salted SHA-256 hash and a copy of the hint encrypted (AES-GCM) with a key derived from that answer. The page source therefore shows neither answers nor hiding places. The full plain content is also stored once, encrypted with the parent password, so that parent mode and the helper can show it.

This is good enough for a family game, but numeric answers are easy to brute-force for anyone who knows how. Don't treat it as real security.

## Rules the game follows

- **Hidden tasks:** task 1 is shown straight away, since the child already has it on paper (with the QR code). After a correct answer, the app shows only the hint to where the next task is hidden. Once the child finds the paper, they press «Готова отвечать» (girl) or «Готов отвечать» (boy, set in the helper) to see the task and answer it. The button is hidden for 3 minutes after the hint was earned and then appears silently, with no countdown or sign that it's coming. The wait survives a reload. Parent mode has no wait. To change the time, edit `SEARCH_WAIT_MS` at the top of `app.js`. If a task has no hint, the next task opens straight away.

- **Answer matching:** case, extra spaces, a trailing dot and ё/е are ignored, and numbers compare as numbers ("07" = "7"). Answers are numbers or Russian words.
- **Wrong answers:** tries are unlimited. After 3 wrong tries the page says «Если трудно — спроси маму или папу».
- **Unlocking:** day N opens at 07:00 Finnish time on its date, using the device clock. Missed days stay open. To change the hour, edit `UNLOCK_HOUR` and `UNLOCK_LABEL` at the top of `app.js` and the label in `helper.js`.
- **Progress:** stored in the browser's localStorage per child and day, so both children can share a device. If a child switches device, use parent mode → enter the password → **Перейти** to set the task.
- **Sound:** always on (a short chime after each correct answer, a longer one at the end of the day). There is no mute button. On an iPhone, the silent switch mutes it.

## Before 27 December

- [ ] Fill in the real content for both children and change the parent password
- [ ] Play all 5 days for both children in parent mode, on the devices they'll use
- [ ] Try each answer with different case and spaces, and with the alternative answers
- [ ] Reload in the middle of a day and check that the current hint or task is still there
- [ ] Open each link without `&parent=1` and check that future days are locked
- [ ] After testing, use parent mode → **Сбросить весь прогресс** for both children on every device
