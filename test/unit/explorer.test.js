/**
 * explorer.test.js — Unit tests for FR-β1 skill/agent explorer.
 *
 * Maps to Design §8.2 L1 TC #1 (listByLevel) + #2 (listByCategory) + §6 E-β1-01.
 *
 * @module test/unit/explorer.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const explorer = require('../../lib/discovery/explorer');

function withFakeRepo(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-explorer-'));
  const skills = path.join(dir, 'skills');
  const agents = path.join(dir, 'agents');
  fs.mkdirSync(skills);
  fs.mkdirSync(agents);
  try { return fn(skills, agents, dir); }
  finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
}

function writeSkill(skillsDir, name, fm) {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir);
  const lines = ['---', `name: ${name}`];
  if (fm.description) lines.push(`description: |`, `  ${fm.description}`);
  if (fm.classification) lines.push(`classification: ${fm.classification}`);
  lines.push('---', '', '# body');
  fs.writeFileSync(path.join(dir, 'SKILL.md'), lines.join('\n'));
}

function writeAgent(agentsDir, name, fm) {
  const lines = ['---', `name: ${name}`];
  if (fm.description) lines.push(`description: |`, `  ${fm.description}`);
  lines.push('---', '', '# body');
  fs.writeFileSync(path.join(agentsDir, `${name}.md`), lines.join('\n'));
}

// ── 1. CATEGORIES + LEVELS contract ──────────────────────────────────────
test('CATEGORIES is a frozen 5-tuple in canonical order', () => {
  assert.deepEqual([...explorer.CATEGORIES],
    ['starter', 'dynamic', 'enterprise', 'pdca-core', 'utility']);
  assert.equal(Object.isFrozen(explorer.CATEGORIES), true);
});

test('LEVELS is Starter / Dynamic / Enterprise', () => {
  assert.deepEqual([...explorer.LEVELS], ['Starter', 'Dynamic', 'Enterprise']);
});

test('LEVEL_TO_CATEGORIES: Starter → starter+pdca-core+utility', () => {
  assert.deepEqual(explorer.LEVEL_TO_CATEGORIES.Starter,
    ['starter', 'pdca-core', 'utility']);
});

test('LEVEL_TO_CATEGORIES: Dynamic includes Starter scope (cumulative)', () => {
  assert.ok(explorer.LEVEL_TO_CATEGORIES.Dynamic.includes('starter'));
  assert.ok(explorer.LEVEL_TO_CATEGORIES.Dynamic.includes('dynamic'));
  assert.ok(!explorer.LEVEL_TO_CATEGORIES.Dynamic.includes('enterprise'));
});

test('LEVEL_TO_CATEGORIES: Enterprise includes all build categories', () => {
  for (const c of ['starter', 'dynamic', 'enterprise', 'pdca-core', 'utility']) {
    assert.ok(explorer.LEVEL_TO_CATEGORIES.Enterprise.includes(c), c);
  }
});

// ── 2. buildIndex against fake repo ──────────────────────────────────────
test('buildIndex: categorizes known skills and agents correctly', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'starter', { description: 'Static web kit.' });
    writeSkill(skills, 'dynamic', { description: 'bkend.ai fullstack.' });
    writeSkill(skills, 'enterprise', { description: 'Enterprise architecture.' });
    writeSkill(skills, 'pdca', { description: 'PDCA cycle.' });
    writeSkill(skills, 'bkit', { description: 'bkit utility.' });
    writeAgent(agents, 'starter-guide', { description: 'Beginner agent.' });
    writeAgent(agents, 'gap-detector', { description: 'Match-rate verifier.' });

    const idx = explorer.buildIndex({ skillsDir: skills, agentsDir: agents });
    assert.equal(idx.counts.skills, 5);
    assert.equal(idx.counts.agents, 2);
    assert.equal(idx.categories.starter.skills.length, 1);
    assert.equal(idx.categories.starter.agents.length, 1);
    assert.equal(idx.categories['pdca-core'].agents[0].name, 'gap-detector');
    assert.equal(idx.categories.utility.skills[0].name, 'bkit');
  });
});

test('buildIndex: unknown skill falls back to utility', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'random-future-skill', { description: 'Unmapped.' });

    const idx = explorer.buildIndex({ skillsDir: skills, agentsDir: agents });
    assert.equal(idx.categories.utility.skills.length, 1);
    assert.equal(idx.categories.utility.skills[0].name, 'random-future-skill');
  });
});

test('buildIndex: extracts first-sentence description from `|` block scalar', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'pdca', { description: 'Run the PDCA cycle. More text here.' });
    const idx = explorer.buildIndex({ skillsDir: skills, agentsDir: agents });
    assert.equal(idx.categories['pdca-core'].skills[0].description,
      'Run the PDCA cycle');
  });
});

test('buildIndex: empty skills/agents dirs produces empty tree (E-β1-01)', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    const idx = explorer.buildIndex({ skillsDir: skills, agentsDir: agents });
    assert.equal(idx.counts.skills, 0);
    assert.equal(idx.counts.agents, 0);
    for (const c of explorer.CATEGORIES) {
      assert.equal(idx.categories[c].skills.length, 0);
    }
  });
});

test('buildIndex: nonexistent skillsDir does not throw', () => {
  explorer._resetCache();
  const idx = explorer.buildIndex({
    skillsDir: '/nonexistent/path/skills',
    agentsDir: '/nonexistent/path/agents',
  });
  assert.equal(idx.counts.skills, 0);
});

// ── 3. listByCategory / listByLevel ──────────────────────────────────────
test('listByCategory: invalid category returns null', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'starter', { description: 'x' });
    assert.equal(explorer.listByCategory('not-a-category', { skillsDir: skills, agentsDir: agents }), null);
  });
});

test('listByCategory: returns category bucket', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'starter', { description: 'x' });
    writeSkill(skills, 'dynamic', { description: 'y' });
    const r = explorer.listByCategory('starter', { skillsDir: skills, agentsDir: agents });
    assert.equal(r.skills.length, 1);
    assert.equal(r.skills[0].name, 'starter');
  });
});

test('listByLevel(Starter): excludes dynamic + enterprise categories', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'starter', { description: 'a' });
    writeSkill(skills, 'dynamic', { description: 'b' });
    writeSkill(skills, 'enterprise', { description: 'c' });
    const r = explorer.listByLevel('Starter', { skillsDir: skills, agentsDir: agents });
    assert.ok(r.starter);
    assert.equal(r.dynamic, undefined);
    assert.equal(r.enterprise, undefined);
    assert.ok(r['pdca-core']);
    assert.ok(r.utility);
  });
});

test('listByLevel: invalid level returns null', () => {
  explorer._resetCache();
  assert.equal(explorer.listByLevel('NotALevel'), null);
});

// ── 4. listEvals ─────────────────────────────────────────────────────────
test('listEvals: scans evals/{cls}/{skill}/eval.yaml', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-evals-list-'));
  try {
    for (const cls of ['workflow', 'capability']) {
      fs.mkdirSync(path.join(dir, cls, 'demo-skill'), { recursive: true });
      fs.writeFileSync(path.join(dir, cls, 'demo-skill', 'eval.yaml'), 'x');
    }
    fs.mkdirSync(path.join(dir, 'capability', 'no-yaml'), { recursive: true });

    const r = explorer.listEvals({ evalsDir: dir });
    assert.deepEqual(r.workflow, ['demo-skill']);
    assert.deepEqual(r.capability, ['demo-skill']);
    assert.deepEqual(r.hybrid, []);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test('listEvals: missing evals dir returns empty buckets', () => {
  const r = explorer.listEvals({ evalsDir: '/nonexistent/evals' });
  assert.deepEqual(r, { workflow: [], capability: [], hybrid: [] });
});

// ── 5. Sort stability + cache idempotency ────────────────────────────────
test('buildIndex: skills sorted alphabetically within each category', () => {
  withFakeRepo((skills, agents) => {
    explorer._resetCache();
    writeSkill(skills, 'bkend-storage', { description: 'z' });
    writeSkill(skills, 'bkend-auth', { description: 'a' });
    writeSkill(skills, 'bkend-data', { description: 'm' });
    const idx = explorer.buildIndex({ skillsDir: skills, agentsDir: agents });
    const names = idx.categories.dynamic.skills.map((s) => s.name);
    assert.deepEqual(names, ['bkend-auth', 'bkend-data', 'bkend-storage']);
  });
});

test('buildIndex: cached when called without dir overrides', () => {
  explorer._resetCache();
  const a = explorer.buildIndex();
  const b = explorer.buildIndex();
  assert.equal(a, b, 'second call must return cached object reference');
});

// ── 6. Real bkit repo smoke (sanity check actual install) ────────────────
test('SMOKE: live bkit repo has at least 30 skills + 30 agents', () => {
  explorer._resetCache();
  const idx = explorer.listAll({ refresh: true });
  assert.ok(idx.counts.skills >= 30,
    `expected ≥30 skills, got ${idx.counts.skills}`);
  assert.ok(idx.counts.agents >= 30,
    `expected ≥30 agents, got ${idx.counts.agents}`);
});
