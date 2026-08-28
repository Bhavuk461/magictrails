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

  /* Both carousels pause while the lightbox is up and pick themselves back up
     when it closes — which is the whole point of opening a frame full size.
     Declared here, above everything that registers with it: the carousels are
     wired long before the lightbox section runs. */
  var lightboxWatchers = [];
  function onLightbox(fn){ lightboxWatchers.push(fn); }
  function tellLightbox(open){
    for(var i = 0; i < lightboxWatchers.length; i++) lightboxWatchers[i](open);
  }

  /* Read a duration custom property in milliseconds, so a dwell can live in
     the stylesheet next to the bar that draws it and never drift from it. */
  function msVar(el, name, fallback){
    var v = String(getComputedStyle(el).getPropertyValue(name)).trim();
    var f = parseFloat(v);
    if(!f) return fallback;
    return /ms$/.test(v) ? f : f * 1000;
  }
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
              /* The print is cropped from a wider source, so the file has to be
                 wider than the box it lands in or the browser scales it up —
                 which is what made these look soft. */
              sizes: '(max-width:620px) 92vw, 720px',
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
        '<div class="cover__intro">' + galHead() + '</div>' +
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
          '<div class="cover__dwell" aria-hidden="true"><i></i></div>' +
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
            sizes: '(max-width:700px) 62vw, 350px',
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
            '<span class="strip__bar"><i style="width:' + (100 / shots.length).toFixed(3) + '%">' +
              '<b class="strip__dwell"></b></i></span>' +
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

    var CAP_OUT = 200, capSeq = 0;

    function writeCap(i){
      var s = shots[i];
      capN.textContent = pad2(i + 1) + ' / ' + pad2(n);
      capT.textContent = s.title || '';
      capS.textContent = s.sub || '';
      cap.classList.remove('is-out');
      /* Drop the class, flush, re-add: without the flush the browser never
         sees the class leave, and the fade plays only once. */
      cap.classList.remove('is-fresh');
      void cap.offsetWidth;
      cap.classList.add('is-fresh');
    }

    /* Replaced wholesale, so with nothing to leave on it hard-cuts while the
       deck is still turning. It fades out, swaps behind the fade, and rises
       back in. A drag is the exception — there the caption should keep up with
       the card under your finger, not lag it. */
    function caption(i, now){
      var mine = ++capSeq;
      if(now || REDUCED.matches){ writeCap(i); return; }
      cap.classList.add('is-out');
      setTimeout(function(){ if(mine === capSeq) writeCap(i); }, CAP_OUT);
    }

    function select(i, now){
      if(i === sel) return;
      cards[sel].classList.remove('is-sel');
      sel = i;
      cards[sel].classList.add('is-sel');
      for(var k = 0; k < n; k++) cards[k].tabIndex = k === i ? 0 : -1;
      for(var d = 0; d < dots.length; d++){
        if(d === i) dots[d].setAttribute('aria-current', 'true');
        else dots[d].removeAttribute('aria-current');
      }
      caption(i, now);
    }

    function stop(){
      if(raf !== null){ cancelAnimationFrame(raf); raf = null; }
      /* will-change is a standing request for a compositor layer per card;
         held permanently on a deck of photographs it costs real GPU memory on
         the devices that can least spare it. */
      deck.classList.remove('is-moving');
    }

    /* An exponential decay is fastest on its first frame and crawls at the
       end — the same shape as the expo easing that made the filmstrip read as
       a snap. A fixed tween on a curve that eases in as well as out lets the
       deck gather itself, travel, and settle. */
    var MOVE = 820;
    function ease(p){
      return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    }

    function settle(to){
      stop();
      target = to;
      select(indexAt(to));
      redwell();
      arm();
      if(REDUCED.matches){ pos = to; paint(); return; }
      deck.classList.add('is-moving');
      var from = pos, span = to - from, t0 = 0;
      raf = requestAnimationFrame(function step(now){
        if(!t0) t0 = now;
        var p = Math.min(1, (now - t0) / MOVE);
        pos = from + span * ease(p);
        paint();
        if(p < 1){ raf = requestAnimationFrame(step); }
        else { pos = to; paint(); stop(); }
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

    /* ---- autoplay ----
       Same terms as the filmstrip: the deck turns on its own, and anything
       suggesting the reader is working it holds. Hover is scoped to the deck
       and released once the pointer has been still, because a resting cursor
       is not engagement; focus holds only when it is keyboard focus, because
       clicking a print focuses it and nothing ever takes that focus back. */
    var dwellEl = wrap.querySelector('.cover__dwell i');
    var DWELL = msVar(wrap, '--dwell', 3400), RESUME = 9000, IDLE = 3000;
    var timer = null, resumeTimer = null, idleTimer = null;
    var holds = { hover: false, lightbox: false, drag: false, away: true, hidden: false };

    function held(){
      for(var k in holds) if(holds[k]) return true;
      return false;
    }

    function arm(){
      if(timer){ clearTimeout(timer); timer = null; }
      var run = !held() && !REDUCED.matches && n > 1;
      wrap.classList.toggle('is-playing', run);
      if(run) timer = setTimeout(function(){ timer = null; nudge(1); }, DWELL);
    }

    function hold(key, on){
      if(holds[key] === on) return;
      holds[key] = on;
      arm();
    }

    /* An explicit choice hands the deck over for a while rather than ending
       the walk, so it neither fights the reader nor dies at the first click. */
    function handOver(){
      hold('drag', true);
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function(){ hold('drag', false); }, RESUME);
    }

    function redwell(){
      if(!dwellEl) return;
      dwellEl.style.animation = 'none';
      void dwellEl.offsetWidth;
      dwellEl.style.animation = '';
    }

    deck.addEventListener('pointermove', function(){
      hold('hover', true);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function(){ hold('hover', false); }, IDLE);
    });
    deck.addEventListener('pointerleave', function(){
      clearTimeout(idleTimer);
      hold('hover', false);
    });
    onLightbox(function(open){ hold('lightbox', open); });
    document.addEventListener('visibilitychange', function(){
      hold('hidden', document.hidden);
    });
    if(window.IntersectionObserver){
      new IntersectionObserver(function(entries){
        hold('away', !entries[entries.length - 1].isIntersecting);
      }, { threshold: 0.1 }).observe(wrap);
    } else {
      holds.away = false;
    }

    /* ---- drag ---- */
    /* No setPointerCapture. Capturing retargets the compatibility mouse
       events too, so the click that follows a tap is dispatched at the frame
       instead of the print — and a handler delegated on the deck never hears
       it. Tracking the drag on the window costs nothing and leaves the click
       where it belongs. */
    /* A press is not yet a drag. Nothing is taken over until the pointer has
       actually travelled, because a tap that stopped the deck and re-settled it
       would move the selection off the very print being tapped — which is what
       made a click land as "centre this" instead of "open this". */
    frame.addEventListener('pointerdown', function(e){
      if(e.button) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pos: pos, v: 0,
               t: e.timeStamp, moved: 0, started: false };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });

    function onMove(e){
      if(!drag || drag.id !== e.pointerId) return;
      var pitch = width * (1 + GAP);
      if(!pitch) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      if(!drag.started){
        /* A gesture that is mostly vertical belongs to the page, not the deck.
           Without this a scroll that drifts sideways grabs the carousel. */
        if(Math.abs(dx) <= 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
        /* Take over from wherever the tween had got to, not from where it began. */
        drag.started = true;
        stop();
        drag.pos = pos;
        drag.x = e.clientX;
        target = pos;
        deck.classList.add('is-moving');
        return;
      }
      var was = pos;
      pos = drag.pos - dx / pitch;
      if(!LOOP) pos = clamp(pos, 0, n - 1);
      /* cards per second, for the throw */
      drag.v = (pos - was) / Math.max(e.timeStamp - drag.t, 1) * 1000;
      drag.t = e.timeStamp;
      select(indexAt(pos), true);
      paint();
    }

    var dragged = false;
    function endDrag(e){
      if(!drag || drag.id !== e.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      /* pointerup lands before the click, so this is read in time to tell a
         tap on a print from the end of a push. */
      dragged = drag.started;
      var carried = clamp(drag.v * 0.18, -2, 2);   /* let a flick carry, a little */
      var to = Math.round(pos + carried);
      drag = null;
      if(!dragged) return;              /* a tap: leave the deck alone */
      handOver();
      settle(LOOP ? to : clamp(to, 0, n - 1));
    }
    /* ---- click, keys, dots ---- */
    deck.addEventListener('click', function(e){
      var card = e.target.closest('.cover__card');
      if(!card || dragged) return;
      var i = +card.dataset.i;
      if(i === sel){ openLightbox(i, card); return; }
      goTo(i);
    });

    wrap.addEventListener('keydown', function(e){
      var k = e.key;
      if(k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      handOver();
      if(k === 'Home') goTo(0);
      else if(k === 'End') goTo(n - 1);
      else nudge(k === 'ArrowLeft' ? -1 : 1);
      cards[sel].focus({ preventScroll: true });
    });

    dots.forEach(function(d){
      d.addEventListener('click', function(){ handOver(); goTo(+d.dataset.i); });
    });
    wrap.querySelector('.cover__arrow--prev').addEventListener('click', function(){ handOver(); nudge(-1); });
    wrap.querySelector('.cover__arrow--next').addEventListener('click', function(){ handOver(); nudge(1); });

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
    caption(0, true);
    if(window.ResizeObserver) new ResizeObserver(measure).observe(frame);
    else window.addEventListener('resize', measure, { passive: true });
    /* Fonts and images landing can change the card box after first paint. */
    window.addEventListener('load', measure);
    arm();
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
    var copyEl  = stage.querySelector('.strip__copy');
    var titleEl = stage.querySelector('.strip__title');
    var metaEl  = stage.querySelector('.strip__meta');
    var iEl     = stage.querySelector('.strip__i');
    var barEl   = stage.querySelector('.strip__bar i');
    var n = cards.length;

    var at = 0, step = 0, home = 0, plate = 0, drag = null, x = 0;

    /* The backdrop is a blurred, hue-graded wash rather than a legible
       photograph, so it is built from the smallest derivative that exists —
       usually the very file the card itself already loaded. A sharper source
       would cost a second download per frame and buy nothing you can see
       through a 24px blur. */
    function plateURL(i){ return MT.bg(t.folder + '/' + shots[i].src, 320); }

    function xFor(i){ return home - i * step; }

    function measure(){
      var cw = cards[0].offsetWidth;
      if(!cw) return;
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      step = cw + gap;
      /* The focused frame always comes to the middle of the stage; the strip
         slides under it. With frames this size the row reaches the edges on
         its own, so there is nothing to be gained by ever holding it still. */
      home = stage.clientWidth / 2 - cw / 2;
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

    function writeCopy(i){
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
      copyEl.classList.remove('is-out');
    }

    /* The headline is replaced wholesale, so with nothing to leave on it
       hard-cuts while everything around it is still moving — which was most
       of what read as abrupt. It fades out first, swaps behind the fade, and
       wipes back in a beat after the frame it belongs to. */
    var COPY_OUT = 200, copySeq = 0;

    function copy(i, now){
      /* Pushing along faster than the fade puts several swaps in flight;
         only the last one asked for may write. */
      var mine = ++copySeq;
      /* The counter and the rail are not part of the fade — they track the
         strip's position, so they move with it. */
      iEl.textContent = pad2(i + 1);
      barEl.style.transform = 'translate3d(' + (i * 100) + '%,0,0)';
      if(now || REDUCED.matches){ writeCopy(i); return; }
      copyEl.classList.add('is-out');
      setTimeout(function(){ if(mine === copySeq) writeCopy(i); }, COPY_OUT);
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

    /* ---- autoplay ----
       The strip walks itself so the section has life without being touched.
       Anything that suggests the reader is engaged holds it: the pointer over
       the stage, keyboard focus inside it, a drag in progress, the section
       scrolled out of view, or the tab in the background. The last two are as
       much about cost as manners — an unwatched carousel that keeps swapping
       graded backdrops is pure waste on a device that can least afford it. */
    /* Taken from the stylesheet, where the dwell fill's animation reads it
       too, so the timer and the bar can never drift apart. */
    var dwellEl = stage.querySelector('.strip__dwell');
    var DWELL = msVar(stage, '--dwell', 3000);
    var RESUME = 9000;
    var timer = null, resumeTimer = null;
    var holds = { hover: false, lightbox: false, drag: false, away: true, hidden: false };

    function held(){
      for(var k in holds) if(holds[k]) return true;
      return false;
    }

    function arm(){
      if(timer){ clearTimeout(timer); timer = null; }
      var run = !held() && !REDUCED.matches && n > 1;
      stage.classList.toggle('is-playing', run);
      if(run) timer = setTimeout(function(){ timer = null; go(at >= n - 1 ? 0 : at + 1); }, DWELL);
    }

    function hold(key, on){
      if(holds[key] === on) return;
      holds[key] = on;
      arm();
    }

    /* An explicit choice pauses the walk rather than ending it, so the strip
       does not fight the reader but does pick itself back up. */
    function handOver(){
      hold('drag', true);
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function(){ hold('drag', false); }, RESUME);
    }

    /* Restart the fill from zero on every advance. Dropping the animation and
       flushing is what makes the browser treat it as a new one. */
    function redwell(){
      if(!dwellEl) return;
      dwellEl.style.animation = 'none';
      void dwellEl.offsetWidth;
      dwellEl.style.animation = '';
    }

    /* Hover has to mean "this reader is working the strip", and on a stage
       this size mere presence does not: scrolling down the page with the
       cursor at rest in the middle of the screen puts it over the frames, and
       a plain pointerenter would then hold the walk for good. So the hold is
       scoped to the row itself and released once the pointer has been still
       for a moment — moving over the photographs pauses, resting does not. */
    var IDLE = 3000, idleTimer = null;
    track.addEventListener('pointermove', function(){
      hold('hover', true);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function(){ hold('hover', false); }, IDLE);
    });
    track.addEventListener('pointerleave', function(){
      clearTimeout(idleTimer);
      hold('hover', false);
    });

    /* Keyboard focus holds; a mouse click does not. Clicking a frame focuses
       its button and nothing takes that focus away again, so treating it as
       engagement would stop the walk permanently on the first click. */
    onLightbox(function(open){ hold('lightbox', open); });

    document.addEventListener('visibilitychange', function(){
      hold('hidden', document.hidden);
    });
    if(window.IntersectionObserver){
      new IntersectionObserver(function(entries){
        hold('away', !entries[entries.length - 1].isIntersecting);
      }, { threshold: 0.1 }).observe(stage);
    } else {
      holds.away = false;
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
      redwell();
      arm();
      if(focusIt) cards[at].focus({ preventScroll: true });
    }

    /* ---- drag ---- */
    /* Tracked on the window rather than through setPointerCapture: capturing
       retargets the click that follows a tap to the capture element, and the
       handler that opens a frame is delegated on the track. */
    stage.addEventListener('pointerdown', function(e){
      if(e.button || e.target.closest('a')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: x, v: 0,
               t: e.timeStamp, moved: 0, started: false };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });

    function onMove(e){
      if(!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      if(!drag.started){
        /* A gesture that is mostly vertical belongs to the page, not the strip. */
        if(Math.abs(dx) <= 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
        /* Only now does the transition come off, and the drag starts from
           wherever the track actually is rather than where it was headed. */
        drag.started = true;
        var m = getComputedStyle(track).transform;
        if(m && m !== 'none' && window.DOMMatrix) x = new DOMMatrix(m).m41;
        track.classList.add('is-still');
        drag.from = x;
        drag.x = e.clientX;
        return;
      }
      var was = x;
      /* Rubber-band past the ends rather than stopping dead. */
      x = drag.from + dx;
      var lo = xFor(n - 1), hi = xFor(0);
      if(x > hi) x = hi + (x - hi) * 0.32;
      else if(x < lo) x = lo + (x - lo) * 0.32;
      drag.v = (x - was) / Math.max(e.timeStamp - drag.t, 1) * 1000;
      drag.t = e.timeStamp;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }

    function endDrag(e){
      if(!drag || drag.id !== e.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      var started = drag.started;
      var thrown = x + clamp(drag.v * 0.12, -step * 1.6, step * 1.6);
      drag = null;
      stage.dataset.moved = started ? 1 : 0;
      if(!started) return;              /* a tap: leave the strip alone */
      track.classList.remove('is-still');
      handOver();
      go(Math.round((home - thrown) / step));
    }
    /* ---- click, keys, wheel ---- */
    track.addEventListener('click', function(e){
      var card = e.target.closest('.strip__card');
      if(!card || +stage.dataset.moved) return;
      var i = +card.dataset.i;
      if(i === at){ openLightbox(i, card); return; }
      go(i);
    });

    stage.addEventListener('keydown', function(e){
      var k = e.key, to = null;
      if(k === 'ArrowLeft') to = at - 1;
      else if(k === 'ArrowRight') to = at + 1;
      else if(k === 'Home') to = 0;
      else if(k === 'End') to = n - 1;
      if(to === null) return;
      e.preventDefault();
      handOver();
      go(to, true);
    });

    /* No wheel handler. Reading a horizontal trackpad swipe needs a
       non-passive listener, and a non-passive wheel listener means the
       compositor cannot scroll until this script has run — over a stage that
       covers most of the viewport, that is felt on every scroll down the page.
       Dragging, the arrows and the keyboard already move the strip; a stuttering
       page is far too much to pay for one more way in. */

    /* ---- start ---- */
    copy(0, true);
    grade(0);
    measure();
    arm();
    if(window.ResizeObserver) new ResizeObserver(measure).observe(stage);
    else window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('load', measure);
  }

  /* ---------- ambience ----------
     verdant grows leaf vines down both margins as you scroll, and nocturne
     drifts a starfield behind the page. Both are decorative and both are
     silenced by prefers-reduced-motion; the margin-hugging one drops to a
     single column on narrow screens where two would sit under the text.

     bloom has no ambience of its own any more: its ground is a photograph,
     laid down by the stylesheet alone. */

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
     restyles on every scroll frame: measured at 30.2ms per frame on a desktop,
     i.e. well past the 60fps budget before a phone ever sees it. Banding cuts
     that to 7.4ms by keeping the per-frame set to what is actually on screen.

     The live window is a fixed span of page, so shorter bands track it more
     closely: the same window then covers fewer parked plants, and a plant only
     costs a frame if it is genuinely near the viewport. */
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
      tellLightbox(true);
      render();
      closeB.focus();
      document.addEventListener('keydown', onKey);
    }
    function close(){
      box.classList.remove('open');
      document.documentElement.style.overflow = '';
      tellLightbox(false);
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
