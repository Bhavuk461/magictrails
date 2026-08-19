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

  /* ---------- gallery ---------- */
  var gallery = '';
  if(shots.length){
    var lead = shots[0];
    var rest = shots.slice(1);
    var mk = function(item, i, sizes){
      return '<figure class="shot frame-' + (item.frame || 'mat') + '" data-i="' + i + '">' +
          '<button type="button" class="shot__btn" aria-label="Open photo ' + (i + 1) + ' of ' + shots.length + '">' +
            MT.img(t.folder + '/' + item.src, { alt: t.name + ', photo ' + (i + 1), sizes: sizes }) +
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

  /* ---------- ambience ----------
     verdant grows leaf vines down both margins as you scroll, bloom opens
     Brahma Kamal the same way, and nocturne drifts a starfield behind the
     page. All are decorative, all are silenced by prefers-reduced-motion,
     and the margin-hugging ones drop to a single column on narrow screens
     where two would sit under the text. */

  var REDUCED = window.matchMedia('(prefers-reduced-motion:reduce)');

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
  function columnWidth(){
    var m = marginColumn();
    if(m < 74) return 0;                       /* nothing worth drawing */
    return Math.max(112, Math.min(210, m - 10));
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

    var lastH = 0;

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
      var seg = 268;
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
           every leaf restyles when --grow changes. */
        var ly1 = y0 + seg * 0.30, ly2 = y0 + seg * 0.72;
        parts.push(leaf(cx - 2 * dir, ly1, dir > 0 ? -32 : 212, at(ly1),
                        i % 2 === 0, i, (0.95 + (i % 3) * 0.12) * lf));
        if(i % 3 !== 2){
          parts.push(leaf(baseX, ly2, dir > 0 ? 150 : 30, at(ly2),
                          i % 3 === 0, i + 1, (0.82 + (i % 2) * 0.16) * lf));
        }
      }

      return '<svg class="v-' + side + '" width="' + W + '" height="' + height + '" ' +
               'viewBox="0 0 ' + W + ' ' + height + '" fill="none" aria-hidden="true">' +
               '<path class="vine-stem" pathLength="1" d="' + d + '"/>' +
               parts.join('') +
             '</svg>';
    }

    var lastW = -1;
    function rebuild(){
      var h = root.offsetHeight, W = columnWidth();
      if(!h) return;
      if(Math.abs(h - lastH) < 40 && W === lastW) return;  /* ignore trivial reflows */
      lastH = h; lastW = W;
      layer.innerHTML = W ? (vine(h, 'left', W) + vine(h, 'right', W)) : '';
    }

    var lastRun = 0;
    function onScroll(){
      var now = (window.performance || Date).now();
      if(now - lastRun < 16) return;
      lastRun = now;
      var r = root.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      var p = span > 0 ? (-r.top) / span : 1;
      /* lead slightly, so a leaf has opened by the time you reach it */
      layer.style.setProperty('--grow', Math.max(0, Math.min(1, p * 1.04 + 0.05)).toFixed(4));
    }

    rebuild();
    if(REDUCED.matches){
      layer.style.setProperty('--grow', '1');
    } else {
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){ rebuild(); onScroll(); }, 180);
    }, { passive: true });

    /* Images landing changes the page height, so redraw once they settle. */
    window.addEventListener('load', function(){ rebuild(); onScroll(); });
  }

  /* --- bloom (Roopkund) --- */
  function buildBlooms(){
    var layer = document.createElement('div');
    layer.className = 'blooms';
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);

    var lastH = 0;

    /* Seeded, so a given page always grows the same garden. */
    var seed = 90210;
    function rnd(){
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    var PETAL = 'M0,0 C -6.5,-9 -6.5,-22 0,-31 C 6.5,-22 6.5,-9 0,0 Z';
    var LEAF  = 'M0,0 C6,-8 18,-10 25,0 C18,10 6,8 0,0 Z';

    /* One plant: a stem that draws, two leaves, then a head of layered
       bracts. Brahma Kamal has an outer ring of pale bracts round a paler
       inner cup, which is what the two rings here stand for. */
    function plant(x, y, at, scale, flip){
      var outer = 6, inner = 4;
      var g = [];

      /* stem, curving back on itself the way a loaded stalk does */
      var lean = (flip ? -1 : 1) * (5 + rnd() * 7);
      var len = 74 + rnd() * 26;
      g.push('<path class="bloom-stem" pathLength="1" style="--at:' + at.toFixed(4) + '" ' +
             'd="M0,0 C ' + (-lean) + ',' + (-len * 0.38) + ' ' +
             (lean * 1.4) + ',' + (-len * 0.68) + ' ' + (lean * 0.4) + ',' + (-len) + '"/>');

      /* two leaves off the lower stem */
      g.push('<g transform="translate(' + (-lean * 0.35) + ',' + (-len * 0.34) + ') rotate(' +
             (flip ? 205 : -25) + ')"><path class="bloom-leaf" style="--at:' +
             (at + 0.012).toFixed(4) + '" d="' + LEAF + '"/></g>');
      g.push('<g transform="translate(' + (lean * 0.5) + ',' + (-len * 0.6) + ') rotate(' +
             (flip ? -20 : 200) + ')"><path class="bloom-leaf" style="--at:' +
             (at + 0.022).toFixed(4) + '" d="' + LEAF + '"/></g>');

      /* head */
      var head = [];
      var i, ang;
      for(i = 0; i < outer; i++){
        ang = (360 / outer) * i + rnd() * 5;
        head.push('<g transform="rotate(' + ang.toFixed(1) + ')">' +
          '<path class="bloom-petal" style="--at:' + at.toFixed(4) +
          ';--d:' + (0.03 + i * 0.006).toFixed(4) + '" d="' + PETAL + '"/></g>');
      }
      for(i = 0; i < inner; i++){
        ang = (360 / inner) * i + 26;
        head.push('<g transform="rotate(' + ang.toFixed(1) + ') scale(.62)">' +
          '<path class="bloom-petal is-inner" style="--at:' + at.toFixed(4) +
          ';--d:' + (0.055 + i * 0.005).toFixed(4) + '" d="' + PETAL + '"/></g>');
      }
      head.push('<circle class="bloom-core" style="--at:' + at.toFixed(4) + '" r="4.6"/>');

      g.push('<g transform="translate(' + (lean * 0.4) + ',' + (-len) + ')">' +
             head.join('') + '</g>');

      /* Placement on the outer group, sway on the inner one: the CSS animation
         would otherwise replace this translate() and stack every plant on the
         SVG origin, which is exactly why no flowers were visible. */
      return '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) +
             ') scale(' + scale.toFixed(3) + ')">' +
               '<g class="bloom-plant" style="--sway:' + (7.5 + rnd() * 4).toFixed(1) +
               's;--sway-delay:-' + (rnd() * 6).toFixed(1) + 's">' + g.join('') + '</g>' +
             '</g>';
    }

    function garden(height, side, W){
      var flip = side === 'right';
      /* Centred in the measured gutter: a plant is ~40px wide either side of
         its stem, and hugging the edge meant half of every flower was being
         clipped by the layer's overflow. */
      var baseX = W / 2;
      /* Spacing keeps the element count sane: every petal restyles when
         --grow changes, so a handful of larger plants rather than a dense
         border of small ones. */
      var gap = 700;
      var n = Math.max(3, Math.round(height / gap));
      var parts = [];

      for(var i = 0; i < n; i++){
        var y = (i + 0.55) * (height / n);
        var x = baseX + (rnd() - 0.5) * Math.min(30, W * 0.18);
        /* Compress into the first 80% of the scroll so even the lowest
           plants finish drawing their stem and opening by the page end. */
        var at = Math.min(0.8, (y / height) * 0.8);
        parts.push(plant(x, y, at, (0.85 + rnd() * 0.5) * Math.min(1.25, W / 150), flip));
      }

      return '<svg class="b-' + side + '" width="' + W + '" height="' + height + '" ' +
               'viewBox="0 0 ' + W + ' ' + height + '" fill="none" aria-hidden="true">' +
               parts.join('') +
             '</svg>';
    }

    var lastW = -1;
    function rebuild(){
      var h = root.offsetHeight, W = columnWidth();
      if(!h) return;
      if(Math.abs(h - lastH) < 40 && W === lastW) return;
      lastH = h; lastW = W;
      seed = 90210;                       /* same garden after a resize */
      layer.innerHTML = W ? (garden(h, 'left', W) + garden(h, 'right', W)) : '';
    }

    var lastRun = 0;
    function onScroll(){
      var now = (window.performance || Date).now();
      if(now - lastRun < 16) return;
      lastRun = now;
      var r = root.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      var p = span > 0 ? (-r.top) / span : 1;
      layer.style.setProperty('--grow', Math.max(0, Math.min(1, p * 1.04 + 0.05)).toFixed(4));
    }

    rebuild();
    if(REDUCED.matches){
      layer.style.setProperty('--grow', '1');
    } else {
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){ rebuild(); onScroll(); }, 180);
    }, { passive: true });
    window.addEventListener('load', function(){ rebuild(); onScroll(); });
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

    var count = window.innerWidth < 700 ? 46 : 78;
    var html = '';
    for(var i = 0; i < count; i++){
      var size = rnd() < 0.86 ? (1 + rnd() * 1.3) : (2 + rnd() * 1.6);
      var warm = rnd() < 0.22;
      html += '<span class="sky__star' + (warm ? ' is-warm' : '') + '" style="' +
        'left:' + (rnd() * 100).toFixed(2) + '%;' +
        'top:' + (rnd() * 100).toFixed(2) + '%;' +
        'width:' + size.toFixed(2) + 'px;height:' + size.toFixed(2) + 'px;' +
        '--dur:' + (2.8 + rnd() * 4.5).toFixed(2) + 's;' +
        '--delay:' + (rnd() * 6).toFixed(2) + 's;' +
        '--min:' + (0.06 + rnd() * 0.16).toFixed(2) + ';' +
        '--max:' + (0.5 + rnd() * 0.5).toFixed(2) + ';' +
        '"></span>';
    }
    html += '<span class="sky__shoot" style="left:76%;top:12%;--delay:7s"></span>';
    html += '<span class="sky__shoot" style="left:38%;top:5%;--delay:19s"></span>';

    sky.innerHTML = html;
    document.body.appendChild(sky);
  }

  /* ---------- lightbox ---------- */
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
    root.querySelectorAll('.shot__btn').forEach(function(btn){
      btn.addEventListener('click', function(){ open(+btn.closest('.shot').dataset.i, btn); });
    });
  }
})();
