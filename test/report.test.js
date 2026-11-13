import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { STATUS, compareObservations } from '../src/compare.js';
import { loadCorpus } from '../src/corpus.js';
import { buildObservation, canonicalJson } from '../src/observation.js';
import { assertOutcomeConsistency, buildReportModel, escapeHtml, renderReport } from '../src/report.js';

const corpus = loadCorpus('collation-core-v1');
const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function nodeObservation({ locale = 'de-DE', environment = { runtime: 'node', icu: '78.3' }, order = corpus.samples, ties = [] } = {}) {
  return buildObservation({
    property: 'collation.sort',
    probeVersion: '1',
    corpus,
    locale,
    localeResolved: locale,
    localeSupported: true,
    sensitivity: 'variant',
    numeric: false,
    order,
    ties,
    environment,
  });
}

function postgresObservation({ locale = 'de-DE', environment = { runtime: 'postgres', server_version: '16.15' }, order = corpus.samples, ties = [] } = {}) {
  return buildObservation({
    property: 'collation.sort',
    probeVersion: '1',
    corpus,
    locale,
    localeResolved: locale,
    localeSupported: true,
    sensitivity: 'variant',
    numeric: false,
    order,
    ties,
    environment,
  });
}

function reversedOrder() {
  return [...corpus.samples].reverse();
}

function report(outcome, left, right) {
  return renderReport({ left, right, outcome });
}

// ── correctness ───────────────────────────────────────────────────────────

test('PASS renders PASS and states that the corpus was verified', () => {
  const left = nodeObservation();
  const right = postgresObservation();
  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.PASS);

  const html = report(outcome, left, right);

  assert.match(html, /data-outcome-status="PASS"/);
  assert.match(html, /data-corpus-verified="true"/);
  assert.match(html, /<section class="verdict" data-status="PASS">/);
  assert.match(html, /<span class="badge badge-pass">Pass<\/span>/);
  assert.doesNotMatch(html, /<span class="badge badge-difference">/);
  assert.match(html, /corpus verified/);
});

test('DIFFERENCE renders the outcome status and the first difference', () => {
  const left = nodeObservation();
  const right = postgresObservation({ order: reversedOrder() });
  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.DIFFERENCE);

  const html = report(outcome, left, right);

  assert.match(html, /data-outcome-status="DIFFERENCE"/);
  assert.match(html, /<span class="badge badge-difference">Difference<\/span>/);
  assert.match(html, /<h2>First difference<\/h2>/);
  assert.match(html, /<th scope="row">Position<\/th>/);
  // The kind of the difference is rendered, not silently dropped.
  assert.ok(html.includes(`<td class="mono">${outcome.first_difference.kind}</td>`));
});

test('INCONCLUSIVE renders the missing-evidence branches instead of a verdict', () => {
  const left = nodeObservation();
  const right = { ...nodeObservation(), result: undefined };
  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);

  const html = report(outcome, left, right);

  assert.match(html, /data-outcome-status="INCONCLUSIVE"/);
  assert.match(html, /Why this outcome/);
  assert.match(html, /missing or malformed evidence/);
  // A structurally broken observation must not produce a corpus claim.
  assert.doesNotMatch(html, /Fingerprints identical<\/th><td class="mono">yes/);
});

test('an ERROR outcome renders an ERROR page and claims nothing about behaviour', () => {
  const html = report({ status: STATUS.ERROR, reason: 'comparison failed: boom' }, null, null);

  assert.match(html, /data-outcome-status="ERROR"/);
  assert.match(html, /badge-error/);
  assert.match(html, /comparison failed: boom/);
  assert.doesNotMatch(html, /corpus verified/);
});

test('an observation whose corpus cannot be resolved renders PASS with corpus not verified', () => {
  const unknownCorpus = { id: 'not-in-this-repo', version: '1', hash: 'c'.repeat(64) };
  const make = () => buildObservation({
    property: 'collation.sort',
    probeVersion: '1',
    corpus: unknownCorpus,
    locale: 'de-DE',
    localeResolved: 'de-DE',
    localeSupported: true,
    sensitivity: 'variant',
    numeric: false,
    order: ['a', 'b'],
    ties: [],
    environment: { runtime: 'node' },
  });

  const left = make();
  const right = make();
  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.PASS);
  assert.equal(outcome.corpus_verified, false);

  const html = report(outcome, left, right);
  assert.match(html, /data-outcome-status="PASS"/);
  assert.match(html, /data-corpus-verified="false"/);
  assert.match(html, /corpus not verified/);
  assert.match(html, /Integrity is not authenticity/);
});

test('metadata-only differences are rendered as metadata, not as a behavioural result', () => {
  const left = nodeObservation({ environment: { runtime: 'node', icu: '78.3' } });
  const right = postgresObservation({ environment: { runtime: 'postgres', icu: '74.2' } });
  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.PASS);

  const html = report(outcome, left, right);
  assert.match(html, /Metadata differences/);
  assert.match(html, /not a behavioural difference/);
  assert.ok(html.includes('78.3'));
  assert.ok(html.includes('74.2'));
});

