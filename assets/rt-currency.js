/*
 * rt-currency.js — display-only multi-currency for Rangtarini.
 *
 * Shopify renders every price in INR (the store charges INR at checkout).
 * This engine rewrites the displayed text of every [data-rt-money] node into the
 * visitor's chosen currency, using the raw integer amount carried by the node.
 * It re-runs after cart Section-Rendering swaps, PDP variant switches and quantity
 * changes (pub/sub + a MutationObserver catch-all). Selection persists in
 * localStorage; switching never reloads the page.
 *
 * Config is provided by the theme via window.RtCurrencyConfig.
 */
(function () {
  'use strict';

  var STORAGE_CODE = 'rt-currency';
  var STORAGE_RATES = 'rt-currency-rates';
  var RATES_TTL = 12 * 60 * 60 * 1000; // 12h
  var RATES_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.min.json';
  var RATES_FALLBACK = 'https://latest.currency-api.pages.dev/v1/currencies/inr.min.json';

  // INR -> target rates. Last-resort fallback so prices never break if the fetch fails.
  var FALLBACK_RATES = {
    usd: 0.012, gbp: 0.0095, eur: 0.011, aed: 0.044,
    sgd: 0.016, aud: 0.018, cad: 0.016, sar: 0.045, jpy: 1.8,
  };

  // Currencies that have no minor unit (rendered with 0 decimals).
  var ZERO_DECIMAL = { JPY: true, KRW: true, VND: true, CLP: true, ISK: true };

  // Best-effort locale per currency for separators/symbol placement.
  var LOCALE = {
    USD: 'en-US', GBP: 'en-GB', EUR: 'de-DE', AED: 'en-AE', SGD: 'en-SG',
    AUD: 'en-AU', CAD: 'en-CA', SAR: 'ar-SA', JPY: 'ja-JP', INR: 'en-IN',
  };

  function readConfig() {
    var c = window.RtCurrencyConfig || {};
    var list = (c.list || ['INR']).map(function (x) { return String(x).toUpperCase().trim(); });
    if (list.indexOf('INR') === -1) list.unshift('INR');
    var def = String(c.default || 'INR').toUpperCase().trim();
    if (list.indexOf(def) === -1) def = 'INR';
    return {
      enabled: c.enabled !== false,
      list: list,
      default: def,
      rounding: c.rounding || 'charm_99',
    };
  }

  var config = readConfig();
  var code = config.default;
  var rates = {};
  var observer = null;

  /* ---- persistence (guarded, matches rt-collection.js pattern) ---- */
  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  function loadRates() {
    var cached = lsGet(STORAGE_RATES);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.rates) rates = parsed.rates;
      } catch (e) {}
    }
    // Always have something to convert with.
    if (!Object.keys(rates).length) rates = FALLBACK_RATES;
  }

  function ratesAreStale() {
    var cached = lsGet(STORAGE_RATES);
    if (!cached) return true;
    try {
      var parsed = JSON.parse(cached);
      return !parsed || !parsed.ts || (nowTs() - parsed.ts) > RATES_TTL;
    } catch (e) { return true; }
  }

  // Date.now via a tolerant wrapper (kept in one place for clarity).
  function nowTs() { return new Date().getTime(); }

  function fetchRates() {
    if (!ratesAreStale()) return;
    fetchFrom(RATES_PRIMARY).catch(function () { return fetchFrom(RATES_FALLBACK); }).catch(function () {});
  }

  function fetchFrom(url) {
    return fetch(url, { mode: 'cors' })
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (data) {
        var map = data && data.inr;
        if (!map || typeof map !== 'object') throw new Error('shape');
        rates = map;
        lsSet(STORAGE_RATES, JSON.stringify({ ts: nowTs(), rates: map }));
        convert(); // re-render with fresh rates
      });
  }

  /* ---- formatting ---- */
  function rateFor(c) {
    var r = rates[c.toLowerCase()];
    return typeof r === 'number' ? r : FALLBACK_RATES[c.toLowerCase()];
  }

  function applyRounding(value, decimals) {
    if (config.rounding === 'exact') return { value: value, decimals: decimals };
    if (config.rounding === 'nearest_int') return { value: Math.round(value), decimals: 0 };
    // charm_99
    if (decimals === 0) return { value: Math.round(value), decimals: 0 };
    var charm = Math.round(value) - 0.01;
    if (charm < 0.99) charm = 0.99;
    return { value: charm, decimals: 2 };
  }

  function format(amount, c) {
    var rate = rateFor(c);
    if (typeof rate !== 'number' || !isFinite(rate)) return null;
    var major = (amount / 100) * rate; // amount is in INR minor units (paise)
    var baseDecimals = ZERO_DECIMAL[c] ? 0 : 2;
    var rounded = applyRounding(major, baseDecimals);
    try {
      return new Intl.NumberFormat(LOCALE[c], {
        style: 'currency',
        currency: c,
        minimumFractionDigits: rounded.decimals,
        maximumFractionDigits: rounded.decimals,
      }).format(rounded.value);
    } catch (e) {
      return null;
    }
  }

  /* ---- DOM conversion ---- */
  function convertNode(el) {
    if (el.__rtInr === undefined) el.__rtInr = el.textContent; // stash exact Shopify INR string once
    if (code === 'INR') { el.textContent = el.__rtInr; return; }
    var amount = parseInt(el.getAttribute('data-rt-money'), 10);
    if (isNaN(amount)) return;
    var out = format(amount, code);
    el.textContent = out !== null ? out : el.__rtInr; // fall back to INR if a rate is missing
  }

  // Disconnect the observer while we mutate text so our own writes don't re-trigger it.
  function convert(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (observer) observer.disconnect();
    var nodes = scope.querySelectorAll('[data-rt-money]');
    for (var i = 0; i < nodes.length; i++) convertNode(nodes[i]);
    if (observer) observe();
  }

  /* ---- public API ---- */
  function setCurrency(next) {
    next = String(next || '').toUpperCase();
    if (config.list.indexOf(next) === -1) return;
    code = next;
    lsSet(STORAGE_CODE, code);
    convert();
    syncPickers();
  }

  function syncPickers() {
    document.querySelectorAll('rt-currency-picker select').forEach(function (sel) {
      if (sel.value !== code) sel.value = code;
    });
  }

  /* ---- re-render hooks ---- */
  var debounceTimer = null;
  function debouncedConvert() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { convert(); }, 60);
  }

  function observe() {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function startObserver() {
    if (!('MutationObserver' in window)) return;
    observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('[data-rt-money]')) return debouncedConvert();
          if (n.querySelector && n.querySelector('[data-rt-money]')) return debouncedConvert();
        }
      }
    });
    observe();
  }

  function init() {
    if (!config.enabled) return;
    loadRates();
    var stored = lsGet(STORAGE_CODE);
    if (stored && config.list.indexOf(stored.toUpperCase()) !== -1) code = stored.toUpperCase();
    convert();
    syncPickers();
    fetchRates();
    startObserver();

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, debouncedConvert);
      subscribe(PUB_SUB_EVENTS.quantityUpdate, debouncedConvert);
      subscribe(PUB_SUB_EVENTS.variantChange, debouncedConvert);
    }
  }

  window.RtCurrency = {
    convert: convert,
    setCurrency: setCurrency,
    format: format,
    getCode: function () { return code; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ---- picker web component ---- */
if (!customElements.get('rt-currency-picker')) {
  customElements.define(
    'rt-currency-picker',
    class RtCurrencyPicker extends HTMLElement {
      constructor() {
        super();
        this.select = this.querySelector('select');
        if (this.select) {
          this.select.addEventListener('change', this.onChange.bind(this));
          if (window.RtCurrency) this.select.value = window.RtCurrency.getCode();
        }
      }

      onChange(event) {
        if (window.RtCurrency) window.RtCurrency.setCurrency(event.target.value);
      }
    }
  );
}
