// 生词本交互：搜索、场景/类型筛选、自测模式、闪卡复习（Leitner 间隔重复）。
// 词条来自 _layouts/vocab.html 渲染出来的静态 DOM；复习进度存在 localStorage。
(function () {
  'use strict';

  var app = document.querySelector('.vocab-app');
  if (!app) return;

  // ---------- 复习进度存储 ----------
  // state = { cards: { "scene::term": { box: 1..5, due: "YYYY-MM-DD" } }, newDay: "YYYY-MM-DD", newCount: n }
  var STORE_KEY = 'vocab-srs-v1';
  var INTERVALS = [1, 2, 4, 7, 15]; // 盒子 1..5 对应的复习间隔（天）
  var NEW_PER_DAY = 20;
  var MAX_BOX = INTERVALS.length;

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (s && s.cards) return s;
    } catch (e) {}
    return { cards: {}, newDay: '', newCount: 0 };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  var state = load();

  function today(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function newLeftToday() {
    if (state.newDay !== today()) return NEW_PER_DAY;
    return Math.max(0, NEW_PER_DAY - state.newCount);
  }

  // ---------- 词条索引 ----------
  var entries = Array.prototype.map.call(app.querySelectorAll('.vocab-entry'), function (el) {
    return {
      el: el,
      id: el.dataset.id,
      kind: el.dataset.kind,
      scene: el.closest('.vocab-scene').dataset.scene,
      hay: el.textContent.toLowerCase()
    };
  });
  var sections = Array.prototype.slice.call(app.querySelectorAll('.vocab-scene'));

  function paintLevel(entry) {
    var card = state.cards[entry.id];
    var box = card ? card.box : 0;
    entry.el.dataset.level = box;
    var level = entry.el.querySelector('.vocab-level');
    level.title = box ? '复习进度 ' + box + ' / ' + MAX_BOX : '还没复习过';
    level.innerHTML = '';
    for (var i = 1; i <= MAX_BOX; i++) {
      var pip = document.createElement('i');
      if (i <= box) pip.className = 'on';
      level.appendChild(pip);
    }
  }

  function paintStats() {
    var t = today(), due = 0, mastered = 0;
    entries.forEach(function (e) {
      var c = state.cards[e.id];
      if (!c) return;
      if (c.due <= t) due++;
      if (c.box >= MAX_BOX) mastered++;
    });
    setStat('due', due);
    setStat('new', newLeftToday());
    setStat('mastered', mastered);
    app.querySelector('[data-review-count]').textContent = buildQueue().length;
  }
  function setStat(name, n) {
    var el = app.querySelector('[data-stat="' + name + '"]');
    el.hidden = false;
    el.querySelector('b').textContent = n;
  }

  // ---------- 筛选 ----------
  var filters = { q: '', scene: '', kind: '' };
  var searchInput = app.querySelector('.vocab-search input');
  var emptyMsg = app.querySelector('.vocab-empty');

  function matches(e) {
    return (!filters.scene || e.scene === filters.scene) &&
      (!filters.kind || e.kind === filters.kind) &&
      (!filters.q || e.hay.indexOf(filters.q) !== -1);
  }

  function applyFilter() {
    var shown = 0;
    var perScene = {};
    entries.forEach(function (e) {
      var ok = matches(e);
      e.el.hidden = !ok;
      if (ok) { shown++; perScene[e.scene] = (perScene[e.scene] || 0) + 1; }
    });
    sections.forEach(function (sec) {
      var n = perScene[sec.dataset.scene] || 0;
      sec.hidden = n === 0;
      sec.querySelector('.vocab-scene-count').textContent = n;
    });
    emptyMsg.hidden = shown !== 0;
    app.querySelector('[data-review-count]').textContent = buildQueue().length;
  }

  searchInput.addEventListener('input', function () {
    filters.q = searchInput.value.trim().toLowerCase();
    applyFilter();
  });

  app.querySelector('[data-filter="kind"]').addEventListener('click', function (ev) {
    var chip = ev.target.closest('button[data-value]');
    if (!chip) return;
    filters.kind = chip.dataset.value;
    this.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-active', b === chip); });
    applyFilter();
  });

  // 左侧场景索引：有 JS 时作为筛选器，没 JS 时就是普通锚点
  var indexLinks = app.querySelectorAll('.vocab-index a[data-scene]');
  app.querySelector('.vocab-index').addEventListener('click', function (ev) {
    var link = ev.target.closest('a[data-scene]');
    if (!link) return;
    ev.preventDefault();
    filters.scene = link.dataset.scene;
    indexLinks.forEach(function (a) { a.classList.toggle('is-active', a === link); });
    applyFilter();
    var toolbar = app.querySelector('.vocab-toolbar');
    var top = app.querySelector('.vocab-shell').getBoundingClientRect().top + window.pageYOffset - toolbar.offsetHeight - 8;
    if (window.pageYOffset > top) window.scrollTo(0, top);
  });

  // ---------- 自测模式 ----------
  var quizBtn = app.querySelector('[data-action="quiz"]');
  quizBtn.addEventListener('click', function () {
    var on = quizBtn.getAttribute('aria-pressed') !== 'true';
    quizBtn.setAttribute('aria-pressed', String(on));
    app.classList.toggle('is-quiz', on);
    if (!on) app.querySelectorAll('.vocab-entry.is-revealed').forEach(function (el) { el.classList.remove('is-revealed'); });
  });
  // 触屏没有 hover：自测模式下点一下词条显示答案
  app.querySelector('.vocab-list').addEventListener('click', function (ev) {
    if (!app.classList.contains('is-quiz')) return;
    var el = ev.target.closest('.vocab-entry');
    if (el) el.classList.toggle('is-revealed');
  });

  // ---------- 闪卡复习 ----------
  function buildQueue() {
    var t = today();
    var due = [], fresh = [];
    entries.forEach(function (e) {
      if (!matches(e)) return;
      var c = state.cards[e.id];
      if (c) { if (c.due <= t) due.push(e); }
      else fresh.push(e);
    });
    due.sort(function (a, b) {
      var ca = state.cards[a.id], cb = state.cards[b.id];
      return ca.due < cb.due ? -1 : ca.due > cb.due ? 1 : ca.box - cb.box;
    });
    return due.concat(fresh.slice(0, newLeftToday()));
  }

  var dialog = app.querySelector('.vocab-review');
  var cardBody = dialog.querySelector('.vocab-card-body');
  var progress = dialog.querySelector('.vocab-card-progress');
  var btn = {
    flip: dialog.querySelector('[data-action="flip"]'),
    forgot: dialog.querySelector('[data-action="forgot"]'),
    remembered: dialog.querySelector('[data-action="remembered"]')
  };
  var session = null;

  function startReview() {
    var queue = buildQueue();
    session = { queue: queue, pos: 0, total: queue.length, remembered: 0, forgot: 0, requeued: {}, flipped: false, lastFocus: document.activeElement };
    dialog.hidden = false;
    document.documentElement.classList.add('vocab-noscroll');
    showCard();
  }

  function closeReview() {
    dialog.hidden = true;
    document.documentElement.classList.remove('vocab-noscroll');
    if (session && session.lastFocus) session.lastFocus.focus();
    session = null;
    paintStats();
  }

  function showCard() {
    var e = session.queue[session.pos];
    session.flipped = false;
    cardBody.innerHTML = '';
    if (!e) {
      progress.textContent = '完成';
      var done = document.createElement('div');
      done.className = 'vocab-card-done';
      done.innerHTML = session.total
        ? '<p class="vocab-card-big">这一轮复习完了</p><p>记得 <b>' + session.remembered + '</b> · 忘了 <b>' + session.forgot + '</b></p>'
        : '<p class="vocab-card-big">现在没有要复习的词</p><p>到期的词和今天的新词都复习完了，明天再来。</p>';
      cardBody.appendChild(done);
      btn.flip.hidden = btn.forgot.hidden = btn.remembered.hidden = true;
      dialog.querySelector('.vocab-card-close').focus();
      return;
    }
    progress.textContent = (session.pos + 1) + ' / ' + session.queue.length + (state.cards[e.id] ? '' : ' · 新词');

    var front = document.createElement('div');
    front.className = 'vocab-card-front';
    front.appendChild(e.el.querySelector('.vocab-term-line').cloneNode(true));
    cardBody.appendChild(front);

    var back = e.el.querySelector('.vocab-answer').cloneNode(true);
    back.classList.add('vocab-card-back');
    back.hidden = true;
    cardBody.appendChild(back);

    btn.flip.hidden = false;
    btn.forgot.hidden = btn.remembered.hidden = true;
    btn.flip.focus();
  }

  function flip() {
    if (!session || session.flipped || !session.queue[session.pos]) return;
    session.flipped = true;
    cardBody.querySelector('.vocab-card-back').hidden = false;
    btn.flip.hidden = true;
    btn.forgot.hidden = btn.remembered.hidden = false;
    btn.remembered.focus();
  }

  function grade(remembered) {
    if (!session || !session.flipped) return;
    var e = session.queue[session.pos];
    var card = state.cards[e.id];
    if (!card) {
      if (state.newDay !== today()) { state.newDay = today(); state.newCount = 0; }
      state.newCount++;
      card = state.cards[e.id] = { box: 0, due: today() };
    }
    if (remembered) {
      session.remembered++;
      // 这一轮里忘过又答对的，留在盒子 1，明天再确认一次
      if (!session.requeued[e.id]) card.box = Math.min(card.box + 1, MAX_BOX);
    } else {
      session.forgot++;
      card.box = 1;
      // 忘了的词在这一轮末尾再出现一次
      if (!session.requeued[e.id]) { session.requeued[e.id] = true; session.queue.push(e); }
    }
    card.due = today(INTERVALS[card.box - 1]);
    save();
    paintLevel(e);
    session.pos++;
    showCard();
  }

  app.querySelector('[data-action="review"]').addEventListener('click', startReview);
  dialog.querySelector('[data-action="close"]').addEventListener('click', closeReview);
  btn.flip.addEventListener('click', flip);
  btn.forgot.addEventListener('click', function () { grade(false); });
  btn.remembered.addEventListener('click', function () { grade(true); });
  dialog.addEventListener('click', function (ev) { if (ev.target === dialog) closeReview(); });
  cardBody.addEventListener('click', flip);

  document.addEventListener('keydown', function (ev) {
    if (dialog.hidden) return;
    if (ev.key === 'Escape') { ev.preventDefault(); closeReview(); }
    else if (ev.key === ' ' || ev.key === 'Enter') {
      if (!session.flipped && session.queue[session.pos]) { ev.preventDefault(); flip(); }
    }
    else if (ev.key === '1') grade(false);
    else if (ev.key === '2') grade(true);
  });

  // ---------- 初始化 ----------
  app.querySelector('.vocab-toolbar').hidden = false;
  app.classList.add('js-ready');
  entries.forEach(paintLevel);
  paintStats();
})();
