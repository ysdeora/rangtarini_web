/**
 * ─────────────────────────────────────────────────────────────
 *  RANGTARINI — rt-collection.js  v3
 *  Upload to: assets/rt-collection.js
 * ─────────────────────────────────────────────────────────────
 *
 *  Fixes in v3:
 *  • Panels now use position:fixed + getBoundingClientRect()
 *    so the filter bar's overflow:auto can't clip them.
 *  • Price track fill uses linear-gradient (no fill div).
 *  • Mobile bottom-sheet overlay is a dedicated DOM element.
 *  • Scroll + resize listeners reposition any open panel.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */
  function getBtn(key)   { return document.querySelector('.rt-f-btn[data-dp="' + key + '"]'); }
  function getPanel(key) { return document.getElementById('dp-' + key); }


  /* ══════════════════════════════════════════════════════════
     OVERLAY — invisible click-capture layer that closes the
     open panel when user taps/clicks outside it.
  ══════════════════════════════════════════════════════════ */
  var overlay = (function () {
    var el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:799;';
    document.body.appendChild(el);
    el.addEventListener('click', closeDropdown);
    return el;
  })();

  function showOverlay() { overlay.style.display = 'block'; }
  function hideOverlay() { overlay.style.display = 'none'; }


  /* ══════════════════════════════════════════════════════════
     DROPDOWN POSITIONING
     Uses position:fixed + getBoundingClientRect on ALL screen
     sizes — panels always open directly below their button.
  ══════════════════════════════════════════════════════════ */
  function positionPanel(key) {
    var btn   = getBtn(key);
    var panel = getPanel(key);
    if (!btn || !panel) return;

    var rect  = btn.getBoundingClientRect();
    var viewW = window.innerWidth;

    /* Min panel width: wider of button or 230px,
       capped so it never overflows the viewport. */
    var panelW = Math.min(Math.max(rect.width, 230), viewW - 16);

    /* Align to button's left edge; shift left when it would clip the right edge */
    var left = rect.left;
    if (left + panelW > viewW - 8) left = viewW - panelW - 8;
    if (left < 8) left = 8;

    panel.style.top   = rect.bottom + 'px';
    panel.style.left  = left + 'px';
    panel.style.width = panelW + 'px';
  }


  /* ══════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════ */
  var openKey = null;

  function openDropdown(key) {
    var btn   = getBtn(key);
    var panel = getPanel(key);
    if (!btn || !panel) return;

    positionPanel(key);           /* position before reveal to avoid 0,0 flash */
    panel.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    openKey = key;
    showOverlay();                /* transparent catch-layer for outside clicks */
  }

  function closeDropdown() {
    if (!openKey) return;
    var btn   = getBtn(openKey);
    var panel = getPanel(openKey);
    if (panel) panel.setAttribute('hidden', '');
    if (btn)   btn.setAttribute('aria-expanded', 'false');
    openKey = null;
    hideOverlay();
  }

  function toggleDropdown(key) {
    openKey === key ? closeDropdown() : (closeDropdown(), openDropdown(key));
  }


  /* ══════════════════════════════════════════════════════════
     REPOSITION ON SCROLL / RESIZE
     Keeps panel anchored to button when user scrolls or
     resizes window with a dropdown already open.
  ══════════════════════════════════════════════════════════ */
  function onScrollResize() {
    if (openKey) positionPanel(openKey);
  }
  window.addEventListener('scroll', onScrollResize, { passive: true });
  window.addEventListener('resize', onScrollResize, { passive: true });


  /* ══════════════════════════════════════════════════════════
     BIND FILTER BUTTONS
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.rt-f-btn[data-dp]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown(btn.getAttribute('data-dp'));
    });
  });

  /* Close on outside click */
  document.addEventListener('click', function (e) {
    if (openKey && !e.target.closest('.rt-dp-wrap')) closeDropdown();
  });

  /* Escape key */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && openKey) {
      var btn = getBtn(openKey);
      closeDropdown();
      if (btn) btn.focus();
    }
  });


  /* ══════════════════════════════════════════════════════════
     CHECKBOX FILTERS → submit on change
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.rt-f-checkbox').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var opt = cb.closest('.rt-dp-opt');
      if (opt) opt.classList.toggle('rt-sel', cb.checked);
      var form = document.getElementById('rt-filter-form');
      if (form) setTimeout(function () { form.submit(); }, 80);
    });
  });


  /* ══════════════════════════════════════════════════════════
     DUAL-RANGE PRICE SLIDER
     The active-range fill is painted as a CSS linear-gradient
     on the track element itself — no separate fill div, no
     z-index or clipping problems.
  ══════════════════════════════════════════════════════════ */
  var COLOR_BORDER = '#D4CFC6';
  var COLOR_ACTIVE = '#181512';

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
    var globalMax = parseFloat(wrap.dataset.max) || 62000;
    var stepSize  = Math.max(100, Math.round(globalMax / 200));

    minRange.min = maxRange.min = globalMin;
    minRange.max = maxRange.max = globalMax;
    minRange.step = maxRange.step = stepSize;

    minRange.value = parseFloat(wrap.dataset.curMin) || globalMin;
    maxRange.value = parseFloat(wrap.dataset.curMax) || globalMax;

    function gradient(loPct, hiPct) {
      return 'linear-gradient(to right,'
        + COLOR_BORDER + ' ' + loPct + '%,'
        + COLOR_ACTIVE + ' ' + loPct + '%,'
        + COLOR_ACTIVE + ' ' + hiPct + '%,'
        + COLOR_BORDER + ' ' + hiPct + '%)';
    }

    function refreshFill() {
      var lo = parseFloat(minRange.value);
      var hi = parseFloat(maxRange.value);

      /* Enforce minimum gap so thumbs don't overlap */
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

      /* SECONDARY: track div (works in Firefox and where shadow DOM
         doesn't interfere with z-index). */
      if (track) track.style.background = grad;

      /* PRIMARY: paint gradient on the outer element's OWN background.
         This layer is rendered by the browser BEFORE any children —
         including WebKit's shadow DOM track elements — so nothing can
         cover it. It is always visible regardless of z-index battles.

         Alignment math:
           Thumb travel range = [8px … W-8px] within the W-wide input
           (browser keeps thumb center 8px = thumbRadius from each edge).
           backgroundSize width = W - 16px  →  calc(100% - 16px)
           backgroundPosition   = 8px from left  →  '8px center'
           Then: loPct% of (W-16px) + 8px = thumb position at lo ✓    */
      if (outer) {
        outer.style.backgroundImage    = grad;
        outer.style.backgroundRepeat   = 'no-repeat';
        outer.style.backgroundSize     = 'calc(100% - 16px) 4px';
        outer.style.backgroundPosition = '8px center';
      }

      /* Update price labels */
      if (minDisplay) minDisplay.textContent = Math.round(lo).toLocaleString('en-IN');
      if (maxDisplay) maxDisplay.textContent = Math.round(hi).toLocaleString('en-IN');

      /* Update hidden inputs — only send non-default values */
      if (minHidden) minHidden.value = (lo > globalMin) ? Math.round(lo) : '';
      if (maxHidden) maxHidden.value = (hi < globalMax) ? Math.round(hi) : '';
    }

    minRange.addEventListener('input', refreshFill);
    maxRange.addEventListener('input', refreshFill);
    refreshFill(); /* paint initial state */
  }

  document.querySelectorAll('.rt-price-slider-wrap').forEach(initSlider);

  /* Apply button submits the filter form */
  document.querySelectorAll('.rt-price-apply-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var form = document.getElementById('rt-filter-form');
      if (form) form.submit();
    });
  });

})();