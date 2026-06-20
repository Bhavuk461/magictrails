(function(){
  'use strict';
  var enc = function(p){ return p.split('/').map(encodeURIComponent).join('/'); };

  /* ========== CINEMATIC SLIDER ENGINE (v3 — track-level overlays) ========== */
  var track = document.getElementById('cine-track');
  if(track && window.TREKS){
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
          '<img class="cs-frame__card-img" src="' + enc(t.folder + '/title.webp') + '" alt="' + t.name + '">' +
          '<img class="cs-frame__full-img" src="' + enc(t.folder + '/back.webp') + '" alt="' + t.name + '">' +
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

    function buildChars(name){
      return name.split('').map(function(c, j){
        if(c === ' ') return '<span class="cs-char cs-space" style="--d:' + (j * 30) + 'ms">\u00A0</span>';
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
        header.classList.toggle('over-slider', sr.top < 60 && sr.bottom > 60);
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
        btn.style.transform = 'translate('+ ((e.clientX-r.left-r.width/2)*0.25) +'px,'+ ((e.clientY-r.top-r.height/2)*0.35) +'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform=''; });
    });
  }

})();
