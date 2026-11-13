import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STATUS, compareObservations, firstDifference } from '../src/compare.js';
import { buildObservation } from '../src/observation.js';

const corpus = { id: 'test-corpus', version: '1', hash: 'b'.repeat(64) };

function observation({
  order = ['a', 'b'],
  ties = [],
  locale = 'de-DE',
  environment = { runtime: 'node', icu: '78.3' },
} = {}) {
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

test('identical observations PASS', () => {
  const outcome = compareObservations(observation(), observation());
  assert.equal(outcome.status, STATUS.PASS);
  assert.equal(outcome.first_difference, null);
  assert.deepEqual(outcome.metadata_differences, []);
});

test('a metadata-only difference PASSes and is reported as metadata', () => {
  const left = observation({ environment: { runtime: 'node', icu: '78.3' } });
  const right = observation({ environment: { runtime: 'node', icu: '74.2' } });

  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.PASS);
  assert.equal(outcome.metadata_differences.length, 1);
  assert.equal(outcome.metadata_differences[0].field, 'icu');
});

test('different observed ordering is a DIFFERENCE with a first differing position', () => {
  const outcome = compareObservations(
    observation({ order: ['a', 'b', 'c'] }),
    observation({ order: ['a', 'c', 'b'] }),
  );

  assert.equal(outcome.status, STATUS.DIFFERENCE);
  assert.deepEqual(outcome.first_difference, {
    kind: 'order',
    position: 1,
    left: 'b',
    right: 'c',
  });
});

test('a different tie structure is a DIFFERENCE even when the order matches', () => {
  const outcome = compareObservations(
    observation({ order: ['a', 'b'], ties: [] }),
    observation({ order: ['a', 'b'], ties: [['a', 'b']] }),
  );

  assert.equal(outcome.status, STATUS.DIFFERENCE);
  assert.equal(outcome.first_difference.kind, 'ties');
});

test('a different order length is a DIFFERENCE', () => {
  const outcome = compareObservations(
    observation({ order: ['a', 'b'] }),
    observation({ order: ['a', 'b', 'c'] }),
  );

  assert.equal(outcome.status, STATUS.DIFFERENCE);
  assert.deepEqual(outcome.first_difference, { kind: 'length', position: 2, left: 2, right: 3 });
});

test('missing evidence is INCONCLUSIVE, never PASS', () => {
  const outcome = compareObservations({}, {});
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.missing.left.length > 0);
  assert.ok(outcome.missing.right.length > 0);
});

test('a partially formed observation is INCONCLUSIVE and names the missing field', () => {
  const left = observation();
  const right = observation();
  delete right.result.result_hash;

  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.missing.right.includes('result.result_hash'));
});

test('observations declaring different locales are INCONCLUSIVE, not a false DIFFERENCE', () => {
  const outcome = compareObservations(
    observation({ locale: 'de-DE' }),
    observation({ locale: 'sv-SE' }),
  );

  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.equal(outcome.incompatible[0].field, 'probe.locale');
});

test('observations over different corpora are INCONCLUSIVE', () => {
  const left = observation();
  const right = buildObservation({
    property: 'collation.sort',
    probeVersion: '1',
    corpus: { id: 'other-corpus', version: '1', hash: 'c'.repeat(64) },
    locale: 'de-DE',
    localeResolved: 'de-DE',
    localeSupported: true,
    sensitivity: 'variant',
    numeric: false,
    order: ['a', 'b'],
    ties: [],
    environment: { runtime: 'node' },
  });

  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.incompatible.some((item) => item.field === 'corpus.hash'));
});

test('observations declaring different sensitivity or numeric options are INCONCLUSIVE', () => {
  const left = observation();
  const right = buildObservation({
    property: 'collation.sort',
    probeVersion: '1',
    corpus,
    locale: 'de-DE',
    localeResolved: 'de-DE',
    localeSupported: true,
    sensitivity: 'base',
    numeric: true,
    order: ['a', 'b'],
    ties: [],
    environment: { runtime: 'node' },
  });

  const outcome = compareObservations(left, right);
  assert.equal(outcome.status, STATUS.INCONCLUSIVE);
  assert.ok(outcome.incompatible.some((item) => item.field === 'probe.options.sensitivity'));
  assert.ok(outcome.incompatible.some((item) => item.field === 'probe.options.numeric'));
});

test('an unexpected failure is ERROR, never a silent success', () => {
  const hostile = {
    get schema() {
      throw new Error('boom');
    },
  };

  const outcome = compareObservations(observation(), hostile);
  assert.equal(outcome.status, STATUS.ERROR);
  assert.match(outcome.reason, /boom/);
});

test('firstDifference returns null for equal results', () => {
  const left = observation();
  assert.equal(firstDifference(left.result, left.result), null);
});

test('compareObservations does not mutate its inputs', () => {
  const left = observation({ order: ['a', 'b'] });
  const right = observation({ order: ['b', 'a'] });
  const snapshot = JSON.stringify([left, right]);

  compareObservations(left, right);
  assert.equal(JSON.stringify([left, right]), snapshot);
});
