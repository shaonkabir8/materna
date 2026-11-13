/**
 * Node.js collation probe.
 *
 * The probe declares its own configuration, executes locale-sensitive
 * collation, and returns an observation. It records the *resolved* locale and
 * whether the requested locale is actually supported, because Intl silently
 * falls back to another locale: a fallback ordering that is then compared
 * against another runtime would produce a false PASS.
 */

import { loadCorpus } from './corpus.js';
import { buildObservation } from './observation.js';

export const DEFAULT_PROBE = Object.freeze({
  property: 'collation.sort',
  version: '1',
  locale: 'de-DE',
  sensitivity: 'variant',
  numeric: false,
});

export function nodeEnvironment() {
  return {
    runtime: 'node',
    node: process.version,
    v8: process.versions.v8 ?? null,
    icu: process.versions.icu ?? null,
    unicode: process.versions.unicode ?? null,
    platform: process.platform,
    arch: process.arch,
  };
}

function collectTies(sorted, collator) {
  const groups = [];
  let current = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const value = sorted[index];

    if (collator.compare(previous, value) === 0) {
      current.push(value);
    } else {
      if (current.length > 1) {
        groups.push(current);
      }
      current = [value];
    }
  }

  if (current.length > 1) {
    groups.push(current);
  }

  return groups;
}

export function probeNode(options = {}) {
  const {
    corpus = loadCorpus('collation-core-v1'),
    locale = DEFAULT_PROBE.locale,
    sensitivity = DEFAULT_PROBE.sensitivity,
    numeric = DEFAULT_PROBE.numeric,
  } = options;

  const collator = new Intl.Collator(locale, { sensitivity, numeric, usage: 'sort' });
  const resolved = collator.resolvedOptions();
  const supported = Intl.Collator.supportedLocalesOf([locale]).length > 0;

  const order = [...corpus.samples].sort(collator.compare);
  const ties = collectTies(order, collator);

  return buildObservation({
    property: DEFAULT_PROBE.property,
    probeVersion: DEFAULT_PROBE.version,
    corpus,
    locale,
    localeResolved: resolved.locale ?? null,
    localeSupported: supported,
    sensitivity,
    numeric,
    order,
    ties,
    environment: nodeEnvironment(),
  });
}
