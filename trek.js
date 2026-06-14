(function(){
  'use strict';
  var enc = function(p){ return p.split('/').map(encodeURIComponent).join('/'); };
  var params = new URLSearchParams(location.search);
  var slug = params.get('t');
  var treks = window.TREKS || [];
  var idx = treks.findIndex(function(t){ return t.slug === slug; });
  var t = treks[idx];
  var root = document.getElementById('trek-root');

  if(!t){
    root.innerHTML = '<div class="loading">Trail not found. <a href="index.html" style="color:var(--accent);margin-left:8px">Go home \u2192</a></div>';
    return;
  }
  document.title = 'MagicTrails \u2014 ' + t.name;

  var title = enc(t.folder + '/title.webp');
  var back  = enc(t.folder + '/back.webp');
  var next  = treks[(idx+1) % treks.length];

  var facts = [
    ['Duration', t.duration],
    ['Route', t.route],
    ['Max altitude', t.altitude],
    ['Grade', t.grade]
  ].map(function(f){ return '<div class="fact reveal"><div class="k">'+f[0]+'</div><div class="v">'+f[1]+'</div></div>'; }).join('');

  var sections = t.sections.map(function(s){
    return '<div class="trek-section reveal"><h2>'+s.h+'</h2><p>'+s.p+'</p></div>';
  }).join('');

  var galleryImgs = (t.gallery||[]).map(function(g){
    return '<img src="'+enc(t.folder+'/'+g)+'" alt="'+t.name+' photo" loading="lazy" decoding="async">';
  }).join('');

  var intro = t.intro.replace(/^(.)/, '<span class="drop">$1</span>');

  root.innerHTML =
    '<section class="trek-hero">'+
      '<div class="bg parallax" data-speed="0.2" style="background-image:url(\''+back+'\')"></div>'+
      '<div class="veil"></div>'+
      '<div class="inner">'+
        '<span class="price-tag">'+t.price+' \u00B7 all inclusive</span>'+
        '<h1>'+t.name+'</h1>'+
        '<p class="tagline">'+t.tagline+'</p>'+
      '</div>'+
    '</section>'+
    '<section class="facts">'+facts+'</section>'+
    '<section class="trek-body">'+
      '<p class="intro reveal">'+intro+'</p>'+
      sections+
      '<div class="included reveal">'+
        '<span class="chip"><b>\u2713</b> Meals included</span>'+
        '<span class="chip"><b>\u2713</b> Stay included</span>'+
        '<span class="chip"><b>\u2713</b> Certified guides</span>'+
        '<span class="chip"><b>\u2713</b> Permits & camps</span>'+
      '</div>'+
    '</section>'+
    (galleryImgs ? '<section class="gallery"><h2 class="reveal">From the trail</h2><div class="grid">'+galleryImgs+'</div></section>' : '')+
    '<section class="book-band">'+
      '<div class="bg parallax" data-speed="0.15" style="background-image:url(\''+title+'\')"></div>'+
      '<div class="veil"></div>'+
      '<div class="c">'+
        '<div class="price-big reveal">'+t.price+'</div>'+
        '<h2 class="reveal">Your '+t.name+' journey awaits</h2>'+
        '<p class="reveal">'+t.duration+' \u00B7 '+t.route+' \u00B7 food & stay sorted.</p>'+
        '<a href="mailto:hello@magictrails.in?subject=Booking%20enquiry%3A%20'+encodeURIComponent(t.name)+'" class="btn-primary magnetic reveal">Reserve your spot</a>'+
      '</div>'+
    '</section>'+
    '<div class="next-link">'+
      '<span class="lbl">Next trail</span>'+
      '<a href="trek.html?t='+encodeURIComponent(next.slug)+'">'+next.name+' \u2192</a>'+
    '</div>';
})();
