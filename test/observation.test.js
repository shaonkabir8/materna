import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  OBSERVATION_SCHEMA,
  buildObservation,
  canonicalJson,
  normalizedResult,
  resultHash,
  sha256Hex,
  validateObservation,
} from '../src/observation.js';

const corpus = { id: 'test-corpus', version: '1', hash: 'a'.repeat(64) };

function observation(order = ['a', 'b'], ties = []) {
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
    environment: { runtime: 'node' },
  });
}

test('canonicalJson is independent of key insertion order', () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

test('canonicalJson preserves array order', () => {
  assert.notEqual(canonicalJson(['a', 'b']), canonicalJson(['b', 'a']));
});

test('canonicalJson keeps null and nested structures distinct', () => {
  assert.equal(canonicalJson({ a: null }), '{"a":null}');
  assert.equal(canonicalJson([{ z: 1, a: [1, 2] }]), '[{"a":[1,2],"z":1}]');
});

test('sha256Hex matches a known vector', () => {
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('result hash is stable across calls and independent of declaration metadata', () => {
  const first = resultHash(['a', 'b'], []);
  const second = resultHash(['a', 'b'], []);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test('result hash changes when ties change but order does not', () => {
  assert.notEqual(resultHash(['a', 'b'], []), resultHash(['a', 'b'], [['a', 'b']]));
});

test('normalizedResult captures order and ties only', () => {
  assert.deepEqual(normalizedResult(['a'], []), { order: ['a'], ties: [] });
});

test('buildObservation produces a self-consistent fingerprinted document', () => {
  const built = observation();
  assert.equal(built.schema, OBSERVATION_SCHEMA);
  assert.equal(built.result.result_hash, resultHash(built.result.order, built.result.ties));
  assert.equal(validateObservation(built).ok, true);
});

test('buildObservation does not alias its input arrays', () => {
  const order = ['a', 'b'];
  const built = observation(order);
  order.push('c');
  assert.deepEqual(built.result.order, ['a', 'b']);
});

test('buildObservation rejects malformed arguments', () => {
  assert.throws(() => observation('not-an-array'), TypeError);
  assert.throws(
    () => buildObservation({ property: 'x', probeVersion: '1', corpus: null, order: [], ties: [] }),
    TypeError,
  );
});

test('validateObservation reports every missing field instead of defaulting it', () => {
  const result = validateObservation({ schema: OBSERVATION_SCHEMA });
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('result.order'));
  assert.ok(result.missing.includes('result.result_hash'));
  assert.ok(result.missing.includes('corpus.hash'));
});

test('validateObservation rejects a non-object and a non sha-256 hash', () => {
  assert.equal(validateObservation(null).ok, false);
  assert.equal(validateObservation([]).ok, false);

  const tampered = observation();
  tampered.result.result_hash = 'not-a-hash';
  const validation = validateObservation(tampered);
  assert.equal(validation.ok, false);
  assert.ok(validation.missing.some((entry) => entry.startsWith('result.result_hash')));
});

test('validateObservation rejects a non-array order', () => {
  const tampered = observation();
  tampered.result.order = 'a,b';
  assert.equal(validateObservation(tampered).ok, false);
});
