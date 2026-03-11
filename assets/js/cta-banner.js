/**
 * CTA Banner Loader
 * Reads banner configuration from Firebase Firestore and renders
 * a customizable call-to-action banner at the top of every page
 * (excluding admin pages).
 *
 * Loaded via <script src="assets/js/cta-banner.js"></script>
 * in any page template.
 */
(function () {
  'use strict';

  // ─── Guard: skip on admin pages ─────────────────────────────────────────────
  const path = window.location.pathname;
  if (path.includes('/admin/') || path.endsWith('/admin')) return;

  // ─── Session dismissal: remember if user dismissed this session ──────────────
  const DISMISS_KEY = 'ql_cta_banner_dismissed';
  if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

  // ─── Firebase config (same project as dashboard) ────────────────────────────
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyA2DI7LRK4kR7DZtGRridtmCZYl8F32cLg',
    authDomain: 'qualityexpress-c19f2.firebaseapp.com',
    projectId: 'qualityexpress-c19f2',
    storageBucket: 'qualityexpress-c19f2.firebasestorage.app',
    messagingSenderId: '201962327491',
    appId: '1:201962327491:web:342d771b9013d901cc8176',
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function loadScript(src, cb) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { console.warn('CTA Banner: failed to load', src); };
    document.head.appendChild(s);
  }

  // ─── Build & inject the banner DOM ──────────────────────────────────────────
  function renderBanner(cfg) {
    if (!cfg || !cfg.enabled) return;

    const bgColor     = cfg.bgColor      || '#CC0000';
    const textColor   = cfg.textColor    || '#FFFFFF';
    const align       = cfg.textAlign    || 'center';
    const fontSize    = cfg.fontSize     || '15px';
    const dismissible = cfg.dismissible  !== false;

    // Wrapper
    const banner = document.createElement('div');
    banner.id = 'ql-cta-banner';
    banner.setAttribute('role', 'banner');
    banner.setAttribute('aria-label', 'Site Announcement');
    banner.style.cssText = [
      'background:' + bgColor,
      'color:' + textColor,
      'padding:12px 48px 12px 20px',
      'text-align:' + align,
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
      'font-size:' + fontSize,
      'position:fixed',
      'top:0',
      'left:0',
      'z-index:100000',
      'width:100%',
      'box-sizing:border-box',
      'display:flex',
      'align-items:center',
      'justify-content:' + (align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'),
      'gap:14px',
      'flex-wrap:wrap',
      'line-height:1.5',
    ].join(';');

    // Content container
    const content = document.createElement('span');
    content.style.cssText = 'display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;';

    if (cfg.headline) {
      const h = document.createElement('strong');
      h.style.cssText = 'font-size:1.05em;letter-spacing:0.01em;';
      h.textContent = cfg.headline;
      content.appendChild(h);
    }
    if (cfg.subtext) {
      const s = document.createElement('span');
      s.style.cssText = 'opacity:0.92;';
      s.textContent = cfg.subtext;
      content.appendChild(s);
    }
    banner.appendChild(content);

    // Optional CTA Button
    if (cfg.buttonEnabled && cfg.buttonText) {
      const btn = document.createElement('a');
      btn.textContent = cfg.buttonText;

      const btnBg      = cfg.buttonBgColor      || '#FFFFFF';
      const btnTxt     = cfg.buttonTextColor     || '#CC0000';
      const btnBorder  = cfg.buttonBorderColor   || 'transparent';

      btn.style.cssText = [
        'display:inline-block',
        'padding:7px 20px',
        'background:' + btnBg,
        'color:' + btnTxt,
        'border-radius:4px',
        'font-weight:700',
        'font-size:0.88em',
        'border:2px solid ' + btnBorder,
        'cursor:pointer',
        'text-decoration:none',
        'white-space:nowrap',
        'transition:opacity 0.2s',
        'flex-shrink:0',
      ].join(';');

      btn.addEventListener('mouseover', function () { this.style.opacity = '0.85'; });
      btn.addEventListener('mouseout',  function () { this.style.opacity = '1'; });

      // Resolve button action
      switch (cfg.buttonAction) {
        case 'link':
          btn.href   = cfg.buttonUrl || '#';
          if (cfg.buttonNewTab) {
            btn.target = '_blank';
            btn.rel    = 'noopener noreferrer';
          }
          break;
        case 'maps':
          btn.href   = 'https://goo.gl/maps/LV1KKy4iULgEro7V7';
          btn.target = '_blank';
          btn.rel    = 'noopener noreferrer';
          break;
        case 'phone':
          btn.href = 'tel:2256589099';
          break;
        case 'apply':
          btn.href = '/careers';
          break;
        case 'specials':
          btn.href = '/specials/';
          break;
        case 'scroll':
          btn.href = '#';
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(cfg.buttonScrollTarget || '#page-content');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          });
          break;
        default:
          btn.href = '#';
      }

      banner.appendChild(btn);
    }

    // Dismiss button
    if (dismissible) {
      const close = document.createElement('button');
      close.setAttribute('aria-label', 'Close announcement');
      close.innerHTML = '&times;';
      close.style.cssText = [
        'position:absolute',
        'right:12px',
        'top:50%',
        'transform:translateY(-50%)',
        'background:transparent',
        'border:none',
        'color:' + textColor,
        'font-size:22px',
        'line-height:1',
        'cursor:pointer',
        'opacity:0.7',
        'padding:4px 8px',
        'transition:opacity 0.15s',
      ].join(';');
      close.addEventListener('mouseover', function () { this.style.opacity = '1'; });
      close.addEventListener('mouseout',  function () { this.style.opacity = '0.7'; });
      close.addEventListener('click', function () {
        sessionStorage.setItem(DISMISS_KEY, '1');
        banner.style.maxHeight = banner.offsetHeight + 'px';
        banner.style.transition = 'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease';
        requestAnimationFrame(function () {
          banner.style.maxHeight  = '0';
          banner.style.opacity    = '0';
          banner.style.padding    = '0';
          banner.style.overflow   = 'hidden';
        });
        setTimeout(function () {
          banner.remove();
          shiftCanvas(0);
        }, 320);
      });
      banner.appendChild(close);
    }

    // Insert at the very top of <body>
    document.body.insertBefore(banner, document.body.firstChild);

    // Push the canvas down by the banner height so the fixed site header
    // still appears immediately below the banner.
    function shiftCanvas(px) {
      const canvas = document.querySelector('.l-canvas');
      if (canvas) canvas.style.marginTop = px ? px + 'px' : '';
    }
    window.addEventListener('load', function () {
      shiftCanvas(banner.offsetHeight);
    });
    // Also apply immediately in case DOM is already ready
    shiftCanvas(banner.offsetHeight);
  }

  // ─── Fetch config from Firestore ─────────────────────────────────────────────
  function fetchAndRender() {
    try {
      let app;
      try {
        app = firebase.app('cta-banner');
      } catch (_) {
        try {
          app = firebase.app();   // use default if already initialised
        } catch (__) {
          app = firebase.initializeApp(FIREBASE_CONFIG, 'cta-banner');
        }
      }
      const db = firebase.firestore(app);
      db.collection('siteSettings').doc('ctaBanner').get()
        .then(function (doc) {
          if (doc.exists) renderBanner(doc.data());
        })
        .catch(function (err) {
          console.warn('CTA Banner: Firestore error', err);
        });
    } catch (e) {
      console.warn('CTA Banner init error', e);
    }
  }

  // ─── Bootstrap (load Firebase SDK if not present) ────────────────────────────
  function boot() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      fetchAndRender();
      return;
    }
    loadScript(
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
      function () {
        loadScript(
          'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js',
          fetchAndRender
        );
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
