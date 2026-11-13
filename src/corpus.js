/**
 * Corpus loading.
 *
 * A corpus is versioned, immutable sample data. Its hash is derived from the
 * samples only, so it identifies the behavioural inputs rather than the file
 * that happens to contain them.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJson, sha256Hex } from './observation.js';

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'corpus');
const cache = new Map();

export function loadCorpus(id = 'collation-core-v1') {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const path = join(CORPUS_DIR, `${id}.json`);
  const parsed = JSON.parse(readFileSync(path, 'utf8'));

  if (parsed.id !== id) {
    throw new Error(`corpus ${id}: file declares id ${JSON.stringify(parsed.id)}`);
  }
  if (!Array.isArray(parsed.samples) || parsed.samples.length < 2) {
    throw new Error(`corpus ${id}: samples must be an array with at least 2 entries`);
  }
  if (parsed.samples.some((sample) => typeof sample !== 'string')) {
    throw new Error(`corpus ${id}: every sample must be a string`);
  }

  const corpus = Object.freeze({
    id,
    version: String(parsed.version),
    description: parsed.description ?? '',
    samples: Object.freeze([...parsed.samples]),
    hash: sha256Hex(canonicalJson(parsed.samples)),
  });

  cache.set(id, corpus);
  return corpus;
}
