/* Advent Quest — the game page. Needs shared.js loaded first. */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var KID = (params.get('kid') || '').toLowerCase();
  var PARENT = params.get('parent') === '1';
  var app = document.getElementById('app');
  var confettiBox = document.getElementById('confetti');

  // Each day opens at this hour, Finnish time, on its date.
  var UNLOCK_HOUR = 7;
  var UNLOCK_LABEL = '7:00';
  // After a hint, the «Задание у меня» button unlocks only after this wait (not in parent mode).
  var SEARCH_WAIT_MS = 3 * 60 * 1000;
  function now() { return Date.now(); }
  // Tree picture on the cards; fresh address per visit so an updated picture always shows.
  var TREE_IMG = 'tree.jpg?v=' + (window.__assetVersion || Date.now());

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var PRAISE = ['Верно!', 'Молодец!', 'Ура, правильно!', 'Здорово!', 'Отлично!'];
  var TRY_AGAIN = ['Пока не то. Попробуй ещё раз!', 'Почти! Подумай ещё немного.',
    'Не совсем. Попробуй снова!', 'Хм, давай ещё разок!'];

  var content = null;     // encrypted content file
  var source = null;      // plain source, only after the parent enters the password
  var dayState = {};      // dayIndex -> [{ norm, hint, prize }] for solved tasks
  var wrongCount = {};    // "d:t" -> wrong tries in this visit
  var timer = null;
  var view = { name: 'calendar', day: 0 };

  /* ---------- storage (per child, per day) ---------- */

  function storeKey(dayNumber) { return 'advent-quest:' + KID + ':day' + dayNumber; }

  function loadSolved(dayNumber) {
    try {
      var v = JSON.parse(localStorage.getItem(storeKey(dayNumber)) || '[]');
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function saveSolved(dayNumber, norms) {
    try { localStorage.setItem(storeKey(dayNumber), JSON.stringify(norms)); } catch (e) { /* private mode */ }
  }
  function clearSolved(dayNumber) {
    try {
      localStorage.removeItem(storeKey(dayNumber));
      localStorage.removeItem(storeKey(dayNumber) + ':found');
      localStorage.removeItem(storeKey(dayNumber) + ':hintAt');
    } catch (e) { /* ignore */ }
  }
  // When the latest hint was earned, so the search wait survives a reload.
  function loadHintAt(dayNumber) {
    try { return parseInt(localStorage.getItem(storeKey(dayNumber) + ':hintAt'), 10) || 0; } catch (e) { return 0; }
  }
  function saveHintAt(dayNumber, ts) {
    try { localStorage.setItem(storeKey(dayNumber) + ':hintAt', String(ts)); } catch (e) { /* ignore */ }
  }
  // Highest task number (1-based) the child has found on paper and opened in the app.
  function loadFound(dayNumber) {
    try { return parseInt(localStorage.getItem(storeKey(dayNumber) + ':found'), 10) || 1; } catch (e) { return 1; }
  }
  function saveFound(dayNumber, taskNumber) {
    try { localStorage.setItem(storeKey(dayNumber) + ':found', String(taskNumber)); } catch (e) { /* ignore */ }
  }

  /* ---------- Finnish time ---------- */

  var hkiParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Helsinki', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  function partsAt(ts) {
    var o = {};
    hkiParts.formatToParts(new Date(ts)).forEach(function (p) { o[p.type] = +p.value || p.value; });
    return o;
  }
  function helsinkiToday() {
    var p = partsAt(Date.now());
    return p.year + '-' + String(p.month).padStart(2, '0') + '-' + String(p.day).padStart(2, '0');
  }
  function offsetAt(ts) {
    var p = partsAt(ts);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
  }
  // Epoch ms of UNLOCK_HOUR:00 Finnish time on the given YYYY-MM-DD.
  function unlockTime(dateStr) {
    var d = dateStr.split('-').map(Number);
    var guess = Date.UTC(d[0], d[1] - 1, d[2], UNLOCK_HOUR);
    var ts = guess - offsetAt(guess);
    return guess - offsetAt(ts);
  }
  function prettyDate(dateStr) {
    var d = dateStr.split('-').map(Number);
    return d[2] + ' ' + MONTHS[d[1] - 1];
  }
  function isUnlocked(day) {
    return PARENT || now() >= unlockTime(day.unlockDate);
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function countdownText(ms) {
    if (ms <= 0) return 'Уже открывается!';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
        m = Math.floor(s % 3600 / 60), sec = s % 60;
    var out = [];
    if (d) out.push(d + ' ' + plural(d, 'день', 'дня', 'дней'));
    if (d || h) out.push(h + ' ' + plural(h, 'час', 'часа', 'часов'));
    out.push(m + ' ' + plural(m, 'минута', 'минуты', 'минут'));
    if (!d) out.push(sec + ' ' + plural(sec, 'секунда', 'секунды', 'секунд'));
    return 'Осталось: ' + out.join(' ');
  }

  /* ---------- tiny DOM helper ---------- */

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* ---------- sound (always on) ---------- */

  var audioCtx = null;
  function getAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  // iPhones only allow sound after the child touches the page, so unlock it on every tap.
  ['pointerdown', 'touchend', 'keydown'].forEach(function (type) {
    document.addEventListener(type, getAudio, { passive: true });
  });

  function beep(notes) {
    try {
      if (!getAudio()) return;
      var t = audioCtx.currentTime;
      notes.forEach(function (f, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.4);
      });
    } catch (e) { /* no audio */ }
  }

  /* ---------- confetti ---------- */

  function confetti(amount) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // white, gold, deep red, light green, green
    var colors = ['#FFFFFF', '#D4A93C', '#9E1B2B', '#A8D5A2', '#2E7D4F'];
    for (var i = 0; i < amount; i++) {
      var p = document.createElement('i');
      var dur = 1.8 + Math.random() * 1.6;
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = pick(colors);
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      if (Math.random() < 0.4) { p.style.width = '8px'; p.style.height = '8px'; p.style.borderRadius = '50%'; }
      confettiBox.appendChild(p);
      setTimeout(p.remove.bind(p), (dur + 0.5) * 1000);
    }
  }

  /* ---------- progress ---------- */

  // Re-check the saved answers of a day so the hints can be decrypted again.
  function restoreDay(di) {
    var day = content.days[di];
    var norms = loadSolved(day.day);
    var solved = [];
    var chain = Promise.resolve();
    norms.slice(0, day.tasks.length).forEach(function (norm, ti) {
      chain = chain.then(function (stop) {
        if (stop) return true;
        return AQ.checkAnswer(content, di, ti, norm).then(function (r) {
          if (!r.ok) return true;
          solved.push({ norm: r.norm, hint: r.hint, next: r.next, prize: r.prize });
          return false;
        });
      });
    });
    return chain.then(function () {
      if (solved.length !== norms.length) saveSolved(day.day, solved.map(function (s) { return s.norm; }));
      dayState[di] = solved;
    });
  }
  function restoreAll() {
    return Promise.all(content.days.map(function (_, di) { return restoreDay(di); }));
  }
  function isDone(di) { return (dayState[di] || []).length >= content.days[di].tasks.length; }

  /* ---------- screens ---------- */

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function header(backTo) {
    return el('div', { class: 'top' }, [
      backTo ? el('button', { class: 'icon-btn', type: 'button', text: '← Назад', onclick: backTo }) : null,
      el('div', { class: 'spacer' })
    ]);
  }

  function parentBanner() {
    return PARENT ? el('div', { class: 'parent-banner', text: '👀 Режим родителя: все дни открыты.' }) : null;
  }

  function render() {
    stopTimer();
    app.innerHTML = '';
    if (view.name === 'day') renderDay(view.day);
    else renderCalendar();
  }

  function go(name, day) {
    view = { name: name, day: day || 0 };
    render();
    window.scrollTo(0, 0);
  }

  function renderCalendar() {
    app.appendChild(header(null));
    app.appendChild(el('h1', { class: 'hello', text: 'Привет, ' + content.name + '!' }));
    app.appendChild(el('p', { class: 'sub', text: 'Каждый день задания и подарок.' }));
    var banner = parentBanner();
    if (banner) app.appendChild(banner);

    var doors = el('div', { class: 'doors' });
    content.days.forEach(function (day, di) {
      var unlocked = isUnlocked(day);
      var done = isDone(di);
      var count = (dayState[di] || []).length;
      var cls = 'door ' + (!unlocked ? 'locked' : done ? 'done' : 'open');
      var state = !unlocked ? 'Закрыто' : done ? 'Пройдено!' : count ? 'Задание ' + (count + 1) : 'Открыто!';
      doors.appendChild(el('button', {
        class: cls, type: 'button',
        'aria-label': prettyDate(day.unlockDate) + ', ' + state,
        onclick: function () { go('day', di); }
      }, [
        el('img', { class: 'badge', src: TREE_IMG, alt: '' }),
        el('span', { class: 'date' }, [
          el('span', { class: 'day-num', text: String(+day.unlockDate.slice(8, 10)) }),
          el('span', { class: 'month', text: MONTHS[+day.unlockDate.slice(5, 7) - 1] })
        ]),
        el('span', { class: 'state', text: state })
      ]));
    });
    app.appendChild(doors);

    if (PARENT) app.appendChild(parentPanel());

    // If the calendar is left open, open the next door when its time comes.
    var nextLocked = content.days.filter(function (d) { return !isUnlocked(d); })[0];
    if (nextLocked) {
      var at = unlockTime(nextLocked.unlockDate);
      timer = setInterval(function () { if (now() >= at) render(); }, 15000);
    }
  }

  function renderDay(di) {
    var day = content.days[di];
    app.appendChild(header(function () { go('calendar'); }));
    app.appendChild(el('h1', { class: 'day-title', text: prettyDate(day.unlockDate) }));
    var banner = parentBanner();
    if (banner) app.appendChild(banner);

    if (!isUnlocked(day)) { renderLocked(day); return; }

    var solved = dayState[di] || [];
    var total = day.tasks.length;
    var card = el('div', { class: 'card' });

    var ti = solved.length;
    var hidingHint = ti > 0 && ti < total ? (solved[ti - 1] || {}).hint : '';
    if (hidingHint && loadFound(day.day) < ti + 1) {
      // The next task is hidden in the flat: show only where to look, not the task itself.
      card.className = 'card search';
      card.appendChild(el('img', { class: 'card-tree', src: TREE_IMG, alt: '' }));
      card.appendChild(el('p', { class: 'hint-text', text: hidingHint }));
      var openAt = PARENT ? 0 : loadHintAt(day.day) + SEARCH_WAIT_MS;
      var readyText = content.gender === 'f' ? 'Готова отвечать' : content.gender === 'm' ? 'Готов отвечать' : 'Готов(а) отвечать';
      var openBtn = el('button', {
        class: 'big-btn', type: 'button', text: readyText,
        onclick: function () {
          if (now() < openAt) return;
          saveFound(day.day, ti + 1); render(); window.scrollTo(0, 0);
        }
      });
      card.appendChild(openBtn);
      app.appendChild(card);
      // During the wait the button is simply not there: no countdown, no hint that it will appear.
      var tickWait = function () {
        var waiting = now() < openAt;
        openBtn.hidden = waiting;
        if (!waiting) stopTimer();
      };
      tickWait();
      if (openBtn.hidden) timer = setInterval(tickWait, 1000);
    } else if (ti < total) {
      var input = el('input', {
        class: 'answer', type: 'text', id: 'answer',
        autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
        inputmode: content.keyboard === 'numeric' ? 'numeric' : 'text',
        enterkeyhint: 'done', 'aria-label': 'Ответ на задание ' + (ti + 1),
        placeholder: 'Ответ'
      });
      var feedback = el('p', { class: 'feedback', role: 'status' });
      var btn = el('button', { class: 'big-btn', type: 'submit', text: 'Проверить' });
      var taskText = ti === 0 ? day.firstTask : (solved[ti - 1] || {}).next;
      var form = el('form', {
        autocomplete: 'off',
        onsubmit: function (e) { e.preventDefault(); submit(di, ti, input, btn, feedback); }
      }, [
        taskText ? el('p', { class: 'task-text', text: taskText }) : null,
        input, btn, feedback
      ]);
      card.className = 'card task-card';
      card.appendChild(form);
      app.appendChild(card);
      setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
    } else {
      // The present's place was shown in the celebration; this card only says what comes next.
      var lastDay = di === content.days.length - 1;
      app.appendChild(el('div', { class: 'card prize' }, [
        el('img', { class: 'card-tree', src: TREE_IMG, alt: '' }),
        el('p', { text: lastDay ? 'С Новым годом!' : 'Следующий конверт открой завтра утром.' })
      ]));
    }
  }

  function renderLocked(day) {
    var target = unlockTime(day.unlockDate);
    var cd = el('p', { class: 'countdown' });
    app.appendChild(el('div', { class: 'card locked-card' }, [
      el('img', { class: 'card-tree', src: TREE_IMG, alt: '' }),
      el('h2', { text: 'Этот день откроется ' + prettyDate(day.unlockDate) + ' в ' + UNLOCK_LABEL }),
      cd
    ]));
    function tick() {
      var left = target - now();
      cd.textContent = countdownText(left);
      if (left <= 0) { stopTimer(); setTimeout(render, 1200); }
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  function submit(di, ti, input, btn, feedback) {
    var typed = input.value;
    if (!AQ.normalize(typed)) { input.focus(); return; }
    btn.disabled = true;
    AQ.checkAnswer(content, di, ti, typed).then(function (r) {
      btn.disabled = false;
      var key = di + ':' + ti;
      if (!r.ok) {
        wrongCount[key] = (wrongCount[key] || 0) + 1;
        input.value = '';
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        feedback.className = 'feedback wrong';
        feedback.textContent = pick(TRY_AGAIN);
        if (wrongCount[key] >= 3) {
          feedback.appendChild(el('span', { class: 'nudge', text: 'Если трудно — спроси маму или папу 🙂' }));
        }
        input.focus();
        return;
      }
      var solved = dayState[di] = (dayState[di] || []).slice(0, ti);
      solved.push({ norm: r.norm, hint: r.hint, next: r.next, prize: r.prize });
      saveSolved(content.days[di].day, solved.map(function (s) { return s.norm; }));
      saveHintAt(content.days[di].day, now());
      delete wrongCount[key];
      input.blur();
      celebrate(di, ti, r);
    });
  }

  function celebrate(di, ti, r) {
    var total = content.days[di].tasks.length;
    var finale = ti === total - 1;
    render();

    confetti(finale ? 160 : 60);
    beep(finale ? [523, 659, 784, 1047, 1319] : [659, 880]);

    var close = function () { overlay.remove(); render(); };
    var btn = el('button', { class: 'big-btn' + (finale ? ' red' : ''), type: 'button',
      text: finale ? 'Ура!' : 'Дальше', onclick: close });
    var overlay = el('div', { class: 'overlay' + (finale ? ' finale' : ''), role: 'dialog', 'aria-modal': 'true' }, [
      el('div', { class: 'panel' }, finale ? [
        el('div', { class: 'big', text: '🎉🎁🎉' }),
        el('h2', { text: 'Все задания решены!' }),
        el('p', { class: 'hint-text', text: r.prize || 'Спроси маму или папу!' }),
        btn
      ] : [
        el('div', { class: 'big', text: '🎉' }),
        el('h2', { text: pick(PRAISE) }),
        r.hint ? el('p', { class: 'hint-text', text: r.hint }) : null,
        btn
      ])
    ]);
    document.body.appendChild(overlay);
    setTimeout(function () { btn.focus(); }, 50);
    if (finale) setTimeout(function () { confetti(120); }, 900);
  }

  /* ---------- parent mode ---------- */

  function parentPanel() {
    var box = el('div', { class: 'card parent' });
    box.appendChild(el('h3', { text: 'Для родителей' }));
    box.appendChild(el('p', { text: 'Сегодня в Финляндии: ' + prettyDate(helsinkiToday()) +
      '. Без «?parent=1» каждый день открывается в ' + UNLOCK_LABEL + ' по финскому времени.' }));

    if (!source) {
      var pw = el('input', { type: 'password', placeholder: 'Пароль родителя', autocomplete: 'current-password' });
      var msg = el('p', { class: 'err' });
      var unlockBtn = el('button', { type: 'submit', text: 'Показать ответы' });
      box.appendChild(el('form', {
        class: 'row',
        onsubmit: function (e) {
          e.preventDefault();
          unlockBtn.disabled = true;
          msg.textContent = 'Проверяю…';
          AQ.openParentBox(content, pw.value).then(function (s) {
            source = s; render();
          }).catch(function () {
            unlockBtn.disabled = false;
            msg.textContent = 'Неверный пароль.';
          });
        }
      }, [pw, unlockBtn]));
      box.appendChild(msg);
      box.appendChild(el('p', { text: 'С паролем можно увидеть ответы и перейти к любому заданию.' }));
    } else {
      box.appendChild(el('p', { text: 'Нажмите номер, чтобы перейти к заданию (✓ — день пройден).' }));
    }

    content.days.forEach(function (day, di) {
      var done = (dayState[di] || []).length;
      var block = el('div', { class: 'day-block' });
      block.appendChild(el('h4', { text: 'День ' + day.day + ' · ' + prettyDate(day.unlockDate) +
        ' · решено ' + done + ' из ' + day.tasks.length }));

      if (source) {
        var sday = source.days[di];
        if (sday.firstPlace) block.appendChild(el('p', { text: '📍 Задание 1 спрятать: ' + sday.firstPlace }));
        var table = el('table', null, [el('tr', null, [
          el('th', { text: '№' }), el('th', { text: 'Ответы' }), el('th', { text: 'Подсказка' })
        ])]);
        sday.tasks.forEach(function (t, ti) {
          table.appendChild(el('tr', null, [
            el('td', { text: String(ti + 1) }),
            el('td', { text: t.answers.join(', ') }),
            el('td', { text: ti === sday.tasks.length - 1 ? '—' : (t.hint || '') })
          ]));
        });
        block.appendChild(table);
        block.appendChild(el('p', { class: 'prize-line', text: '🎁 ' + (sday.prizeHint || '') }));

        var jumps = el('div', { class: 'row' }, [el('span', { text: 'Перейти:' })]);
        for (var k = 0; k <= sday.tasks.length; k++) {
          (function (k) {
            jumps.appendChild(el('button', {
              type: 'button', class: k === done ? 'current' : '',
              text: k === sday.tasks.length ? '✓' : String(k + 1),
              onclick: function () { jumpTo(di, k); }
            }));
          })(k);
        }
        block.appendChild(jumps);
      }

      block.appendChild(el('div', { class: 'row' }, [
        el('button', { type: 'button', class: 'danger', text: 'Сбросить день ' + day.day,
          onclick: function () {
            if (!confirm('Сбросить прогресс дня ' + day.day + ' для ' + content.name + '?')) return;
            clearSolved(day.day); dayState[di] = []; render();
          } })
      ]));
      box.appendChild(block);
    });

    box.appendChild(el('div', { class: 'row', style: 'margin-top:16px' }, [
      el('button', { type: 'button', class: 'danger', text: 'Сбросить весь прогресс: ' + content.name,
        onclick: function () {
          if (!confirm('Сбросить весь прогресс для ' + content.name + ' на этом устройстве?')) return;
          content.days.forEach(function (d, di) { clearSolved(d.day); dayState[di] = []; });
          render();
        } })
    ]));
    return box;
  }

  // Mark tasks 1..k of a day as solved, using the first answer of each.
  function jumpTo(di, k) {
    var norms = source.days[di].tasks.slice(0, k).map(function (t) { return AQ.normalize(t.answers[0]); });
    saveSolved(content.days[di].day, norms);
    saveFound(content.days[di].day, k + 1); // the parent jumps straight to the open task
    restoreDay(di).then(render);
  }

  /* ---------- start ---------- */

  function fatal(text, small) {
    app.innerHTML = '';
    app.appendChild(el('div', { class: 'fatal' }, [text, small ? el('small', { text: small }) : null]));
  }

  if (!/^[a-z0-9_-]+$/.test(KID)) {
    fatal('Открой свою ссылку на адвент-квест 🎄', 'В адресе должно быть ?kid=… с именем ребёнка.');
    return;
  }
  if (!window.crypto || !crypto.subtle) {
    fatal('Этот браузер не умеет проверять ответы.', 'Откройте страницу по ссылке https:// в Safari или Chrome.');
    return;
  }

  fetch(KID + '.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (data.format !== AQ.FORMAT) throw new Error('format');
      content = data;
      document.title = 'Адвент-квест · ' + content.name;
      return restoreAll();
    })
    .then(render)
    .catch(function () {
      fatal('Не получилось загрузить задания 😕', 'Проверьте ссылку и интернет, потом обновите страницу.');
    });

  // A day can unlock while the page is open (e.g. at midnight).
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && content && !document.querySelector('.overlay') &&
        !(document.activeElement && document.activeElement.tagName === 'INPUT')) render();
  });
})();
