import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STATUS, compareObservations } from '../src/compare.js';
import { buildObservation } from '../src/observation.js';

const corpus = { id: 'test-corpus', version: '1', hash: 'd'.repeat(64) };

function observation(order = ['a', 'b']) {
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
    ties: [],
    environment: { runtime: 'node' },
  });
}

test('an observation whose declared hash does not match its result is never PASS', () => {
  const genuine = observation(['a', 'b']);
  const tampered = observation(['a', 'b']);
  tampered.result.order = ['b', 'a']; // hash left untouched

  const outcome = compareObservations(genuine, tampered);

  assert.notEqual(outcome.status, STATUS.PASS);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.match(outcome.reason, /not self-consistent/);
  assert.ok(
    outcome.missing.right.some((entry) => entry.includes('does not match observed result')),
    'the integrity failure must be named explicitly',
  );
});

test('a self-inconsistent document is rejected even when both sides are identical', () => {
  const tampered = observation(['a', 'b']);
  tampered.result.order = ['b', 'a'];

  const outcome = compareObservations(tampered, tampered);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
});

test('a recomputed genuine fingerprint still compares correctly', () => {
  const left = observation(['a', 'b']);
  const right = observation(['a', 'b']);
  assert.equal(compareObservations(left, right).status, STATUS.PASS);
});
