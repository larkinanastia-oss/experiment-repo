/*
 * Advent Quest — shared code for the game (index.html) and the parent helper (helper.html).
 *
 * Answers are never stored in plain text. For every accepted answer the content file holds:
 *   h  — SHA-256 of the normalised answer (salted per child, day and task), used to check it;
 *   iv, c — the hint, AES-GCM-encrypted with a key derived from that same normalised answer.
 * So the hint can only be read by someone who types a correct answer.
 *
 * The whole plain source (all answers and hints) is also stored once, encrypted with the
 * parent password, so parent mode can show answers and the helper can re-open the file.
 */
(function (root) {
  'use strict';

  var FORMAT = 'advent-quest-1';
  var PARENT_ITERATIONS = 250000;
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  var subtle = root.crypto && root.crypto.subtle;

  /* ---------- answer normalisation ---------- */

  // Ignore case, extra spaces, brackets, ! ? quotes and trailing dots; ё = е;
  // numbers compare as numbers ("07" = "7").
  function normalize(input) {
    var s = String(input == null ? '' : input).normalize('NFC').toLowerCase();
    s = s.replace(/ё/g, 'е');
    s = s.replace(/[()!?«»"]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/[.…]+$/, '').trim();
    var compact = s.replace(/ /g, '');
    if (/^\+?\d+$/.test(compact)) {
      s = compact.replace(/^\+/, '').replace(/^0+(?=\d)/, '');
    }
    return s;
  }

  // Answers may be numbers or Russian words. Returns an error text (Russian) or ''.
  function answerProblem(norm) {
    if (!norm) return 'пустой ответ';
    if (/^\d+$/.test(norm)) return '';
    if (/[a-z]/.test(norm)) return 'латинские буквы — дети вводят ответы по-русски';
    if (!/^[а-я0-9 \-]+$/.test(norm)) return 'только русские буквы, цифры, пробел и дефис';
    return '';
  }

  /* ---------- base64 helpers ---------- */

  function toB64(buf) {
    var bytes = new Uint8Array(buf), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function fromB64(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  function randomB64(n) {
    return toB64(root.crypto.getRandomValues(new Uint8Array(n)));
  }

  /* ---------- per-answer hash and hint key ---------- */

  function sha256(text) {
    return subtle.digest('SHA-256', enc.encode(text));
  }

  function answerHash(salt, day, task, norm) {
    return sha256([salt, day, task, 'check', norm].join('|')).then(toHex);
  }

  function answerKey(salt, day, task, norm) {
    return sha256([salt, day, task, 'key', norm].join('|')).then(function (raw) {
      return subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    });
  }

  function encryptWith(key, text) {
    var iv = root.crypto.getRandomValues(new Uint8Array(12));
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(text)).then(function (c) {
      return { iv: toB64(iv), c: toB64(c) };
    });
  }

  function decryptWith(key, box) {
    return subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.c))
      .then(function (p) { return dec.decode(p); });
  }

  /*
   * Check a typed answer against one task of an encrypted content file.
   * Resolves to { ok: true, norm, hint, prize } or { ok: false, norm }.
   */
  function checkAnswer(content, dayIndex, taskIndex, typed) {
    var norm = normalize(typed);
    var day = content.days[dayIndex];
    var task = day && day.tasks[taskIndex];
    if (!norm || !task) return Promise.resolve({ ok: false, norm: norm });
    return answerHash(content.salt, day.day, taskIndex + 1, norm).then(function (h) {
      var lock = task.locks.filter(function (l) { return l.h === h; })[0];
      if (!lock) return { ok: false, norm: norm };
      return answerKey(content.salt, day.day, taskIndex + 1, norm)
        .then(function (key) { return decryptWith(key, lock); })
        .then(function (text) {
          var payload = JSON.parse(text);
          return { ok: true, norm: norm, hint: payload.hint || '', next: payload.next || '', prize: payload.prize || '' };
        });
    }).catch(function () { return { ok: false, norm: norm }; });
  }

  /* ---------- parent password ---------- */

  function parentKey(password, saltB64) {
    return subtle.importKey('raw', enc.encode(String(password).normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: fromB64(saltB64), iterations: PARENT_ITERATIONS, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  // Resolves to the plain source object, or rejects if the password is wrong.
  function openParentBox(content, password) {
    if (!content.parent) return Promise.reject(new Error('no parent box'));
    return parentKey(password, content.parent.salt)
      .then(function (key) { return decryptWith(key, content.parent); })
      .then(function (text) { return JSON.parse(text); });
  }

  /* ---------- build an encrypted content file from plain source ---------- */

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = root.crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /*
   * source = { child, name, days: [{ day, unlockDate, tasks: [{ answers: [..], hint }], prizeHint }] }
   * Resolves to the encrypted content object that the game loads.
   */
  function buildContent(source, password) {
    if (!password) return Promise.reject(new Error('Нужен пароль родителя'));
    var salt = randomB64(16);
    var parentSalt = randomB64(16);

    var daysP = source.days.map(function (day) {
      var last = day.tasks.length - 1;
      var tasksP = day.tasks.map(function (task, ti) {
        // The next task's text is unlocked together with the hint, so it isn't readable in advance.
        var payload = JSON.stringify(ti === last
          ? { hint: '', prize: day.prizeHint || '' }
          : { hint: task.hint || '', next: (day.tasks[ti + 1].text || '').trim() });
        var norms = [];
        task.answers.forEach(function (a) {
          var n = normalize(a);
          if (n && norms.indexOf(n) === -1) norms.push(n);
        });
        return Promise.all(norms.map(function (n) {
          return Promise.all([answerHash(salt, day.day, ti + 1, n), answerKey(salt, day.day, ti + 1, n)])
            .then(function (r) {
              return encryptWith(r[1], payload).then(function (box) {
                return { h: r[0], iv: box.iv, c: box.c };
              });
            });
        })).then(function (locks) { return { locks: shuffle(locks) }; });
      });
      return Promise.all(tasksP).then(function (tasks) {
        // Only the first task's text is stored openly: nothing unlocks it.
        return { day: day.day, unlockDate: day.unlockDate, firstTask: ((day.tasks[0] || {}).text || '').trim(), tasks: tasks };
      });
    });

    var parentP = parentKey(password, parentSalt).then(function (key) {
      return encryptWith(key, JSON.stringify(source));
    }).then(function (box) {
      return { salt: parentSalt, iv: box.iv, c: box.c };
    });

    return Promise.all([Promise.all(daysP), parentP]).then(function (r) {
      return {
        format: FORMAT,
        child: source.child,
        name: source.name,
        keyboard: source.keyboard === 'numeric' ? 'numeric' : 'text',
        gender: source.gender === 'f' || source.gender === 'm' ? source.gender : '',
        salt: salt,
        days: r[0],
        parent: r[1]
      };
    });
  }

  root.AQ = {
    FORMAT: FORMAT,
    normalize: normalize,
    answerProblem: answerProblem,
    checkAnswer: checkAnswer,
    openParentBox: openParentBox,
    buildContent: buildContent
  };
})(typeof window !== 'undefined' ? window : globalThis);
