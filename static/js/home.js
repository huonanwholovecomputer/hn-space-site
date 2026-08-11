/* 首页滚动入场动画：渐进增强，无 JS 或减少动态时直接显示 */
(function () {
  'use strict';
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!els.length) {
    return;
  }

  var show = function (el) {
    el.classList.add('is-in');
  };

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(show);
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        var siblings = entry.target.parentElement.children;
        var index = Array.prototype.indexOf.call(siblings, entry.target);
        entry.target.style.transitionDelay = Math.min(index, 5) * 70 + 'ms';
        show(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -36px 0px' }
  );

  els.forEach(function (el) {
    io.observe(el);
  });
})();
