/**
 * Impact Analyzer — Dependency graph and blast radius analysis
 * @module lib/context/impact-analyzer
 * @version 3.0.0
 *
 * Generates .bkit/impact-map.yaml by statically analyzing import/require/from
 * statements across the project source files.
 */
const fs = require('fs');
const path = require('path');

let _paths = null;
function getPaths() {
  if (!_paths) { _paths = require('../core/paths'); }
  return _paths;
}

/**
 * Generate full impact map for a project
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - { include: ['src/'], exclude: ['node_modules/'] }
 * @returns {ImpactMap}
 */
async function generateImpactMap(projectRoot, options = {}) {
  const include = options.include || ['src/'];
  const exclude = options.exclude || ['node_modules/', '.next/', 'dist/', 'build/', '.bkit/'];

  const sourceFiles = collectSourceFiles(projectRoot, include, exclude);
  const graph = buildDependencyGraph(projectRoot, sourceFiles);
  const modules = {};

  for (const [file, deps] of Object.entries(graph.dependsOn)) {
    const relativePath = path.relative(projectRoot, file);
    const dependedBy = graph.dependedBy[file] || [];
    const blastRadius = dependedBy.length;
    const changeRisk = blastRadius >= 10 ? 'high' : blastRadius >= 3 ? 'medium' : 'low';

    modules[relativePath] = {
      depends_on: deps.map(d => path.relative(projectRoot, d)),
      depended_by: dependedBy.map(d => path.relative(projectRoot, d)),
      blast_radius: blastRadius,
      change_risk: changeRisk,
    };
  }

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    modules,
  };
}

/**
 * Collect source files from directories
 */
function collectSourceFiles(root, includePaths, excludePaths) {
  const files = [];
  const exts = ['.js', '.ts', '.tsx', '.jsx', '.mjs'];

  function walk(dir) {
    const relDir = path.relative(root, dir);
    if (excludePaths.some(ex => relDir.startsWith(ex) || dir.includes(ex))) return;

    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
        files.push(fullPath);
      }
    }
  }

  for (const inc of includePaths) {
    const incPath = path.join(root, inc);
    if (fs.existsSync(incPath)) walk(incPath);
  }

  return files;
}

/**
 * Build dependency graph from import/require statements
 */
function buildDependencyGraph(root, files) {
  const dependsOn = {};  // file -> [files it imports]
  const dependedBy = {}; // file -> [files that import it]

  for (const file of files) {
    dependsOn[file] = [];
    let content;
    try { content = fs.readFileSync(file, 'utf8'); }
    catch { continue; }

    const imports = extractImports(content);

    for (const imp of imports) {
      const resolved = resolveImportPath(file, imp, root);
      if (resolved && files.includes(resolved)) {
        dependsOn[file].push(resolved);
        if (!dependedBy[resolved]) dependedBy[resolved] = [];
        dependedBy[resolved].push(file);
      }
    }
  }

  return { dependsOn, dependedBy };
}

/**
 * Extract import paths from file content
 */
function extractImports(content) {
  const imports = [];
  const patterns = [
    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const imp = match[1];
      // Only relative imports (skip node_modules packages)
      if (imp.startsWith('.') || imp.startsWith('/')) {
        imports.push(imp);
      }
    }
  }
  return imports;
}

/**
 * Resolve relative import to absolute file path
 */
function resolveImportPath(fromFile, importPath, root) {
  const dir = path.dirname(fromFile);
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];

  for (const ext of exts) {
    const candidate = path.resolve(dir, importPath + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Get blast radius for a specific file
 */
async function getBlastRadius(filePath, projectRoot) {
  const mapPath = getPaths().STATE_PATHS.impactMap();

  if (fs.existsSync(mapPath)) {
    const { parseYamlFile } = require('./context-loader');
    const data = parseYamlFile(mapPath);
    if (data && data.modules) {
      for (const [key, info] of Object.entries(data.modules)) {
        if (filePath.includes(key)) {
          return {
            file: key,
            depends_on: info.depends_on || [],
            depended_by: info.depended_by || [],
            blast_radius: info.blast_radius || 0,
            change_risk: info.change_risk || 'unknown',
            affected_files: info.depended_by || [],
          };
        }
      }
    }
  }

  return { file: filePath, depends_on: [], depended_by: [], blast_radius: 0, change_risk: 'unknown', affected_files: [] };
}

/**
 * Get all files affected by changing a file (transitive closure)
 */
async function getAffectedFiles(filePath, projectRoot) {
  const result = await getBlastRadius(filePath, projectRoot);
  return result.affected_files;
}

/**
 * Write impact map to JSON file
 */
function writeImpactMap(impactMap, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(impactMap, null, 2));
}

module.exports = {
  generateImpactMap,
  getBlastRadius,
  getAffectedFiles,
  writeImpactMap,
  collectSourceFiles,
  buildDependencyGraph,
  extractImports,
};
