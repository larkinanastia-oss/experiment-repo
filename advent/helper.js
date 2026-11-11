/* Advent Quest — parent helper: turns plain tasks, answers and hints into an encrypted content file. */
(function () {
  'use strict';

  var DAYS = 5, MAX_TASKS = 5;
  var DEFAULT_DATES = ['2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31'];
  var $ = function (id) { return document.getElementById(id); };
  var daysBox = $('days');
  var lastOutput = null;

  /* ---------- build the form ---------- */

  function field(tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function labelled(text, input) {
    var wrap = document.createElement('div');
    var l = document.createElement('label');
    l.textContent = text;
    l.setAttribute('for', input.id);
    wrap.appendChild(l);
    wrap.appendChild(input);
    return wrap;
  }

  for (var d = 0; d < DAYS; d++) {
    var det = document.createElement('details');
    det.className = 'day';
    if (d === 0) det.open = true;
    var sum = document.createElement('summary');
    sum.textContent = 'День ' + (d + 1);
    det.appendChild(sum);

    var top = document.createElement('div');
    top.className = 'grid';
    top.appendChild(labelled('Дата (открывается в 7:00 по финскому времени)',
      field('input', { type: 'date', id: 'date' + d, value: DEFAULT_DATES[d], required: '' })));
    det.appendChild(top);

    for (var t = 0; t < MAX_TASKS; t++) {
      var box = document.createElement('div');
      box.className = 'task';
      var n = document.createElement('div');
      n.className = 'n';
      n.textContent = (t + 1) + '.';
      var body = document.createElement('div');
      body.className = 'task-body';

      body.appendChild(labelled('Текст задания (покажется в приложении)',
        field('textarea', { id: 'x' + d + '_' + t, rows: '2', placeholder: 'Бревно распилили на 5 частей. Сколько было распилов?' })));

      var two = document.createElement('div');
      two.className = 'grid';
      var ansWrap = labelled('Ответы (через запятую)',
        field('input', { type: 'text', id: 'a' + d + '_' + t, placeholder: 'например: 4, четыре' }));
      var norm = document.createElement('div');
      norm.className = 'norm';
      norm.id = 'n' + d + '_' + t;
      ansWrap.appendChild(norm);
      two.appendChild(ansWrap);
      two.appendChild(labelled('Подсказка, где следующее задание (можно пусто)',
        field('input', { type: 'text', id: 'h' + d + '_' + t, placeholder: 'Загляни под зелёную подушку' })));
      body.appendChild(two);

      box.appendChild(n);
      box.appendChild(body);
      det.appendChild(box);
    }

    var prize = document.createElement('div');
    prize.className = 'grid';
    prize.style.marginTop = '10px';
    prize.appendChild(labelled('🎁 Где спрятан подарок (после последнего задания)',
      field('input', { type: 'text', id: 'p' + d, placeholder: 'Подарок ждёт тебя за дверью ванной' })));
    det.appendChild(prize);
    daysBox.appendChild(det);
  }

  /* ---------- read / write the form ---------- */

  function splitAnswers(text) {
    return String(text || '').split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function showNorm(d, t) {
    var list = splitAnswers($('a' + d + '_' + t).value);
    var box = $('n' + d + '_' + t);
    var problems = [], shown = [];
    list.forEach(function (a) {
      var n = AQ.normalize(a);
      var p = AQ.answerProblem(n);
      if (p) problems.push('«' + a + '»: ' + p);
      else if (shown.indexOf(n) === -1) shown.push(n);
    });
    if ($('numeric').checked && shown.some(function (n) { return !/^\d+$/.test(n); })) {
      problems.push('включена цифровая клавиатура, а ответ — слово');
    }
    box.className = 'norm' + (problems.length ? ' bad' : '');
    box.textContent = problems.length ? problems.join('; ')
      : shown.length ? 'Принимается: ' + shown.join(' / ') : '';
  }
  function showAllNorms() {
    for (var d = 0; d < DAYS; d++) for (var t = 0; t < MAX_TASKS; t++) showNorm(d, t);
  }

  daysBox.addEventListener('input', function (e) {
    var m = /^a(\d)_(\d)$/.exec(e.target.id);
    if (m) showNorm(+m[1], +m[2]);
  });
  $('numeric').addEventListener('change', showAllNorms);

  // Empty task slots at the end of a day are left out, so a day can have 1–5 tasks.
  function readForm() {
    var source = {
      child: $('child').value.trim().toLowerCase(),
      name: $('name').value.trim(),
      keyboard: $('numeric').checked ? 'numeric' : 'text',
      gender: $('gender').value,
      days: []
    };
    for (var d = 0; d < DAYS; d++) {
      var tasks = [];
      for (var t = 0; t < MAX_TASKS; t++) {
        tasks.push({
          text: $('x' + d + '_' + t).value.trim(),
          answers: splitAnswers($('a' + d + '_' + t).value),
          hint: $('h' + d + '_' + t).value.trim()
        });
      }
      while (tasks.length && !tasks[tasks.length - 1].text && !tasks[tasks.length - 1].answers.length) tasks.pop();
      if (tasks.length) tasks[tasks.length - 1].hint = '';
      source.days.push({ day: d + 1, unlockDate: $('date' + d).value, tasks: tasks, prizeHint: $('p' + d).value.trim() });
    }
    return source;
  }

  function fillForm(src) {
    $('child').value = src.child || '';
    $('name').value = src.name || '';
    $('numeric').checked = src.keyboard === 'numeric';
    $('gender').value = src.gender === 'm' ? 'm' : 'f';
    for (var d = 0; d < DAYS; d++) {
      var day = (src.days || [])[d] || {};
      $('date' + d).value = day.unlockDate || DEFAULT_DATES[d];
      $('p' + d).value = day.prizeHint || '';
      for (var t = 0; t < MAX_TASKS; t++) {
        var task = (day.tasks || [])[t] || {};
        $('x' + d + '_' + t).value = task.text || '';
        $('a' + d + '_' + t).value = (task.answers || []).join(', ');
        $('h' + d + '_' + t).value = task.hint || '';
      }
    }
    showAllNorms();
    var details = daysBox.querySelectorAll('details');
    for (var i = 0; i < details.length; i++) details[i].open = true;
  }

  function validate(src) {
    var errs = [];
    if (!/^[a-z0-9_-]+$/.test(src.child)) errs.push('Файл: только латинские буквы, цифры, «-» и «_» (например, daria).');
    if (!src.name) errs.push('Укажите имя для приветствия.');
    var dates = {};
    src.days.forEach(function (day) {
      var p = 'День ' + day.day + ': ';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.unlockDate)) errs.push(p + 'укажите дату.');
      else if (dates[day.unlockDate]) errs.push(p + 'та же дата, что у дня ' + dates[day.unlockDate] + '.');
      dates[day.unlockDate] = day.day;
      if (!day.tasks.length) errs.push(p + 'нет ни одного задания.');
      day.tasks.forEach(function (task, ti) {
        var q = p + 'задание ' + (ti + 1) + ' — ';
        if (!task.answers.length) errs.push(q + 'нет ответа.');
        task.answers.forEach(function (a) {
          var problem = AQ.answerProblem(AQ.normalize(a));
          if (problem) errs.push(q + '«' + a + '»: ' + problem + '.');
          else if (src.keyboard === 'numeric' && !/^\d+$/.test(AQ.normalize(a))) {
            errs.push(q + '«' + a + '» — слово, а включена цифровая клавиатура.');
          }
        });
      });
      if (!day.prizeHint) errs.push(p + 'нет подсказки, где подарок.');
    });
    for (var i = 1; i < src.days.length; i++) {
      if (src.days[i].unlockDate && src.days[i - 1].unlockDate && src.days[i].unlockDate < src.days[i - 1].unlockDate) {
        errs.push('День ' + (i + 1) + ' открывается раньше дня ' + i + '.');
      }
    }
    return errs;
  }

  /* ---------- actions ---------- */

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var src = readForm();
    var errs = validate(src);
    if ($('pw1').value !== $('pw2').value) errs.push('Пароли не совпадают.');
    if ($('pw1').value.length < 4) errs.push('Пароль родителя — не короче 4 символов.');
    $('errors').textContent = errs.join('\n');
    if (errs.length) { $('errors').scrollIntoView({ block: 'center' }); return; }

    var btn = $('buildBtn');
    btn.disabled = true;
    btn.textContent = 'Шифрую…';
    AQ.buildContent(src, $('pw1').value).then(function (content) {
      lastOutput = { name: src.child + '.json', text: JSON.stringify(content, null, 1) };
      $('out').value = lastOutput.text;
      $('resultMsg').textContent = 'Файл ' + lastOutput.name + ' готов. Ответы и подсказки в нём зашифрованы.';
      $('result').hidden = false;
      $('result').scrollIntoView({ behavior: 'smooth' });
    }).catch(function (err) {
      $('errors').textContent = 'Не получилось: ' + err.message;
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Создать файл';
    });
  });

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $('downloadBtn').addEventListener('click', function () {
    if (lastOutput) download(lastOutput.name, lastOutput.text);
  });
  $('copyBtn').addEventListener('click', function () {
    if (!lastOutput) return;
    var done = function () { $('copyBtn').textContent = 'Скопировано ✓'; setTimeout(function () { $('copyBtn').textContent = 'Скопировать текст'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(lastOutput.text).then(done, function () { $('out').select(); });
    else { $('out').select(); document.execCommand('copy'); done(); }
  });

  $('exportPlain').addEventListener('click', function () {
    var src = readForm();
    download((src.child || 'child') + '-draft.json', JSON.stringify(src, null, 2));
  });
  $('importPlainBtn').addEventListener('click', function () { $('importPlain').click(); });
  $('importPlain').addEventListener('change', function () {
    var f = this.files[0];
    if (!f) return;
    f.text().then(function (t) {
      var data = JSON.parse(t);
      if (data.format === AQ.FORMAT) throw new Error('Это зашифрованный файл — откройте его вверху страницы с паролем.');
      fillForm(data);
      $('errors').textContent = '';
    }).catch(function (err) { $('errors').textContent = 'Не получилось загрузить черновик: ' + err.message; });
    this.value = '';
  });

  $('openBtn').addEventListener('click', function () {
    var f = $('openFile').files[0];
    var msg = $('openMsg');
    if (!f) { msg.textContent = 'Выберите файл.'; return; }
    msg.textContent = 'Открываю…';
    f.text().then(function (t) {
      var content = JSON.parse(t);
      if (content.format !== AQ.FORMAT) throw new Error('это не файл адвент-квеста');
      return AQ.openParentBox(content, $('openPw').value).catch(function () {
        throw new Error('неверный пароль');
      });
    }).then(function (src) {
      fillForm(src);
      $('pw1').value = $('pw2').value = $('openPw').value;
      msg.textContent = 'Открыто: ' + src.name + '. Измените что нужно и нажмите «Создать файл».';
    }).catch(function (err) {
      msg.textContent = 'Не получилось: ' + err.message;
    });
  });

  if (!window.crypto || !crypto.subtle) {
    $('errors').textContent = 'Этот браузер не поддерживает шифрование. Откройте страницу по https:// в Chrome или Safari.';
    $('buildBtn').disabled = true;
  }
})();
