(function(){
  'use strict';
  var enc = function(p){ return p.split('/').map(encodeURIComponent).join('/'); };

  /* ---------- build trek cards ---------- */
  var grid = document.getElementById('trek-grid');
  if(grid && window.TREKS){
    var frag = document.createDocumentFragment();
    window.TREKS.forEach(function(t,i){
      var title = enc(t.folder + '/title.webp');
      var back  = enc(t.folder + '/back.webp');
      var a = document.createElement('a');
      a.className = 'trek-card reveal';
      a.href = 'trek.html?t=' + encodeURIComponent(t.slug);
      a.style.transitionDelay = (i*0.07) + 's';
      a.setAttribute('aria-label', t.name + ' trek');
      a.innerHTML =
        '<div class="imgwrap">'+
          '<img class="img-back" src="'+back+'" alt="" loading="lazy" decoding="async">'+
          '<img class="img-title" src="'+title+'" alt="'+t.name+'" loading="lazy" decoding="async">'+
        '</div>'+
        '<div class="grad"></div>'+
        '<span class="price">'+t.price+'</span>'+
        '<div class="meta">'+
          '<h3 class="name">'+t.name+'</h3>'+
          '<div class="sub"><span>'+t.duration+'</span><span class="dot">\u25CF</span><span>'+t.route+'</span></div>'+
          '<span class="open-hint">View journey \u2192</span>'+
        '</div>';
      frag.appendChild(a);
    });
    grid.appendChild(frag);
  }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{threshold:0.14, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* hero title kinetic intro */
  var heroTitle = document.querySelector('.hero-title.kinetic');
  if(heroTitle){ requestAnimationFrame(function(){ setTimeout(function(){ heroTitle.classList.add('in'); },120); }); }

  /* ---------- count-up stats ---------- */
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

  /* ---------- parallax + scroll progress (rAF throttled) ---------- */
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

  /* ---------- sticky header state ---------- */
  var header = document.querySelector('.site-header');
  if(header){
    var setHeader = function(){ header.classList.toggle('scrolled', window.pageYOffset > 40); };
    window.addEventListener('scroll', setHeader, {passive:true});
    setHeader();
  }

  /* ---------- magnetic buttons (desktop only) ---------- */
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

  /* ---------- smooth scroll centering on trek card hover ---------- */
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    var hoverTimer = null;
    document.querySelectorAll('.trek-card').forEach(function(card){
      card.addEventListener('mouseenter', function(){
        clearTimeout(hoverTimer);
        var target = card;
        hoverTimer = setTimeout(function(){
          target.scrollIntoView({ behavior:'smooth', block:'center' });
        }, 300);
      });
      card.addEventListener('mouseleave', function(){
        clearTimeout(hoverTimer);
      });
    });
  }

})();
