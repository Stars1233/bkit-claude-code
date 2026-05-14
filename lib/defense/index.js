/**
 * bkit Defense Layer — facade barrel for Sub-Sprint 2 (Defense) modules.
 *
 * Layer responsibility:
 *   Post-hoc audit + active enforcement of bkit-specific defense policies
 *   that go beyond the pre-execution prevention living in lib/control/.
 *
 *   • heredoc-detector  (ENH-310, differentiation #6) — pure regex guard
 *     against the heredoc-pipe permission bypass (CC #58904).
 *   • push-event-guard  (ENH-298) — git push fork/upstream classification.
 *   • layer-6-audit     (ENH-289, differentiation #2) — post-hoc audit,
 *     alarm, and auto-rollback. Wired in via Sub-Sprint 2 Step 13.
 *   • memory-enforcer   (ENH-286, differentiation #1) — CLAUDE.md deny-list
 *     enforcement. Wired in via Sub-Sprint 4 (E Defense 확장).
 *
 * Invariant:
 *   Defense Layer modules may import fs / child_process / network (unlike
 *   the Domain Layer ports). They are explicitly excluded from
 *   scripts/check-domain-purity.js. ADR 0003 invariant 1 still applies to
 *   lib/domain/ port files only.
 *
 * @module lib/defense
 * @version 2.1.14
 * @since 2.1.14
 * @layer Defense
 */

'use strict';

const heredocDetector = require('./heredoc-detector');
const pushEventGuard = require('./push-event-guard');
const layer6Audit = require('./layer-6-audit');
const memoryEnforcer = require('./memory-enforcer');

module.exports = {
  // ENH-310 #6 Heredoc Pipe Bypass Defense
  heredocDetector,
  detectHeredoc: heredocDetector.detect,

  // ENH-298 git push fork/upstream guard
  pushEventGuard,
  detectPushCommand: pushEventGuard.detectPushCommand,
  classifyRemote: pushEventGuard.classifyRemote,
  shouldGuardPush: pushEventGuard.shouldGuard,

  // ENH-289 #2 Defense Layer 6 — post-hoc audit + alarm + auto-rollback
  layer6Audit,
  createLayer6Audit: layer6Audit.createLayer6Audit,
  classifySeverity: layer6Audit.classifySeverity,
  isInLayer6Audit: layer6Audit.isInLayer6Audit,

  // ENH-286 #1 Memory Enforcer — CLAUDE.md deny-list enforced
  memoryEnforcer,
  extractMemoryDirectives: memoryEnforcer.extractDirectives,
  enforceMemoryDirectives: memoryEnforcer.enforce,
  serializeMemoryDirectives: memoryEnforcer.serializeDirectives,
  deserializeMemoryDirectives: memoryEnforcer.deserializeDirectives,
};
