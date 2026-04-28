/**
 * detector.js — 8-language auto-detector adapter (FR-β6)
 *
 * Sprint β language detection. Wraps the existing `lib/intent/language.js`
 * detectLanguage() (which already covers KO/EN/JA/ZH + Latin disambiguation
 * for ES/FR/DE/IT via stopwords + diacritics) and adds:
 *
 *   - `detectFromPrompt(text)` — returns { lang, confidence } (0..1)
 *   - `persistLanguage(lang)`  — writes `.bkit/runtime/language-detected.json`
 *   - `readLanguage()`         — returns last persisted language or null
 *   - `mergeWithEnv(detected)` — combines text-detected lang with $LANG env
 *
 * Persistence target: `.bkit/runtime/language-detected.json` (project-local,
 * gitignored). User-level `~/.claude/settings.json` is intentionally NOT
 * touched — bkit never mutates user-managed CC settings (Sprint α decision).
 *
 * Fail-open: any detection / I/O error returns `{ lang: 'en', confidence: 0 }`
 * or null persistence; never blocks the caller.
 *
 * @module lib/i18n/detector
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'it'];
const STORE_REL = path.join('.bkit', 'runtime', 'language-detected.json');

/**
 * Path of the persistence file in the active project (honors CLAUDE_PROJECT_DIR).
 * @returns {string}
 */
function storePath() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return path.join(root, STORE_REL);
}

/**
 * Score a detection. Higher = more certain.
 *
 *   - CJK script hit (KO/JA/ZH) → high confidence (0.95) since these are
 *     mutually exclusive Unicode blocks at the codepoint level.
 *   - Latin disambiguation (ES/FR/DE/IT) → 0.6..0.9 depending on signal
 *     density (each stopword/diacritic hit is +0.15, capped at 0.9).
 *   - Pure ASCII → 0.5 baseline for `en` since "no signal" is itself signal.
 *   - Empty / nullish → 0.0.
 *
 * @param {string} text
 * @param {string} lang
 * @returns {number}
 */
function scoreConfidence(text, lang) {
  if (!text || typeof text !== 'string') return 0;
  if (lang === 'ko' || lang === 'ja' || lang === 'zh') return 0.95;
  if (lang === 'en') {
    // English is the fallback; confidence reflects "no other language signal".
    // Long ASCII-only input → 0.7. Short / mixed input → 0.5.
    return text.length > 40 ? 0.7 : 0.5;
  }
  // Latin disambiguation: count stopword/diacritic hits via re-running the
  // primitive detector on lowercase tokens. This avoids re-implementing the
  // dictionary here.
  const lower = text.toLowerCase();
  let hits = 0;
  // Cheap heuristic — character classes that are very language-specific:
  if (lang === 'es' && /[ñ¿¡]/.test(lower)) hits++;
  if (lang === 'de' && /[äöüß]/.test(lower)) hits++;
  if (lang === 'fr' && /[çœæ]|\bs'/.test(lower)) hits++;
  if (lang === 'it' && /\b(gli|della|dello|degli|delle)\b/.test(lower)) hits++;
  // token count signal:
  const tokenCount = lower.split(/[^a-zàâäáãåāéèêëēíìîïīñóòôöõøœúùûüūÿçß'-]+/).filter(Boolean).length;
  if (tokenCount > 5) hits++;
  return Math.min(0.6 + hits * 0.15, 0.9);
}

/**
 * Detect language from a prompt string.
 *
 * @param {string} text
 * @returns {{ lang: string, confidence: number }}
 */
function detectFromPrompt(text) {
  if (!text || typeof text !== 'string') {
    return { lang: 'en', confidence: 0 };
  }
  let lang;
  try {
    const { detectLanguage } = require('../intent/language');
    lang = detectLanguage(text);
  } catch {
    lang = 'en';
  }
  if (!SUPPORTED.includes(lang)) lang = 'en';
  return { lang, confidence: scoreConfidence(text, lang) };
}

/**
 * Combine text-detected language with $LANG env hint.
 * Env value (e.g. `ko_KR.UTF-8`) is used only as a tiebreaker when
 * text confidence is low (< 0.6).
 *
 * @param {{lang: string, confidence: number}} detected
 * @param {{envLang?: string}} [opts]
 * @returns {{lang: string, confidence: number, source: 'text'|'env'|'fallback'}}
 */
function mergeWithEnv(detected, opts = {}) {
  if (detected && detected.confidence >= 0.6) {
    return { ...detected, source: 'text' };
  }
  const envRaw = (opts.envLang !== undefined ? opts.envLang : process.env.LANG) || '';
  const envCode = envRaw.split(/[._-]/)[0].toLowerCase();
  if (SUPPORTED.includes(envCode)) {
    return { lang: envCode, confidence: 0.55, source: 'env' };
  }
  return {
    lang: (detected && detected.lang) || 'en',
    confidence: detected ? detected.confidence : 0,
    source: 'fallback',
  };
}

/**
 * Persist the resolved language to `.bkit/runtime/language-detected.json`.
 * Idempotent and fail-open. Returns true on success.
 *
 * @param {string} lang
 * @param {{ confidence?: number, source?: string }} [meta]
 * @returns {boolean}
 */
function persistLanguage(lang, meta = {}) {
  if (!SUPPORTED.includes(lang)) return false;
  try {
    const target = storePath();
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const payload = {
      lang,
      confidence: typeof meta.confidence === 'number' ? meta.confidence : null,
      source: typeof meta.source === 'string' ? meta.source : null,
      detectedAt: new Date().toISOString(),
    };
    fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n');
    return true;
  } catch {
    return false;
  }
}

/**
 * Read previously persisted language. Returns null when missing or invalid.
 *
 * @returns {{lang: string, confidence: number|null, source: string|null, detectedAt: string} | null}
 */
function readLanguage() {
  try {
    const target = storePath();
    if (!fs.existsSync(target)) return null;
    const data = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (data && typeof data.lang === 'string' && SUPPORTED.includes(data.lang)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  SUPPORTED,
  STORE_REL,
  storePath,
  scoreConfidence,
  detectFromPrompt,
  mergeWithEnv,
  persistLanguage,
  readLanguage,
};
