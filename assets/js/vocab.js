// 生词本交互：搜索、场景/类型筛选、自测模式、随机闪卡复习。
// 词条来自 _layouts/vocab.html 渲染出来的静态 DOM。
// 复习是纯随机的：每次点按钮都从当前筛选结果里重新抽一批，不记录任何进度。
(function () {
  'use strict';

  var app = document.querySelector('.vocab-app');
  if (!app) return;

  var ROUND_SIZE = 20; // 每轮随机抽多少个

  // ---------- 词条索引 ----------
  var entries = Array.prototype.map.call(app.querySelectorAll('.vocab-entry'), function (el) {
    return {
      el: el,
      kind: el.dataset.kind,
      scene: el.closest('.vocab-scene').dataset.scene,
      hay: el.textContent.toLowerCase()
    };
  });
  var sections = Array.prototype.slice.call(app.querySelectorAll('.vocab-scene'));

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

  // ---------- 随机闪卡复习 ----------
  // 部分 Fisher–Yates 洗牌：只洗前 k 个位置，随机范围每轮向右收缩，
  // 已定下的位置不会再被换走 —— 同一轮内不会重复，且每个词落到每个位置的概率相等。
  // 不用 sort(() => Math.random() - 0.5)：比较函数不满足传递性，结果分布有偏且跨引擎不一致。
  function sampleRandom(n) {
    var pool = entries.filter(matches);
    var k = Math.min(n, pool.length);
    for (var i = 0; i < k; i++) {
      var j = i + Math.floor(Math.random() * (pool.length - i));
      var tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, k);
  }

  var dialog = app.querySelector('.vocab-review');
  var cardBody = dialog.querySelector('.vocab-card-body');
  var progress = dialog.querySelector('.vocab-card-progress');
  var btn = {
    flip: dialog.querySelector('[data-action="flip"]'),
    next: dialog.querySelector('[data-action="next"]'),
    again: dialog.querySelector('[data-action="again"]')
  };
  var session = null;

  // 开一轮新的。从完成页点「再来一轮」时也是走这里，弹窗不关，可以无限点。
  function startReview() {
    session = {
      queue: sampleRandom(ROUND_SIZE),
      pos: 0,
      flipped: false,
      lastFocus: (session && session.lastFocus) || document.activeElement
    };
    dialog.hidden = false;
    document.documentElement.classList.add('vocab-noscroll');
    showCard();
  }

  function closeReview() {
    dialog.hidden = true;
    document.documentElement.classList.remove('vocab-noscroll');
    if (session && session.lastFocus) session.lastFocus.focus();
    session = null;
  }

  function showCard() {
    var e = session.queue[session.pos];
    session.flipped = false;
    cardBody.innerHTML = '';
    btn.flip.hidden = btn.next.hidden = btn.again.hidden = true;

    if (!e) {
      progress.textContent = session.queue.length ? '完成' : '';
      var done = document.createElement('div');
      done.className = 'vocab-card-done';
      done.innerHTML = session.queue.length
        ? '<p class="vocab-card-big">这一轮 ' + session.queue.length + ' 个看完了</p><p>再来一轮是重新随机抽的，想刷几轮都行。</p>'
        : '<p class="vocab-card-big">当前筛选下没有词条</p><p>清空搜索框，或者在左边换个场景。</p>';
      cardBody.appendChild(done);
      btn.again.hidden = false;
      btn.again.focus();
      return;
    }

    progress.textContent = (session.pos + 1) + ' / ' + session.queue.length;

    var front = document.createElement('div');
    front.className = 'vocab-card-front';
    front.appendChild(e.el.querySelector('.vocab-term-line').cloneNode(true));
    cardBody.appendChild(front);

    var back = e.el.querySelector('.vocab-answer').cloneNode(true);
    back.classList.add('vocab-card-back');
    back.hidden = true;
    cardBody.appendChild(back);

    btn.flip.hidden = false;
    btn.flip.focus();
  }

  function flip() {
    if (!session || session.flipped || !session.queue[session.pos]) return;
    session.flipped = true;
    cardBody.querySelector('.vocab-card-back').hidden = false;
    btn.flip.hidden = true;
    btn.next.hidden = false;
    btn.next.focus();
  }

  function next() {
    if (!session || !session.flipped) return;
    session.pos++;
    showCard();
  }

  app.querySelector('[data-action="review"]').addEventListener('click', startReview);
  dialog.querySelector('[data-action="close"]').addEventListener('click', closeReview);
  btn.flip.addEventListener('click', flip);
  btn.next.addEventListener('click', next);
  btn.again.addEventListener('click', startReview);
  dialog.addEventListener('click', function (ev) { if (ev.target === dialog) closeReview(); });
  cardBody.addEventListener('click', flip);

  document.addEventListener('keydown', function (ev) {
    if (dialog.hidden || !session) return;
    if (ev.key === 'Escape') { ev.preventDefault(); closeReview(); return; }
    if (ev.key !== ' ' && ev.key !== 'Enter' && ev.key !== 'ArrowRight') return;
    // 完成页上焦点在「再来一轮」按钮上，交给按钮自己响应，别在这里重复触发
    if (!session.queue[session.pos]) return;
    ev.preventDefault();
    if (session.flipped) next();
    else flip();
  });

  // ---------- 初始化 ----------
  app.querySelector('.vocab-toolbar').hidden = false;
  app.classList.add('js-ready');
})();
