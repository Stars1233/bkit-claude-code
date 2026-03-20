'use strict';

const { performance } = require('perf_hooks');

function measureTime(fn, iterations = 1) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = performance.now() - start;
  return iterations > 1 ? elapsed / iterations : elapsed;
}

async function measureTimeAsync(fn, iterations = 1) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const elapsed = performance.now() - start;
  return iterations > 1 ? elapsed / iterations : elapsed;
}

function formatMs(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

module.exports = { measureTime, measureTimeAsync, formatMs };
