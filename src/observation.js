/**
 * Observation primitives.
 *
 * An observation is the serialisable evidence produced by one probe run:
 * what was declared, what environment executed it, what was observed, and a
 * SHA-256 fingerprint of the normalised observation result.
 */

import { createHash } from 'node:crypto';

export const OBSERVATION_SCHEMA = 'materna.observation/1';

/**
 * Deterministic JSON: object keys are sorted, so two logically identical
 * documents always serialise to the same bytes.
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const members = keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${members.join(',')}}`;
  }

  const serialised = JSON.stringify(value);
  return serialised === undefined ? 'null' : serialised;
}

export function sha256Hex(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * The normalised result is the observed ordering plus the observed tie
 * structure. Ties matter: two runtimes can produce the same order while
 * disagreeing about which values are equivalent, and that disagreement is
 * itself a behavioural difference.
 */
export function normalizedResult(order, ties) {
  return { order, ties };
}

export function resultHash(order, ties) {
  return sha256Hex(canonicalJson(normalizedResult(order, ties)));
}

export function buildObservation({
  property,
  probeVersion,
  corpus,
  locale,
  localeResolved = null,
  localeSupported = null,
  sensitivity,
  numeric,
  order,
  ties,
  environment,
}) {
  if (!Array.isArray(order)) {
    throw new TypeError('buildObservation: order must be an array');
  }
  if (!Array.isArray(ties)) {
    throw new TypeError('buildObservation: ties must be an array');
  }
  if (corpus === null || typeof corpus !== 'object') {
    throw new TypeError('buildObservation: corpus is required');
  }

  const frozenOrder = [...order];
  const frozenTies = ties.map((group) => [...group]);

  return {
    schema: OBSERVATION_SCHEMA,
    probe: {
      property,
      version: String(probeVersion),
      locale,
      locale_resolved: localeResolved,
      locale_supported: localeSupported,
      options: {
        sensitivity,
        numeric: numeric === true,
      },
    },
    corpus: {
      id: corpus.id,
      version: String(corpus.version),
      hash: corpus.hash,
    },
    environment: { ...environment },
    result: {
      order: frozenOrder,
      ties: frozenTies,
      result_hash: resultHash(frozenOrder, frozenTies),
    },
  };
}

const REQUIRED_PATHS = Object.freeze([
  'schema',
  'probe.property',
  'probe.version',
  'probe.locale',
  'corpus.id',
  'corpus.version',
  'corpus.hash',
  'result.order',
  'result.result_hash',
]);

function readPath(value, path) {
  return path.split('.').reduce((accumulator, key) => {
    if (accumulator === null || typeof accumulator !== 'object') {
      return undefined;
    }
    return accumulator[key];
  }, value);
}

/**
 * Missing evidence must be reported as missing, never defaulted away.
 */
export function validateObservation(observation) {
  if (observation === null || typeof observation !== 'object' || Array.isArray(observation)) {
    return { ok: false, missing: ['<observation object>'], integrity: false };
  }

  const missing = [];

  for (const path of REQUIRED_PATHS) {
    const value = readPath(observation, path);

    if (value === undefined || value === null || value === '') {
      missing.push(path);
      continue;
    }

    if (path === 'result.order' && !Array.isArray(value)) {
      missing.push(`${path} (not an array)`);
      continue;
    }

    if (path === 'result.result_hash' && !/^[0-9a-f]{64}$/.test(String(value))) {
      missing.push(`${path} (not sha-256 hex)`);
    }
  }

  if (observation.result !== null && typeof observation.result === 'object'
    && Array.isArray(observation.result.ties) === false) {
    missing.push('result.ties (not an array)');
  }

  // The declared fingerprint must be reproducible from the observed ordering.
  // A document whose hash does not match its own result is not evidence, and
  // must never be allowed to compare as PASS.
  let integrity = false;
  if (missing.length === 0) {
    integrity = resultHash(observation.result.order, observation.result.ties ?? [])
      === observation.result.result_hash;
  }

  const problems = integrity ? missing : [...missing, 'result.result_hash (does not match observed result)'];

  return { ok: problems.length === 0, missing: problems, integrity };
}
