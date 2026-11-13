/**
 * Observation primitives.
 *
 * An observation is the serialisable evidence produced by one probe run:
 * what was declared, what environment executed it, what was observed, and a
 * SHA-256 fingerprint of the normalised observation result.
 */

import { createHash } from 'node:crypto';

export const OBSERVATION_SCHEMA = 'materna.observation/1';

const SHA256_HEX = /^[0-9a-f]{64}$/;

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

/**
 * A multiset of the observed values, used to ask "is this ordering a
 * rearrangement of the corpus, or something else?".
 */
export function multiset(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function sameMultiset(left, right) {
  const leftCounts = multiset(left);
  const rightCounts = multiset(right);
  if (leftCounts.size !== rightCounts.size) return false;
  for (const [value, count] of leftCounts) {
    if (rightCounts.get(value) !== count) return false;
  }
  return true;
}

/**
 * Structural problems with an observed ordering. A non-string member is not an
 * ordering: it is a malformed observation, and it must never compare as PASS.
 * An ordering is not trusted merely because it hashes consistently.
 */
export function orderProblems(order) {
  if (!Array.isArray(order)) {
    return ['result.order (not an array)'];
  }

  const problems = [];
  order.forEach((value, index) => {
    if (typeof value !== 'string') {
      problems.push(`result.order[${index}] (not a string)`);
    } else if (value.length === 0) {
      problems.push(`result.order[${index}] (empty string)`);
    }
  });
  return problems;
}

/**
 * Structural problems with the observed tie structure. A tie group must name
 * at least two distinct members that the observation actually ordered; a tie
 * group referring to values that were never observed is fabricated evidence.
 */
export function tieProblems(order, ties) {
  if (!Array.isArray(ties)) {
    return ['result.ties (not an array)'];
  }

  const present = new Set(Array.isArray(order) ? order.filter((value) => typeof value === 'string') : []);
  const seenGroups = new Set();
  const problems = [];

  ties.forEach((group, index) => {
    if (!Array.isArray(group)) {
      problems.push(`result.ties[${index}] (not an array)`);
      return;
    }
    if (group.length < 2) {
      problems.push(`result.ties[${index}] (fewer than 2 members)`);
      return;
    }

    const members = new Set();
    for (const member of group) {
      if (typeof member !== 'string') {
        problems.push(`result.ties[${index}] (member is not a string)`);
        continue;
      }
      if (!present.has(member)) {
        problems.push(`result.ties[${index}] (member ${JSON.stringify(member)} is not in result.order)`);
      }
      if (members.has(member)) {
        problems.push(`result.ties[${index}] (duplicate member ${JSON.stringify(member)})`);
      }
      members.add(member);
    }

    const key = canonicalJson([...members].sort());
    if (seenGroups.has(key)) {
      problems.push(`result.ties[${index}] (duplicate tie group)`);
    }
    seenGroups.add(key);
  });

  return problems;
}

/**
 * Cross-check an observation against a corpus it claims to have observed.
 *
 * Three independent claims are checked, because each one is separately
 * forgeable: the declared corpus identity, the declared corpus hash, and the
 * claim that the ordering is a rearrangement of exactly those samples.
 */
export function corpusConformance(observation, corpus) {
  const problems = [];
  const declared = observation?.corpus ?? {};
  const declaredVersion = declared.version === undefined ? null : String(declared.version);

  if (declaredVersion !== String(corpus.version)) {
    problems.push(`corpus.version (declares ${JSON.stringify(declaredVersion)}, corpus is ${JSON.stringify(String(corpus.version))})`);
  }

  if (declared.hash !== corpus.hash) {
    problems.push('corpus.hash (does not match the corpus it names)');
  }

  const order = Array.isArray(observation?.result?.order) ? observation.result.order : [];
  if (!sameMultiset(order, corpus.samples)) {
    problems.push(
      `result.order (is not a rearrangement of the ${corpus.samples.length} declared corpus samples; observed ${order.length})`,
    );
  }

  return problems;
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
  const malformed = orderProblems(order);
  if (malformed.length > 0) {
    throw new TypeError(`buildObservation: ${malformed.slice(0, 3).join(', ')}`);
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

    if (path === 'result.result_hash' && !SHA256_HEX.test(String(value))) {
      missing.push(`${path} (not sha-256 hex)`);
    }
  }

  if (observation.result !== null && typeof observation.result === 'object') {
    if (Array.isArray(observation.result.order)) {
      missing.push(...orderProblems(observation.result.order));
      missing.push(...tieProblems(observation.result.order, observation.result.ties ?? []));
    } else if (Array.isArray(observation.result.ties) === false) {
      missing.push('result.ties (not an array)');
    }
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
