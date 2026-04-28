/**
 * translator.js — Friendly error message translator (FR-β3)
 *
 * Translates technical error codes into user-friendly messages in the
 * detected language. Loads JSON dictionaries from `assets/error-dict.<lang>.json`.
 *
 * v2.1.11 scope (RD-5 mitigation, narrowed):
 *   - 9 core categories (subset of design §3.1's 20)
 *   - 1 `default` style (4-style fan-out deferred to v2.1.12)
 *   - KO + EN full quality, other 6 languages fall back to EN
 *
 * Fallback chain (per code):
 *   lang.code → lang.UNKNOWN_ERROR → en.code → en.UNKNOWN_ERROR → hardcoded
 *
 * In-process LRU cache (idempotent message hash) — protects against
 * repeated re-fire from CC v2.1.118 X14 prompt-hooks-verifier
 * (E-β3-03 mitigation).
 *
 * @module lib/i18n/translator
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'assets');
const SUPPORTED = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'it'];
const FULL_QUALITY = new Set(['en', 'ko']); // RD-5 narrowed scope
const HARD_FALLBACK = 'An error occurred.';

const _dictCache = new Map(); // lang → parsed dict (or null on load failure)
const _msgCache = new Map();  // hash → translated message (LRU-ish, capped 200)

function _loadDict(lang) {
  if (_dictCache.has(lang)) return _dictCache.get(lang);
  const target = path.join(ASSETS_DIR, `error-dict.${lang}.json`);
  let parsed = null;
  try {
    if (fs.existsSync(target)) {
      parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    }
  } catch {
    parsed = null;
  }
  _dictCache.set(lang, parsed);
  return parsed;
}

function _resolveLang(requested) {
  const normalized = (requested || 'en').toLowerCase();
  if (FULL_QUALITY.has(normalized)) return normalized;
  // Pseudo languages → EN fallback (v2.1.11 scope)
  return SUPPORTED.includes(normalized) ? 'en' : 'en';
}

function _lookup(lang, code, style) {
  const dict = _loadDict(lang);
  if (!dict || !dict.categories) return null;
  const cat = dict.categories[code];
  if (!cat) return null;
  if (style && cat.styles && typeof cat.styles[style] === 'string') {
    return cat.styles[style];
  }
  if (typeof cat[style] === 'string') return cat[style];
  if (typeof cat.default === 'string') return cat.default;
  return null;
}

function _hashKey(code, lang, style) {
  return `${code}::${lang}::${style || 'default'}`;
}

function _capCache() {
  if (_msgCache.size <= 200) return;
  const drop = _msgCache.size - 200;
  let i = 0;
  for (const k of _msgCache.keys()) {
    if (i++ >= drop) break;
    _msgCache.delete(k);
  }
}

/**
 * Translate an error code into a user-friendly message.
 *
 * @param {string} code — Error category key (e.g. "FILE_NOT_FOUND"). Unknown
 *                       codes fall back to UNKNOWN_ERROR within the same
 *                       language → English → hardcoded.
 * @param {{lang?: string, style?: string}} [opts]
 * @returns {string}
 */
function translate(code, opts = {}) {
  const requestedLang = opts.lang || 'en';
  const lang = _resolveLang(requestedLang);
  const style = opts.style || 'default';

  const cacheKey = _hashKey(code, lang, style);
  if (_msgCache.has(cacheKey)) return _msgCache.get(cacheKey);

  // 1. Try exact code in resolved lang
  let msg = _lookup(lang, code, style);
  // 2. Fall back to UNKNOWN_ERROR in resolved lang
  if (!msg) msg = _lookup(lang, 'UNKNOWN_ERROR', style);
  // 3. Fall back to English exact code
  if (!msg && lang !== 'en') msg = _lookup('en', code, style);
  // 4. Fall back to English UNKNOWN_ERROR
  if (!msg) msg = _lookup('en', 'UNKNOWN_ERROR', style);
  // 5. Hard fallback
  if (!msg) msg = HARD_FALLBACK;

  _msgCache.set(cacheKey, msg);
  _capCache();
  return msg;
}

/**
 * Convenience wrapper for callers that have already determined a language.
 * Returns UNKNOWN_ERROR message when the requested code is unmapped.
 *
 * @param {string} unknownCode
 * @param {{lang?: string, style?: string}} [opts]
 * @returns {string}
 */
function fallback(unknownCode, opts = {}) {
  // Skip the "code lookup" step — go directly to UNKNOWN_ERROR.
  return translate('UNKNOWN_ERROR', opts);
}

/**
 * List loaded category keys for a given language (debug + tests).
 * @param {string} lang
 * @returns {string[]}
 */
function categories(lang) {
  const dict = _loadDict(lang);
  if (!dict || !dict.categories) return [];
  return Object.keys(dict.categories);
}

function _resetCache() {
  _dictCache.clear();
  _msgCache.clear();
}

module.exports = {
  ASSETS_DIR,
  SUPPORTED,
  FULL_QUALITY: [...FULL_QUALITY],
  HARD_FALLBACK,
  translate,
  fallback,
  categories,
  _resetCache, // test-only
};
