/* Prumo · site.js — comportamento compartilhado (reveals, nav, carrossel, forms) */
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveals ---------- */
  function initReveals(){
    var root = document.documentElement;
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    // garante visibilidade dura (sem transição) — usado como rede de segurança
    function forceVisible(){ root.classList.add('anim-off'); }
    // sem JS de animação ou movimento reduzido: conteúdo já é visível por padrão
    if (reduce || !('IntersectionObserver' in window)) return;
    root.classList.add('anim'); // agora esconde e passa a revelar
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function(el){ io.observe(el); });
    // above-the-fold: revela já (duplo rAF p/ pintar o estado inicial antes da transição)
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      reveals.forEach(function(el){ if (el.getBoundingClientRect().top < (window.innerHeight||800)*0.96) el.classList.add('in'); });
    }); });
    // rede de segurança: se as transições não rodarem, força tudo visível
    var hardStop = function(){ forceVisible(); };
    window.addEventListener('load', function(){ setTimeout(hardStop, 1200); });
    setTimeout(hardStop, 2000);
  }

  /* ---------- mobile nav ---------- */
  function initNav(){
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
    });
  }

  /* ---------- carrossel ---------- */
  function initCarousel(){
    var track = document.getElementById('carTrack');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var total = slides.length;
    var prev = document.getElementById('carPrev');
    var next = document.getElementById('carNext');
    var dotsWrap = document.getElementById('carDots');
    var count = document.getElementById('carCount');
    var index = 0, dots = [];
    for (var i=0;i<total;i++){ (function(i){
      var b = document.createElement('button');
      b.type='button'; b.setAttribute('role','tab');
      b.setAttribute('aria-label','Ir para a tela '+(i+1)+' de '+total);
      b.addEventListener('click', function(){ go(i); });
      dotsWrap.appendChild(b); dots.push(b);
    })(i); }
    function pad(n){ return (n<10?'0':'')+n; }
    function render(){
      track.style.transform='translateX('+(-index*100)+'%)';
      slides.forEach(function(s,i){
        s.setAttribute('aria-hidden', i===index?'false':'true');
        s.querySelectorAll('a,button,[tabindex]').forEach(function(el){ el.tabIndex = (i===index?0:-1); });
      });
      dots.forEach(function(d,i){ d.setAttribute('aria-current', i===index?'true':'false'); });
      if(prev) prev.disabled = (index===0);
      if(next) next.disabled = (index===total-1);
      if(count) count.textContent = pad(index+1)+' / '+pad(total);
    }
    function go(i){ index=Math.max(0,Math.min(total-1,i)); render(); }
    if(prev) prev.addEventListener('click', function(){ go(index-1); });
    if(next) next.addEventListener('click', function(){ go(index+1); });
    var carousel = document.querySelector('.carousel');
    carousel.addEventListener('keydown', function(e){
      if (e.key==='ArrowLeft'){ e.preventDefault(); go(index-1); }
      else if (e.key==='ArrowRight'){ e.preventDefault(); go(index+1); }
    });
    var sx=null, sy=null, vp=document.querySelector('.car-viewport');
    vp.addEventListener('touchstart', function(e){ sx=e.touches[0].clientX; sy=e.touches[0].clientY; }, {passive:true});
    vp.addEventListener('touchend', function(e){
      if(sx===null) return;
      var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
      if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)){ if(dx<0) go(index+1); else go(index-1); }
      sx=sy=null;
    }, {passive:true});
    render();
  }

  /* ---------- forms (Web3Forms → contato@gruporavs.com.br) ---------- */
  var W3F_KEY = 'a599ec93-b989-4323-b257-684b7c8d0960'; // substituir pela chave gerada em web3forms.com

  var FORM_SUBJECT = {
    'familias-beta':         'Prumo · Interesse Famílias (beta)',
    'escolas-descoberta':    'Prumo · Interesse Escolas (descoberta)',
    'institucional-contato': 'Prumo · Contato Institucional'
  };

  function initForms(){
    document.querySelectorAll('form.lead-form').forEach(function(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var ok      = form.parentNode.querySelector('.form-ok');
        var btn     = form.querySelector('button[type="submit"]');
        var formKey = form.getAttribute('data-form') || 'lead';
        var subject = FORM_SUBJECT[formKey] || 'Prumo · Lead';

        // coleta campos
        var fd = new FormData(form);
        var payload = { access_key: W3F_KEY, subject: subject };
        fd.forEach(function(v, k){ payload[k] = v; });
        payload._form = formKey;
        payload._ts   = new Date().toISOString();

        // estado de loading
        if (btn){ btn.disabled = true; btn.textContent = 'Enviando…'; }

        fetch('https://api.web3forms.com/submit', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body:    JSON.stringify(payload)
        })
        .then(function(r){ return r.json(); })
        .then(function(res){
          if (res.success){
            form.style.display = 'none';
            if (ok){ ok.classList.add('show'); ok.setAttribute('tabindex','-1'); ok.focus(); }
          } else {
            if (btn){ btn.disabled = false; btn.textContent = 'Tentar novamente'; }
            console.error('Web3Forms error:', res);
          }
        })
        .catch(function(err){
          if (btn){ btn.disabled = false; btn.textContent = 'Tentar novamente'; }
          console.error('Fetch error:', err);
        });
      });
    });
  }

  function boot(){ initReveals(); initNav(); initCarousel(); initForms(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
