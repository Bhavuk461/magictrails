(function(){
  'use strict';
  var enc = function(p){ return p.split('/').map(encodeURIComponent).join('/'); };

  /* ========== CINEMATIC SLIDER ENGINE (v2 — expanding cards) ========== */
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

      /* Split name into per-character spans for staggered animation */
      var chars = t.name.split('').map(function(c, j){
        if(c === ' ') return '<span class="cs-char cs-space" style="--d:' + (j * 30) + 'ms">\u00A0</span>';
        return '<span class="cs-char" style="--d:' + (j * 30) + 'ms">' + c + '</span>';
      }).join('');

      slide.innerHTML =
        /* The expanding frame — uses title.webp for card, back.webp for fullscreen */
        '<div class="cs-frame">' +
          '<img class="cs-frame__card-img" src="' + enc(t.folder + '/title.webp') + '" alt="' + t.name + '">' +
          '<img class="cs-frame__full-img" src="' + enc(t.folder + '/back.webp') + '" alt="' + t.name + '">' +
          '<div class="cs-frame__grad"></div>' +
          '<span class="cs-frame__label">' + t.name + '</span>' +
        '</div>' +
        /* Dark veil for text legibility (only on active) */
        '<div class="cs-veil"></div>' +
        /* Trek name — the ONLY text content */
        '<div class="cs-name-wrap">' +
          '<a href="trek.html?t=' + encodeURIComponent(t.slug) + '" class="cs-name">' + chars + '</a>' +
        '</div>';

      track.appendChild(slide);
    });

    /* ---- Controls + odometer (bottom-left) ---- */
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
    var odometerTrack = track.querySelector('.cs-odometer__track');

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

      /* Odometer */
      odometerTrack.style.transform = 'translateY(' + (-activeIdx * 1.6) + 'em)';

      /* Preview card click handlers */
      rebindCardClicks();
    }

    function rebindCardClicks(){
      slides.forEach(function(s){
        var frame = s.querySelector('.cs-frame');
        var idx = +s.dataset.index;
        var st = s.dataset.state;
        if(st === 'next-1' || st === 'next-2' || st === 'next-3'){
          frame.onclick = function(e){ e.preventDefault(); goTo(idx); };
        } else {
          frame.onclick = null;
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

      current = targetIdx;

      /* Boost z-index of the expanding slide so it's always on top */
      slides[current].classList.add('cs-expanding');

      /* Assign all states simultaneously — old active shrinks, new card expands */
      assignStates(current);

      /* Remove z-boost and unlock after expansion completes */
      var activeFrame = slides[current].querySelector('.cs-frame');
      function onDone(e){
        if(e.propertyName === 'width' || e.propertyName === 'height'){
          activeFrame.removeEventListener('transitionend', onDone);
          slides[current].classList.remove('cs-expanding');
          isLocked = false;
        }
      }
      activeFrame.addEventListener('transitionend', onDone);
      /* Safety timeout */
      setTimeout(function(){
        slides[current].classList.remove('cs-expanding');
        isLocked = false;
      }, 1400);
    }

    /* Initial state */
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
