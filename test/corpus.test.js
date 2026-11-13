import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadCorpus } from '../src/corpus.js';
import { canonicalJson, sha256Hex } from '../src/observation.js';

test('the default corpus loads with a declared id and version', () => {
  const corpus = loadCorpus('collation-core-v1');
  assert.equal(corpus.id, 'collation-core-v1');
  assert.equal(corpus.version, '1');
  assert.ok(corpus.samples.length >= 2);
  assert.ok(corpus.samples.every((sample) => typeof sample === 'string'));
});

test('the corpus hash is derived from its samples', () => {
  const corpus = loadCorpus('collation-core-v1');
  assert.equal(corpus.hash, sha256Hex(canonicalJson(corpus.samples)));
});

test('corpus loading is cached and immutable', () => {
  const first = loadCorpus('collation-core-v1');
  const second = loadCorpus('collation-core-v1');
  assert.equal(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.samples));
  assert.throws(() => {
    first.samples.push('tampered');
  }, TypeError);
});

test('the corpus contains the locale-sensitive cases the probe relies on', () => {
  const { samples } = loadCorpus('collation-core-v1');
  // ä must be present, otherwise de-DE vs sv-SE ordering would be untested.
  assert.ok(samples.includes('\u00e4pfel'));
  // The Turkish dotted/dotless I pair.
  assert.ok(samples.includes('\u0130stanbul'));
  assert.ok(samples.includes('\u0131lgaz'));
  // Composed and decomposed forms of the same word.
  assert.ok(samples.includes('caf\u00e9'));
  assert.ok(samples.includes('cafe\u0301'));
  // A numeric-collation discriminator pair.
  assert.ok(samples.includes('item9'));
  assert.ok(samples.includes('item10'));
});

test('an unknown corpus id fails loudly', () => {
  assert.throws(() => loadCorpus('does-not-exist'), /ENOENT|no such file/);
});
