/**
 * ============================================================
 * HOKAGE22B.COM — Public Open API SDK (v1.0)
 * Zero-dependency client for browser & Node.js
 * Docs: https://hokage22b.com/construir
 * ============================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HokageAPI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BASE_URL = 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/public-api';
  var APP_NAME = 'hokage22b-web-client';

  function setBaseUrl(url) {
    if (url && typeof url === 'string') {
      BASE_URL = url.replace(/\/+$/, '');
    }
  }

  function setAppName(name) {
    if (name && typeof name === 'string') {
      APP_NAME = name.trim().slice(0, 60);
    }
  }

  function buildQuery(params) {
    if (!params || typeof params !== 'object') return '';
    var pairs = [];
    Object.keys(params).forEach(function (key) {
      var val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(val)));
      }
    });
    return pairs.length ? '?' + pairs.join('&') : '';
  }

  async function request(path, params) {
    var cleanPath = '/' + String(path || '').replace(/^\/+/, '');
    var url = BASE_URL + '/v1' + cleanPath + buildQuery(params);
    var res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Hokage-Client': APP_NAME
      }
    });
    var json = await res.json();
    if (!res.ok || !json.ok) {
      var err = new Error((json && json.error) || ('HTTP ' + res.status));
      err.code = (json && json.code) || 'API_ERROR';
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  return {
    version: '1.0.0',
    getBaseUrl: function () { return BASE_URL; },
    setBaseUrl: setBaseUrl,
    setAppName: setAppName,
    health: function () {
      return request('/health');
    },
    getPassport: function (username) {
      var clean = String(username || '').trim().replace(/^@+/, '');
      return request('/passaportes', { u: clean });
    },
    listPassports: function (opts) {
      return request('/passaportes', opts || {});
    },
    getMonteHokage: function (opts) {
      return request('/monte-hokage', opts || {});
    },
    listVila: function (opts) {
      return request('/vila', opts || {});
    },
    validateWallet: function (address) {
      return request('/tools/validate-wallet', { address: address });
    },
    getPiPrice: function (currency) {
      return request('/tools/pi-price', { currency: currency || 'BRL' });
    },
    getStats: function () {
      return request('/stats');
    }
  };
}));
