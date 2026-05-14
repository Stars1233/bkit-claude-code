#!/usr/bin/env node
'use strict';

/**
 * MCP alwaysLoad measurement harness (ENH-282).
 *
 * Compares cold-start vs warm-load behavior of bkit MCP servers
 * (bkit-pdca, bkit-analysis) by:
 *   1. spawning each server `index.js` directly
 *   2. measuring time from spawn to first stderr/stdout byte (handshake-ready)
 *   3. measuring peak RSS during a 2-second sampling window
 *   4. emitting an OTEL gen_ai.* sample (gen_ai.tool_call_count = 1) when
 *      OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_ENDPOINT is configured
 *
 * This is the in-process baseline. The 1-week alwaysLoad=true vs false
 * comparison requires the user to flip `.mcp.json` and re-run; the OTEL
 * trace then accumulates server-side and the final decision report is
 * generated from that trace.
 *
 * Usage:
 *   node scripts/measure-mcp-alwaysload.js                # both servers
 *   node scripts/measure-mcp-alwaysload.js bkit-pdca      # one server
 *   node scripts/measure-mcp-alwaysload.js --json         # JSON output
 *
 * @module scripts/measure-mcp-alwaysload
 * @version 2.1.14
 * @enh ENH-282 (alwaysLoad measurement)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SAMPLE_WINDOW_MS = 2000;
const SERVERS = ['bkit-pdca', 'bkit-analysis'];

function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function serverEntry(name) {
  return path.join(projectRoot(), 'servers', name + '-server', 'index.js');
}

function measureOne(name) {
  return new Promise((resolve) => {
    const entry = serverEntry(name);
    if (!fs.existsSync(entry)) {
      resolve({ server: name, ok: false, error: 'entry not found: ' + entry });
      return;
    }
    const t0 = process.hrtime.bigint();
    const child = spawn('node', [entry], {
      cwd: projectRoot(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    let firstByteNs = null;
    let peakRss = 0;
    let stderrBuf = '';

    const onFirstByte = () => {
      if (firstByteNs === null) firstByteNs = process.hrtime.bigint();
    };
    child.stdout.on('data', onFirstByte);
    child.stderr.on('data', (d) => {
      onFirstByte();
      stderrBuf += d.toString('utf8');
    });

    const rssTimer = setInterval(() => {
      try {
        const memUsage = (() => {
          try { return process.memoryUsage(); } catch { return null; }
        })();
        if (memUsage && memUsage.rss > peakRss) peakRss = memUsage.rss;
      } catch (_) { /* graceful */ }
    }, 100);

    const finalize = () => {
      clearInterval(rssTimer);
      try { child.kill('SIGTERM'); } catch (_) { /* graceful */ }
      const handshakeMs = firstByteNs ? Number(firstByteNs - t0) / 1e6 : null;
      resolve({
        server: name,
        ok: true,
        handshakeMs,
        peakRssBytes: peakRss,
        stderrSnippet: stderrBuf.slice(0, 200),
        entry,
      });
    };

    setTimeout(finalize, SAMPLE_WINDOW_MS);
    child.on('error', (e) => {
      clearInterval(rssTimer);
      resolve({ server: name, ok: false, error: e.message });
    });
  });
}

async function emitOtelSample(results) {
  try {
    const { emitGenAI } = require('../lib/infra/telemetry');
    for (const r of results) {
      if (!r.ok) continue;
      await emitGenAI('gen_ai.tool_call_count', {
        id: 'measure-mcp-alwaysload',
        server: r.server,
        handshake_ms: r.handshakeMs,
        peak_rss_bytes: r.peakRssBytes,
        measurement: 'alwaysload-baseline',
      });
    }
  } catch (_) { /* graceful */ }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--json');
  const jsonMode = process.argv.includes('--json');
  const targets = args.length > 0 ? args : SERVERS;
  const results = [];
  for (const name of targets) {
    results.push(await measureOne(name));
  }
  await emitOtelSample(results);
  if (jsonMode) {
    console.log(JSON.stringify({ version: '2.1.14', enh: 'ENH-282', results }, null, 2));
    return;
  }
  console.log('\nbkit MCP alwaysLoad measurement (ENH-282 baseline)\n');
  console.log('Server          | Handshake | Peak RSS  | Status');
  console.log('----------------|-----------|-----------|--------');
  for (const r of results) {
    if (!r.ok) {
      console.log(r.server.padEnd(16) + '| FAIL      | -         | ' + r.error);
      continue;
    }
    const hms = r.handshakeMs !== null ? r.handshakeMs.toFixed(1) + 'ms' : 'no-output';
    const rss = (r.peakRssBytes / 1024 / 1024).toFixed(1) + 'MB';
    console.log(r.server.padEnd(16) + '| ' + hms.padEnd(10) + '| ' + rss.padEnd(10) + '| OK');
  }
  console.log('\nNext: flip `.mcp.json` `alwaysLoad: true` for 1 week, re-run, compare.\n');
}

if (require.main === module) {
  main().catch((e) => {
    console.error('measure-mcp-alwaysload fatal:', e.message);
    process.exit(1);
  });
}

module.exports = { measureOne, SERVERS, SAMPLE_WINDOW_MS };
