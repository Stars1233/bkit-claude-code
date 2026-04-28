/**
 * branding.test.js — Unit tests for One-Liner SSoT (FR-α2)
 *
 * Validates that the branding module exports the expected One-Liner constants
 * and that the default ONE_LINER points to the English variant.
 *
 * @module test/unit/branding.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const branding = require('../../lib/infra/branding');

test('branding exports ONE_LINER_EN as a non-empty string', () => {
  assert.equal(typeof branding.ONE_LINER_EN, 'string');
  assert.ok(branding.ONE_LINER_EN.length > 0);
  assert.match(branding.ONE_LINER_EN, /Claude Code plugin/);
});

test('branding exports ONE_LINER_KO as a non-empty string', () => {
  assert.equal(typeof branding.ONE_LINER_KO, 'string');
  assert.ok(branding.ONE_LINER_KO.length > 0);
  assert.match(branding.ONE_LINER_KO, /Claude Code 플러그인/);
});

test('default ONE_LINER equals ONE_LINER_EN', () => {
  assert.equal(branding.ONE_LINER, branding.ONE_LINER_EN);
});

test('ONE_LINER strings end with a period', () => {
  assert.match(branding.ONE_LINER_EN, /\.$/);
  assert.match(branding.ONE_LINER_KO, /\.$/);
});
