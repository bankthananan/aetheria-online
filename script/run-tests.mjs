#!/usr/bin/env node
// Aetheria Online test runner.
//
// Discovers every `*.test.js` under `js/` (plus the legacy `src/test_e2e_suite.js`)
// and runs each file in its own Node process, so browser-global mocks never leak
// between suites. Output is buffered and only printed for failing files unless
// `--verbose` is given. Exit code: 0 when every suite passes, 1 otherwise.
//
// Usage:
//   node script/run-tests.mjs                 # run everything
//   node script/run-tests.mjs loot phase      # only files whose path contains "loot" or "phase"
//   node script/run-tests.mjs --bail          # stop at the first failure
//   node script/run-tests.mjs --verbose       # stream every suite's output
//   node script/run-tests.mjs --list          # print discovered files and exit

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY_SUITES = ['src/test_e2e_suite.js'];
const PER_FILE_TIMEOUT_MS = 120_000;

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const filters = args.filter(a => !a.startsWith('--'));
const unknown = [...flags].filter(f => !['--bail', '--verbose', '--list'].includes(f));
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  process.exit(2);
}

/** Recursively collect `*.test.js` files below `dir`, as repo-relative POSIX paths. */
function findTests(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findTests(full));
    else if (entry.isFile() && entry.name.endsWith('.test.js')) out.push(relative(ROOT, full).split(sep).join('/'));
  }
  return out;
}

const discovered = [...LEGACY_SUITES, ...findTests(join(ROOT, 'js')).sort()];
const selected = filters.length ? discovered.filter(f => filters.some(q => f.includes(q))) : discovered;

if (flags.has('--list')) {
  selected.forEach(f => console.log(f));
  process.exit(0);
}
if (!selected.length) {
  console.error(`No test files match: ${filters.join(', ')}`);
  process.exit(1);
}

/** Run one suite; resolves with { file, code, ms, output }. Never rejects. */
function runSuite(file) {
  return new Promise(resolve => {
    const started = Date.now();
    const verbose = flags.has('--verbose');
    const child = spawn(process.execPath, [file], { cwd: ROOT, stdio: verbose ? 'inherit' : 'pipe' });
    let output = '';
    if (!verbose) {
      child.stdout.on('data', d => { output += d; });
      child.stderr.on('data', d => { output += d; });
    }
    const timer = setTimeout(() => {
      output += `\n[runner] timed out after ${PER_FILE_TIMEOUT_MS / 1000}s\n`;
      child.kill('SIGKILL');
    }, PER_FILE_TIMEOUT_MS);
    child.on('error', err => { output += `\n[runner] failed to start: ${err.message}\n`; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ file, code: code ?? (signal ? 1 : 0), ms: Date.now() - started, output });
    });
  });
}

const results = [];
for (const file of selected) {
  if (flags.has('--verbose')) console.log(`\n=== ${file}`);
  const result = await runSuite(file);
  results.push(result);
  const mark = result.code === 0 ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${file}  (${result.ms} ms)`);
  if (result.code !== 0) {
    if (result.output) console.log(result.output.replace(/^/gm, '    | '));
    if (flags.has('--bail')) break;
  }
}

const failed = results.filter(r => r.code !== 0);
const totalMs = results.reduce((sum, r) => sum + r.ms, 0);
console.log(`\n${results.length - failed.length}/${results.length} suites passed in ${(totalMs / 1000).toFixed(1)}s`);
if (failed.length) {
  console.log(`Failed: ${failed.map(r => r.file).join(', ')}`);
  process.exit(1);
}
