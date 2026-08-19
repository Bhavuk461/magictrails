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
    if(wantMobile) buildCarousel();
    else buildSlider();
  }

  /* ---------- mobile: swipeable card carousel ---------- */
  function buildCarousel(){
    var treks = window.TREKS;
    var wrap = document.createElement('div');
    wrap.className = 'mt-carousel';

    var cards = treks.map(function(t, i){
      var media = MT.img(t.folder + '/back.webp', {
        alt: t.name,
        sizes: '(max-width:460px) 78vw, 340px',
        loading: i === 0 ? 'eager' : 'lazy'
      });
      return '<a class="mt-card" href="trek.html?t=' + encodeURIComponent(t.slug) + '" ' +
               'aria-label="' + MT.esc(t.name + ', ' + t.grade + ', ' + t.price) + '">' +
          '<span class="mt-card__media">' + media +
            '<span class="mt-card__grade">' + t.grade + '</span>' +
            '<span class="mt-card__alt">' + t.altitude + '</span>' +
          '</span>' +
          '<span class="mt-card__body">' +
            '<h3 class="mt-card__name">' + t.name + '</h3>' +
            '<span class="mt-card__tag">' + t.tagline + '</span>' +
            '<span class="mt-card__foot">' +
              '<span class="mt-card__price">' + t.price + '<small>' + t.duration + '</small></span>' +
              '<span class="mt-card__cta">View trek →</span>' +
            '</span>' +
          '</span>' +
        '</a>';
    }).join('');

    wrap.innerHTML =
      '<div class="mt-carousel__head">' +
        '<h2>The trails</h2>' +
        '<span class="count">Four routes</span>' +
      '</div>' +
      '<div class="mt-carousel__rail">' + cards + '</div>' +
      '<div class="mt-carousel__dots">' +
        treks.map(function(t, i){
          return '<button type="button" aria-label="Go to ' + MT.esc(t.name) + '"' +
            (i === 0 ? ' aria-selected="true"' : ' aria-selected="false"') + '></button>';
        }).join('') +
      '</div>';

    track.appendChild(wrap);

    var rail = wrap.querySelector('.mt-carousel__rail');
    var dots = Array.prototype.slice.call(wrap.querySelectorAll('.mt-carousel__dots button'));
    var items = Array.prototype.slice.call(rail.querySelectorAll('.mt-card'));

    dots.forEach(function(d, i){
      d.addEventListener('click', function(){
        items[i].scrollIntoView({ behavior: REDUCED_Q.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      });
    });

    /* Track the centred card without a scroll handler. */
    var seen = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var i = items.indexOf(e.target);
        if(i < 0) return;
        dots.forEach(function(d, j){ d.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      });
    }, { root: rail, threshold: 0.6 });
    items.forEach(function(el){ seen.observe(el); });
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
  var progress = document.querySelector('.scroll-progress');
  var ticking = false;

  /* Multi-megabyte layers being transformed every frame is the main source of
     scroll jank on phones, and reduced-motion should silence it everywhere. */
  function parallaxOff(){ return isMobile() || REDUCED_Q.matches; }

  function clearParallax(){
    parallax.forEach(function(el){ el.style.transform = ''; });
  }

  function onScroll(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(function(){
      var y = window.pageYOffset;

      if(!parallaxOff()){
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

      if(progress){ var h = document.documentElement.scrollHeight - window.innerHeight; progress.style.width = (h>0 ? (y/h*100) : 0)+'%'; }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  onMQ(MOBILE_Q, function(){ clearParallax(); onScroll(); });
  onMQ(REDUCED_Q, function(){ clearParallax(); onScroll(); });
  if(parallaxOff()) clearParallax();
  onScroll();

  /* ========== STICKY HEADER + SLIDER-AWARE DARK MODE ========== */
  var header = document.querySelector('.site-header');
  var slider = document.querySelector('.cine-slider');
  if(header){
    function updateHeader(){
      header.classList.toggle('scrolled', window.pageYOffset > 40);
      /* The dark treatment only makes sense over the fullscreen desktop slider. */
      if(slider && !isMobile()){
        var sr = slider.getBoundingClientRect();
        header.classList.toggle('over-slider', sr.top < 60 && sr.bottom > 60);
      } else {
        header.classList.remove('over-slider');
      }
    }
    window.addEventListener('scroll', updateHeader, {passive:true});
    onMQ(MOBILE_Q, updateHeader);
    updateHeader();
  }

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
