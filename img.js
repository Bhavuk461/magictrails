/* Responsive-image helper shared by main.js and trek.js.
   Reads the build manifest emitted by tools/build-images.py (img-manifest.js)
   and turns a source path like 'Roopkund trek/back.webp' into a full srcset.
   Falls back to the original file whenever a source is missing from the
   manifest, so the site still renders if derivatives were never generated. */
(function () {
  'use strict';

  var M = window.MT_IMAGES || {};
  var MT = (window.MT = window.MT || {});

  /* Folder names contain spaces, so every path segment is encoded separately. */
  function enc(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function variant(entry, w) {
    return entry.dir + '/' + entry.stem + '-' + w + '.webp';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Everything a responsive <img> needs for one source. */
  MT.imgData = function (src) {
    var entry = M[src];
    if (!entry || !entry.widths.length) {
      return { src: enc(src), srcset: '', w: 0, h: 0, ratio: 0 };
    }
    var widths = entry.widths;
    return {
      /* Mid-size default for browsers that ignore srcset. */
      src: variant(entry, widths[Math.min(1, widths.length - 1)]),
      srcset: widths.map(function (w) { return variant(entry, w) + ' ' + w + 'w'; }).join(', '),
      w: entry.w,
      h: entry.h,
      ratio: entry.h / entry.w,
      widths: widths
    };
  };

  /* Best single URL at or above a target width — for CSS background-image. */
  MT.bg = function (src, targetW) {
    var entry = M[src];
    if (!entry || !entry.widths.length) return enc(src);
    var widths = entry.widths;
    for (var i = 0; i < widths.length; i++) {
      if (widths[i] >= targetW) return variant(entry, widths[i]);
    }
    return variant(entry, widths[widths.length - 1]);
  };

  /* Build an <img> tag string.
     opts: alt, sizes, className, loading, fetchpriority, style, extra */
  MT.img = function (src, opts) {
    opts = opts || {};
    var d = MT.imgData(src);
    var a = ['src="' + d.src + '"'];

    if (d.srcset) a.push('srcset="' + d.srcset + '"');
    a.push('sizes="' + (opts.sizes || '100vw') + '"');
    a.push('alt="' + esc(opts.alt || '') + '"');
    if (d.w) {
      a.push('width="' + d.w + '"');
      a.push('height="' + d.h + '"');
    }
    a.push('loading="' + (opts.loading || 'lazy') + '"');
    a.push('decoding="async"');
    if (opts.fetchpriority) a.push('fetchpriority="' + opts.fetchpriority + '"');
    if (opts.className) a.push('class="' + opts.className + '"');
    if (opts.style) a.push('style="' + opts.style + '"');
    if (opts.extra) a.push(opts.extra);

    return '<img ' + a.join(' ') + '>';
  };

  MT.enc = enc;
  MT.esc = esc;

  /* ── one scroll listener for the whole page ────────────────────────────────
     Every extra window.addEventListener('scroll', …) is another main-thread
     callback per frame, and each one that measures the page forces its own
     style+layout pass. The trek page had four. They all subscribe here
     instead: one passive listener, one rAF per frame, subscribers called in
     registration order with the offset already read for them.

     A handler that returns nothing is assumed to have written to the DOM, so
     ordering matters — register readers before writers where it counts. */
  var subs = [], queued = false;

  function frame(){
    queued = false;
    var y = window.pageYOffset;
    for (var i = 0; i < subs.length; i++) subs[i](y);
  }

  function kick(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  }

  /* The first call is synchronous rather than deferred to a frame: anything
     driven by scroll position is wrong until it has run once, and a tab that
     loads in the background gets no animation frames at all until you look
     at it — which would otherwise leave it holding its start state. */
  MT.onScroll = function (fn) {
    subs.push(fn);
    fn(window.pageYOffset);
    return fn;
  };

  /* For anything that changes the page without scrolling it — images landing,
     a rebuild, a breakpoint crossing. */
  MT.kick = kick;

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });

  /* Low-power devices get a lighter build of the same design: fewer decorative
     nodes, no idle animation, and the expensive paint features off. Both
     hints are advisory and absent on Safari, so the fallback assumes a
     capable machine rather than punishing every iPhone. */
  MT.lite = (navigator.deviceMemory || 8) <= 4 ||
            (navigator.hardwareConcurrency || 8) <= 4;
})();
