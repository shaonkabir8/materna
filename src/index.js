export { loadCorpus } from './corpus.js';
export { DEFAULT_PROBE, nodeEnvironment, probeNode } from './probe.js';
export {
  OBSERVATION_SCHEMA,
  buildObservation,
  canonicalJson,
  corpusConformance,
  multiset,
  normalizedResult,
  orderProblems,
  resultHash,
  sha256Hex,
  tieProblems,
  validateObservation,
} from './observation.js';
export { STATUS, compareObservations, firstDifference } from './compare.js';

// The PostgreSQL adapter imports `pg` dynamically so that installing and
// importing Materna does not require a database driver at module load time.
export { probePostgres } from './adapters/postgres.js';
