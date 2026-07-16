/* Generic carousel: native scroll-snap track + arrow buttons that
   scroll by exactly one card width, so touch/swipe works for free
   and the buttons just nudge the same native scroll position.
   Reused for both the fleet and services carousels. */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTOPLAY_DELAY = 4000;
  var RESUME_DELAY = 4500;

  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var prevBtn = carousel.querySelector('.carousel-arrow.prev');
    var nextBtn = carousel.querySelector('.carousel-arrow.next');
    if (!track) return;

    /* Seamless infinite loop: clone the first card onto the end of the
       track so the last real card always has something to peek in from
       the right instead of empty space. The actual wrap happens in
       goNext/goPrev below (see note there) rather than via a passive
       scroll listener — a listener that fires on arrival can't tell
       "just scrolled to the last real card" apart from "scrolled past
       it to the clone" whenever the track shows more than one card at
       a time, since both land at the same clamped maxScroll. */
    if (track.children.length > 1) {
      var leadClone = track.firstElementChild.cloneNode(true);
      leadClone.setAttribute('aria-hidden', 'true');
      leadClone.querySelectorAll('a, button, input, select, textarea').forEach(function (el) {
        el.setAttribute('tabindex', '-1');
      });
      track.appendChild(leadClone);
    }

    function step() {
      var card = track.firstElementChild;
      if (!card) return 0;
      var style = getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    /* The track's own padding means its "resting at the start" scrollLeft
       isn't exactly 0 (it's a few px, from --space-2) — a fixed, generous
       threshold handles that without needing to snapshot the real value,
       which (read this early, before layout has settled) isn't reliable. */
    var MIN_SCROLL_SLOP = 16;

    /* Only loop when the track is already resting at its scroll limit
       — i.e. this click is the one *past* the last real card — so every
       real card gets its own stop first. */
    function goNext() {
      var maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      } else {
        track.scrollBy({ left: step(), behavior: 'smooth' });
      }
    }
    function goPrev() {
      if (track.scrollLeft <= MIN_SCROLL_SLOP) {
        /* Wrapping to the end: scrollTo() a raw pixel target here would
           land on a position that isn't any card's scroll-snap-align
           point (the true max is a few px short of the last card's own
           snap point), and CSS scroll-snap silently reverts an instant
           or smooth scrollTo that doesn't resolve to a snap point. A
           scrollBy() large enough to run past the end and get clamped
           by the browser doesn't have that problem — it's the same
           mechanism the forward direction already relies on. */
        var realCardCount = track.children.length - 1; /* minus the clone */
        track.scrollBy({ left: (realCardCount - 1) * step(), behavior: reducedMotion ? 'auto' : 'smooth' });
      } else {
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', goPrev);
    if (nextBtn) nextBtn.addEventListener('click', goNext);

    /* Autoplay: loop to the next card every few seconds, pausing
       whenever the user is looking at or touching the carousel, and
       only running while it's actually on screen. */
    if (!reducedMotion && track.children.length > 1) {
      var timer = null;
      var isVisible = false;
      var isPaused = false;
      var resumeTimeout = null;

      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function start() {
        stop();
        if (isVisible && !isPaused) timer = setInterval(goNext, AUTOPLAY_DELAY);
      }
      function pauseThenResume() {
        isPaused = true;
        stop();
        clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(function () { isPaused = false; start(); }, RESUME_DELAY);
      }

      carousel.addEventListener('mouseenter', function () { isPaused = true; stop(); });
      carousel.addEventListener('mouseleave', function () { isPaused = false; start(); });
      carousel.addEventListener('focusin', function () { isPaused = true; stop(); });
      carousel.addEventListener('focusout', function () { isPaused = false; start(); });
      carousel.addEventListener('touchstart', function () { isPaused = true; stop(); }, { passive: true });
      carousel.addEventListener('touchend', pauseThenResume, { passive: true });
      if (prevBtn) prevBtn.addEventListener('click', pauseThenResume);
      if (nextBtn) nextBtn.addEventListener('click', pauseThenResume);

      if ('IntersectionObserver' in window) {
        var visibilityIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            isVisible = entry.isIntersecting;
            if (isVisible) start(); else stop();
          });
        }, { threshold: 0.4 });
        visibilityIO.observe(carousel);
      } else {
        isVisible = true;
        start();
      }
    }
  });

  /* Small settle "bounce" on whichever card snaps into center as the
     user swipes through a carousel, for tactile touch feedback. */
  if (!reducedMotion && 'IntersectionObserver' in window) {
    function watchSwipeBounce(container) {
      var items = container.children;
      if (!items.length) return;
      var active = null;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.intersectionRatio > 0.7 && entry.target !== active) {
            active = entry.target;
            entry.target.classList.remove('is-swipe-bounce');
            void entry.target.offsetWidth;
            entry.target.classList.add('is-swipe-bounce');
          }
        });
      }, { root: container, threshold: [0.7] });
      Array.prototype.forEach.call(items, function (item) { io.observe(item); });
    }

    document.querySelectorAll('.carousel-track').forEach(watchSwipeBounce);
    var statRow = document.querySelector('.stat-row');
    if (statRow) watchSwipeBounce(statRow);
  }
})();
