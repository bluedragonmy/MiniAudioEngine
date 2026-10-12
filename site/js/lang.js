// ============================================================
// Sound Basics · lang.js
// English is the default; the choice is remembered per browser.
// Load this in <head> (not deferred) so the page never flashes
// the wrong language.
// ============================================================

(function () {
  const KEY = 'sb-lang';
  const LANGS = ['en', 'zh-Hant'];

  function read() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem(KEY);
      if (LANGS.includes(saved)) return saved;
    } catch (e) { /* storage unavailable */ }
    return 'en';
  }

  function apply(lang) {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      // The button names the language you would switch TO.
      btn.textContent = lang === 'en' ? '中文' : 'EN';
      btn.setAttribute('aria-label', lang === 'en' ? '切換成中文' : 'Switch to English');
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  window.currentLang = () => document.documentElement.dataset.lang || 'en';

  // Pick a string for the current language: t({ en: '…', zh: '…' })
  window.t = (s) => (currentLang() === 'en' ? s.en : s.zh);

  document.documentElement.dataset.lang = read();

  document.addEventListener('DOMContentLoaded', () => {
    apply(read());
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = currentLang() === 'en' ? 'zh-Hant' : 'en';
        try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
        apply(next);
      });
    });
  });
})();