test('absent optional fields are rendered as absent, never defaulted', () => {
  const left = nodeObservation({ environment: {} });
  const right = nodeObservation({ environment: {} });
  const outcome = compareObservations(left, right);
  const html = report(outcome, left, right);

  // No environment keys at all: the column says so rather than inventing a runtime.
  assert.match(html, /no environment block|not recorded/);
  assert.doesNotMatch(html, /Node 20\.11/);
});

// ── the invariant ─────────────────────────────────────────────────────────

test('the model status and corpus_verified are the outcome status and corpus_verified', () => {
  const left = nodeObservation();
  for (const right of [nodeObservation(), postgresObservation({ order: reversedOrder() })]) {
    const outcome = compareObservations(left, right);
    const model = buildReportModel({ left, right, outcome });
    assert.equal(model.status, outcome.status);
    assert.equal(model.corpus_verified, outcome.corpus_verified);
  }
});

test('a self-contradicting outcome is refused instead of rendered', () => {
  const left = nodeObservation();
  const right = nodeObservation();
  const outcome = compareObservations(left, right);

  const cases = [
    { ...outcome, status: STATUS.PASS, first_difference: { kind: 'order', position: 0, left: 'a', right: 'b' } },
    { ...outcome, status: STATUS.DIFFERENCE },
    { ...outcome, status: 'MAYBE' },
    { ...outcome, reason: '' },
    { ...outcome, corpus_verified: undefined },
    { ...outcome, metadata: { left_hash: 'not-a-hash', right_hash: 'nope' } },
    { ...outcome, metadata: undefined },
    null,
    'PASS',
  ];

  for (const doctored of cases) {
    assert.throws(() => assertOutcomeConsistency(doctored), undefined, `accepted ${canonicalJson(doctored)}`);
    assert.throws(() => renderReport({ left, right, outcome: doctored }), undefined, `rendered ${canonicalJson(doctored)}`);
  }
});

test('a tampered observation never renders as PASS', () => {
  const left = nodeObservation();
  const right = { ...nodeObservation(), result: { ...nodeObservation().result, order: ['nur-ein-wert'] } };
  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);

  const html = report(outcome, left, right);
  assert.match(html, /data-outcome-status="INCONCLUSIVE"/);
  assert.doesNotMatch(html, /data-outcome-status="PASS"/);
});

// ── untraceable metrics ───────────────────────────────────────────────────

test('no invented metric appears anywhere in a generated report', () => {
  const left = nodeObservation();
  const right = postgresObservation({ order: reversedOrder() });
  const html = report(compareObservations(left, right), left, right);

  for (const invented of ['1,842', '8.7 MB', '4.2', '0.6 MB', '20.11', 'PG 16.2', '6 of 8', 'ICU 74.2 on both']) {
    assert.ok(!html.includes(invented), `report invented ${invented}`);
  }

  assert.match(html, /not measured/);
  assert.match(html, /the probes record no timings/);
});

// ── determinism ───────────────────────────────────────────────────────────

test('rendering is byte-identical across repeated calls', () => {
  const left = nodeObservation();
  const right = postgresObservation({ order: reversedOrder() });
  const outcome = compareObservations(left, right);

  assert.equal(report(outcome, left, right), report(outcome, left, right));
  assert.equal(Buffer.from(report(outcome, left, right)).toString('hex'), Buffer.from(report(outcome, left, right)).toString('hex'));
});

test('rendering is byte-identical across processes, timezones and locales', () => {
  const directory = mkdtempSync(join(tmpdir(), 'materna-report-'));
  const leftPath = join(directory, 'left.json');
  const rightPath = join(directory, 'right.json');
  const scriptPath = join(directory, 'render.mjs');

  const left = nodeObservation();
  const right = postgresObservation({ order: reversedOrder() });
  writeFileSync(leftPath, JSON.stringify(left));
  writeFileSync(rightPath, JSON.stringify(right));

  writeFileSync(scriptPath, `
import { readFileSync } from 'node:fs';
import { compareObservations } from ${JSON.stringify(new URL('../src/compare.js', import.meta.url).href)};
import { renderReport } from ${JSON.stringify(new URL('../src/report.js', import.meta.url).href)};
const left = JSON.parse(readFileSync(${JSON.stringify(leftPath)}, 'utf8'));
const right = JSON.parse(readFileSync(${JSON.stringify(rightPath)}, 'utf8'));
process.stdout.write(renderReport({ left, right, outcome: compareObservations(left, right) }));
`);

  const run = (env) => execFileSync(process.execPath, [scriptPath], { env: { ...process.env, ...env }, maxBuffer: 32 * 1024 * 1024 });

  const first = run({ TZ: 'UTC', LANG: 'en_US.UTF-8' });
  const second = run({ TZ: 'Pacific/Kiritimati', LANG: 'de_DE.UTF-8' });
  assert.ok(first.length > 0);
  assert.equal(first.toString('hex'), second.toString('hex'));

  const inProcess = report(compareObservations(left, right), left, right);
  assert.ok(first.equals(Buffer.from(inProcess)), 'child process and in-process rendering diverged');
});

