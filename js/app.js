'use strict';
(function () {
  const C = window.CONTENT;
  const $app = document.getElementById('app');

  // ---------- ほぞん（この たんまつの なかだけ） ----------
  const KEY = 'pentaApp.v1';
  const defaults = () => ({
    stamps: [], checkins: [], sos: [], diary: [], lessonsDone: [], practice: [],
    // じぶんの こと（ユニット3・4・5・8で えらぶ）
    profile: { switches: [], body: [], skill: '', action: '' },
    settings: { autoSpeak: false, calmPlace: '', favSkill: 'breath' },
  });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY)) || {};
      const d = defaults();
      const out = Object.assign(d, s, {
        settings: Object.assign(d.settings, s.settings || {}),
        profile: Object.assign(d.profile, s.profile || {}),
      });
      // v0.1 の bodySigns を profile.body へ
      if (Array.isArray(s.bodySigns) && !out.profile.body.length) out.profile.body = s.bodySigns;
      delete out.bodySigns;
      return out;
    } catch (e) { return defaults(); }
  }
  let db = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ほぞん できなくても うごかす */ } }
  const nowIso = () => new Date().toISOString();
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
  const todayKey = () => dayKey(Date.now());
  const find = (list, id) => list.find((x) => x.id === id);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- よみあげ・おと ----------
  let jaVoice = null;
  const canSpeak = 'speechSynthesis' in window;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find((v) => v.lang === 'ja-JP') || vs.find((v) => v.lang.startsWith('ja')) || null;
  }
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  const plain = (html) => String(html).replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  function speak(text) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plain(text));
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.9; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
  const speakIf = (text) => { if (db.settings.autoSpeak) speak(text); };

  let audioCtx = null;
  function chime() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 1320].forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        const t = audioCtx.currentTime + i * 0.12;
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g).connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.4);
      });
    } catch (e) { /* おとが でなくても よい */ }
  }

  // ---------- がめん きりかえ ----------
  let timers = [];
  let cleanups = [];
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function every(fn, ms) { const t = setInterval(fn, ms); timers.push(t); return t; }
  function teardown() {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers = [];
    cleanups.forEach((f) => f());
    cleanups = [];
    if (canSpeak) speechSynthesis.cancel();
  }

  let currentSay = '';
  function go(name, arg) {
    teardown();
    const scr = screens[name](arg || {});
    currentSay = scr.say || '';
    const back = scr.back;
    $app.innerHTML = `
      <header class="bar">
        ${back ? '<button class="icon-btn" data-back aria-label="もどる">⬅️</button>' : '<span class="icon-spacer"></span>'}
        <h1 class="bar-title">${scr.title || ''}</h1>
        <button class="icon-btn" data-speak aria-label="よみあげ">🔊</button>
      </header>
      <main class="screen ${scr.cls || ''}">${scr.html}</main>`;
    const main = $app.querySelector('main');
    if (back) $app.querySelector('[data-back]').onclick = () => (typeof back === 'function' ? back() : go(back));
    $app.querySelector('[data-speak]').onclick = () => speak(currentSay);
    if (scr.mount) scr.mount(main);
    window.scrollTo(0, 0);
    speakIf(currentSay);
  }
  // がめんの とちゅうで よみあげる ないようを かえる
  function setSay(text) { currentSay = text; speakIf(text); }

  function bind(root, sel, fn) {
    root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (ev) => fn(el, ev)));
  }

  // ---------- パーツ ----------
  const penta = (text, mood = '') =>
    `<div class="penta ${mood}"><div class="penta-face" aria-hidden="true">${ART.penta(mood || 'normal')}</div><div class="bubble">${text}</div></div>`;

  // 'art:…' なら イラスト、それ いがいは えもじ
  const icon = (e) => (String(e).startsWith('art:') ? `<span class="icon-art">${ART.resolve(e.slice(4))}</span>` : e);
  const bigVisual = (big) =>
    String(big).startsWith('art:') ? `<div class="big-art">${ART.resolve(big.slice(4))}</div>` : `<div class="big-emo">${big}</div>`;

  const choiceBtn = (item, attrs = '', extra = '') =>
    `<button class="choice ${extra}" ${attrs}><span class="emo" aria-hidden="true">${icon(item.e)}</span><span class="lbl">${item.t}</span></button>`;

  const choices = (list, key = 'data-id', cols = '') =>
    `<div class="choices ${cols}">${list.map((x) => choiceBtn(x, `${key}="${x.id}"`)).join('')}</div>`;

  const thermo = (hint = '') =>
    `<div class="thermo" role="group" aria-label="いかりの おんどけい">
      ${C.levels.slice().reverse().map((l) =>
        `<button class="lv lv${l.n}" data-lv="${l.n}"><span class="lv-n">${l.n}</span><span class="emo">${ART.ikarin(l.n)}</span><span class="lbl">${l.t}</span></button>`).join('')}
    </div>${hint}`;

  const steps = (i, n) =>
    `<div class="steps" aria-label="${n}こ ちゅう ${i}こめ">${Array.from({ length: n }, (_, k) =>
      `<span class="dot ${k < i ? 'on' : ''}"></span>`).join('')}</div>`;

  function earnStamp(reason) {
    const e = pick(C.stickers);
    db.stamps.push({ e, reason, at: nowIso() });
    save();
    return e;
  }
  // しんこきゅうの ガイド（まるが おおきく なったら すう、ちいさく なったら はく）
  function runBreath(el, cycles, onDone) {
    const circle = el.querySelector('.breath-circle'), label = el.querySelector('.breath-label'), cnt = el.querySelector('.counter');
    let cycle = 0;
    const inhale = () => {
      if (cycle >= cycles) { label.textContent = 'できた！'; onDone(); return; }
      cycle++;
      if (cnt) cnt.textContent = `${cycle} / ${cycles}`;
      circle.className = 'breath-circle in';
      label.textContent = 'はなから すって…';
      speakIf('すって');
      later(exhale, 4000);
    };
    const exhale = () => {
      circle.className = 'breath-circle out';
      label.textContent = 'くちから ゆっくり はいて…';
      speakIf('ゆっくり はいて');
      later(inhale, 5000);
    };
    later(inhale, 1500);
  }

  function rankOf(n) { return C.ranks.filter((r) => n >= r.min).pop(); }

  // ---------- がめん ----------
  const screens = {};

  // ホーム
  screens.home = () => {
    const todayMood = db.checkins.filter((c) => dayKey(c.at) === todayKey()).pop();
    const mood = todayMood && find(C.moods, todayMood.mood);
    const greet = mood ? `きょうの きもちは「${mood.t}」だね。` : 'やあ！ ペンタ だよ。<br>きょうの きもちは どう？';
    return {
      title: 'クールダウン・ペンタ',
      say: plain(greet),
      html: `
        ${penta(greet)}
        ${mood ? '' : `<div class="moods">${C.moods.map((m) =>
          `<button class="mood ${m.c}" data-mood="${m.id}"><span class="emo">${m.e}</span><span class="lbl">${m.t}</span></button>`).join('')}</div>`}
        <button class="sos-btn" data-go="sos1"><span class="emo">🔥</span><span>いま イライラ している</span></button>
        <div class="tiles">
          <button class="tile t-learn" data-go="learn"><span class="emo">📖</span><span>まなぶ</span></button>
          <button class="tile t-practice" data-go="practice"><span class="emo">🎮</span><span>れんしゅう</span></button>
          <button class="tile t-reflect" data-go="reflect"><span class="emo">📒</span><span>ふりかえり</span></button>
          <button class="tile t-stamp" data-go="stamps"><span class="emo">⭐</span><span>シール <b>${db.stamps.length}</b></span></button>
        </div>
        <div class="adult-link"><button class="linkish" data-adult>おとなの かたへ（ながおし）</button></div>`,
      mount(el) {
        bind(el, '[data-go]', (b) => go(b.dataset.go));
        bind(el, '[data-mood]', (b) => {
          db.checkins.push({ mood: b.dataset.mood, at: nowIso() });
          save();
          go('checkinDone', { mood: b.dataset.mood });
        });
        // おとな がめんは 1.5びょう ながおし
        const a = el.querySelector('[data-adult]');
        let t = null;
        const start = () => { a.classList.add('holding'); t = setTimeout(() => go('adult'), 1500); };
        const stop = () => { a.classList.remove('holding'); clearTimeout(t); };
        a.addEventListener('pointerdown', start);
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => a.addEventListener(ev, stop));
        a.addEventListener('contextmenu', (e) => e.preventDefault());
        cleanups.push(stop);
      },
    };
  };

  screens.checkinDone = ({ mood }) => {
    const m = find(C.moods, mood);
    const firstToday = db.checkins.filter((c) => dayKey(c.at) === todayKey()).length === 1;
    const e = firstToday ? earnStamp('checkin') : null;
    let msg;
    if (mood === 'angry') msg = 'イライラ して いるんだね。<br>おしえて くれて ありがとう。<br>いっしょに おちつこう。';
    else if (mood === 'sad' || mood === 'worry') msg = `「${m.t}」なんだね。<br>おしえて くれて ありがとう。<br>つらい ときは おとなに はなして みてね。`;
    else msg = `「${m.t}」なんだね。<br>おしえて くれて ありがとう！`;
    return {
      title: 'きょうの きもち',
      say: plain(msg),
      html: `
        <div class="big-emo">${m.e}</div>
        ${penta(msg)}
        ${e ? `<div class="got">シール ゲット！ <span class="sticker pop">${e}</span></div>` : ''}
        ${mood === 'angry' ? '<button class="primary big red" data-go="sos1">🔥 おちつく わざを つかう</button>' : ''}
        <button class="primary big" data-go="home">🏠 ホームへ</button>`,
      mount(el) { if (e) chime(); bind(el, '[data-go]', (b) => go(b.dataset.go)); },
    };
  };

  // ---------- いま つかう（SOS）：とまる → おちつく → かんがえる ----------
  screens.sos1 = () => ({
    title: '① とまる',
    back: 'home',
    cls: 'sos',
    say: 'ストップ！ まず とまろう。いま なんど くらい？',
    html: `
      <div class="stop-sign" aria-hidden="true">✋</div>
      <p class="lead">ストップ！ まず とまろう。</p>
      <p class="q">いま なんど くらい？</p>
      ${thermo()}`,
    mount(el) { bind(el, '[data-lv]', (b) => go('skill', { mode: 'sos', before: +b.dataset.lv, skill: db.settings.favSkill })); },
  });

  // わざ（SOS と れんしゅうで きょうつう）
  screens.skill = (ctx) => {
    const skill = find(C.skills, ctx.skill) || C.skills[0];
    const others = C.skills.filter((s) => s.id !== skill.id);
    const isSos = ctx.mode === 'sos';
    const body = {
      breath: `<div class="breath-wrap"><div class="breath-circle">${ART.penta('calm')}</div><div class="breath-label">じゅんび…</div></div><p class="counter"></p>`,
      count: `<div class="count-num">6</div><p class="lead">こころの なかで かぞえよう</p>`,
      fist: `<div class="fist">✊</div><p class="breath-label">じゅんび…</p><p class="counter"></p>`,
      away: `<div class="big-emo">🚶</div>
        ${penta(`${db.settings.calmPlace ? `「${db.settings.calmPlace}」` : 'しずかな ばしょ'}に いこう。<br>せんせいに「ちょっと はなれます」と いって いいよ。`)}
        <p class="lead">おちついたら もどって こよう。</p>`,
    }[skill.id];
    return {
      title: isSos ? '② おちつく' : 'おちつく わざ',
      back: isSos ? 'sos1' : 'skillMenu',
      cls: 'sos',
      say: {
        breath: 'いっしょに しんこきゅう しよう。まるが おおきく なったら すって、ちいさく なったら はこう。',
        count: '6びょう かぞえよう。',
        fist: 'てを ぎゅーっと にぎって、ぱっと ひらこう。',
        away: 'しずかな ばしょに いこう。',
      }[skill.id],
      html: `
        <p class="skill-name">${skill.e} ${skill.t}</p>
        ${body}
        <button class="primary big" data-done ${skill.id === 'away' ? '' : 'hidden'}>${skill.id === 'away' ? 'もどって きた' : 'できた！'}</button>
        <div class="others"><p class="small">ほかの わざに する</p>
          <div class="choices mini">${others.map((s) => choiceBtn(s, `data-skill="${s.id}"`)).join('')}</div>
        </div>`,
      mount(el) {
        const doneBtn = el.querySelector('[data-done]');
        const finish = () => { doneBtn.hidden = false; doneBtn.classList.add('pop'); setSay('できたね！ ボタンを おしてね。'); };
        doneBtn.onclick = () => {
          if (isSos) go('sos3', Object.assign({}, ctx, { skill: skill.id }));
          else {
            db.practice.push({ kind: 'skill', skill: skill.id, at: nowIso() }); save();
            go('done', { msg: `${skill.t}の れんしゅう、できたね！`, reason: 'practice', next: 'skillMenu' });
          }
        };
        bind(el, '[data-skill]', (b) => go('skill', Object.assign({}, ctx, { skill: b.dataset.skill })));

        if (skill.id === 'breath') runBreath(el, 3, finish);
        if (skill.id === 'count') {
          const num = el.querySelector('.count-num');
          let n = 6;
          later(() => {
            speakIf('ろく');
            const iv = every(() => {
              n--;
              if (n <= 0) { num.textContent = '✨'; finish(); clearInterval(iv); return; }
              num.textContent = n;
              num.classList.remove('tick'); void num.offsetWidth; num.classList.add('tick');
              speakIf(['', 'いち', 'に', 'さん', 'よん', 'ご'][n]);
            }, 1200);
          }, 1500);
        }
        if (skill.id === 'fist') {
          const f = el.querySelector('.fist'), label = el.querySelector('.breath-label'), cnt = el.querySelector('.counter');
          let cycle = 0;
          const squeeze = () => {
            if (cycle >= 3) { label.textContent = 'からだが ゆるんだね'; f.textContent = '🖐️'; finish(); return; }
            cycle++;
            cnt.textContent = `${cycle} / 3`;
            f.textContent = '✊'; f.className = 'fist squeeze';
            label.textContent = 'ぎゅーーっと にぎって！';
            speakIf('ぎゅーっと にぎって');
            later(release, 3500);
          };
          const release = () => {
            f.textContent = '🖐️'; f.className = 'fist';
            label.textContent = 'ぱっと ひらいて、ちからを ぬこう';
            speakIf('ぱっと ひらいて');
            later(squeeze, 3500);
          };
          later(squeeze, 1500);
        }
      },
    };
  };

  screens.sos3 = (ctx) => ({
    title: '② おちつく',
    back: () => go('skill', ctx),
    cls: 'sos',
    say: 'いま なんど くらい？',
    html: `${penta('いま なんど くらい？')}${thermo()}`,
    mount(el) {
      bind(el, '[data-lv]', (b) => {
        const after = +b.dataset.lv;
        go('sos3b', Object.assign({}, ctx, { after }));
      });
    },
  });

  screens.sos3b = (ctx) => {
    const { before, after } = ctx;
    const hot = after >= 4;
    let msg;
    if (hot) msg = 'まだ あついね。<br>もう いちど やって みよう。<br>ちかくの おとなを よんでも いいよ。';
    else if (after < before) msg = `${before} から ${after} に さがったね！<br>${pick(C.praise)}`;
    else msg = 'おちつこうと できたのが えらい！';
    return {
      title: hot ? '② おちつく' : '③ かんがえる',
      back: () => go('sos3', ctx),
      cls: 'sos',
      say: plain(msg),
      html: `
        <div class="temp-change"><span class="lv-chip lv${before}">${before}</span><span class="arrow">➡️</span><span class="lv-chip lv${after}">${after}</span></div>
        ${penta(msg, hot ? 'worry' : 'happy')}
        ${hot
          ? `<button class="primary big" data-again>🔁 もう いちど</button>
             <button class="primary big yellow" data-help>🧑‍🏫 おとなを よぶ</button>`
          : '<button class="primary big" data-next>つぎへ ➡️</button>'}`,
      mount(el) {
        bind(el, '[data-again]', () => {
          const nextSkill = C.skills[(C.skills.findIndex((s) => s.id === ctx.skill) + 1) % C.skills.length].id;
          go('skill', Object.assign({}, ctx, { skill: nextSkill }));
        });
        bind(el, '[data-help]', () => go('callAdult', ctx));
        bind(el, '[data-next]', () => go('sos4', ctx));
      },
    };
  };

  screens.callAdult = (ctx) => ({
    title: 'おとなを よぼう',
    back: 'home',
    cls: 'sos',
    say: 'ちかくの おとなに「たすけて」と いおう。いって いいんだよ。',
    html: `
      <div class="big-emo">🧑‍🏫</div>
      ${penta('ちかくの おとなに<br><b class="huge">「たすけて」</b><br>と いおう。<br>いって いいんだよ。')}
      <button class="primary big" data-next>おちついたら つぎへ ➡️</button>`,
    mount(el) { bind(el, '[data-next]', () => go('sos4', Object.assign({}, ctx, { calledAdult: true }))); },
  });

  screens.sos4 = (ctx) => ({
    title: '③ かんがえる',
    back: 'home',
    cls: 'sos',
    say: 'これから どうする？',
    html: `${penta('これから どうする？')}${choices(C.afterChoices)}`,
    mount(el) {
      bind(el, '[data-id]', (b) => {
        const next = b.dataset.id;
        db.sos.push({ at: nowIso(), before: ctx.before, after: ctx.after, skill: ctx.skill, next, calledAdult: !!ctx.calledAdult });
        save();
        const extra = next === 'words'
          ? '<div class="card imsg">「〇〇されて、<b>いやだった</b>。<br>〇〇して <b>ほしい</b>。」<br>と いって みよう。</div>'
          : '';
        go('done', { msg: 'おちついて、かんがえる ことが できたね！<br>あとで「ふりかえり」に かいて みよう。', extra, reason: 'sos' });
      });
    },
  });

  // シール ゲット がめん（きょうつう）
  screens.done = ({ msg, extra = '', reason = '', next = 'home' }) => {
    const e = earnStamp(reason);
    return {
      title: 'できたね！',
      say: `${pick(C.praise)} ${plain(msg)} シールを ゲット！`,
      html: `
        <div class="sticker huge pop">${e}</div>
        <p class="got">シール ゲット！ （ぜんぶで ${db.stamps.length}まい）</p>
        ${penta(msg, 'cheer')}
        ${extra}
        <button class="primary big" data-go="${next}">${next === 'home' ? '🏠 ホームへ' : 'つぎへ ➡️'}</button>`,
      mount(el) { chime(); bind(el, '[data-go]', (b) => go(b.dataset.go)); },
    };
  };

  // ---------- まなぶ ----------
  screens.learn = () => {
    const nextId = (C.lessons.find((l) => !db.lessonsDone.includes(l.id)) || {}).id;
    const msg = `どれを まなぶ？ 1かい 5ふん くらい だよ。<br>（${db.lessonsDone.length} / ${C.lessons.length} おわった）`;
    return {
      title: 'まなぶ',
      back: 'home',
      say: plain(msg),
      html: `${penta(msg)}
        <div class="lesson-list">${C.lessons.map((l, i) => {
          const done = db.lessonsDone.includes(l.id);
          const isNext = l.id === nextId;
          return `<button class="lesson ${done ? 'done' : ''} ${isNext ? 'next' : ''}" data-lesson="${l.id}">
            <span class="num">${i + 1}</span><span class="emo">${l.e}</span>
            <span class="lbl">${l.t}${isNext ? '<small>つぎは これ！</small>' : ''}</span>
            <span class="state">${done ? '✅' : '▶️'}</span></button>`;
        }).join('')}</div>`,
      mount(el) { bind(el, '[data-lesson]', (b) => go('lesson', { id: b.dataset.lesson, i: 0 })); },
    };
  };

  const THERMO_DESC = {
    1: 'へいき。いつもの きもち。',
    2: 'ちょっと いやだな。',
    3: 'イライラ。からだに サインが でて くる。',
    4: 'ムカムカ。かんがえるのが むずかしく なって くる。',
    5: 'ばくはつ しそう！ まず とまろう。',
  };

  // いんさつ できない かんきょう（window.PENTA_NO_PRINT）では スクリーンショットを すすめる
  const printBtn = () => (window.PENTA_NO_PRINT
    ? '<p class="lead small-lead">📸 がめんを しゃしんに とって ほぞん しよう</p>'
    : '<button class="primary yellow" data-print>🖨️ いんさつ する</button>');

  // じぶんの さくせんカード（ユニット8・ふりかえりで つかう）
  function planCardHtml() {
    const p = db.profile;
    const names = (list, ids) => ids.map((id) => find(list, id)).filter(Boolean);
    const skill = find(C.skills, p.skill || db.settings.favSkill);
    const act = find(C.afterChoices, p.action);
    const chips = (xs) => (xs.length
      ? xs.map((x) => `<span class="chip">${x.e} ${x.t}</span>`).join('')
      : '<span class="small">まだ えらんで いないよ</span>');
    return `<div class="plan-card" id="plan-card">
      <div class="plan-head">${ART.penta('cheer')}<p class="plan-title">わたしの いかり さくせん</p></div>
      <div class="plan-row"><p class="plan-lbl">🔌 わたしの スイッチ</p><div class="chips">${chips(names(C.triggers, p.switches))}</div></div>
      <div class="plan-row red"><p class="plan-lbl">🔴 とまる：からだの サイン</p><div class="chips">${chips(names(C.bodySigns, p.body))}</div></div>
      <div class="plan-row yellow"><p class="plan-lbl">🟡 おちつく：とくい わざ</p><div class="chips">${chips(skill ? [skill] : [])}</div></div>
      <div class="plan-row green"><p class="plan-lbl">🟢 やってみる</p><div class="chips">${chips(act ? [act] : [])}</div></div>
    </div>`;
  }

  screens.lesson = ({ id, i }) => {
    const L = find(C.lessons, id);
    const s = L.slides[i];
    const last = i === L.slides.length - 1;
    const waits = ['quiz', 'pick', 'breath', 'imsg'].includes(s.type);
    const nextBtn = `<button class="primary big" data-next ${waits ? 'hidden' : ''}>${last ? 'おわり！' : 'つぎへ ➡️'}</button>`;
    let html = '', say = s.say || s.q || '';
    switch (s.type) {
      case 'talk':
        html = `${bigVisual(s.big)}${penta(s.say)}`;
        break;
      case 'quiz':
        html = `${bigVisual(s.big)}${penta(s.q)}
          <div class="choices ${s.options.length === 3 ? 'stack' : ''}">${s.options.map((o, k) => choiceBtn(o, `data-opt="${k}"`)).join('')}</div>
          <div class="feedback" hidden></div>`;
        break;
      case 'list':
        html = `${penta(s.say)}<ol class="rules">${s.items.map((it) =>
          `<li><span class="emo">${icon(it.e)}</span><span>${it.t}</span></li>`).join('')}</ol>`;
        say = `${s.say} ${s.items.map((it) => it.t).join('。')}`;
        break;
      case 'thermoDemo':
        html = `${penta(s.say)}${thermo('<div class="feedback" hidden></div>')}`;
        break;
      case 'pick': {
        const list = C[s.list];
        html = `${penta(s.say)}<div class="choices ${list.length > 6 ? 'three' : ''}">${list.map((x) =>
          choiceBtn(x, `data-id="${x.id}"`, s.multi ? 'toggle' : '')).join('')}</div>`;
        break;
      }
      case 'breath':
        html = `${penta(s.say)}<div class="breath-wrap"><div class="breath-circle">${ART.penta('calm')}</div><div class="breath-label">じゅんび…</div></div><p class="counter"></p>`;
        break;
      case 'imsg': {
        const part = (k, lbl) => `<p class="card-h">${lbl}</p><div class="pills" data-part="${k}">${C.imsg[k].map((t, n) =>
          `<button class="pill" data-v="${n}">${t}</button>`).join('')}</div>`;
        html = `${penta(s.say)}
          ${part('did', '① なにを された？')}${part('feel', '② どんな きもち だった？')}${part('want', '③ どう して ほしい？')}
          <div class="card imsg" data-sentence></div>
          <button class="primary yellow" data-hear hidden>🔊 きいて みる</button>`;
        break;
      }
      case 'planCard':
        html = `${penta(s.say, 'happy')}${planCardHtml()}${printBtn()}`;
        break;
    }
    return {
      title: `${L.e} ${L.t}`,
      back: i === 0 ? 'learn' : () => go('lesson', { id, i: i - 1 }),
      say,
      html: `${steps(i + 1, L.slides.length)}${html}${nextBtn}`,
      mount(el) {
        const next = el.querySelector('[data-next]');
        const reveal = () => { if (next.hidden) { next.hidden = false; next.classList.add('pop'); } };
        next.onclick = () => {
          if (!last) return go('lesson', { id, i: i + 1 });
          if (!db.lessonsDone.includes(id)) db.lessonsDone.push(id);
          save();
          go('done', { msg: `「${L.t}」を まなんだね！`, reason: 'lesson', next: 'learn' });
        };

        if (s.type === 'quiz') {
          const fb = el.querySelector('.feedback');
          bind(el, '[data-opt]', (b) => {
            const o = s.options[+b.dataset.opt];
            el.querySelectorAll('[data-opt]').forEach((x) => x.classList.remove('picked'));
            b.classList.add('picked');
            fb.hidden = false;
            fb.className = `feedback ${o.ok || s.any ? 'ok' : 'hint'}`;
            fb.innerHTML = `${o.ok ? '⭕ ' : s.any ? '' : '💡 '}${o.fb}`;
            setSay(o.fb);
            if (o.ok || s.any) chime();
            // まちがえても すすめる（しっぱいを こわがらせない）
            reveal();
          });
        }

        if (s.type === 'thermoDemo') {
          const fb = el.querySelector('.feedback');
          bind(el, '[data-lv]', (b) => {
            const n = +b.dataset.lv;
            fb.hidden = false; fb.className = 'feedback ok';
            fb.textContent = `${n}：${THERMO_DESC[n]}`;
            setSay(`${n}。${THERMO_DESC[n]}`);
          });
        }

        if (s.type === 'pick') {
          const cur = [].concat(db.profile[s.key] || []);
          el.querySelectorAll('[data-id]').forEach((b) => { if (cur.includes(b.dataset.id)) b.classList.add('on'); });
          bind(el, '[data-id]', (b) => {
            if (s.multi) b.classList.toggle('on');
            else { el.querySelectorAll('[data-id]').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }
            const ids = [...el.querySelectorAll('[data-id].on')].map((x) => x.dataset.id);
            db.profile[s.key] = s.multi ? ids : (ids[0] || '');
            if (s.key === 'skill' && ids[0]) db.settings.favSkill = ids[0];
            save();
            next.hidden = !ids.length;
            if (b.classList.contains('on')) speakIf(b.textContent);
          });
          next.hidden = !el.querySelector('[data-id].on');
        }

        if (s.type === 'breath') runBreath(el, 2, reveal);

        if (s.type === 'imsg') {
          const sel = {};
          const out = el.querySelector('[data-sentence]'), hear = el.querySelector('[data-hear]');
          const done = () => sel.did && sel.feel && sel.want;
          const text = () => `「${sel.did || '〇〇されて'}、${sel.feel || '〇〇だった'}。${sel.want || '〇〇して ほしい'}。」`;
          bind(el, '.pill', (b) => {
            const k = b.parentElement.dataset.part;
            b.parentElement.querySelectorAll('.pill').forEach((x) => x.classList.remove('on'));
            b.classList.add('on');
            sel[k] = C.imsg[k][+b.dataset.v];
            out.textContent = text();
            if (done()) { hear.hidden = false; reveal(); speakIf(text()); }
          });
          hear.onclick = () => speak(text());
          out.textContent = text();
        }

        if (s.type === 'planCard') bind(el, '[data-print]', () => window.print());
      },
    };
  };

  // ---------- れんしゅう ----------
  screens.practice = () => ({
    title: 'れんしゅう',
    back: 'home',
    say: 'どれを れんしゅう する？',
    html: `${penta('どれを れんしゅう する？')}
      <div class="lesson-list">
        <button class="lesson" data-go="game"><span class="emo">🔥</span><span class="lbl">いかりんを しずめよう<small>ゲーム</small></span><span class="state">▶️</span></button>
        <button class="lesson" data-go="wz"><span class="emo">🤔</span><span class="lbl">わざと？ たまたま？<small>クイズ</small></span><span class="state">▶️</span></button>
        <button class="lesson" data-go="skillMenu"><span class="emo">🌬️</span><span class="lbl">おちつく わざ<small>れんしゅう</small></span><span class="state">▶️</span></button>
      </div>`,
    mount(el) { bind(el, '[data-go]', (b) => go(b.dataset.go)); },
  });

  screens.skillMenu = () => ({
    title: 'おちつく わざ',
    back: 'practice',
    say: 'どの わざを れんしゅう する？ おちついて いる ときに れんしゅう して おくと、イライラ した ときに つかえるよ。',
    html: `${penta('おちついて いる ときに れんしゅう して おくと、イライラ した ときに つかえるよ。')}
      <div class="choices">${C.skills.map((s) => choiceBtn(s, `data-skill="${s.id}"`)).join('')}</div>`,
    mount(el) { bind(el, '[data-skill]', (b) => go('skill', { mode: 'practice', skill: b.dataset.skill })); },
  });

  // わざと？ たまたま？
  screens.wz = ({ i = 0, step = 0 }) => {
    const n = C.wazato.length;
    const sc = C.wazato[i];
    let html, say;
    if (step === 0) {
      say = `${sc.s} わざと だと おもう？`;
      html = `<div class="big-emo">${sc.big}</div>
        <div class="card scene">${sc.s}</div>
        ${penta('わざと だと おもう？')}
        <div class="choices">
          ${choiceBtn({ e: '😠', t: 'ぜったい わざと！' }, 'data-a="1"')}
          ${choiceBtn({ e: '🤔', t: 'たまたま かも' }, 'data-a="2"')}
          ${choiceBtn({ e: '❓', t: 'わからない' }, 'data-a="3"')}
        </div>`;
    } else if (step === 1) {
      say = 'ほかに どんな りゆうが ありそう？ カードを おして みよう。';
      html = `<div class="card scene">${sc.big} ${sc.s}</div>
        ${penta('ほかに どんな りゆうが ありそう？<br>カードを ぜんぶ おして みよう。')}
        <div class="flips">${sc.reasons.map((r, k) =>
          `<button class="flip" data-flip="${k}"><span class="front">❓</span><span class="back">${r}</span></button>`).join('')}</div>
        <button class="primary big" data-next hidden>つぎへ ➡️</button>`;
    } else {
      say = 'ほんとうの りゆうは わからない ことが おおいよ。「わざとだ」と おもうと いかりは 4。「たまたま かも」と おもうと 2。まずは「わざと？」って きいて みよう。';
      html = `${penta('ほんとうの りゆうは<br>わからない ことが おおいよ。')}
        <div class="compare">
          <div class="cmp"><p>「わざとだ！」</p><div class="cmp-art">${ART.ikarin(4)}</div><span class="lv-chip lv4">4</span></div>
          <div class="cmp"><p>「たまたま かも」</p><div class="cmp-art">${ART.ikarin(2)}</div><span class="lv-chip lv2">2</span></div>
        </div>
        <div class="card imsg">まずは<br><b>「わざと？」</b>って きいて みよう。</div>
        <button class="primary big" data-next>${i === n - 1 ? 'おわり！' : 'つぎの もんだい ➡️'}</button>`;
    }
    return {
      title: 'わざと？ たまたま？',
      back: 'practice',
      say,
      html: `${steps(i + 1, n)}${html}`,
      mount(el) {
        bind(el, '[data-a]', () => go('wz', { i, step: 1 }));
        if (step === 1) {
          const next = el.querySelector('[data-next]');
          bind(el, '[data-flip]', (b) => {
            b.classList.add('open');
            speakIf(sc.reasons[+b.dataset.flip]);
            if (el.querySelectorAll('.flip.open').length === sc.reasons.length) { next.hidden = false; next.classList.add('pop'); }
          });
          next.onclick = () => go('wz', { i, step: 2 });
        }
        if (step === 2) {
          el.querySelector('[data-next]').onclick = () => {
            if (i < n - 1) return go('wz', { i: i + 1, step: 0 });
            db.practice.push({ kind: 'wazato', at: nowIso() }); save();
            go('done', { msg: 'いろんな りゆうを かんがえられたね！', reason: 'practice', next: 'practice' });
          };
        }
      },
    };
  };

  // ゲーム：いかりんを しずめよう
  screens.game = () => ({
    title: 'いかりんを しずめよう',
    back: 'practice',
    say: 'いかりんが おおきく なったら、ボタンを ながおし して いきを すって、はなして はこう。',
    html: `
      <div class="game">
        <div class="game-top"><span>⏱️ <b class="g-time">45</b></span><span>🌬️ <b class="g-score">0</b></span></div>
        <div class="g-event" aria-live="polite"></div>
        <div class="g-stage"><div class="ikarin" data-lv="2">${ART.ikarin(2)}</div></div>
        <div class="g-meter">${[1, 2, 3, 4, 5].map((n) => `<span class="seg lv${n}"></span>`).join('')}</div>
        <p class="g-guide">ボタンを ながおし → すう<br>はなす → はく</p>
        <button class="breath-btn"><span class="ring"></span><span class="txt">おして すう</span></button>
        <button class="primary big" data-start>スタート！</button>
      </div>`,
    mount(el) {
      const ik = el.querySelector('.ikarin'), ev = el.querySelector('.g-event'), tEl = el.querySelector('.g-time'),
        sEl = el.querySelector('.g-score'), btn = el.querySelector('.breath-btn'), txt = btn.querySelector('.txt'),
        guide = el.querySelector('.g-guide'), startBtn = el.querySelector('[data-start]'), segs = el.querySelectorAll('.seg');
      let level = 2, score = 0, time = 45, running = false, pressAt = 0, maxHit = false;
      btn.disabled = true;
      const draw = () => {
        if (ik.dataset.lv !== String(level)) ik.innerHTML = ART.ikarin(level);
        ik.dataset.lv = level;
        segs.forEach((s, k) => s.classList.toggle('on', k < level));
      };
      draw();
      const provoke = () => {
        if (!running) return;
        if (level < 5) level++;
        ev.textContent = pick(C.gameEvents);
        ev.classList.remove('show'); void ev.offsetWidth; ev.classList.add('show');
        if (level === 5 && !maxHit) { maxHit = true; guide.textContent = 'ばくはつ しそう！ ゆっくり いきを しよう'; }
        draw();
        later(provoke, 3500 + Math.random() * 2500);
      };
      const down = (e) => {
        if (!running) return;
        e.preventDefault();
        pressAt = Date.now();
        btn.classList.add('inhale');
        txt.textContent = 'すって…';
      };
      const up = () => {
        if (!running || !pressAt) return;
        const held = Date.now() - pressAt;
        pressAt = 0;
        btn.classList.remove('inhale');
        if (held >= 2500) {
          txt.textContent = 'はいて〜';
          level = Math.max(1, level - 1);
          score++; sEl.textContent = score;
          ik.classList.remove('calm'); void ik.offsetWidth; ik.classList.add('calm');
          guide.textContent = level === 1 ? 'いかりんが ちいさく なった！' : 'いいね！ その ちょうし';
          draw();
          later(() => { if (running) txt.textContent = 'おして すう'; }, 1200);
        } else {
          txt.textContent = 'おして すう';
          guide.textContent = 'もっと ゆっくり、ながく すって みよう';
        }
      };
      btn.addEventListener('pointerdown', down);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => btn.addEventListener(n, up));
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
      const key = (e) => { if (e.code === 'Space') { if (e.type === 'keydown' && !e.repeat) down(e); if (e.type === 'keyup') up(); } };
      document.addEventListener('keydown', key); document.addEventListener('keyup', key);
      cleanups.push(() => { document.removeEventListener('keydown', key); document.removeEventListener('keyup', key); });

      startBtn.onclick = () => {
        startBtn.hidden = true; btn.disabled = false; running = true;
        guide.innerHTML = 'ボタンを ながおし → すう<br>はなす → はく';
        later(provoke, 2000);
        every(() => {
          time--; tEl.textContent = time;
          if (time <= 0) {
            running = false;
            db.practice.push({ kind: 'game', score, at: nowIso() }); save();
            go('done', {
              msg: `しんこきゅうが ${score}かい できたね！<br>イライラ しても、いきで おちつけるよ。`,
              reason: 'practice', next: 'practice',
            });
          }
        }, 1000);
      };
    },
  });

  // ---------- ふりかえり（いかり にっき） ----------
  const DIARY_STEPS = 6;
  screens.reflect = () => {
    const d = db.diary;
    const count = (list, key, many) => {
      const m = {};
      d.forEach((r) => [].concat(r[key] || []).forEach((id) => { m[id] = (m[id] || 0) + 1; }));
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, many).map(([id, n]) => ({ item: find(list, id), n })).filter((x) => x.item);
    };
    const tops = count(C.triggers, 'trigger', 3);
    const goods = count(C.actions.filter((a) => a.good), 'action', 3);
    const weekAgo = Date.now() - 7 * 864e5;
    const thisWeek = d.filter((r) => new Date(r.at) > weekAgo).length;
    return {
      title: 'ふりかえり',
      back: 'home',
      say: 'おこった ことを ふりかえって みよう。1ぷんで おわるよ。',
      html: `
        ${penta('おこった ことを ふりかえって みよう。<br>1ぷんで おわるよ。')}
        <button class="primary big" data-new>📒 きろく する</button>
        <button class="primary yellow" data-plan>📇 じぶんの さくせんカード</button>
        ${d.length ? `
          <div class="card">
            <p class="card-h">こんしゅうの きろく： <b>${thisWeek}</b>かい</p>
            <p class="card-h">よく ある スイッチ</p>
            <div class="chips">${tops.map((t) => `<span class="chip">${t.item.e} ${t.item.t} ×${t.n}</span>`).join('') || '<span class="small">まだ ないよ</span>'}</div>
            <p class="card-h">つかえた わざ</p>
            <div class="chips">${goods.map((t) => `<span class="chip good">${t.item.e} ${t.item.t} ×${t.n}</span>`).join('') || '<span class="small">これから ふえるよ</span>'}</div>
          </div>
          <p class="card-h">さいきんの きろく</p>
          ${d.slice(-5).reverse().map((r) => {
            const t = find(C.triggers, r.trigger), res = find(C.results, r.result);
            const dt = new Date(r.at);
            return `<div class="card rec"><span class="date">${dt.getMonth() + 1}/${dt.getDate()}</span>
              <span>${t ? t.e : ''}</span><span class="lv-chip lv${r.temp}">${r.temp}</span>
              <span>${(r.action || []).map((a) => (find(C.actions, a) || {}).e || '').join('')}</span>
              <span>${res ? res.e : ''}</span></div>`;
          }).join('')}` : ''}`,
      mount(el) {
        bind(el, '[data-new]', () => go('diary', { step: 1, rec: {} }));
        bind(el, '[data-plan]', () => go('plan'));
      },
    };
  };

  screens.plan = () => {
    const p = db.profile;
    const empty = !p.switches.length && !p.body.length && !p.action;
    const msg = empty
      ? 'まなぶの「じぶんの さくせん」で カードを つくろう！'
      : 'きみの さくせんカード だよ。いんさつ して ふでばこに いれて おこう。';
    return {
      title: 'さくせんカード',
      back: 'reflect',
      say: msg,
      html: `${penta(msg)}
        ${planCardHtml()}
        ${empty
          ? '<button class="primary big" data-make>🚦 カードを つくる</button>'
          : `${printBtn()}<button class="primary" data-make>✏️ つくりなおす</button>`}`,
      mount(el) {
        bind(el, '[data-print]', () => window.print());
        // ユニット8の「えらぶ」ところ から はじめる
        const u8 = find(C.lessons, 'u8');
        bind(el, '[data-make]', () => go('lesson', { id: 'u8', i: u8.slides.findIndex((s) => s.type === 'pick') }));
      },
    };
  };

  screens.diary = ({ step, rec }) => {
    const nextStep = (patch) => go(step < DIARY_STEPS ? 'diary' : 'diaryDone', { step: step + 1, rec: Object.assign({}, rec, patch) });
    const back = step === 1 ? 'reflect' : () => go('diary', { step: step - 1, rec });
    const cfg = {
      1: { q: 'なにが あった？', list: C.triggers, key: 'trigger' },
      2: { q: 'どのくらい おこった？', thermo: true },
      3: { q: 'からだに どんな サインが でた？<br>（いくつ えらんでも いいよ）', list: C.bodySigns, key: 'body', multi: true },
      4: { q: 'なにを した？<br>（いくつ えらんでも いいよ）', list: C.actions, key: 'action', multi: true },
      5: { q: 'そのあと、どうなった？', list: C.results, key: 'result' },
      6: { q: 'つぎ おなじ ことが あったら、<br>なにを やって みる？', list: C.nextPlans, key: 'next' },
    }[step];
    const body = cfg.thermo ? thermo() : `<div class="choices ${cfg.list.length > 6 ? 'three' : ''}">${cfg.list.map((x) =>
      choiceBtn(x, `data-id="${x.id}"`, cfg.multi ? 'toggle' : '')).join('')}</div>`;
    return {
      title: 'いかり にっき',
      back,
      say: plain(cfg.q),
      html: `${steps(step, DIARY_STEPS)}${penta(cfg.q)}${body}
        ${cfg.multi ? '<button class="primary big" data-next hidden>つぎへ ➡️</button>' : ''}`,
      mount(el) {
        if (cfg.thermo) return bind(el, '[data-lv]', (b) => nextStep({ temp: +b.dataset.lv }));
        if (!cfg.multi) return bind(el, '[data-id]', (b) => nextStep({ [cfg.key]: b.dataset.id }));
        const next = el.querySelector('[data-next]');
        const prev = rec[cfg.key] || [];
        el.querySelectorAll('[data-id]').forEach((b) => { if (prev.includes(b.dataset.id)) b.classList.add('on'); });
        const upd = () => { next.hidden = !el.querySelector('[data-id].on'); };
        bind(el, '[data-id]', (b) => { b.classList.toggle('on'); upd(); if (b.classList.contains('on')) speakIf(b.textContent); });
        upd();
        next.onclick = () => nextStep({ [cfg.key]: [...el.querySelectorAll('[data-id].on')].map((b) => b.dataset.id) });
      },
    };
  };

  screens.diaryDone = ({ rec }) => {
    db.diary.push(Object.assign({ at: nowIso() }, rec));
    if (['breath', 'count', 'fist', 'away'].includes(rec.next)) db.settings.favSkill = rec.next;
    save();
    const good = (rec.action || []).map((id) => find(C.actions, id)).filter((a) => a && a.good);
    const plan = find(C.nextPlans, rec.next);
    let msg = good.length
      ? `「${good[0].t}」ができたね！ すごい！`
      : 'おしえて くれて ありがとう。<br>ふりかえる ことが できたのが えらい！';
    if (plan) msg += `<br>つぎは「${plan.t}」を やって みよう。`;
    return screens.done({ msg, reason: 'diary', next: 'reflect' });
  };

  // ---------- シール ちょう ----------
  screens.stamps = () => {
    const n = db.stamps.length;
    const r = rankOf(n);
    const nextR = C.ranks.find((x) => x.min > n);
    return {
      title: 'シール ちょう',
      back: 'home',
      say: `シールは ${n}まい。いまの ランクは ${r.plain || r.t}。`,
      html: `
        <div class="rank">🏅 ${r.t}</div>
        ${nextR ? `<p class="lead">あと <b>${nextR.min - n}</b>まいで「${nextR.t}」</p>` : '<p class="lead">さいこう ランク！</p>'}
        <div class="sticker-grid">${db.stamps.map((s) => `<span class="sticker">${s.e}</span>`).join('') ||
          '<p class="small">まだ ないよ。きもちを おしえたり、れんしゅう すると もらえるよ。</p>'}</div>`,
    };
  };

  // ---------- おとなの かたへ ----------
  screens.adult = () => {
    const s = db.settings;
    const sosN = db.sos.length, diaryN = db.diary.length;
    const drops = db.sos.filter((x) => x.after < x.before).length;
    return {
      title: 'おとなの方へ',
      back: 'home',
      cls: 'adult',
      say: '',
      html: `
        <section class="card">
          <h2>このアプリについて</h2>
          <p>小学3〜6年生向けのアンガーマネジメント練習アプリ（試作版）です。認知行動療法にもとづく子ども向けプログラム（Coping Power、Second Step など）を参考に、<b>「とまる → おちつく → かんがえる」</b>の流れを練習します。医療・治療の代わりではありません。</p>
          <p>記録はこの端末の中だけに保存され、外部には送信されません。</p>
        </section>
        <section class="card">
          <h2>声かけのポイント</h2>
          <ul>
            <li>怒っている最中は説得しない。まず「ペンタの深呼吸しよう」など、アプリと同じ言葉で落ち着くのを手伝う。</li>
            <li>落ち着いてから「何度くらいだった？」「どの技を使えた？」と聞く。</li>
            <li>「怒らなかったこと」ではなく「気づけた・技を試せた・記録できた」ことをほめる。</li>
            <li>クールダウンのために離れてよい場所を、事前に子どもと決めておく。</li>
          </ul>
        </section>
        <section class="card">
          <h2>設定</h2>
          <label class="row"><input type="checkbox" data-set="autoSpeak" ${s.autoSpeak ? 'checked' : ''}> 画面を自動で読み上げる（家庭向け。教室ではイヤホン推奨）</label>
          <label class="col">クールダウンの場所（「はなれる」で表示）
            <input type="text" data-set="calmPlace" value="${(s.calmPlace || '').replace(/"/g, '&quot;')}" placeholder="例：ほけんしつ、ろうかの ベンチ">
          </label>
        </section>
        <section class="card">
          <h2>記録のまとめ</h2>
          <p>クールダウン（SOS）使用：${sosN}回（うち温度が下がった：${drops}回）<br>
             いかり日記：${diaryN}件 ／ 学習済みユニット：${db.lessonsDone.length} ／ 練習：${db.practice.length}回 ／ シール：${db.stamps.length}枚</p>
          <p class="small">子どもが安心して記録できるよう、記録の内容を叱る材料にしないでください。</p>
        </section>
        <section class="card danger">
          <h2>データ</h2>
          <button class="secondary" data-reset>この端末の記録をすべて消す</button>
          <div class="confirm" data-confirm hidden>
            <p>記録・シールをすべて消します。元に戻せません。</p>
            <button class="secondary" data-reset-yes>消す</button>
            <button class="linkish" data-reset-no>やめる</button>
          </div>
        </section>`,
      mount(el) {
        el.querySelectorAll('[data-set]').forEach((inp) => inp.addEventListener('change', () => {
          db.settings[inp.dataset.set] = inp.type === 'checkbox' ? inp.checked : inp.value.trim();
          save();
        }));
        // confirm() が つかえない かんきょう（Artifact など）でも うごくよう、がめん内で かくにん
        const box = el.querySelector('[data-confirm]');
        bind(el, '[data-reset]', () => { box.hidden = false; });
        bind(el, '[data-reset-no]', () => { box.hidden = true; });
        bind(el, '[data-reset-yes]', () => { db = defaults(); save(); go('home'); });
      },
    };
  };

  go('home');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
