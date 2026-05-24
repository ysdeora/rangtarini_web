/**
 * ─────────────────────────────────────────────────────────────
 *  RANGTARINI — rt-collection.js  v4
 *  Editorial redesign: sidebar toggle, view switcher, price slider
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     HEADER HEIGHT → CSS VARIABLES
     Sets --rt-header-h and --rt-toolbar-bottom on :root so
     both the sticky toolbar and sidebar stick correctly below
     whatever the live header height actually is.
  ══════════════════════════════════════════════════════════ */
  function setHeightVars() {
    var header =
      document.querySelector('.rt-hd-wrap') ||
      document.querySelector('.shopify-section-group-header-group') ||
      document.querySelector('sticky-header') ||
      document.querySelector('.shopify-section-header') ||
      document.querySelector('.header-wrapper') ||
      document.querySelector('header');
    var headerH = header ? header.offsetHeight : 61;

    var toolbar = document.querySelector('.rt-toolbar');
    var toolbarH = toolbar ? toolbar.offsetHeight : 57;

    var root = document.documentElement;
    root.style.setProperty('--rt-header-h', headerH + 'px');
    root.style.setProperty('--rt-toolbar-bottom', (headerH + toolbarH) + 'px');
  }

  document.addEventListener('DOMContentLoaded', setHeightVars);
  window.addEventListener('resize', setHeightVars, { passive: true });


  /* ══════════════════════════════════════════════════════════
     SIDEBAR TOGGLE
  ══════════════════════════════════════════════════════════ */
  var sidebar = document.querySelector('.rt-sidebar');
  var toggleBtn = document.querySelector('.rt-sidebar-toggle');
  var mobileOverlay = document.querySelector('.rt-mobile-overlay');
  var sidebarCloseBtn = document.querySelector('.rt-sidebar-close-btn');

  var isMobile = function () { return window.innerWidth <= 768; };

  function isSidebarOpen() {
    if (isMobile()) return sidebar && sidebar.classList.contains('rt-sidebar--mobile-open');
    return sidebar && sidebar.classList.contains('rt-sidebar--open');
  }

  function openSidebar() {
    if (!sidebar) return;
    if (isMobile()) {
      sidebar.classList.add('rt-sidebar--mobile-open');
      if (mobileOverlay) mobileOverlay.classList.add('rt-mobile-overlay--active');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.add('rt-sidebar--open');
      /* Re-run height calc so sidebar top aligns with refreshed toolbar height */
      setHeightVars();
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', 'true');
      toggleBtn.querySelector('.rt-toggle-label').textContent = 'Hide filters';
    }
    try { sessionStorage.setItem('rt-sidebar-open', '1'); } catch (e) {}
  }

  function closeSidebar() {
    if (!sidebar) return;
    if (isMobile()) {
      sidebar.classList.remove('rt-sidebar--mobile-open');
      if (mobileOverlay) mobileOverlay.classList.remove('rt-mobile-overlay--active');
      document.body.style.overflow = '';
    } else {
      sidebar.classList.remove('rt-sidebar--open');
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.querySelector('.rt-toggle-label').textContent = 'Filter';
    }
    try { sessionStorage.setItem('rt-sidebar-open', '0'); } catch (e) {}
  }

  function toggleSidebar() {
    isSidebarOpen() ? closeSidebar() : openSidebar();
  }

  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
  if (mobileOverlay) mobileOverlay.addEventListener('click', closeSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

  /* Escape key closes sidebar on mobile */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && isMobile() && isSidebarOpen()) {
      closeSidebar();
    }
  });

  /* Restore sidebar state from sessionStorage (desktop only) */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (!isMobile()) {
        var saved = sessionStorage.getItem('rt-sidebar-open');
        /* Default open on desktop if no saved preference */
        if (saved === null || saved === '1') {
          openSidebar();
        }
      }
    } catch (e) {
      if (!isMobile()) openSidebar();
    }
  });


  /* ══════════════════════════════════════════════════════════
     VIEW SWITCHER (2 / 3 / 4 columns)
  ══════════════════════════════════════════════════════════ */
  var grid = document.querySelector('.rt-grid');
  var viewBtns = document.querySelectorAll('.rt-view-btn');

  function setView(n) {
    if (!grid) return;
    grid.style.setProperty('--rt-cols', n);
    viewBtns.forEach(function (btn) {
      var active = btn.getAttribute('data-view') === String(n);
      btn.classList.toggle('rt-view-btn--active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    try { sessionStorage.setItem('rt-view', n); } catch (e) {}
  }

  viewBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(parseInt(btn.getAttribute('data-view'), 10));
    });
  });

  /* Restore saved view */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      var saved = sessionStorage.getItem('rt-view');
      if (saved) setView(parseInt(saved, 10));
    } catch (e) {}
  });


  /* ══════════════════════════════════════════════════════════
     CHECKBOX FILTERS → submit form on change (80ms debounce)
  ══════════════════════════════════════════════════════════ */
  var submitTimer;
  document.querySelectorAll('.rt-f-checkbox').forEach(function (cb) {
    cb.addEventListener('change', function () {
      clearTimeout(submitTimer);
      submitTimer = setTimeout(function () {
        var form = document.getElementById('rt-filter-form');
        if (form) form.submit();
      }, 80);
    });
  });


  /* ══════════════════════════════════════════════════════════
     DUAL-RANGE PRICE SLIDER
  ══════════════════════════════════════════════════════════ */
  var COLOR_TRACK  = 'rgba(10,10,10,0.2)';
  var COLOR_ACTIVE = '#0a0a0a';

  function gradient(loPct, hiPct) {
    return 'linear-gradient(to right,'
      + COLOR_TRACK  + ' ' + loPct + '%,'
      + COLOR_ACTIVE + ' ' + loPct + '%,'
      + COLOR_ACTIVE + ' ' + hiPct + '%,'
      + COLOR_TRACK  + ' ' + hiPct + '%)';
  }

  function initSlider(wrap) {
    var minRange   = wrap.querySelector('.rt-range-min');
    var maxRange   = wrap.querySelector('.rt-range-max');
    var track      = wrap.querySelector('.rt-slider-track');
    var outer      = wrap.querySelector('.rt-slider-outer');
    var minDisplay = wrap.querySelector('.rt-price-min-val');
    var maxDisplay = wrap.querySelector('.rt-price-max-val');
    var minHidden  = wrap.querySelector('.rt-price-hidden-min');
    var maxHidden  = wrap.querySelector('.rt-price-hidden-max');

    if (!minRange || !maxRange) return;

    var globalMin = parseFloat(wrap.dataset.min) || 0;
    var globalMax = parseFloat(wrap.dataset.max) || 100000;
    var stepSize  = Math.max(100, Math.round(globalMax / 200));

    minRange.min = maxRange.min = globalMin;
    minRange.max = maxRange.max = globalMax;
    minRange.step = maxRange.step = stepSize;
    minRange.value = parseFloat(wrap.dataset.curMin) || globalMin;
    maxRange.value = parseFloat(wrap.dataset.curMax) || globalMax;

    function refreshFill() {
      var lo = parseFloat(minRange.value);
      var hi = parseFloat(maxRange.value);
      var gap = stepSize;

      if (lo >= hi - gap) {
        if (document.activeElement === minRange) {
          lo = hi - gap;
          minRange.value = lo;
        } else {
          hi = lo + gap;
          maxRange.value = hi;
        }
      }

      var loPct = ((lo - globalMin) / (globalMax - globalMin)) * 100;
      var hiPct = ((hi - globalMin) / (globalMax - globalMin)) * 100;
      var grad  = gradient(loPct, hiPct);

      if (track) track.style.background = grad;
      if (outer) {
        outer.style.backgroundImage    = grad;
        outer.style.backgroundRepeat   = 'no-repeat';
        outer.style.backgroundSize     = 'calc(100% - 16px) 4px';
        outer.style.backgroundPosition = '8px center';
      }

      if (minDisplay) minDisplay.textContent = Math.round(lo).toLocaleString('en-IN');
      if (maxDisplay) maxDisplay.textContent = Math.round(hi).toLocaleString('en-IN');
      if (minHidden)  minHidden.value  = (lo > globalMin) ? Math.round(lo) : '';
      if (maxHidden)  maxHidden.value  = (hi < globalMax) ? Math.round(hi) : '';
    }

    minRange.addEventListener('input', refreshFill);
    maxRange.addEventListener('input', refreshFill);
    refreshFill();
  }

  document.querySelectorAll('.rt-price-slider-wrap').forEach(initSlider);

  document.querySelectorAll('.rt-price-apply-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var form = document.getElementById('rt-filter-form');
      if (form) form.submit();
    });
  });


  /* ══════════════════════════════════════════════════════════
     WISHLIST TOGGLE (client-side only)
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.rt-wishlist-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var wished = btn.classList.toggle('rt-wishlist-btn--wished');
      var path = btn.querySelector('path');
      if (path) path.setAttribute('fill', wished ? 'currentColor' : 'none');
      btn.setAttribute('aria-label', wished ? 'Remove from wishlist' : 'Add to wishlist');
    });
  });

})();
