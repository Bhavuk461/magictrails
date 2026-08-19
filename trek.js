(function(){
  'use strict';

  var params = new URLSearchParams(location.search);
  var slug   = params.get('t');
  var treks  = window.TREKS || [];
  var idx    = treks.findIndex(function(x){ return x.slug === slug; });
  var t      = treks[idx];
  var root   = document.getElementById('trek-root');

  if(!t){
    root.innerHTML = '<div class="loading">Trail not found. ' +
      '<a href="index.html" style="color:var(--accent);margin-left:8px">Go home →</a></div>';
    return;
  }

  var esc   = MT.esc;
  var theme = t.theme || 'journal';
  var next  = treks[(idx + 1) % treks.length];

  /* ---------- head ---------- */
  document.title = 'MagicTrails — ' + t.name + ' Trek · ' + t.duration;
  var meta = document.querySelector('meta[name="description"]');
  if(meta){
    meta.setAttribute('content',
      t.name + ' — ' + t.tagline + ' ' + t.duration + ', ' + t.route +
      ', max altitude ' + t.altitude + '. ' + t.price + ' all inclusive.');
  }
  document.documentElement.dataset.theme = theme;

  /* ---------- helpers ---------- */

  /* '~4,575 m' -> 4575 */
  function metres(s){ return parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0; }

  /* A stated non-zero baseline: at a 0 baseline every Himalayan trek looks the
     same height, so the axis starts at 3,000 m and says so. */
  var FLOOR = 3000, CEIL = 5200;
  function altPct(m){
    return Math.max(2, Math.min(100, ((m - FLOOR) / (CEIL - FLOOR)) * 100));
  }

  var GRADES = ['Easy', 'Easy – Moderate', 'Moderate', 'Moderate – Difficult', 'Difficult'];
  function gradeStep(g){
    var i = GRADES.indexOf(g);
    if(i > -1) return i;
    /* Tolerate hyphen/spacing drift in the data. */
    var norm = g.toLowerCase().replace(/[\s–-]+/g, '');
    for(var j = 0; j < GRADES.length; j++){
      if(GRADES[j].toLowerCase().replace(/[\s–-]+/g, '') === norm) return j;
    }
    return /difficult/i.test(g) ? 4 : /moderate/i.test(g) ? 2 : 0;
  }

  var TICK = '<svg class="tick" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
             '<path d="M2.5 8.6 L6.2 12.2 L13.5 4"/></svg>';

  /* ---------- hero ---------- */
  var heroImg = MT.img(t.folder + '/back.webp', {
    alt: t.name,
    sizes: '100vw',
    loading: 'eager',
    fetchpriority: 'high'
  });

  var eyebrow = '<span class="n">' + String(idx + 1).padStart(2, '0') + ' / ' +
                String(treks.length).padStart(2, '0') + '</span>' +
                '<span class="sep" aria-hidden="true"></span>' +
                '<span>' + esc(t.grade) + '</span>' +
                '<span class="sep" aria-hidden="true"></span>' +
                '<span>' + esc(t.altitude) + '</span>';

  var hero;
  if(theme === 'cinematic'){
    /* Full-bleed plate, name set over the photograph. */
    hero =
      '<header class="hero-cine">' +
        '<div class="plate">' + heroImg + '<div class="plate__veil"></div></div>' +
        '<div class="hero-cine__inner">' +
          '<p class="eyebrow reveal">' + eyebrow + '</p>' +
          '<h1 class="display reveal">' + esc(t.name) + '</h1>' +
          '<p class="tagline reveal">' + esc(t.tagline) + '</p>' +
        '</div>' +
        '<span class="scroll-cue" aria-hidden="true"><i></i></span>' +
      '</header>';
  } else {
    /* Masthead on paper, then a framed plate — a magazine feature opener. */
    hero =
      '<header class="hero-journal">' +
        '<div class="masthead">' +
          '<p class="eyebrow reveal">' + eyebrow + '</p>' +
          '<h1 class="display reveal">' + esc(t.name) + '</h1>' +
          '<p class="tagline reveal">' + esc(t.tagline) + '</p>' +
        '</div>' +
        '<figure class="plate reveal">' + heroImg +
          '<figcaption>' + esc(t.route) + ' · ' + esc(t.duration) + '</figcaption>' +
        '</figure>' +
      '</header>';
  }

  /* ---------- at a glance ---------- */
  var factRows = [
    ['Duration', t.duration],
    ['Route', t.route],
    ['Max altitude', t.altitude],
    ['Grade', t.grade]
  ].map(function(f){
    return '<div class="row"><dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd></div>';
  }).join('');

  var ranked = treks.slice().sort(function(a, b){ return metres(b.altitude) - metres(a.altitude); });
  var altRows = ranked.map(function(x){
    var me = x.slug === t.slug;
    return '<li class="alt-row' + (me ? ' is-me' : '') + '">' +
        '<span class="alt-name">' + esc(x.name) + '</span>' +
        '<span class="alt-bar"><i style="--pct:' + altPct(metres(x.altitude)).toFixed(1) + '%"></i></span>' +
        '<span class="alt-val">' + metres(x.altitude).toLocaleString() + '<abbr> m</abbr></span>' +
      '</li>';
  }).join('');

  var step = gradeStep(t.grade);
  var gradeMarks = GRADES.map(function(g, i){
    return '<li' + (i === step ? ' aria-current="true"' : '') + '><span class="dot"></span>' +
           '<span class="lbl">' + g.replace(' – ', '–') + '</span></li>';
  }).join('');

  var ledger =
    '<section class="ledger" aria-labelledby="glance-h">' +
      '<div class="ledger__inner">' +
        '<h2 class="sec-title reveal" id="glance-h"><span class="num">01</span>At a glance</h2>' +
        '<dl class="facts reveal">' + factRows + '</dl>' +
        '<div class="viz">' +
          '<figure class="alt-chart reveal">' +
            '<figcaption>Max altitude, against the other three trails</figcaption>' +
            '<ul>' + altRows + '</ul>' +
            '<p class="axis"><span>' + FLOOR.toLocaleString() + ' m</span><span>' + CEIL.toLocaleString() + ' m</span></p>' +
          '</figure>' +
          '<figure class="grade-scale reveal">' +
            '<figcaption>Difficulty</figcaption>' +
            '<ol style="--step:' + step + '">' + gradeMarks + '</ol>' +
          '</figure>' +
        '</div>' +
      '</div>' +
    '</section>';

  /* ---------- body ---------- */
  var sections = t.sections.map(function(s, i){
    return '<section class="chapter reveal">' +
        '<h2 class="sec-title"><span class="num">' + String(i + 2).padStart(2, '0') + '</span>' + esc(s.h) + '</h2>' +
        '<p>' + esc(s.p) + '</p>' +
      '</section>';
  }).join('');

  var included = ['Meals throughout', 'Stay & camps', 'Certified guides', 'Permits & safety gear']
    .map(function(x){ return '<li>' + TICK + '<span>' + x + '</span></li>'; }).join('');

  var rail =
    '<aside class="rail">' +
      '<div class="rail__card">' +
        '<p class="rail__price">' + t.price + '<small>per person, all inclusive</small></p>' +
        '<dl class="rail__facts">' +
          '<div><dt>Duration</dt><dd>' + esc(t.duration) + '</dd></div>' +
          '<div><dt>Route</dt><dd>' + esc(t.route) + '</dd></div>' +
          '<div><dt>Grade</dt><dd>' + esc(t.grade) + '</dd></div>' +
        '</dl>' +
        '<a class="btn-primary magnetic" href="' + mailto() + '">Reserve your spot</a>' +
        '<p class="rail__note">No deposit to enquire — we reply within a day.</p>' +
      '</div>' +
    '</aside>';

  function mailto(){
    return 'mailto:hello@magictrails.in?subject=' +
      encodeURIComponent('Booking enquiry: ' + t.name);
  }

  var body =
    '<div class="body-wrap">' +
      '<div class="prose">' +
        '<p class="intro reveal">' + esc(t.intro) + '</p>' +
        sections +
        '<section class="included reveal">' +
          '<h2 class="sec-title"><span class="num">' + String(t.sections.length + 2).padStart(2, '0') + '</span>What is included</h2>' +
          '<ul>' + included + '</ul>' +
        '</section>' +
      '</div>' +
      rail +
    '</div>';

  /* ---------- gallery ---------- */
  var gallery = '';
  if(t.gallery && t.gallery.length){
    var lead = t.gallery[0];
    var rest = t.gallery.slice(1);
    var mk = function(file, i, sizes){
      return '<figure class="shot" data-i="' + i + '">' +
          '<button type="button" class="shot__btn" aria-label="Open photo ' + (i + 1) + ' of ' + t.gallery.length + '">' +
            MT.img(t.folder + '/' + file, { alt: t.name + ', photo ' + (i + 1), sizes: sizes }) +
          '</button>' +
          '<figcaption>' + String(i + 1).padStart(2, '0') + '</figcaption>' +
        '</figure>';
    };
    gallery =
      '<section class="gallery" aria-labelledby="gal-h">' +
        '<h2 class="sec-title reveal" id="gal-h"><span class="num">' +
          String(t.sections.length + 3).padStart(2, '0') + '</span>From the trail</h2>' +
        '<div class="gallery__lead reveal">' + mk(lead, 0, '(max-width:900px) 100vw, min(1180px, 92vw)') + '</div>' +
        (rest.length ? '<div class="gallery__grid">' +
          rest.map(function(f, i){ return mk(f, i + 1, '(max-width:900px) 46vw, min(560px, 44vw)'); }).join('') +
        '</div>' : '') +
      '</section>';
  }

  /* ---------- booking band ---------- */
  var bandImg = MT.img(t.folder + '/title.webp', {
    alt: '', sizes: '(max-width:900px) 100vw, 50vw', className: 'band__img'
  });
  var band =
    '<section class="band">' +
      '<div class="band__media">' + bandImg + '</div>' +
      '<div class="band__body">' +
        '<p class="eyebrow reveal">Ready when you are</p>' +
        '<h2 class="reveal">Your ' + esc(t.name) + '<br/>journey awaits</h2>' +
        '<p class="band__meta reveal">' + esc(t.duration) + ' · ' + esc(t.route) + ' · food &amp; stay sorted.</p>' +
        '<p class="band__price reveal">' + t.price + '<small>all inclusive</small></p>' +
        '<a class="btn-primary magnetic reveal" href="' + mailto() + '">Reserve your spot</a>' +
      '</div>' +
    '</section>';

  /* ---------- next trail + index ---------- */
  var others = treks.filter(function(x){ return x.slug !== t.slug; }).map(function(x){
    return '<li><a href="trek.html?t=' + encodeURIComponent(x.slug) + '">' +
        '<span class="nm">' + esc(x.name) + '</span>' +
        '<span class="mt">' + esc(x.altitude) + ' · ' + esc(x.price) + '</span>' +
      '</a></li>';
  }).join('');

  var nextCard =
    '<section class="next">' +
      '<a class="next__card reveal" href="trek.html?t=' + encodeURIComponent(next.slug) + '">' +
        '<span class="next__media">' +
          MT.img(next.folder + '/back.webp', {
            alt: next.name, sizes: '(max-width:900px) 100vw, 46vw'
          }) +
        '</span>' +
        '<span class="next__body">' +
          '<span class="eyebrow">Next trail</span>' +
          '<span class="next__name">' + esc(next.name) + '</span>' +
          '<span class="next__tag">' + esc(next.tagline) + '</span>' +
          '<span class="next__go">Read the trail →</span>' +
        '</span>' +
      '</a>' +
      '<nav class="next__index" aria-label="All treks">' +
        '<p class="eyebrow">Every trail</p><ul>' + others + '</ul>' +
      '</nav>' +
    '</section>';

  /* ---------- mount ---------- */
  root.innerHTML = hero + ledger + body + gallery + band + nextCard;

  /* Compact booking bar for phones, where the sticky rail collapses away. */
  var bar = document.createElement('div');
  bar.className = 'bookbar';
  bar.innerHTML =
    '<span class="bookbar__price">' + t.price + '<small>' + esc(t.duration) + '</small></span>' +
    '<a class="bookbar__cta" href="' + mailto() + '">Reserve</a>';
  document.body.appendChild(bar);

  /* ---------- lightbox ---------- */
  if(t.gallery && t.gallery.length) buildLightbox();

  function buildLightbox(){
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', t.name + ' photographs');
    box.innerHTML =
      '<div class="lightbox__ui">' +
        '<button type="button" class="lightbox__close" aria-label="Close">✕</button>' +
        '<button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Previous photo">←</button>' +
        '<button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Next photo">→</button>' +
        '<p class="lightbox__count" aria-live="polite"></p>' +
      '</div>' +
      '<div class="lightbox__stage"></div>';
    document.body.appendChild(box);

    var stage  = box.querySelector('.lightbox__stage');
    var count  = box.querySelector('.lightbox__count');
    var closeB = box.querySelector('.lightbox__close');
    var at = 0, trigger = null;

    function render(){
      stage.innerHTML = MT.img(t.folder + '/' + t.gallery[at], {
        alt: t.name + ', photo ' + (at + 1), sizes: '100vw', loading: 'eager'
      });
      count.textContent = (at + 1) + ' / ' + t.gallery.length;
    }
    function open(i, from){
      at = i; trigger = from || null;
      box.hidden = false;
      void box.offsetHeight;
      box.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
      render();
      closeB.focus();
      document.addEventListener('keydown', onKey);
    }
    function close(){
      box.classList.remove('open');
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      setTimeout(function(){ box.hidden = true; stage.innerHTML = ''; }, 260);
      if(trigger && trigger.focus) trigger.focus();
    }
    function go(d){ at = (at + d + t.gallery.length) % t.gallery.length; render(); }
    function onKey(e){
      if(e.key === 'Escape') close();
      else if(e.key === 'ArrowRight') go(1);
      else if(e.key === 'ArrowLeft') go(-1);
      else if(e.key === 'Tab'){
        /* Only the three controls are reachable while the overlay is up. */
        var f = Array.prototype.slice.call(box.querySelectorAll('button'));
        var first = f[0], last = f[f.length - 1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }

    closeB.addEventListener('click', close);
    box.querySelector('.lightbox__nav--prev').addEventListener('click', function(){ go(-1); });
    box.querySelector('.lightbox__nav--next').addEventListener('click', function(){ go(1); });
    box.addEventListener('click', function(e){
      if(e.target === box || e.target === stage) close();
    });
    root.querySelectorAll('.shot__btn').forEach(function(btn){
      btn.addEventListener('click', function(){ open(+btn.closest('.shot').dataset.i, btn); });
    });
  }
})();
