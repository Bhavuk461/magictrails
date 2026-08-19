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
})();