test('rendering does not mutate its inputs', () => {
  const left = nodeObservation();
  const right = postgresObservation({ order: reversedOrder() });
  const outcome = compareObservations(left, right);

  const before = canonicalJson({ left, right, outcome });
  report(outcome, left, right);
  assert.equal(canonicalJson({ left, right, outcome }), before);

  const frozen = JSON.parse(JSON.stringify({ left, right, outcome }));
  const deepFreeze = (value) => {
    if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  };
  deepFreeze(frozen);
  assert.doesNotThrow(() => renderReport({ ...frozen }));
});

// ── escaping ──────────────────────────────────────────────────────────────

test('escapeHtml neutralises every dangerous character', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('" onmouseover="x'), '&quot; onmouseover=&quot;x');
  assert.equal(escapeHtml("'"), '&#39;');
  assert.equal(escapeHtml('<!-- -->'), '&lt;!-- --&gt;');
  assert.equal(escapeHtml('a\u2028b\u2029c'), 'a&#8232;b&#8233;c');
  assert.equal(escapeHtml('</style><style>'), '&lt;/style&gt;&lt;style&gt;');
});

test('hostile observation content cannot escape its context', () => {
  // Markup-bearing payloads must not survive as markup. Benign Unicode must
  // survive intact: dropping it would be silent evidence loss, not hardening.
  const hostile = [
    '<script>alert(1)</script>',
    '</style><script>alert(2)</script>',
    '"><img src=x onerror=alert(3)>',
    "' onmouseover='alert(4)",
    '<!--<script>',
    '<svg/onload=alert(6)>',
    'a\u2028x',
  ];
  const benign = ['💥 non-BMP ✓', 'ß', "l'apostrophe", 'a & b'];

  for (const payload of [...hostile, ...benign]) {
    const left = nodeObservation({
      environment: { runtime: 'node', injected: payload },
      order: [...corpus.samples.slice(0, -1), payload],
    });
    const right = postgresObservation({ environment: { runtime: 'postgres', injected: payload } });
    const outcome = compareObservations(left, right);
    const html = report(outcome, left, right);

    if (hostile.includes(payload)) {
      assert.ok(!html.includes(payload), `payload reached the document verbatim: ${payload}`);
      assert.ok(html.includes(escapeHtml(payload)), `payload was dropped instead of escaped: ${payload}`);
    } else {
      assert.ok(html.includes(escapeHtml(payload)), `benign value was dropped: ${payload}`);
    }
    assert.ok(!/<script/i.test(html), `a script element appeared for payload: ${payload}`);
    // An event handler is dangerous as an *attribute*; the same bytes inside an
    // escaped text node are inert.
    assert.ok(!/<[a-zA-Z][^>]*\son[a-z]+\s*=/i.test(html), `an event handler attribute appeared for payload: ${payload}`);
    assert.ok(!/<img/i.test(html), `an img element appeared for payload: ${payload}`);
    assert.ok(!/javascript:/i.test(html), `a javascript: URL appeared for payload: ${payload}`);
    // Escaped payload text is still visible, so the report did not silently drop evidence.
    if (payload === '<script>alert(1)</script>') {
      assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    }
  }
});

test('a hostile outcome reason is escaped', () => {
  const html = report({ status: STATUS.ERROR, reason: '<img src=x onerror=alert(1)>' }, null, null);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

// ── CLI contract ──────────────────────────────────────────────────────────

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout };
  } catch (error) {
    return { code: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

test('materna report writes a deterministic file and keeps the exit-code contract', () => {
  const directory = mkdtempSync(join(tmpdir(), 'materna-cli-report-'));
  const leftPath = join(directory, 'left.json');
  const rightPath = join(directory, 'right.json');
  const outPath = join(directory, 'report.html');

  writeFileSync(leftPath, JSON.stringify(nodeObservation()));
  writeFileSync(rightPath, JSON.stringify(postgresObservation()));
  const pass = runCli(['report', '--left', leftPath, '--right', rightPath, '--out', outPath]);
  assert.equal(pass.code, 0);
  const firstBytes = readFileSync(outPath, 'utf8');
  assert.match(firstBytes, /data-outcome-status="PASS"/);

  writeFileSync(rightPath, JSON.stringify(postgresObservation({ order: reversedOrder() })));
  const difference = runCli(['report', '--left', leftPath, '--right', rightPath, '--out', outPath]);
  assert.equal(difference.code, 1);
  assert.match(readFileSync(outPath, 'utf8'), /data-outcome-status="DIFFERENCE"/);

  const malformed = runCli(['report', '--left', join(directory, 'missing.json'), '--right', rightPath, '--out', outPath]);
  assert.equal(malformed.code, 3);

  const unknown = runCli(['report', '--left', leftPath, '--right', rightPath, '--collation', 'en-US-x-icu']);
  assert.equal(unknown.code, 3);

  // Re-rendering the same inputs overwrites with identical bytes.
  writeFileSync(rightPath, JSON.stringify(postgresObservation()));
  runCli(['report', '--left', leftPath, '--right', rightPath, '--out', outPath]);
  assert.equal(readFileSync(outPath, 'utf8'), firstBytes);
});
