/**
 * Observation comparison.
 *
 * Comparison is intentionally conservative:
 *   - missing evidence is INCONCLUSIVE, never PASS;
 *   - an observation that is not a rearrangement of the corpus it names is
 *     INCONCLUSIVE, because its fingerprint is a fingerprint of the wrong
 *     experiment;
 *   - observations that declare different probes, options or corpora are
 *     INCONCLUSIVE, because their fingerprints are not comparable;
 *   - a metadata difference alone is not a behavioural failure;
 *   - unexpected failures are ERROR, never a silent success.
 */

import { canonicalJson, corpusConformance, validateObservation } from './observation.js';
import { loadCorpus } from './corpus.js';

export const STATUS = Object.freeze({
  PASS: 'PASS',
  DIFFERENCE: 'DIFFERENCE',
  INCONCLUSIVE: 'INCONCLUSIVE',
  ERROR: 'ERROR',
});

const COMPARABLE_PATHS = Object.freeze([
  'probe.property',
  'probe.version',
  'probe.locale',
  'probe.options.sensitivity',
  'probe.options.numeric',
  'corpus.id',
  'corpus.version',
  'corpus.hash',
]);

function readPath(value, path) {
  return path.split('.').reduce((accumulator, key) => {
    if (accumulator === null || typeof accumulator !== 'object') {
      return undefined;
    }
    return accumulator[key];
  }, value);
}

function comparisonMetadata(left, right) {
  return {
    left_hash: left.result.result_hash,
    right_hash: right.result.result_hash,
    locale: left.probe.locale,
    property: left.probe.property,
    corpus: `${left.corpus.id}@${left.corpus.version}`,
  };
}

function environmentDifferences(left, right) {
  const leftEnvironment = left.environment ?? {};
  const rightEnvironment = right.environment ?? {};
  const keys = [...new Set([...Object.keys(leftEnvironment), ...Object.keys(rightEnvironment)])].sort();

  const differences = [];
  for (const key of keys) {
    if (canonicalJson(leftEnvironment[key]) !== canonicalJson(rightEnvironment[key])) {
      differences.push({ field: key, left: leftEnvironment[key], right: rightEnvironment[key] });
    }
  }
  return differences;
}

/**
 * Check an observation against the corpus it names, when that corpus is
 * available locally.
 *
 * A fingerprint only means something relative to the inputs it was computed
 * over. An observation that declares `collation-core-v1@1` but ordered two
 * samples of it is self-consistent and worthless: the hash proves the document
 * was not edited, not that the experiment declared by the document happened.
 */
function corpusCheck(observation) {
  const declaredId = observation?.corpus?.id;
  if (typeof declaredId !== 'string' || declaredId.length === 0) {
    return { verified: false, problems: [], unverified: 'observation declares no corpus id' };
  }

  let corpus;
  try {
    corpus = loadCorpus(declaredId);
  } catch (error) {
    return {
      verified: false,
      problems: [],
      unverified: `corpus ${JSON.stringify(declaredId)} is not available locally (${error && error.message ? error.message.split('\n')[0] : String(error)})`,
    };
  }

  return { verified: true, problems: corpusConformance(observation, corpus), unverified: null };
}

export function firstDifference(leftResult, rightResult) {
  const leftOrder = leftResult.order ?? [];
  const rightOrder = rightResult.order ?? [];
  const limit = Math.min(leftOrder.length, rightOrder.length);

  for (let position = 0; position < limit; position += 1) {
    if (canonicalJson(leftOrder[position]) !== canonicalJson(rightOrder[position])) {
      return {
        kind: 'order',
        position,
        left: leftOrder[position],
        right: rightOrder[position],
      };
    }
  }

  if (leftOrder.length !== rightOrder.length) {
    return {
      kind: 'length',
      position: limit,
      left: leftOrder.length,
      right: rightOrder.length,
    };
  }

  if (canonicalJson(leftResult.ties ?? []) !== canonicalJson(rightResult.ties ?? [])) {
    return {
      kind: 'ties',
      position: null,
      left: leftResult.ties ?? [],
      right: rightResult.ties ?? [],
    };
  }

  return null;
}

/**
 * Compare two observations.
 *
 * `requireCorpusVerification` (default `false`) turns an observation whose
 * declared corpus cannot be resolved locally into INCONCLUSIVE instead of
 * merely flagging it. Callers comparing evidence from outside this repository
 * should set it: without it, `corpus_verified: false` is the only signal that
 * the ordering was never checked against the corpus it names.
 */
export function compareObservations(left, right, { requireCorpusVerification = false } = {}) {
  try {
    const leftValidation = validateObservation(left);
    const rightValidation = validateObservation(right);

    if (!leftValidation.ok || !rightValidation.ok) {
      const isTampered = (validation) => validation.missing
        .some((entry) => entry.startsWith('result.result_hash (does not match'));
      const tampered = isTampered(leftValidation) || isTampered(rightValidation);

      return {
        status: STATUS.INCONCLUSIVE,
        reason: tampered
          ? 'observation is not self-consistent: declared fingerprint does not match observed result'
          : 'required observed evidence is missing or malformed',
        missing: { left: leftValidation.missing, right: rightValidation.missing },
      };
    }

    const leftCorpus = corpusCheck(left);
    const rightCorpus = corpusCheck(right);
    const corpusVerified = leftCorpus.verified && rightCorpus.verified;

    if (leftCorpus.problems.length > 0 || rightCorpus.problems.length > 0) {
      return {
        status: STATUS.INCONCLUSIVE,
        reason: 'observation is not what it declares: its ordering does not match the corpus it names',
        invalid: { left: leftCorpus.problems, right: rightCorpus.problems },
        corpus_verified: corpusVerified,
        metadata: comparisonMetadata(left, right),
      };
    }

    if (requireCorpusVerification && !corpusVerified) {
      return {
        status: STATUS.INCONCLUSIVE,
        reason: 'corpus verification was required but the declared corpus could not be resolved locally',
        unverified: {
          left: leftCorpus.unverified,
          right: rightCorpus.unverified,
        },
        corpus_verified: false,
        metadata: comparisonMetadata(left, right),
      };
    }

    const incompatible = [];
    for (const path of COMPARABLE_PATHS) {
      const leftValue = readPath(left, path);
      const rightValue = readPath(right, path);

      if (canonicalJson(leftValue) !== canonicalJson(rightValue)) {
        incompatible.push({ field: path, left: leftValue, right: rightValue });
      }
    }

    if (incompatible.length > 0) {
      return {
        status: STATUS.INCONCLUSIVE,
        reason: 'observations are not comparable: declarations differ',
        incompatible,
        corpus_verified: corpusVerified,
        metadata: comparisonMetadata(left, right),
      };
    }

    const metadataDifferences = environmentDifferences(left, right);
    const metadata = comparisonMetadata(left, right);

    if (left.result.result_hash === right.result.result_hash) {
      return {
        status: STATUS.PASS,
        reason: 'result fingerprints match',
        metadata,
        corpus_verified: corpusVerified,
        metadata_differences: metadataDifferences,
        first_difference: null,
      };
    }

    return {
      status: STATUS.DIFFERENCE,
      reason: 'result fingerprints differ',
      metadata,
      corpus_verified: corpusVerified,
      metadata_differences: metadataDifferences,
      first_difference: firstDifference(left.result, right.result),
    };
  } catch (error) {
    return {
      status: STATUS.ERROR,
      reason: `comparison failed: ${error && error.message ? error.message : String(error)}`,
    };
  }
}
