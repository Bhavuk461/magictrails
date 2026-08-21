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
  /* Gallery entries carry a per-photograph frame; older data used bare
     filenames, so normalise both shapes to one. */
  var shots = (t.gallery || []).map(function(g){
    return typeof g === 'string' ? { src: g, frame: 'mat' } : g;
  });
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

  var REDUCED = window.matchMedia('(prefers-reduced-motion:reduce)');

  /* Low-power devices get a lighter build of the same design: fewer decorative
     nodes, no idle animation, and the expensive paint features off (see
     .is-lite in trek.css). The design language is preserved; only the cost is
     cut. Declared up here because the carousels below want it too. */
  var LITE = MT.lite;
  if(LITE) document.documentElement.classList.add('is-lite');
  var DENSITY = LITE ? 0.55 : 1;

  function slice(list){ return Array.prototype.slice.call(list); }
  function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }

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
  if(theme !== 'journal'){
    /* Full-bleed plate, name set over the photograph. */
    hero =
      '<header class="hero-full">' +
        '<div class="plate">' + heroImg + '<div class="plate__veil"></div></div>' +
        '<div class="hero-full__inner">' +
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

  /* ---------- gallery ----------
     Three presentations, picked per trek in data.js, because the photographs
     themselves differ: a paper deck of prints for the journal ground, a
     cinematic strip for the night one, framed plates for the rest. They share
     one contract — every photograph carries data-lb="<index>", which is all
     the lightbox binds to. */
  var galStyle = shots.length ? (t.galleryStyle || 'frames') : '';
  var galNum   = String(t.sections.length + 3).padStart(2, '0');

  function pad2(n){ return String(n).padStart(2, '0'); }

  function galHead(){
    return '<h2 class="sec-title reveal" id="gal-h">' +
      '<span class="num">' + galNum + '</span>From the trail</h2>';
  }

  /* Label used for the button, the caption and the lightbox alike. */
  function shotLabel(s, i){
    return s.title ? s.title.replace(/\n/g, ' ') : (t.name + ', photo ' + (i + 1));
  }

  var gallery =
    galStyle === 'coverflow' ? coverDeck() :
    galStyle === 'filmstrip' ? filmStrip() :
    galStyle                 ? framedGrid() : '';

  /* --- frames: a lead plate over a two-up grid, each in its own frame --- */
  function framedGrid(){
    var lead = shots[0];
    var rest = shots.slice(1);
    var mk = function(item, i, sizes){
      return '<figure class="shot frame-' + (item.frame || 'mat') + '" data-i="' + i + '">' +
          '<button type="button" class="shot__btn" data-lb="' + i + '" ' +
            'aria-label="Open photo ' + (i + 1) + ' of ' + shots.length + '">' +
            MT.img(t.folder + '/' + item.src, { alt: t.name + ', photo ' + (i + 1), sizes: sizes }) +
          '</button>' +
          '<figcaption>' + pad2(i + 1) + '</figcaption>' +
        '</figure>';
    };
    return '<section class="gallery" aria-labelledby="gal-h">' +
        galHead() +
        '<div class="gallery__lead reveal">' + mk(lead, 0, '(max-width:900px) 100vw, min(1180px, 92vw)') + '</div>' +
        (rest.length ? '<div class="gallery__grid">' +
          rest.map(function(f, i){ return mk(f, i + 1, '(max-width:900px) 46vw, min(560px, 44vw)'); }).join('') +
        '</div>' : '') +
      '</section>';
  }

  /* --- coverflow: a deck of prints, raked back on both sides ---
     Square cards, because these photographs are a mix of portrait and
     landscape and a square crop lets them sit in one deck without the rhythm
     breaking. Everything else — pitch, recession, perspective — is derived in
     wireCover() from the one card width CSS gives it, so the rake scales with
     the viewport and nothing here is hard-coded to a breakpoint. */
  function coverDeck(){
    var cards = shots.map(function(s, i){
      return '<button type="button" class="cover__card" data-i="' + i + '" data-lb="' + i + '" ' +
          'tabindex="' + (i ? '-1' : '0') + '" aria-roledescription="slide" ' +
          'aria-label="' + esc(shotLabel(s, i) + ' — ' + (i + 1) + ' of ' + shots.length) + '">' +
          '<span class="cover__print">' +
            MT.img(t.folder + '/' + s.src, {
              alt: shotLabel(s, i),
              sizes: '(max-width:620px) 58vw, 330px',
              loading: i < 2 ? 'eager' : 'lazy'
            }) +
          '</span>' +
        '</button>';
    }).join('');

    var dots = shots.map(function(s, i){
      return '<button type="button" class="cover__dot" data-i="' + i + '" ' +
        'aria-label="' + esc(shotLabel(s, i)) + '"' + (i ? '' : ' aria-current="true"') + '></button>';
    }).join('');

    return '<section class="gallery gallery--cover" aria-labelledby="gal-h">' +
        galHead() +
        '<div class="cover reveal" role="group" aria-roledescription="carousel" ' +
             'aria-label="' + esc(t.name) + ' photographs">' +
          '<div class="cover__frame">' +
            '<div class="cover__deck">' + cards + '</div>' +
          '</div>' +
          '<button type="button" class="cover__arrow cover__arrow--prev" aria-label="Previous photograph"></button>' +
          '<button type="button" class="cover__arrow cover__arrow--next" aria-label="Next photograph"></button>' +
          '<div class="cover__cap" aria-live="polite">' +
            '<p class="cover__n"></p>' +
            '<p class="cover__title"></p>' +
            '<p class="cover__sub"></p>' +
          '</div>' +
          '<div class="cover__dots">' + dots + '</div>' +
        '</div>' +
      '</section>';
  }

  /* --- filmstrip: full-bleed, the focused frame unveiling to full height ---
     Every card shares one top edge and one height; the unfocused ones are
     clipped to half. Clipping rather than resizing means the strip's layout
     never changes as focus moves — the row is laid out once and the rest is
     compositing — and the photograph doesn't rescale as it opens, so the
     frame reads as being unveiled rather than swapped. */
  function filmStrip(){
    var cards = shots.map(function(s, i){
      return '<button type="button" class="strip__card' + (i ? '' : ' is-on') + '" ' +
          'data-i="' + i + '" data-lb="' + i + '" tabindex="' + (i ? '-1' : '0') + '" ' +
          'aria-roledescription="slide" ' +
          'aria-label="' + esc(shotLabel(s, i) + ' — ' + (i + 1) + ' of ' + shots.length) + '">' +
          MT.img(t.folder + '/' + s.src, {
            alt: shotLabel(s, i),
            sizes: '(max-width:700px) 34vw, 240px',
            loading: i < 2 ? 'eager' : 'lazy'
          }) +
          '<span class="strip__dim" aria-hidden="true"></span>' +
        '</button>';
    }).join('');

    return '<section class="strip" aria-labelledby="gal-h">' +
        '<div class="strip__intro">' + galHead() + '</div>' +
        '<div class="strip__stage reveal" role="group" aria-roledescription="carousel" ' +
             'aria-label="' + esc(t.name) + ' photographs">' +
          '<div class="strip__bg" aria-hidden="true">' +
            '<div class="strip__plate is-on"></div>' +
            '<div class="strip__plate"></div>' +
            '<div class="strip__hue"></div>' +
            '<div class="strip__wash"></div>' +
            '<div class="strip__grain"></div>' +
          '</div>' +
          '<div class="strip__copy">' +
            '<h3 class="strip__title"></h3>' +
            '<p class="strip__note">' + esc(t.name) + ' · ' + esc(t.duration) + '</p>' +
            '<ul class="strip__meta"></ul>' +
          '</div>' +
          '<div class="strip__rail"><div class="strip__track">' + cards + '</div></div>' +
          '<div class="strip__rule">' +
            '<span class="strip__i">01</span>' +
            '<span class="strip__of">' + pad2(shots.length) + '</span>' +
            '<span class="strip__bar"><i style="width:' + (100 / shots.length).toFixed(3) + '%"></i></span>' +
          '</div>' +
        '</div>' +
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

  /* The deckle frame displaces a paper backing with this filter. Only
     emitted when a photograph actually uses it. */
  if(shots.some(function(g){ return g.frame === 'deckle'; })){
    var defs = document.createElement('div');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs.setAttribute('aria-hidden', 'true');
    defs.innerHTML =
      '<svg width="0" height="0" focusable="false">' +
        '<filter id="mt-deckle" x="-8%" y="-8%" width="116%" height="116%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.021" numOctaves="4" seed="7" result="n"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="n" scale="11" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter>' +
      '</svg>';
    document.body.appendChild(defs);
  }

  if(galStyle === 'coverflow') wireCover();
  if(galStyle === 'filmstrip') wireStrip();

  /* ---------- coverflow ----------
     One fractional index, `pos`, is the whole state: the card at pos sits
     centred and everything else is derived from its distance. Transforms are
     written straight to the elements inside a single rAF rather than through
     class changes, because sixty style recalculations a second over a deck of
     prints is exactly the cost this page cannot afford. */
  function wireCover(){
    var wrap = root.querySelector('.cover');
    if(!wrap) return;

    var frame = wrap.querySelector('.cover__frame');
    var deck  = wrap.querySelector('.cover__deck');
    var cards = slice(deck.children);
    var dots  = slice(wrap.querySelectorAll('.cover__dot'));
    var cap   = wrap.querySelector('.cover__cap');
    var capN  = wrap.querySelector('.cover__n');
    var capT  = wrap.querySelector('.cover__title');
    var capS  = wrap.querySelector('.cover__sub');
    var n     = cards.length;

    /* Tuned shallower than a jukebox: on paper the neighbours have to keep
       reading as photographs, not as edges. */
    var ROTATE = 42, DEPTH = 0.5, FALLOFF = 0.58, FADE = 0.16, GAP = 0.07;
    /* Below four cards the ring folds onto itself and a card would appear
       twice, so short decks simply run to their ends. */
    var LOOP = n >= 4;

    var pos = 0, target = 0, sel = 0, width = 0, raf = null, drag = null;

    function ring(i, from){
      var off = i - from;
      if(!LOOP) return off;
      off = ((off % n) + n) % n;
      return off > n / 2 ? off - n : off;
    }

    function indexAt(p){ return ((Math.round(p) % n) + n) % n; }

    function paint(){
      if(!width) return;
      var pitch = width * (1 + GAP);
      for(var i = 0; i < n; i++){
        var off  = ring(i, pos);
        var dist = Math.abs(off);
        /* Both the rake and the recession ease off with distance — doubling
           it adds only about half again as much of each — so the second card
           stays readable instead of folding shut. */
        var ramp = Math.pow(dist, FALLOFF);
        var tilt = Math.min(ROTATE * ramp, 76) * (off < 0 ? -1 : off > 0 ? 1 : 0);
        var card = cards[i];
        card.style.transform =
          'translate3d(calc(-50% + ' + (off * pitch).toFixed(1) + 'px),0,' +
          (-DEPTH * width * ramp).toFixed(1) + 'px) rotateY(' + (-tilt).toFixed(2) + 'deg)';
        /* A card is teleported across the ring at exactly half a turn out, so
           it has to have faded by then or the jump is visible. */
        var edge = LOOP ? clamp(n / 2 - dist, 0, 1) : 1;
        card.style.opacity = (Math.max(0, 1 - FADE * dist) * edge).toFixed(3);
        card.style.zIndex  = 100 - Math.round(dist);
      }
    }

    function caption(i){
      var s = shots[i];
      capN.textContent = pad2(i + 1) + ' / ' + pad2(n);
      capT.textContent = s.title || '';
      capS.textContent = s.sub || '';
      /* Drop the class, flush, re-add: without the flush the browser never
         sees the class leave, and the fade plays only once. */
      cap.classList.remove('is-fresh');
      void cap.offsetWidth;
      cap.classList.add('is-fresh');
    }

    function select(i){
      if(i === sel) return;
      cards[sel].classList.remove('is-sel');
      sel = i;
      cards[sel].classList.add('is-sel');
      for(var k = 0; k < n; k++) cards[k].tabIndex = k === i ? 0 : -1;
      for(var d = 0; d < dots.length; d++){
        if(d === i) dots[d].setAttribute('aria-current', 'true');
        else dots[d].removeAttribute('aria-current');
      }
      caption(i);
    }

    function stop(){
      if(raf !== null){ cancelAnimationFrame(raf); raf = null; }
      /* will-change is a standing request for a compositor layer per card;
         held permanently on a deck of photographs it costs real GPU memory on
         the devices that can least spare it. */
      deck.classList.remove('is-moving');
    }

    function settle(to){
      stop();
      target = to;
      select(indexAt(to));
      if(REDUCED.matches){ pos = to; paint(); return; }
      deck.classList.add('is-moving');
      raf = requestAnimationFrame(function step(){
        var left = target - pos;
        if(Math.abs(left) < 0.0006){ pos = target; paint(); stop(); return; }
        pos += left * 0.17;          /* exponential ease-out, no overshoot */
        paint();
        raf = requestAnimationFrame(step);
      });
    }

    function goTo(i){
      /* Take the shorter way round rather than unwinding the whole ring. */
      var to = LOOP ? i + Math.round((target - i) / n) * n : clamp(i, 0, n - 1);
      settle(to);
    }
    function nudge(by){
      var to = Math.round(target) + by;
      settle(LOOP ? to : clamp(to, 0, n - 1));
    }

    /* ---- drag ---- */
    frame.addEventListener('pointerdown', function(e){
      if(e.button) return;
      stop();
      frame.setPointerCapture(e.pointerId);
      target = pos;
      drag = { id: e.pointerId, x: e.clientX, pos: pos, v: 0, t: e.timeStamp, moved: 0 };
      deck.classList.add('is-moving');
    });

    frame.addEventListener('pointermove', function(e){
      if(!drag || drag.id !== e.pointerId) return;
      var pitch = width * (1 + GAP);
      if(!pitch) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      var was = pos;
      pos = drag.pos - dx / pitch;
      if(!LOOP) pos = clamp(pos, 0, n - 1);
      /* cards per second, for the throw */
      drag.v = (pos - was) / Math.max(e.timeStamp - drag.t, 1) * 1000;
      drag.t = e.timeStamp;
      select(indexAt(pos));
      paint();
    });

    var dragged = false;
    function endDrag(e){
      if(!drag || drag.id !== e.pointerId) return;
      var carried = clamp(drag.v * 0.18, -2, 2);   /* let a flick carry, a little */
      var to = Math.round(pos + carried);
      /* pointerup lands before the click, so this is read in time to tell a
         tap on a print from the end of a push. */
      dragged = drag.moved > 6;
      drag = null;
      settle(LOOP ? to : clamp(to, 0, n - 1));
    }
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    /* ---- click, keys, dots ---- */
    deck.addEventListener('click', function(e){
      var card = e.target.closest('.cover__card');
      if(!card || dragged) return;
      var i = +card.dataset.i;
      if(i === sel) openLightbox(i, card);
      else goTo(i);
    });

    wrap.addEventListener('keydown', function(e){
      var k = e.key;
      if(k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      if(k === 'Home') goTo(0);
      else if(k === 'End') goTo(n - 1);
      else nudge(k === 'ArrowLeft' ? -1 : 1);
      cards[sel].focus({ preventScroll: true });
    });

    dots.forEach(function(d){
      d.addEventListener('click', function(){ goTo(+d.dataset.i); });
    });
    wrap.querySelector('.cover__arrow--prev').addEventListener('click', function(){ nudge(-1); });
    wrap.querySelector('.cover__arrow--next').addEventListener('click', function(){ nudge(1); });

    /* ---- measurement ----
       Card width drives pitch, recession and perspective, so it is the only
       thing worth measuring, and only when the box actually changes. */
    function measure(){
      var w = cards[0].offsetWidth;
      if(w === width) return;
      width = w;
      paint();
    }
    cards[0].classList.add('is-sel');
    measure();
    caption(0);
    if(window.ResizeObserver) new ResizeObserver(measure).observe(frame);
    else window.addEventListener('resize', measure, { passive: true });
    /* Fonts and images landing can change the card box after first paint. */
    window.addEventListener('load', measure);
  }

  /* ---------- filmstrip ----------
     The track is moved with one CSS transition on a transform, so a settle
     costs the main thread nothing at all: no spring, no rAF, no per-frame JS.
     The drag turns the transition off, writes the transform directly, and
     hands the settle back to CSS on release. */
  function wireStrip(){
    var stage = root.querySelector('.strip__stage');
    if(!stage) return;

    var track  = stage.querySelector('.strip__track');
    var cards  = slice(track.children);
    var plates = slice(stage.querySelectorAll('.strip__plate'));
    var hue    = stage.querySelector('.strip__hue');
    var titleEl = stage.querySelector('.strip__title');
    var metaEl  = stage.querySelector('.strip__meta');
    var iEl     = stage.querySelector('.strip__i');
    var barEl   = stage.querySelector('.strip__bar i');
    var n = cards.length;

    var at = 0, step = 0, home = 0, plate = 0, drag = null, x = 0, fits = false;

    /* The backdrop is a blurred, hue-graded wash rather than a legible
       photograph, so it is built from the smallest derivative that exists —
       usually the very file the card itself already loaded. A sharper source
       would cost a second download per frame and buy nothing you can see
       through a 24px blur. */
    function plateURL(i){ return MT.bg(t.folder + '/' + shots[i].src, 320); }

    function xFor(i){ return fits ? home : home - i * step; }

    function measure(){
      var cw = cards[0].offsetWidth;
      if(!cw) return;
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      step = cw + gap;
      var full = n * step - gap;
      /* A strip is meant to run off both edges of the stage. Four photographs
         on a wide desktop cannot, and centring the focused frame would leave
         the entire row stranded on one side of it. So when the whole strip
         fits, it is centred and stands still, and the frames open where they
         are; when it does not — a phone, or a longer gallery — the focused
         frame comes to the middle as designed. */
      fits = full <= stage.clientWidth * 0.86;
      home = fits ? (stage.clientWidth - full) / 2
                  : stage.clientWidth / 2 - cw / 2;
      stage.classList.toggle('is-static', fits);
      move(false);
    }

    function move(animate){
      if(!animate) track.classList.add('is-still');
      x = xFor(at);
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      if(!animate){
        void track.offsetWidth;               /* flush, so the class lifts clean */
        track.classList.remove('is-still');
      }
    }

    function copy(i){
      var s = shots[i];
      /* Each line wipes up from behind its own edge. Rebuilding the nodes is
         what restarts the animation — cheaper and more reliable than juggling
         animation-name on the existing ones. */
      titleEl.innerHTML = String(s.title || shotLabel(s, i)).split('\n')
        .map(function(line, k){
          return '<span class="l"><i style="--d:' + (k * 70) + 'ms">' + esc(line) + '</i></span>';
        }).join('');
      metaEl.innerHTML = (s.meta || []).map(function(m, k){
        return '<li style="--d:' + (120 + k * 60) + 'ms">' + esc(m) + '</li>';
      }).join('');
      iEl.textContent = pad2(i + 1);
      barEl.style.transform = 'translate3d(' + (i * 100) + '%,0,0)';
    }

    /* Swap the graded backdrop by crossfading two plates, so the incoming
       bitmap is decoded before anything fades. */
    var grading = 0;
    function grade(i){
      /* Pushing along the strip faster than the plates can load means several
         swaps are in flight at once, all aimed at the same idle plate. Only
         the last one asked for may land; without this the earlier ones fire
         late, in order, and the one that arrives after the swap takes the
         visible plate away with it. */
      var mine = ++grading;
      var url = plateURL(i);
      var nextPlate = plates[1 - plate];

      function show(){
        if(mine !== grading) return;
        if(plates[plate] === nextPlate) return;      /* already swapped */
        nextPlate.classList.add('is-on');
        plates[plate].classList.remove('is-on');
        plate = 1 - plate;
      }

      hue.style.backgroundColor = shots[i].accent || '#8a8a8a';
      if(nextPlate.dataset.url === url){ show(); return; }
      nextPlate.dataset.url = url;
      nextPlate.style.backgroundImage = 'url("' + url + '")';
      var probe = new Image();
      probe.onload = probe.onerror = show;
      probe.src = url;
      if(probe.complete) show();
    }

    function go(i, focusIt){
      i = clamp(i, 0, n - 1);
      if(i !== at){
        cards[at].classList.remove('is-on');
        cards[at].tabIndex = -1;
        at = i;
        cards[at].classList.add('is-on');
        cards[at].tabIndex = 0;
        copy(at);
        grade(at);
      }
      move(true);
      if(focusIt) cards[at].focus({ preventScroll: true });
    }

    /* ---- drag ---- */
    stage.addEventListener('pointerdown', function(e){
      if(fits || e.button || e.target.closest('a')) return;
      stage.setPointerCapture(e.pointerId);
      track.classList.add('is-still');
      drag = { id: e.pointerId, x: e.clientX, from: x, v: 0, t: e.timeStamp, moved: 0 };
    });

    stage.addEventListener('pointermove', function(e){
      if(!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      var was = x;
      /* Rubber-band past the ends rather than stopping dead. */
      x = drag.from + dx;
      var lo = xFor(n - 1), hi = xFor(0);
      if(x > hi) x = hi + (x - hi) * 0.32;
      else if(x < lo) x = lo + (x - lo) * 0.32;
      drag.v = (x - was) / Math.max(e.timeStamp - drag.t, 1) * 1000;
      drag.t = e.timeStamp;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    });

    function endDrag(e){
      if(!drag || drag.id !== e.pointerId) return;
      var moved = drag.moved;
      var thrown = x + clamp(drag.v * 0.12, -step * 1.6, step * 1.6);
      drag = null;
      track.classList.remove('is-still');
      stage.dataset.moved = moved > 6 ? 1 : 0;
      go(Math.round((home - thrown) / step));
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    /* ---- click, keys, wheel ---- */
    track.addEventListener('click', function(e){
      var card = e.target.closest('.strip__card');
      if(!card || +stage.dataset.moved) return;
      var i = +card.dataset.i;
      if(i === at) openLightbox(i, card);
      else go(i);
    });

    stage.addEventListener('keydown', function(e){
      var k = e.key, to = null;
      if(k === 'ArrowLeft') to = at - 1;
      else if(k === 'ArrowRight') to = at + 1;
      else if(k === 'Home') to = 0;
      else if(k === 'End') to = n - 1;
      if(to === null) return;
      e.preventDefault();
      go(to, true);
    });

    /* Horizontal intent only. Swallowing vertical wheel would turn a
       full-bleed strip into a scroll trap on the way down the page. */
    var wheelLock = 0;
    stage.addEventListener('wheel', function(e){
      if(fits) return;
      if(Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      if(e.timeStamp < wheelLock) return;
      e.preventDefault();
      wheelLock = e.timeStamp + 380;
      go(at + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });

    /* ---- start ---- */
    copy(0);
    grade(0);
    measure();
    if(window.ResizeObserver) new ResizeObserver(measure).observe(stage);
    else window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('load', measure);
  }

  /* ---------- ambience ----------
     verdant grows leaf vines down both margins as you scroll, bloom opens
     Brahma Kamal the same way, and nocturne drifts a starfield behind the
     page. All are decorative, all are silenced by prefers-reduced-motion,
     and the margin-hugging ones drop to a single column on narrow screens
     where two would sit under the text. */

  /* How much clear space sits between the viewport edge and the text column.
     The ambience is drawn into that gutter; sizing it by measurement rather
     than a fixed width is what stops the plants being clipped in half by the
     layer's overflow, or straying under the prose on a narrow window. */
  function marginColumn(){
    var probe = root.querySelector('.body-wrap') || root.querySelector('.ledger__inner');
    if(!probe) return 0;
    var r = probe.getBoundingClientRect();
    var pad = parseFloat(window.getComputedStyle(probe).paddingLeft) || 0;
    return Math.max(0, r.left + pad);
  }
  /* Below this the stylesheet hides the second margin column, so building it
     is pure cost: nodes to parse, memory to hold, and style to invalidate. */
  var NARROW = window.matchMedia('(max-width:900px)');
  function ONE_COLUMN(){ return NARROW.matches; }

  function columnWidth(){
    var m = marginColumn();
    if(m < 74) return 0;                       /* nothing worth drawing */
    return Math.max(112, Math.min(210, m - 10));
  }

  /* Plants are grouped into vertical bands and only the bands near the
     viewport have their --grow updated. Without this, every plant on the page
     restyles on every scroll frame: measured at 17.8ms median and 69.7ms peak
     on a 24-core desktop, i.e. already past the 60fps budget before a phone
     ever sees it. Banding keeps the per-frame set to what is actually on
     screen. */
  /* Band height. The live window is a fixed span of page, so shorter bands
     track it more closely: the same window then covers fewer parked plants,
     and a plant only costs a frame if it is genuinely near the viewport. */
  var BAND = 450;

  function bandWrap(items, height, bandPx){
    var out = [], n = Math.max(1, Math.ceil(height / bandPx)), i;
    for(i = 0; i < n; i++){
      var y0 = i * bandPx, y1 = y0 + bandPx, inside = [];
      for(var j = 0; j < items.length; j++){
        if(items[j].y >= y0 && items[j].y < y1) inside.push(items[j].m);
      }
      if(inside.length){
        out.push('<g class="amb-band" data-y0="' + y0 + '" data-y1="' + y1 + '">' +
                 inside.join('') + '</g>');
      }
    }
    return out.join('');
  }

  /* Page metrics for every scroll-driven effect here. Cached rather than
     measured per frame: a getBoundingClientRect() inside a scroll handler
     forces style and layout, and once another handler has written to the DOM
     that same frame it forces the whole pipeline to run twice. */
  var pageTop = 0, pageSpan = 1;
  function remeasure(){
    var r = root.getBoundingClientRect();
    pageTop  = r.top + window.pageYOffset;
    pageSpan = Math.max(1, r.height - window.innerHeight);
  }
  /* lead slightly, so a leaf has opened by the time you reach it */
  function growth(y){ return clamp(((y - pageTop) / pageSpan) * 1.04 + 0.05, 0, 1); }

  function bandDriver(layer, stemSelector){
    var bands = [], stems = null, lastG = '';

    function collect(){
      bands = [];
      lastG = '';
      var els = layer.querySelectorAll('.amb-band');
      for(var i = 0; i < els.length; i++){
        bands.push({ el: els[i], y0: +els[i].dataset.y0, y1: +els[i].dataset.y1, state: '' });
      }
      stems = stemSelector ? layer.querySelectorAll(stemSelector) : null;
    }

    /* Bands outside the live window are parked at 0 or 1 once and then left
       alone, so a frame only ever writes to the two or three bands actually
       near the viewport — not to every plant on a ten-thousand-pixel page. */
    function update(y){
      var g = growth(y).toFixed(4);
      var top = y - pageTop;
      /* Growth saturates before the foot of the page, so the window has to be
         part of the key — otherwise the last bands never go live and the
         plants down there never open. */
      var key = g + '|' + Math.round(top / 200);
      if(key === lastG) return;
      lastG = key;
      /* The live window is the viewport plus half of one either side. Parking
         the rest is not an approximation: a plant's --at is its own position
         down the page, so everything above the window is past its opening and
         belongs at 1, and everything below has not reached its opening and
         belongs at 0. */
      var vh = window.innerHeight, lo = top - vh * 0.5, hi = top + vh * 1.5;
      for(var i = 0; i < bands.length; i++){
        var b = bands[i];
        if(b.y1 >= lo && b.y0 <= hi){
          b.el.style.setProperty('--grow', g);
          b.state = 'live';
        } else if(b.y1 < lo){
          if(b.state !== 'done'){ b.el.style.setProperty('--grow', '1'); b.state = 'done'; }
        } else if(b.state !== 'wait'){
          b.el.style.setProperty('--grow', '0'); b.state = 'wait';
        }
      }
      /* One page-spanning stem cannot be banded, so it tracks progress alone. */
      if(stems) for(var k = 0; k < stems.length; k++) stems[k].style.setProperty('--stem', g);
    }

    function full(){
      lastG = '';
      for(var i = 0; i < bands.length; i++){
        bands[i].el.style.setProperty('--grow', '1');
        bands[i].state = 'done';
      }
      if(stems) for(var k = 0; k < stems.length; k++) stems[k].style.setProperty('--stem', '1');
    }

    return { collect: collect, update: update, full: full };
  }

  /* Shared by both margin gardens: rebuild on a real size change, drive from
     the one page-wide scroll bus, and hold everything open when the reader
     has asked for no motion. */
  function ambience(layer, build, stemSelector){
    var drive = bandDriver(layer, stemSelector);
    var lastH = 0, lastW = -1, lastOne = null;

    function rebuild(force){
      var h = root.offsetHeight, W = columnWidth(), one = ONE_COLUMN();
      if(!h) return;
      /* Ignore trivial reflows — rebuilding is thousands of nodes. */
      if(!force && Math.abs(h - lastH) < 40 && W === lastW && one === lastOne) return;
      lastH = h; lastW = W; lastOne = one;
      layer.innerHTML = W ? build(h, W) : '';
      drive.collect();
      remeasure();
      /* Drive the fresh nodes now rather than waiting for a frame. A rebuild
         replaces every band element, and an undriven band holds --grow at 0 —
         which is an empty margin, not a subtle difference. */
      if(REDUCED.matches) drive.full();
      else drive.update(window.pageYOffset);
    }

    rebuild(true);
    if(!REDUCED.matches) MT.onScroll(drive.update);

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(rebuild, 180);
    }, { passive: true });

    /* Images landing changes the page height, so redraw once they settle. */
    window.addEventListener('load', function(){ rebuild(); });
  }

  if(theme === 'verdant') buildVines();
  if(theme === 'bloom') buildBlooms();
  if(theme === 'nocturne') buildStars();

  /* --- verdant --- */
  function buildVines(){
    var layer = document.createElement('div');
    layer.className = 'vines';
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);

    /* Three lanceolate blades rather than one almond: asymmetric, drawn to a
       point, each on a short petiole with a midrib and side veins. The whole
       leaf animates as one group, so the extra detail costs no extra work
       when --grow changes. */
    var BLADES = [
      { blade:'M4,0 C11,-11 25,-11 35,-1 C25,8 11,9 4,0 Z',
        vein: 'M0,1 C2,0 3,0 4,0 M4,0 C14,-2 26,-2 35,-1 ' +
              'M10,-4 C13,-6 16,-7 19,-7 M16,-2 C19,-4 23,-5 26,-5 ' +
              'M11,3 C14,5 17,6 20,6 M18,2 C21,4 24,5 27,5' },
      { blade:'M4,1 C10,-9 22,-13 32,-4 C24,6 11,9 4,1 Z',
        vein: 'M0,2 C2,1 3,1 4,1 M4,1 C13,-3 24,-4 32,-4 ' +
              'M10,-3 C13,-6 16,-8 19,-9 M17,-3 C20,-5 23,-7 25,-8 ' +
              'M11,3 C14,4 17,5 19,5' },
      { blade:'M4,0 C9,-8 19,-10 27,-2 C19,7 10,8 4,0 Z',
        vein: 'M0,1 C2,0 3,0 4,0 M4,0 C11,-2 20,-2 27,-2 ' +
              'M9,-3 C12,-5 14,-6 17,-6 M10,3 C13,4 15,5 18,5' }
    ];

    function leaf(x, y, angle, at, alt, variant, scale){
      var b = BLADES[variant % BLADES.length];
      /* Placement lives on the outer group. A CSS transform REPLACES an SVG
         transform attribute, so anything the stylesheet animates has to sit
         on its own element or every leaf collapses onto the origin. */
      return '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) +
               ') rotate(' + angle.toFixed(1) + ') scale(' + scale.toFixed(2) + ')">' +
               '<g class="vine-leaf' + (alt ? ' is-alt' : '') + '" ' +
                 'style="--at:' + at.toFixed(4) + '">' +
                 '<path class="leaf-blade" d="' + b.blade + '"/>' +
                 '<path class="leaf-vein" d="' + b.vein + '"/>' +
               '</g>' +
             '</g>';
    }

    /* A sinuous stem with leaves alternating off each bend. Geometry is
       generated from the real page height so the waves keep their
       proportions instead of being stretched by preserveAspectRatio. */
    function vine(height, side, W){
      /* Centre the stem in the measured gutter so leaves swing out on both
         sides without touching either the viewport edge or the prose. */
      var baseX = W / 2;
      var amp = Math.min(26, W * 0.18);
      /* Leaves must fit the gutter too: the SVG does not clip, so on a narrow
         window full-size blades reach past the column and into the prose. */
      var lf = Math.min(1, W / 160);
      /* Longer bends on a weak device: fewer waves, fewer leaves, same plant. */
      var seg = LITE ? 360 : 268;
      var n = Math.max(3, Math.ceil(height / seg));
      /* Cap below 1 so the final leaves reach full opacity by the page end:
         the opacity ramp is (grow - at) * 12. */
      var at = function(y){ return Math.min(0.9, y / height); };
      var inward = side === 'left' ? 1 : -1;
      var d = 'M ' + baseX + ' 0';
      var parts = [];

      for(var i = 0; i < n; i++){
        var y0 = i * seg, y1 = y0 + seg;
        var dir = (i % 2 ? -1 : 1) * inward;
        var cx = baseX + amp * dir;
        d += ' C ' + cx + ' ' + (y0 + seg * 0.34) +
             ', ' + cx + ' ' + (y0 + seg * 0.66) +
             ', ' + baseX + ' ' + y1;

        /* Leaves off the outside of each bend. Skipping some keeps it from
           reading as a repeating pattern, and keeps the node count down:
           every leaf in a live band restyles when --grow changes. */
        var ly1 = y0 + seg * 0.30, ly2 = y0 + seg * 0.72;
        parts.push({ y: ly1, m: leaf(cx - 2 * dir, ly1, dir > 0 ? -32 : 212, at(ly1),
                        i % 2 === 0, i, (0.95 + (i % 3) * 0.12) * lf) });
        if(i % 3 !== 2 && !LITE){
          parts.push({ y: ly2, m: leaf(baseX, ly2, dir > 0 ? 150 : 30, at(ly2),
                          i % 3 === 0, i + 1, (0.82 + (i % 2) * 0.16) * lf) });
        }
      }

      return '<svg class="v-' + side + '" width="' + W + '" height="' + height + '" ' +
               'viewBox="0 0 ' + W + ' ' + height + '" fill="none" aria-hidden="true">' +
               '<path class="vine-stem" pathLength="1" d="' + d + '"/>' +
               bandWrap(parts, height, BAND) +
             '</svg>';
    }

    ambience(layer, function(h, W){
      return vine(h, 'left', W) + (ONE_COLUMN() ? '' : vine(h, 'right', W));
    }, '.vine-stem');
  }

  /* --- bloom (Roopkund) ---
     The planting is taken from the trek's own gallery photograph, which shows
     Brahma Kamal standing over crimson Bistorta spikes, drifts of small white
     Anaphalis daisies, and pale ferns. Those four make up the garden.

     Node budget matters: everything driven by --grow restyles on every scroll
     frame. So only Brahma Kamal, the feature flower, animates petal by petal;
     the companions open as a single group each. Nesting is
     placement (static attribute) > sway (CSS animation) > open (CSS transform),
     because a CSS transform replaces an SVG transform attribute rather than
     composing with it. */
  function buildBlooms(){
    var layer = document.createElement('div');
    layer.className = 'blooms';
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);

    var seed = 90210;
    function rnd(){
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    function pick(a){ return a[Math.floor(rnd() * a.length)]; }

    /* ---- shapes ---- */

    var PETAL = 'M0,0 C -6.5,-9 -6.5,-22 0,-31 C 6.5,-22 6.5,-9 0,0 Z';
    var STRAP = 'M0,0 C7,-6 20,-8 30,-2 C20,8 7,7 0,0 Z';   /* broad rosette leaf */
    var LANCE = 'M0,0 C5,-4 14,-6 21,-1 C14,5 5,5 0,0 Z';   /* narrow leaf */

    /* Brahma Kamal: hooded cream bracts round a paler inner cup. */
    function brahmaKamal(at){
      var outer = 6, inner = 4, g = [], i, ang;
      var lean = (rnd() - 0.5) * 12;
      var len = 76 + rnd() * 26;

      g.push('<path class="bloom-stem" pathLength="1" style="--at:' + at.toFixed(4) + '" ' +
             'd="M0,0 C ' + (-lean) + ',' + (-len * 0.38) + ' ' + (lean * 1.4) + ',' +
             (-len * 0.68) + ' ' + (lean * 0.4) + ',' + (-len) + '"/>');

      /* strap leaves at the base, as in the photograph */
      g.push('<g transform="translate(-2,-6) rotate(-18)"><path class="bloom-leaf" ' +
             'style="--at:' + (at + 0.010).toFixed(4) + '" d="' + STRAP + '"/></g>');
      g.push('<g transform="translate(2,-11) rotate(196)"><path class="bloom-leaf" ' +
             'style="--at:' + (at + 0.018).toFixed(4) + '" d="' + STRAP + '"/></g>');

      var head = [];
      for(i = 0; i < outer; i++){
        ang = (360 / outer) * i + rnd() * 6;
        head.push('<g transform="rotate(' + ang.toFixed(1) + ')"><path class="bloom-petal" ' +
          'style="--at:' + at.toFixed(4) + ';--d:' + (0.03 + i * 0.006).toFixed(4) +
          '" d="' + PETAL + '"/></g>');
      }
      for(i = 0; i < inner; i++){
        ang = (360 / inner) * i + 30;
        head.push('<g transform="rotate(' + ang.toFixed(1) + ') scale(.6)">' +
          '<path class="bloom-petal is-inner" style="--at:' + at.toFixed(4) +
          ';--d:' + (0.055 + i * 0.005).toFixed(4) + '" d="' + PETAL + '"/></g>');
      }
      head.push('<circle class="bloom-core" style="--at:' + at.toFixed(4) + '" r="4.4"/>');

      g.push('<g transform="translate(' + (lean * 0.4).toFixed(1) + ',' + (-len).toFixed(1) + ')">' +
             head.join('') + '</g>');
      return g.join('');
    }

    /* Bistorta: a slim crimson floret spike. Opens as one group. */
    function bistorta(at){
      var len = 46 + rnd() * 26;
      var top = -len - (16 + rnd() * 10);
      var lean = (rnd() - 0.5) * 9;
      var g = '<path class="bi-stem" d="M0,0 C ' + (-lean) + ',' + (-len * 0.4) +
              ' ' + lean + ',' + (-len * 0.75) + ' ' + (lean * 0.5) + ',' + (-len) + '"/>';
      g += '<g transform="translate(' + (lean * 0.5).toFixed(1) + ',' + (-len).toFixed(1) + ')">' +
             '<path class="bi-spike" d="M-3.1,0 C -4,' + ((top + len) * 0.45).toFixed(1) +
             ' -3.3,' + ((top + len) * 0.85).toFixed(1) + ' 0,' + (top + len).toFixed(1) +
             ' C 3.3,' + ((top + len) * 0.85).toFixed(1) + ' 4,' + ((top + len) * 0.45).toFixed(1) +
             ' 3.1,0 Z"/>';
      /* a few florets so the spike is not a flat silhouette */
      for(var k = 0; k < 5; k++){
        var fy = ((top + len) / 5) * (k + 0.5);
        g += '<ellipse class="bi-floret" cx="' + ((k % 2 ? 1 : -1) * 1.1).toFixed(1) +
             '" cy="' + fy.toFixed(1) + '" rx="1.5" ry="1.1"/>';
      }
      g += '</g>';
      g += '<g transform="translate(0,-10) rotate(-24)"><path class="bi-leaf" d="' + LANCE + '"/></g>';
      g += '<g transform="translate(1,-20) rotate(200)"><path class="bi-leaf" d="' + LANCE + '"/></g>';
      return '<g class="bloom-open" style="--at:' + at.toFixed(4) + '">' + g + '</g>';
    }

    /* Anaphalis: a low drift of tiny white daisies over grey-green leaves. */
    function anaphalis(at){
      var n = 4 + Math.floor(rnd() * 3), g = '', i;
      for(i = 0; i < 3; i++){
        g += '<g transform="translate(' + ((rnd() - 0.5) * 16).toFixed(1) + ',-2) rotate(' +
             (-60 + rnd() * 120).toFixed(0) + ') scale(.62)"><path class="an-leaf" d="' +
             LANCE + '"/></g>';
      }
      for(i = 0; i < n; i++){
        var fx = (rnd() - 0.5) * 26;
        var fy = -6 - rnd() * 18;
        var r = 2 + rnd() * 0.9;
        g += '<circle class="an-ray" cx="' + fx.toFixed(1) + '" cy="' + fy.toFixed(1) +
             '" r="' + r.toFixed(1) + '"/>' +
             '<circle class="an-eye" cx="' + fx.toFixed(1) + '" cy="' + fy.toFixed(1) +
             '" r="' + (r * 0.42).toFixed(1) + '"/>';
      }
      return '<g class="bloom-open" style="--at:' + at.toFixed(4) + '">' + g + '</g>';
    }

    /* Fern: an arching rachis with pinnae stepping down its length. */
    function fern(at, flip){
      var len = 54 + rnd() * 26;
      var dir = flip ? -1 : 1;
      var g = '<path class="fn-rachis" d="M0,0 C ' + (10 * dir) + ',' + (-len * 0.45) +
              ' ' + (16 * dir) + ',' + (-len * 0.78) + ' ' + (13 * dir) + ',' + (-len) + '"/>';
      var n = 9;
      for(var i = 0; i < n; i++){
        var p = (i + 1) / (n + 1);
        var px = (10 * dir) * p * 1.25;
        var py = -len * p;
        var s = (1 - p * 0.62) * 0.5;
        g += '<g transform="translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ') rotate(' +
             ((flip ? 150 : 30) - p * 26).toFixed(0) + ') scale(' + s.toFixed(2) + ')">' +
             '<path class="fn-pinna" d="' + LANCE + '"/></g>';
        g += '<g transform="translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ') rotate(' +
             ((flip ? 210 : -30) + p * 26).toFixed(0) + ') scale(' + s.toFixed(2) + ')">' +
             '<path class="fn-pinna" d="' + LANCE + '"/></g>';
      }
      return '<g class="bloom-open" style="--at:' + at.toFixed(4) + '">' + g + '</g>';
    }

    /* ---- placement ---- */

    /* Static transform on the outer group, sway on the middle one, so neither
       fights the CSS that animates opening. `back` pushes an item visually
       further away: smaller, paler, nearer the outer edge. */
    function place(inner, x, y, scale, back){
      /* Only some plants sway. The animation runs every frame whether or not
         you are scrolling, so swaying all hundred of them would burn the main
         thread for no visual gain — a meadow where a few stems move and the
         rest are still reads as natural anyway. */
      var sways = !LITE && rnd() < (back ? 0.18 : 0.45);
      return { y: y, m:
        '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) +
          ') scale(' + scale.toFixed(3) + ')">' +
          '<g class="bloom-rank' + (back ? ' is-back' : '') +
            (sways ? ' bloom-sway' : '') +
            '" style="--sway:' + (7 + rnd() * 5).toFixed(1) + 's;--sway-delay:-' +
            (rnd() * 7).toFixed(1) + 's">' + inner + '</g>' +
        '</g>' };
    }

    function garden(height, side, W){
      var flip = side === 'right';
      var mid = W / 2;
      var parts = [];

      /* Organic rhythm rather than a fixed pitch: scenes of mixed species with
         varied gaps, so the column reads as a meadow edge and not a row. */
      var y = height * 0.06;
      var guard = 0;
      /* Wider gaps between scenes on a weak device: the same meadow, thinned,
         rather than a different design. */
      var pitch = 1 / DENSITY;
      while(y < height * 0.99 && guard++ < 80){
        var at = Math.min(0.8, (y / height) * 0.8);
        var scene = pick(['feature', 'feature', 'spikes', 'drift', 'ferny']);
        var inward = flip ? -1 : 1;

        if(scene === 'feature'){
          /* a Brahma Kamal with companions gathered at its foot */
          parts.push(place(brahmaKamal(at), mid + inward * (rnd() * 8),
                           y, 0.86 + rnd() * 0.4, false));
          parts.push(place(anaphalis(at + 0.012), mid - inward * (16 + rnd() * 12),
                           y + 4 + rnd() * 8, 0.8 + rnd() * 0.3, true));
          if(rnd() < 0.6){
            parts.push(place(bistorta(at + 0.008), mid + inward * (20 + rnd() * 12),
                             y - 2, 0.7 + rnd() * 0.25, true));
          }
          y += (300 + rnd() * 120) * pitch;

        } else if(scene === 'spikes'){
          var k = 2 + Math.floor(rnd() * 2);
          for(var i = 0; i < k; i++){
            parts.push(place(bistorta(at + i * 0.006),
                             mid + (rnd() - 0.5) * (W * 0.42),
                             y + i * (8 + rnd() * 10),
                             0.78 + rnd() * 0.4, i > 0));
          }
          parts.push(place(anaphalis(at + 0.014), mid + (rnd() - 0.5) * (W * 0.4),
                           y + 14 + rnd() * 10, 0.75 + rnd() * 0.3, true));
          y += (205 + rnd() * 95) * pitch;

        } else if(scene === 'drift'){
          var m = 2 + Math.floor(rnd() * 2);
          for(var j = 0; j < m; j++){
            parts.push(place(anaphalis(at + j * 0.005),
                             mid + (rnd() - 0.5) * (W * 0.5),
                             y + j * (10 + rnd() * 12),
                             0.72 + rnd() * 0.4, j % 2 === 1));
          }
          y += (195 + rnd() * 85) * pitch;

        } else {
          parts.push(place(fern(at, flip), mid + inward * (rnd() * 14),
                           y, 0.8 + rnd() * 0.4, false));
          if(rnd() < 0.7){
            parts.push(place(anaphalis(at + 0.01), mid - inward * (14 + rnd() * 14),
                             y + 6, 0.7 + rnd() * 0.3, true));
          }
          y += (215 + rnd() * 95) * pitch;
        }
      }

      return '<svg class="b-' + side + '" width="' + W + '" height="' + height + '" ' +
               'viewBox="0 0 ' + W + ' ' + height + '" fill="none" aria-hidden="true">' +
               bandWrap(parts, height, BAND) +
             '</svg>';
    }

    ambience(layer, function(h, W){
      seed = 90210;                       /* same garden after a resize */
      return garden(h, 'left', W) + (ONE_COLUMN() ? '' : garden(h, 'right', W));
    }, null);
  }

  /* --- nocturne --- */
  function buildStars(){
    var sky = document.createElement('div');
    sky.className = 'sky';
    sky.setAttribute('aria-hidden', 'true');

    /* Deterministic placement: the same trek looks the same on every visit. */
    var seed = 1337;
    function rnd(){
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    var count = LITE ? 30 : (window.innerWidth < 700 ? 46 : 78);
    /* An element animating its own opacity gets its own compositor layer.
       Eighty of those is fine on a laptop and a real cost on a cheap phone,
       so the lighter build twinkles in three groups instead of individually:
       three layers, one sky, and at these sizes you cannot tell. */
    var groups = LITE ? ['', '', ''] : null;
    var html = '';
    for(var i = 0; i < count; i++){
      var size = rnd() < 0.86 ? (1 + rnd() * 1.3) : (2 + rnd() * 1.6);
      var warm = rnd() < 0.22;
      var star = '<span class="sky__star' + (warm ? ' is-warm' : '') + '" style="' +
        'left:' + (rnd() * 100).toFixed(2) + '%;' +
        'top:' + (rnd() * 100).toFixed(2) + '%;' +
        'width:' + size.toFixed(2) + 'px;height:' + size.toFixed(2) + 'px;' +
        '--dur:' + (2.8 + rnd() * 4.5).toFixed(2) + 's;' +
        '--delay:' + (rnd() * 6).toFixed(2) + 's;' +
        '--min:' + (0.06 + rnd() * 0.16).toFixed(2) + ';' +
        '--max:' + (0.5 + rnd() * 0.5).toFixed(2) + ';' +
        '"></span>';
      if(groups) groups[i % 3] += star;
      else html += star;
    }
    if(groups){
      html = groups.map(function(g, k){
        return '<span class="sky__group" style="--dur:' + (5.5 + k * 1.9).toFixed(1) +
               's;--delay:-' + (k * 2.3).toFixed(1) + 's">' + g + '</span>';
      }).join('');
    }
    html += '<span class="sky__shoot" style="left:76%;top:12%;--delay:7s"></span>';
    if(!LITE) html += '<span class="sky__shoot" style="left:38%;top:5%;--delay:19s"></span>';

    sky.innerHTML = html;
    document.body.appendChild(sky);
  }

  /* ---------- lightbox ----------
     Every gallery style hands over the same way: openLightbox(index, from).
     `from` is where focus returns when the overlay closes. */
  function openLightbox(){}

  if(shots.length) buildLightbox();

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
      stage.innerHTML = MT.img(t.folder + '/' + shots[at].src, {
        alt: t.name + ', photo ' + (at + 1), sizes: '100vw', loading: 'eager'
      });
      count.textContent = (at + 1) + ' / ' + shots.length;
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
    function go(d){ at = (at + d + shots.length) % shots.length; render(); }
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
    /* The framed grid opens on its own buttons; the two carousels call
       openLightbox() themselves, because there a click has to mean "centre
       this card" until the card is already centred. */
    openLightbox = open;
    if(galStyle === 'frames'){
      root.querySelectorAll('[data-lb]').forEach(function(btn){
        btn.addEventListener('click', function(){ open(+btn.dataset.lb, btn); });
      });
    }
  }
})();
