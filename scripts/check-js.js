'use strict';

const { readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = join(__dirname, '..');
const ignored = new Set(['node_modules', 'dist', 'data']);

function collectJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) collectJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = collectJs(root).sort();
let failed = false;

for (const file of files) {
  const rel = relative(root, file);
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`node --check failed: ${rel}\n`);
    process.stderr.write(result.stderr || result.stdout || '');
  }
}

if (failed) process.exit(1);
process.stdout.write(`Checked ${files.length} JavaScript files.\n`);
