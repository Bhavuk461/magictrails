(function(){
  'use strict';
  var enc = function(p){ return p.split('/').map(encodeURIComponent).join('/'); };

  /* ========== CINEMATIC SLIDER ENGINE ========== */
  var track = document.getElementById('cine-track');
  if(track && window.TREKS){
    var N = window.TREKS.length;
    var current = 0;
    var isLocked = false;

    /* ---- Build slide DOM ---- */
    window.TREKS.forEach(function(t, i){
      var slide = document.createElement('div');
      slide.className = 'cs-slide';
      slide.dataset.index = i;
      slide.innerHTML =
        '<div class="cs-bg"><img class="cs-bg__img" src="' + enc(t.folder + '/back.webp') + '" alt="' + t.name + '"></div>' +
        '<div class="cs-veil"></div>' +
        '<div class="cs-content">' +
          '<div class="cs-mask"><span class="cs-kicker">' + t.route + '</span></div>' +
          '<div class="cs-mask"><h2 class="cs-title">' + t.name + '</h2></div>' +
          '<div class="cs-mask"><p class="cs-tagline">' + t.tagline + '</p></div>' +
          '<div class="cs-mask"><div class="cs-meta">' +
            '<span class="cs-meta__item">' + t.duration + '</span>' +
            '<span class="cs-meta__dot">\u25CF</span>' +
            '<span class="cs-meta__item">' + t.price + '</span>' +
            '<span class="cs-meta__dot">\u25CF</span>' +
            '<span class="cs-meta__item">' + t.altitude + '</span>' +
          '</div></div>' +
          '<div class="cs-mask"><a href="trek.html?t=' + encodeURIComponent(t.slug) + '" class="cs-cta">Discover Location <span class="cs-cta__arrow">\u2192</span></a></div>' +
        '</div>' +
        '<div class="cs-preview">' +
          '<img class="cs-preview__img" src="' + enc(t.folder + '/title.webp') + '" alt="' + t.name + '">' +
          '<span class="cs-preview__label">' + t.name + '</span>' +
        '</div>';
      track.appendChild(slide);
    });

    /* ---- Title nav (left side) ---- */
    var nav = document.createElement('nav');
    nav.className = 'cs-nav';
    window.TREKS.forEach(function(t, i){
      var btn = document.createElement('button');
      btn.className = 'cs-nav__btn' + (i === 0 ? ' active' : '');
      btn.dataset.target = i;
      btn.textContent = t.name;
      btn.addEventListener('click', function(){ goTo(i); });
      nav.appendChild(btn);
    });
    track.appendChild(nav);

    /* ---- Controls + odometer (bottom-right) ---- */
    var controls = document.createElement('div');
    controls.className = 'cs-controls';
    controls.innerHTML =
      '<button class="cs-arrow cs-arrow--prev" aria-label="Previous">\u2190</button>' +
      '<div class="cs-odometer"><div class="cs-odometer__track">' +
        window.TREKS.map(function(_, i){ return '<span>0' + (i + 1) + '</span>'; }).join('') +
      '</div></div>' +
      '<button class="cs-arrow cs-arrow--next" aria-label="Next">\u2192</button>';
    track.appendChild(controls);

    controls.querySelector('.cs-arrow--prev').addEventListener('click', function(){ goTo((current - 1 + N) % N); });
    controls.querySelector('.cs-arrow--next').addEventListener('click', function(){ goTo((current + 1) % N); });

    /* ---- Wipe curtain ---- */
    var wipe = document.createElement('div');
    wipe.className = 'cs-wipe';
    track.appendChild(wipe);

    /* ---- State machine ---- */
    var slides = track.querySelectorAll('.cs-slide');
    var navBtns = track.querySelectorAll('.cs-nav__btn');
    var odometerTrack = track.querySelector('.cs-odometer__track');

    function assignStates(activeIdx, prevIdx){
      for(var i = 0; i < N; i++){
        var offset = (i - activeIdx + N) % N;
        var state;
        if(offset === 0)      state = 'active';
        else if(offset === 1) state = 'next-1';
        else if(offset === 2) state = 'next-2';
        else                  state = 'hidden';
        /* The outgoing slide gets 'prev' to trigger its exit animation */
        if(prevIdx !== undefined && i === prevIdx && i !== activeIdx) state = 'prev';
        slides[i].dataset.state = state;
      }

      /* Nav buttons */
      navBtns.forEach(function(btn, i){
        btn.classList.toggle('active', i === activeIdx);
      });

      /* Odometer */
      odometerTrack.style.transform = 'translateY(' + (-activeIdx * 1.6) + 'em)';

      /* Preview card click handlers */
      slides.forEach(function(s){
        var preview = s.querySelector('.cs-preview');
        var idx = +s.dataset.index;
        if(s.dataset.state === 'next-1' || s.dataset.state === 'next-2'){
          preview.onclick = function(e){ e.preventDefault(); goTo(idx); };
        } else {
          preview.onclick = null;
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

      var prev = current;
      current = targetIdx;
      assignStates(current, prev);

      /* Unlock after the longest transition completes */
      var activeBg = slides[current].querySelector('.cs-bg__img');
      function unlock(){ activeBg.removeEventListener('transitionend', unlock); isLocked = false; }
      activeBg.addEventListener('transitionend', unlock);
      /* Safety timeout */
      setTimeout(function(){ isLocked = false; }, 1600);
    }

    /* Initial state (no prev index) */
    assignStates(0);
  }

  /* ========== REVEAL ON SCROLL ========== */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{threshold:0.14, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* hero title kinetic intro */
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
  function onScroll(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(function(){
      var y = window.pageYOffset;
      parallax.forEach(function(el){
        var r = el.parentElement.getBoundingClientRect();
        if(r.bottom < -200 || r.top > window.innerHeight+200) return;
        var speed = parseFloat(el.dataset.speed)||0.2;
        el.style.transform = 'translate3d(0,'+ (r.top * -speed) +'px,0) scale(1.12)';
      });
      if(progress){ var h = document.documentElement.scrollHeight - window.innerHeight; progress.style.width = (h>0 ? (y/h*100) : 0)+'%'; }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  onScroll();

  /* ========== STICKY HEADER + SLIDER-AWARE DARK MODE ========== */
  var header = document.querySelector('.site-header');
  var slider = document.querySelector('.cine-slider');
  if(header){
    function updateHeader(){
      header.classList.toggle('scrolled', window.pageYOffset > 40);
      /* Dark header when slider is in viewport */
      if(slider){
        var sr = slider.getBoundingClientRect();
        var inSlider = sr.top < 60 && sr.bottom > 60;
        header.classList.toggle('over-slider', inSlider);
      }
    }
    window.addEventListener('scroll', updateHeader, {passive:true});
    updateHeader();
  }

  /* ========== MAGNETIC BUTTONS (desktop only) ========== */
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    document.querySelectorAll('.magnetic').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width/2;
        var my = e.clientY - r.top - r.height/2;
        btn.style.transform = 'translate('+ (mx*0.25) +'px,'+ (my*0.35) +'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform=''; });
    });
  }

})();
