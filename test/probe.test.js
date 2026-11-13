import assert from 'node:assert/strict';
import { test } from 'node:test';

import { probeNode } from '../src/probe.js';
import { validateObservation } from '../src/observation.js';
import { loadCorpus } from '../src/corpus.js';

test('a Node.js probe produces valid, fingerprinted evidence', () => {
  const observation = probeNode();
  assert.deepEqual(
    { ok: validateObservation(observation).ok, missing: validateObservation(observation).missing },
    { ok: true, missing: [] },
  );
  assert.equal(validateObservation(observation).integrity, true);
  assert.equal(observation.environment.runtime, 'node');
  assert.equal(observation.environment.node, process.version);
  assert.equal(observation.probe.property, 'collation.sort');
  assert.equal(observation.corpus.id, 'collation-core-v1');
});

test('the Node.js probe is deterministic across repeated runs', () => {
  const first = probeNode({ locale: 'sv-SE' });
  const second = probeNode({ locale: 'sv-SE' });
  assert.equal(first.result.result_hash, second.result.result_hash);
  assert.deepEqual(first.result.order, second.result.order);
});

test('the observed order is a permutation of the corpus, never a subset', () => {
  const observation = probeNode();
  const { samples } = loadCorpus('collation-core-v1');

  assert.equal(observation.result.order.length, samples.length);
  assert.equal(new Set(observation.result.order).size, samples.length);
  assert.deepEqual(
    [...observation.result.order].sort(),
    [...samples].sort(),
  );
});

test('de-DE and sv-SE order "ä" differently, and the fingerprints reflect it', () => {
  const german = probeNode({ locale: 'de-DE' });
  const swedish = probeNode({ locale: 'sv-SE' });

  const germanA = german.result.order.indexOf('\u00e4pfel');
  const germanZ = german.result.order.indexOf('zebra');
  const swedishA = swedish.result.order.indexOf('\u00e4pfel');
  const swedishZ = swedish.result.order.indexOf('zebra');

  assert.ok(germanA < germanZ, 'de-DE should sort ä before z');
  assert.ok(swedishA > swedishZ, 'sv-SE should sort ä after z');
  assert.notEqual(german.result.result_hash, swedish.result.result_hash);
});

test('sensitivity and numeric change the observation as declared', () => {
  const base = probeNode({ sensitivity: 'base' });
  const variant = probeNode({ sensitivity: 'variant' });
  assert.equal(base.probe.options.sensitivity, 'base');
  assert.equal(variant.probe.options.sensitivity, 'variant');
  assert.notEqual(base.result.result_hash, variant.result.result_hash);

  const numeric = probeNode({ numeric: true });
  assert.equal(numeric.probe.options.numeric, true);
  assert.ok(
    numeric.result.order.indexOf('item9') < numeric.result.order.indexOf('item10'),
    'numeric collation should order item9 before item10',
  );
});

test('the Turkish dotted/dotless I case is represented in the corpus ordering', () => {
  const observation = probeNode({ locale: 'tr-TR' });
  assert.ok(observation.result.order.includes('\u0130stanbul'));
  assert.ok(observation.result.order.includes('\u0131lgaz'));
  assert.equal(observation.probe.locale_supported, true);
});

test('an unsupported locale is recorded as unsupported rather than silently accepted', () => {
  const observation = probeNode({ locale: 'zz-ZZ' });
  assert.equal(observation.probe.locale_supported, false);
  assert.notEqual(observation.probe.locale_resolved, 'zz-ZZ');
  // The evidence is still well-formed: the fallback is declared, not hidden.
  assert.equal(validateObservation(observation).ok, true);
});
