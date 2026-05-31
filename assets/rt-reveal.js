/* Rangtarini scroll-reveal — adds `.rt-in` to [data-rt-reveal] and .rt-mask
   elements as they enter the viewport. Reduced-motion + no-IO safe.
   Re-runs on shopify:section:load so it works inside the theme editor. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function show(el) {
    el.classList.add('rt-in');
  }

  function reveal(root) {
    var scope = root || document;
    var els = scope.querySelectorAll('[data-rt-reveal]:not(.rt-in), .rt-mask:not(.rt-in)');
    if (!els.length) return;

    if (reduce.matches || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, show);
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  if (document.readyState !== 'loading') {
    reveal();
  } else {
    document.addEventListener('DOMContentLoaded', function () { reveal(); });
  }

  document.addEventListener('shopify:section:load', function (event) {
    reveal(event.target);
  });
})();
