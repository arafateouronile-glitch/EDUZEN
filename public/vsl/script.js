function scrollToForm() {
  document.getElementById('formulaire').scrollIntoView({ behavior: 'smooth' });
}

/* ── Sticky nav ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', function() {
  navbar.classList.toggle('scrolled', window.scrollY > 80);
}, { passive: true });

/* ── Logo scroll to top ── */
document.querySelector('.logo').addEventListener('click', function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ── Nav CTA button ── */
document.getElementById('nav-cta').addEventListener('click', scrollToForm);

/* ── Urgency bar button ── */
document.getElementById('urgency-cta').addEventListener('click', scrollToForm);

/* ── VSL Placeholder play ── */
document.getElementById('vsl-placeholder').addEventListener('click', function() {
  var placeholder = document.getElementById('vsl-placeholder');
  var player = document.getElementById('vsl-player');
  placeholder.classList.add('hidden');
  player.style.display = 'block';
  var src = player.getAttribute('src');
  if (src && src !== 'VOTRE_URL_VIDEO') {
    player.setAttribute('src', src + (src.includes('?') ? '&' : '?') + 'autoplay=1');
  }
});

/* ── Fade-up on scroll ── */
var fadeEls = document.querySelectorAll('.fade-up');
var fadeObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
fadeEls.forEach(function(el) { fadeObserver.observe(el); });

/* ── CountUp for stats ── */
var countEls = document.querySelectorAll('[data-count]');
var countObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    var el = entry.target;
    var target = parseInt(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1200;
    var start = performance.now();
    function update(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(update);
    countObserver.unobserve(el);
  });
}, { threshold: 0.3 });
countEls.forEach(function(el) { countObserver.observe(el); });

/* ── FAQ accordion ── */
document.querySelectorAll('.faq-question').forEach(function(questionEl) {
  questionEl.addEventListener('click', function() {
    var item = questionEl.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(i) { i.classList.remove('open'); });
    if (!isOpen) item.classList.add('open');
  });
});

/* ── Form validation & submit ── */
document.getElementById('signup-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var valid = true;
  var fields = [
    { id: 'prenom',    errId: 'err-prenom',    validate: function(v) { return v.trim().length > 0; } },
    { id: 'nom',       errId: 'err-nom',       validate: function(v) { return v.trim().length > 0; } },
    { id: 'email',     errId: 'err-email',     validate: function(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); } },
    { id: 'telephone', errId: 'err-telephone', validate: function(v) { return v.trim().length >= 10; } },
    { id: 'organisme', errId: 'err-organisme', validate: function(v) { return v.trim().length > 0; } },
  ];
  fields.forEach(function(f) {
    var input = document.getElementById(f.id);
    var err = document.getElementById(f.errId);
    var ok = f.validate(input.value);
    input.classList.toggle('error', !ok);
    err.classList.toggle('visible', !ok);
    if (!ok) valid = false;
  });
  if (!valid) return;
  var btn = document.getElementById('submit-btn');
  btn.classList.add('loading');
  setTimeout(function() {
    btn.classList.remove('loading');
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('success-msg').classList.add('visible');
  }, 1800);
});

/* ── Mini CTA form ── */
document.getElementById('mini-form').addEventListener('submit', function(e) {
  e.preventDefault();
  scrollToForm();
  var data = new FormData(e.target);
  var prenom = data.get('prenom_mini');
  var email  = data.get('email_mini');
  var tel    = data.get('tel_mini');
  if (prenom) document.getElementById('prenom').value = prenom;
  if (email)  document.getElementById('email').value = email;
  if (tel)    document.getElementById('telephone').value = tel;
});
