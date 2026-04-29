/**
 * branding.js — bkit identity Single Source of Truth (FR-α2)
 *
 * All locations referencing the bkit One-Liner MUST import from this module
 * (or be validated via docs-code-scanner.scanOneLiner CI gate).
 *
 * @module lib/infra/branding
 *
 * @version 2.1.12
 */

const ONE_LINER_EN = "The only Claude Code plugin that verifies AI-generated code against its own design specs.";
const ONE_LINER_KO = "AI가 만든 코드를 AI가 만든 설계로 검증하는 유일한 Claude Code 플러그인.";

module.exports = {
  ONE_LINER_EN,
  ONE_LINER_KO,
  ONE_LINER: ONE_LINER_EN,
};
