/**
 * Regression tests for the observation trust boundary.
 *
 * Each case here was first reproduced as a false PASS against the previous
 * implementation: the document was self-consistent, so it hashed correctly, so
 * it compared as PASS without ever being checked against the corpus it claimed
 * to have observed. A fingerprint proves a document was not edited; it does not
 * prove the experiment in the document happened.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STATUS, compareObservations } from '../src/compare.js';
import { buildObservation, validateObservation } from '../src/observation.js';
import { loadCorpus } from '../src/corpus.js';

const real = loadCorpus('collation-core-v1');
const declared = { id: real.id, version: real.version, hash: real.hash };

function craft(order, { ties = [], runtime = 'node', corpus = declared } = {}) {
  return buildObservation({
    property: 'collation.sort',
    probeVersion: '1',
    corpus,
    locale: 'de-DE',
    localeResolved: 'de-DE',
    localeSupported: true,
    sensitivity: 'variant',
    numeric: false,
    order,
    ties,
    environment: { runtime },
  });
}

test('an observation that ordered only part of the corpus it names is never PASS', () => {
  const truncated = craft(['apple', 'zebra']);

  // The document is internally consistent: the hash matches the two values it
  // does contain. That is exactly why integrity alone is not enough.
  assert.equal(validateObservation(truncated).integrity, true);

  const outcome = compareObservations(truncated, craft(['apple', 'zebra'], { runtime: 'postgres' }));

  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.match(outcome.reason, /does not match the corpus it names/);
  assert.ok(outcome.invalid.left.some((entry) => entry.startsWith('result.order')));
  assert.equal(outcome.corpus_verified, true);
});

test('duplicated samples standing in for a lost sample are never PASS', () => {
  const order = [...real.samples.slice(0, real.samples.length - 1), 'apple'];
  assert.equal(order.length, real.samples.length, 'same length as the corpus, different multiset');

  const outcome = compareObservations(craft(order), craft(order, { runtime: 'postgres' }));
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.invalid.left.some((entry) => entry.startsWith('result.order')));
});

test('a forged corpus hash is rejected even when both sides agree', () => {
  const forged = { ...craft([...real.samples]) };
  forged.corpus = { ...forged.corpus, hash: 'f'.repeat(64) };
  const other = { ...craft([...real.samples], { runtime: 'postgres' }) };
  other.corpus = { ...other.corpus, hash: 'f'.repeat(64) };

  const outcome = compareObservations(forged, other);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.invalid.left.some((entry) => entry.startsWith('corpus.hash')));
});

test('a declared corpus version that does not match the corpus is rejected', () => {
  const lying = { ...craft([...real.samples]) };
  lying.corpus = { ...lying.corpus, version: '99' };

  const outcome = compareObservations(lying, craft([...real.samples], { runtime: 'postgres' }));
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.invalid.left.some((entry) => entry.startsWith('corpus.version')));
});

test('a tie group naming values that were never observed is rejected', () => {
  const fabricated = craft([...real.samples], { ties: [['ghost-a', 'ghost-b']] });

  const outcome = compareObservations(fabricated, craft([...real.samples], { runtime: 'postgres' }));
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  // The structural tie check rejects this before the corpus check is reached,
  // so the defect surfaces in whichever field the comparison reports it in.
  assert.match(
    JSON.stringify(outcome),
    /is not in result.order/,
    'the fabricated tie members must be named explicitly',
  );
});

test('a non-string member in the observed ordering is rejected, not compared', () => {
  const hostile = craft([...real.samples]);
  hostile.result.order = [null, ...real.samples.slice(1)];
  // The tampered document is no longer self-consistent either; both gates must
  // hold, and the structural gate is the one that names the defect.
  const outcome = compareObservations(hostile, craft([...real.samples], { runtime: 'postgres' }));
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
});

test('buildObservation refuses to construct an ordering of non-strings', () => {
  assert.throws(() => craft([{ a: 1 }, null]), TypeError);
});

test('an unresolvable corpus is reported as unverified, and can be made fatal', () => {
  const unknown = { id: 'not-in-this-repository', version: '1', hash: 'c'.repeat(64) };
  const left = craft(['a', 'b'], { corpus: unknown });
  const right = craft(['a', 'b'], { corpus: unknown, runtime: 'postgres' });

  const lenient = compareObservations(left, right);
  assert.equal(lenient.status, STATUS.PASS);
  assert.equal(lenient.corpus_verified, false);

  const strict = compareObservations(left, right, { requireCorpusVerification: true });
  assert.equal(strict.status, STATUS.INCONCLUSIVE);
  assert.match(strict.reason, /corpus verification was required/);
});

test('genuine evidence for the real corpus still PASSes and reports verification', () => {
  const left = craft([...real.samples]);
  const right = craft([...real.samples], { runtime: 'postgres' });

  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.PASS);
  assert.equal(outcome.corpus_verified, true);
});

test('a reordering of real corpus samples is still a DIFFERENCE, not a rejection', () => {
  const reordered = [...real.samples].reverse();
  const outcome = compareObservations(craft([...real.samples]), craft(reordered, { runtime: 'postgres' }));

  assert.equal(outcome.status, STATUS.DIFFERENCE);
  assert.equal(outcome.corpus_verified, true);
  assert.equal(outcome.first_difference.kind, 'order');
});
