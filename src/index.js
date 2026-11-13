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

// Report rendering is a projection of a comparison outcome. It is exported so a
// consumer can render the same bytes the CLI writes, without shelling out.
export { REPORT_SCHEMA, buildReportModel, escapeHtml, renderReport } from './report.js';
