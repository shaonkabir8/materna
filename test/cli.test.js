/**
 * CLI contract tests.
 *
 * The exit-code table is a published contract, so it is tested by executing the
 * CLI as a subprocess rather than by calling its functions: a wrong exit code
 * that only appears through `process.exitCode` is exactly the kind of defect an
 * in-process test cannot see.
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function run(args, { input } = {}) {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [CLI, ...args],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        resolve({ code: error ? (error.code ?? 1) : 0, stdout, stderr });
      },
    );
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'materna-cli-'));
}

test('an unknown command exits 3', async () => {
  const result = await run(['bogus']);
  assert.equal(result.code, 3);
  assert.match(result.stderr, /unknown command: bogus/);
});

test('an unknown option exits 3 instead of being silently ignored', async () => {
  // Before this contract existed, `--collation` on `node` was parsed, dropped,
  // and the CLI exited 0 — an observation that looks configured but is not.
  const result = await run(['node', '--collation', 'en-US-x-icu']);
  assert.equal(result.code, 3);
  assert.match(result.stderr, /unknown option --collation for "materna node"/);
});

test('an unparseable option value exits 3', async () => {
  const numeric = await run(['node', '--numeric', 'yes-please']);
  assert.equal(numeric.code, 3);
  assert.match(numeric.stderr, /--numeric must be "true" or "false"/);

  const sensitivity = await run(['node', '--sensitivity', 'loud']);
  assert.equal(sensitivity.code, 3);
  assert.match(sensitivity.stderr, /--sensitivity must be one of/);
});

test('an option given twice exits 3 rather than silently keeping the last value', async () => {
  const result = await run(['node', '--locale', 'de-DE', '--locale', 'sv-SE']);
  assert.equal(result.code, 3);
  assert.match(result.stderr, /--locale was given more than once/);
});

test('a successful node probe exits 0 and emits a self-consistent observation', async () => {
  const result = await run(['node', '--json']);
  assert.equal(result.code, 0);

  const observation = JSON.parse(result.stdout);
  assert.equal(observation.schema, 'materna.observation/1');
  assert.match(observation.result.result_hash, /^[0-9a-f]{64}$/);
});

test('an unsupported locale exits 2, not 0', async () => {
  const result = await run(['node', '--locale', 'zz-ZZ', '--json']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /is not supported/);
});

test('compare reports PASS (0) for identical documents and DIFFERENCE (1) for reordered ones', async () => {
  const dir = tempDir();
  const left = join(dir, 'left.json');
  const right = join(dir, 'right.json');

  const probe = await run(['node', '--json']);
  writeFileSync(left, probe.stdout);
  writeFileSync(right, probe.stdout);

  const same = await run(['compare', '--left', left, '--right', right]);
  assert.equal(same.code, 0);
  assert.match(same.stdout, /^PASS/);

  // A document that reorders the same corpus is a DIFFERENCE, never a
  // rejection: reordering is real behaviour, not corruption.
  const reordered = JSON.parse(probe.stdout);
  const { resultHash } = await import('../src/observation.js');
  reordered.result.order = [...reordered.result.order].reverse();
  reordered.result.result_hash = resultHash(reordered.result.order, reordered.result.ties);
  writeFileSync(right, JSON.stringify(reordered));

  const different = await run(['compare', '--left', left, '--right', right]);
  assert.equal(different.code, 1);
  assert.match(different.stdout, /^DIFFERENCE/);
});

test('compare reports INCONCLUSIVE (2) for a document whose hash does not match its result', async () => {
  const dir = tempDir();
  const left = join(dir, 'left.json');
  const right = join(dir, 'right.json');

  const probe = JSON.parse((await run(['node', '--json'])).stdout);
  writeFileSync(left, JSON.stringify(probe));

  const tampered = JSON.parse(JSON.stringify(probe));
  tampered.result.order = [...tampered.result.order].reverse();
  writeFileSync(right, JSON.stringify(tampered));

  const result = await run(['compare', '--left', left, '--right', right]);
  assert.equal(result.code, 2);
  assert.match(result.stdout, /not self-consistent|does not match/);
});

test('compare reports ERROR (3) for malformed JSON and for a missing file', async () => {
  const dir = tempDir();
  const malformed = join(dir, 'bad.json');
  writeFileSync(malformed, '{ not json');

  const probe = join(dir, 'probe.json');
  writeFileSync(probe, (await run(['node', '--json'])).stdout);

  const bad = await run(['compare', '--left', malformed, '--right', probe]);
  assert.equal(bad.code, 3);
  assert.match(bad.stderr, /malformed JSON/);

  const missing = await run(['compare', '--left', join(dir, 'nope.json'), '--right', probe]);
  assert.equal(missing.code, 3);
  assert.match(missing.stderr, /file not found/);
});

test('compare accepts "-" for stdin', async () => {
  const dir = tempDir();
  const probe = join(dir, 'probe.json');
  const stdout = (await run(['node', '--json'])).stdout;
  writeFileSync(probe, stdout);

  const result = await new Promise((resolve) => {
    const child = execFile(process.execPath, [CLI, 'compare', '--left', '-', '--right', probe], (error) => {
      resolve(error ? (error.code ?? 1) : 0);
    });
    child.stdin.end(stdout);
  });

  assert.equal(result, 0);
});
