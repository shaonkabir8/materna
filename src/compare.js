/**
 * Observation comparison.
 *
 * Comparison is intentionally conservative:
 *   - missing evidence is INCONCLUSIVE, never PASS;
 *   - observations that declare different probes, options or corpora are
 *     INCONCLUSIVE, because their fingerprints are not comparable;
 *   - a metadata difference alone is not a behavioural failure;
 *   - unexpected failures are ERROR, never a silent success.
 */

import { canonicalJson, validateObservation } from './observation.js';

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

export function compareObservations(left, right) {
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
          : 'required observed evidence is missing',
        missing: { left: leftValidation.missing, right: rightValidation.missing },
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
        metadata_differences: metadataDifferences,
        first_difference: null,
      };
    }

    return {
      status: STATUS.DIFFERENCE,
      reason: 'result fingerprints differ',
      metadata,
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
