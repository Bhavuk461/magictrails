(function(){
  'use strict';
  /* Phones and small tablets get a different treks component entirely, rather
     than a CSS override of the desktop slider. */
  var MOBILE_Q  = window.matchMedia('(max-width:899px)');
  var REDUCED_Q = window.matchMedia('(prefers-reduced-motion:reduce)');
  function isMobile(){ return MOBILE_Q.matches; }
  function onMQ(mq, fn){
    if(mq.addEventListener) mq.addEventListener('change', fn);
    else mq.addListener(fn); /* Safari < 14 */
  }

  /* ========== MOBILE NAV ========== */
  (function(){
    var toggle = document.getElementById('nav-toggle');
    var sheet  = document.getElementById('mobile-nav');
    if(!toggle || !sheet) return;

    var list = document.getElementById('mobile-nav-treks');
    if(list && window.TREKS){
      list.innerHTML = window.TREKS.map(function(t, i){
        return '<li style="--i:' + i + '">' +
          '<a href="trek.html?t=' + encodeURIComponent(t.slug) + '">' +
            '<span class="n">0' + (i + 1) + '</span>' +
            '<span class="nm">' + t.name +
              '<span class="mt">' + t.duration + ' · ' + t.altitude + '</span>' +
            '</span>' +
            '<span class="pr">' + t.price + '</span>' +
          '</a></li>';
      }).join('');
    }

    var lastFocus = null;

    function focusables(){
      return Array.prototype.slice.call(sheet.querySelectorAll('a[href],button:not([disabled])'));
    }

    function open(){
      lastFocus = document.activeElement;
      sheet.hidden = false;
      /* Flush layout so the transition has a start value. Done synchronously
         rather than in rAF, which never fires while the tab is backgrounded
         and would leave the sheet open but invisible. */
      void sheet.offsetHeight;
      sheet.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
    }

    function close(){
      sheet.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      var done = function(){ sheet.hidden = true; };
      if(REDUCED_Q.matches) done();
      else setTimeout(done, 320);
      if(lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function isOpen(){ return toggle.getAttribute('aria-expanded') === 'true'; }

    function onKey(e){
      if(e.key === 'Escape'){ close(); return; }
      if(e.key !== 'Tab') return;
      /* Keep focus inside the sheet while it covers the page. */
      var f = focusables();
      if(!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }

    toggle.addEventListener('click', function(){ isOpen() ? close() : open(); });
    sheet.addEventListener('click', function(e){ if(e.target.closest('a')) close(); });
    /* Resizing up to desktop leaves the sheet stranded over the page. */
    onMQ(MOBILE_Q, function(){ if(!isMobile() && isOpen()) close(); });
  })();

  /* ========== TREKS SECTION ========== */
  var track = document.getElementById('cine-track');

  var renderedMobile = null;

  if(track && window.TREKS){
    buildTreks();
    onMQ(MOBILE_Q, buildTreks);
    /* Backstop: some engines only dispatch the matchMedia change event once the
       page is compositing, so reconcile on resize too. Both paths are no-ops
       unless the breakpoint was actually crossed. */
    var resizeTimer;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildTreks, 150);
    }, {passive:true});
  }

  function buildTreks(){
    var wantMobile = isMobile();
    if(wantMobile === renderedMobile) return;
    renderedMobile = wantMobile;
    track.innerHTML = '';
    track.className = 'cine-slider__track';
    if(wantMobile) buildStack();
    else buildSlider();
  }

  /* ---------- mobile: every trail on screen at once ----------
     This replaced a swipeable rail of 78vw cards. The rail held one card in
     view and the other three off the side of the screen, which meant three of
     the four trails were unnamed until you thought to swipe — the trails are
     the point of the page, so none of them should need finding.

     Four bands instead, each the photograph with the name over it, and the
     band height derived from the viewport so that all four and the heading
     fit one screen without scrolling. Read the height in the stylesheet: it is
     (screen - chrome) / 4, so this stays true on a small phone as well. */
  function buildStack(){
    var bands = window.TREKS.map(function(t, i){
      var media = MT.img(t.folder + '/back.webp', {
        /* Decorative: the name is right beside it in real text. */
        alt: '',
        sizes: '100vw',
        /* The section sits directly under a full-screen hero, so the first two
           are within a flick of the fold and the last two are not. */
        loading: i < 2 ? 'eager' : 'lazy'
      });
      return '<li class="tband">' +
          '<a class="tband__a" href="trek.html?t=' + encodeURIComponent(t.slug) + '">' +
            '<span class="tband__media">' + media + '</span>' +
            '<span class="tband__veil"></span>' +
            /* Grade and altitude ride at the top, in their own chip. Set on one
               line with the name and the price they collided with the price the
               moment a grade ran long - "Moderate - Difficult" does. */
            '<span class="tband__top">' +
              '<span class="tband__n">' + String(i + 1).padStart(2, '0') + '</span>' +
              '<span class="tband__grade">' + MT.esc(t.grade) + ' · ' +
                MT.esc(t.altitude) + '</span>' +
            '</span>' +
            '<span class="tband__foot">' +
              '<span class="tband__name">' + MT.esc(t.name) + '</span>' +
              '<span class="tband__price">' + MT.esc(t.price) +
                '<small>' + MT.esc(t.duration) + '</small></span>' +
            '</span>' +
          '</a>' +
        '</li>';
    }).join('');

    var wrap = document.createElement('div');
    wrap.className = 'mt-stack';
    wrap.innerHTML =
      '<div class="mt-stack__head">' +
        '<h2>The trails</h2>' +
        '<span class="count">Four routes</span>' +
      '</div>' +
      '<ul class="mt-stack__list">' + bands + '</ul>';
    track.appendChild(wrap);
  }

  /* ---------- desktop: cinematic slider (unchanged behaviour) ---------- */
  function buildSlider(){
    var N = window.TREKS.length;
    var current = 0;
    var isLocked = false;

    /* ---- Suppress transitions on first paint ---- */
    track.classList.add('cs-no-anim');

    /* ---- Build slide DOM (frames only, no text overlays) ---- */
    window.TREKS.forEach(function(t, i){
      var slide = document.createElement('div');
      slide.className = 'cs-slide';
      slide.dataset.index = i;
      slide.innerHTML =
        '<div class="cs-frame">' +
          MT.img(t.folder + '/back.webp', {
            className: 'cs-frame__img',
            alt: t.name,
            sizes: '100vw',
            loading: i === 0 ? 'eager' : 'lazy',
            fetchpriority: i === 0 ? 'high' : null
          }) +
          '<div class="cs-frame__grad"></div>' +
          '<span class="cs-frame__label">' + t.name + '</span>' +
        '</div>';
      track.appendChild(slide);
    });

    /* ---- Shared veil (track-level, always visible) ---- */
    var veil = document.createElement('div');
    veil.className = 'cs-veil';
    track.appendChild(veil);

    /* ---- Shared trek name (track-level) ---- */
    var nameWrap = document.createElement('div');
    nameWrap.className = 'cs-name-wrap';
    var nameEl = document.createElement('a');
    nameEl.className = 'cs-name';
    nameWrap.appendChild(nameEl);
    track.appendChild(nameWrap);

    /* ---- Controls + odometer ---- */
    var controls = document.createElement('div');
    controls.className = 'cs-controls';
    controls.innerHTML =
      '<button class="cs-arrow cs-arrow--prev" aria-label="Previous">←</button>' +
      '<div class="cs-odometer"><div class="cs-odometer__track">' +
        window.TREKS.map(function(_, i){ return '<span>0' + (i + 1) + '</span>'; }).join('') +
      '</div></div>' +
      '<button class="cs-arrow cs-arrow--next" aria-label="Next">→</button>';
    track.appendChild(controls);
    controls.querySelector('.cs-arrow--prev').addEventListener('click', function(){ goTo((current - 1 + N) % N); });
    controls.querySelector('.cs-arrow--next').addEventListener('click', function(){ goTo((current + 1) % N); });

    /* ---- Wipe curtain ---- */
    var wipe = document.createElement('div');
    wipe.className = 'cs-wipe';
    track.appendChild(wipe);

    /* ---- State machine ---- */
    var slides = track.querySelectorAll('.cs-slide');
    var odometerTrack = track.querySelector('.cs-odometer__track');

    /* Cards are activated by pointer; give them a keyboard path too. */
    slides.forEach(function(s){
      s.querySelector('.cs-frame').addEventListener('keydown', function(e){
        if(e.key !== 'Enter' && e.key !== ' ') return;
        var st = s.dataset.state;
        if(st !== 'next-1' && st !== 'next-2' && st !== 'next-3') return;
        e.preventDefault();
        goTo(+s.dataset.index);
      });
    });

    function buildChars(name){
      return name.split('').map(function(c, j){
        if(c === ' ') return '<span class="cs-char cs-space" style="--d:' + (j * 30) + 'ms"> </span>';
        return '<span class="cs-char" style="--d:' + (j * 30) + 'ms">' + c + '</span>';
      }).join('');
    }

    function showName(trekIdx){
      var t = window.TREKS[trekIdx];
      nameEl.innerHTML = buildChars(t.name);
      nameEl.href = 'trek.html?t=' + encodeURIComponent(t.slug);
      void nameWrap.offsetHeight; /* force reflow */
      nameWrap.classList.remove('exiting');
      nameWrap.classList.add('active');
    }

    function transitionName(trekIdx){
      /* Exit old name */
      nameWrap.classList.remove('active');
      nameWrap.classList.add('exiting');
      /* After exit completes, show new name */
      setTimeout(function(){
        showName(trekIdx);
      }, 280);
    }

    function assignStates(activeIdx){
      for(var i = 0; i < N; i++){
        var offset = (i - activeIdx + N) % N;
        var state;
        if(offset === 0)      state = 'active';
        else if(offset === 1) state = 'next-1';
        else if(offset === 2) state = 'next-2';
        else if(offset === 3) state = 'next-3';
        else                  state = 'hidden';
        slides[i].dataset.state = state;
      }
      odometerTrack.style.transform = 'translateY(' + (-activeIdx * 1.6) + 'em)';
      rebindCardClicks();
    }

    function rebindCardClicks(){
      slides.forEach(function(s){
        var frame = s.querySelector('.cs-frame');
        var idx = +s.dataset.index;
        var st = s.dataset.state;
        if(st === 'next-1' || st === 'next-2' || st === 'next-3'){
          frame.onclick = function(e){ e.preventDefault(); goTo(idx); };
          frame.setAttribute('role', 'button');
          frame.setAttribute('tabindex', '0');
          frame.setAttribute('aria-label', 'Show ' + window.TREKS[idx].name);
        } else {
          frame.onclick = null;
          frame.removeAttribute('role');
          frame.removeAttribute('tabindex');
          frame.removeAttribute('aria-label');
        }
      });
    }

    function goTo(targetIdx){
      if(isLocked || targetIdx === current) return;
      isLocked = true;

      var isLoopForward  = (current === N - 1 && targetIdx === 0);
      var isLoopBackward = (current === 0 && targetIdx === N - 1);
      if(isLoopForward || isLoopBackward){
        wipe.classList.add('sweeping');
        wipe.addEventListener('animationend', function handler(){
          wipe.removeEventListener('animationend', handler);
          wipe.classList.remove('sweeping');
        });
      }

      var oldSlide = slides[current];
      current = targetIdx;

      /* Old active shrinks BEHIND the new one (z:3) */
      oldSlide.classList.add('cs-shrinking');

      /* Assign new positions — new active expands, old shrinks, cards shift */
      assignStates(current);

      /* Transition the name */
      transitionName(current);

      /* After transition completes, remove shrinking class and unlock */
      setTimeout(function(){
        oldSlide.classList.remove('cs-shrinking');
        isLocked = false;
      }, 1200);
    }

    /* ---- Initial state (no animation) ---- */
    assignStates(0);
    showName(0);

    /* Enable transitions after first paint */
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        track.classList.remove('cs-no-anim');
      });
    });
  }

  /* ========== REVEAL ON SCROLL ========== */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{threshold:0.14, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* Failsafe. .reveal starts at opacity:0, and the trek page is rendered
     entirely from JS, so a non-delivering observer would leave a blank page.
     If something is on screen and still hidden after a beat, the observer
     never ran - show everything rather than animate nothing. */
  setTimeout(function(){
    var hidden = document.querySelectorAll('.reveal:not(.in)');
    if(!hidden.length) return;
    var strandedOnScreen = Array.prototype.some.call(hidden, function(el){
      var r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    if(strandedOnScreen){
      document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); });
    }
  }, 2500);

  var heroTitle = document.querySelector('.hero-title.kinetic');
  if(heroTitle){ requestAnimationFrame(function(){ setTimeout(function(){ heroTitle.classList.add('in'); },120); }); }

  /* ========== COUNT-UP STATS ========== */
  var counters = document.querySelectorAll('.num[data-count]');
  var cObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var el = e.target, target = +el.dataset.count, start = null, dur = 1400;
      function step(ts){ if(!start) start = ts; var p = Math.min((ts-start)/dur,1);
        el.textContent = Math.floor((1-Math.pow(1-p,3))*target).toLocaleString();
        if(p<1) requestAnimationFrame(step); else el.textContent = target.toLocaleString(); }
      requestAnimationFrame(step); cObs.unobserve(el);
    });
  },{threshold:0.5});
  counters.forEach(function(c){ cObs.observe(c); });

  /* ========== PARALLAX + SCROLL PROGRESS ========== */
  var parallax = Array.prototype.slice.call(document.querySelectorAll('.parallax'));

  /* Multi-megabyte layers being transformed every frame is the main source of
     scroll jank on phones, and reduced-motion should silence it everywhere. */
  function parallaxOff(){ return isMobile() || REDUCED_Q.matches; }

  function clearParallax(){
    parallax.forEach(function(el){ el.style.transform = ''; });
  }

  /* Runs inside the shared rAF (see MT.onScroll), so no self-throttling. */
  function onScroll(y){
    if(!parallaxOff() && parallax.length){
      var vh = window.innerHeight;
      /* Read every rect first, then write — interleaving the two forced a
         layout recalculation per element per frame. */
      var reads = [];
      for(var i = 0; i < parallax.length; i++){
        var el = parallax[i];
        var r = el.parentElement.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) continue;
        reads.push([el, r.top, parseFloat(el.dataset.speed) || 0.2]);
      }
      for(var j = 0; j < reads.length; j++){
        reads[j][0].style.transform =
          'translate3d(0,' + (reads[j][1] * -reads[j][2]) + 'px,0) scale(1.12)';
      }
    }
  }

  /* A rect taken inside the frame would land after the parallax has written
     its transforms, forcing a second layout pass every frame — so the page is
     measured when it actually changes size instead. */
  var sliderTop = 0, sliderBot = 0;
  var slider = document.querySelector('.cine-slider');

  function measurePage(){
    if(slider){
      /* Page-space bounds, so the header check below needs no rect of its own. */
      var r = slider.getBoundingClientRect();
      sliderTop = r.top + window.pageYOffset;
      sliderBot = r.bottom + window.pageYOffset;
    }
  }
  measurePage();
  window.addEventListener('load', function(){ measurePage(); MT.kick(); });
  if(window.ResizeObserver){
    /* Images landing and breakpoints crossing both change the page's height. */
    new ResizeObserver(function(){ measurePage(); MT.kick(); }).observe(document.body);
  } else {
    window.addEventListener('resize', measurePage, { passive: true });
  }

  MT.onScroll(onScroll);
  onMQ(MOBILE_Q, function(){ clearParallax(); MT.kick(); });
  onMQ(REDUCED_Q, function(){ clearParallax(); MT.kick(); });
  if(parallaxOff()) clearParallax();

  /* ========== STICKY HEADER + SLIDER-AWARE DARK MODE ========== */
  var header = document.querySelector('.site-header');
  if(header){
    var wasScrolled = null, wasOver = null;
    function updateHeader(y){
      /* classList.toggle writes unconditionally, which invalidates style for
         the header's subtree on every frame of every scroll. Both flags change
         at most a handful of times per page, so only write on a real change. */
      var scrolled = y > 40;
      if(scrolled !== wasScrolled){ header.classList.toggle('scrolled', scrolled); wasScrolled = scrolled; }

      /* The dark treatment only makes sense over the fullscreen desktop slider. */
      var over = !!slider && !isMobile() && (sliderTop - y) < 60 && (sliderBot - y) > 60;
      if(over !== wasOver){ header.classList.toggle('over-slider', over); wasOver = over; }
    }
    MT.onScroll(updateHeader);
    onMQ(MOBILE_Q, MT.kick);
  }

  /* ========== SMOOTH ANCHORS ==========
     scroll-behavior:smooth on <html> is gone. Chromium routes wheel and
     keyboard scrolling through it too, so every notch was animated and a
     quick flick kept travelling after the gesture stopped — which is what
     made manual scrolling feel like it overshot. In-page links ask for smooth
     explicitly instead, which is the only place it was ever wanted. */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if(!a) return;
    var id = a.getAttribute('href').slice(1);
    if(!id) return;
    var target = document.getElementById(id);
    if(!target) return;
    e.preventDefault();
    target.scrollIntoView({
      behavior: REDUCED_Q.matches ? 'auto' : 'smooth',
      block: 'start'
    });
    if(history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ========== MAGNETIC BUTTONS (desktop only) ========== */
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    document.querySelectorAll('.magnetic').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r = btn.getBoundingClientRect();
        btn.style.transform = 'translate('+ ((e.clientX-r.left-r.width/2)*0.25) +'px,'+ ((e.clientY-r.top-r.height/2)*0.35) +'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform=''; });
    });
  }

})();
