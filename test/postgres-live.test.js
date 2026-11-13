/**
 * Live PostgreSQL integration tests.
 *
 * These require a reachable PostgreSQL server. They are skipped — never
 * silently passed — when no server is available, because a skipped
 * integration test is missing evidence, not evidence of compatibility.
 *
 * Run with:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/localeparity npm test
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { probePostgres } from '../src/adapters/postgres.js';
import { probeNode } from '../src/probe.js';
import { compareObservations, STATUS } from '../src/compare.js';
import { validateObservation } from '../src/observation.js';
import { loadCorpus } from '../src/corpus.js';

const DATABASE_URL = process.env.DATABASE_URL ?? null;

async function serverAvailable() {
  if (!DATABASE_URL) {
    return false;
  }
  try {
    const pg = await import('pg');
    const Client = pg.default?.Client ?? pg.Client;
    const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 3000 });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const available = await serverAvailable();
const skip = available ? false : 'no reachable PostgreSQL (set DATABASE_URL to enable live tests)';

test('a live PostgreSQL probe produces valid, fingerprinted evidence', { skip }, async () => {
  const observation = await probePostgres({ connectionString: DATABASE_URL });

  assert.deepEqual(
    { ok: validateObservation(observation).ok, missing: validateObservation(observation).missing },
    { ok: true, missing: [] },
  );
  assert.equal(validateObservation(observation).integrity, true);
  assert.equal(observation.environment.runtime, 'postgres');
  assert.match(observation.environment.server_version, /^PostgreSQL/);

  const { samples } = loadCorpus('collation-core-v1');
  assert.equal(observation.result.order.length, samples.length);
  assert.deepEqual([...observation.result.order].sort(), [...samples].sort());
});

test('a live PostgreSQL probe is repeatable', { skip }, async () => {
  const first = await probePostgres({ connectionString: DATABASE_URL });
  const second = await probePostgres({ connectionString: DATABASE_URL });
  assert.equal(first.result.result_hash, second.result.result_hash);
});

test('a live PostgreSQL probe does not leave its temporary table behind', { skip }, async () => {
  const pg = await import('pg');
  const Client = pg.default?.Client ?? pg.Client;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const before = await client.query(
      "SELECT count(*)::int AS n FROM pg_class WHERE relname LIKE 'materna_probe_%'",
    );
    await probePostgres({ connectionString: DATABASE_URL });
    const after = await client.query(
      "SELECT count(*)::int AS n FROM pg_class WHERE relname LIKE 'materna_probe_%'",
    );
    assert.equal(after.rows[0].n, before.rows[0].n);
  } finally {
    await client.end();
  }
});

test('corpus text reaches PostgreSQL intact, including emoji and combining marks', { skip }, async () => {
  const observation = await probePostgres({ connectionString: DATABASE_URL });
  const { samples } = loadCorpus('collation-core-v1');

  for (const sample of samples) {
    assert.ok(
      observation.result.order.includes(sample),
      `sample ${JSON.stringify(sample)} was lost or transformed in transit`,
    );
  }
});

test('an unsafe collation identifier is rejected before any query runs', { skip }, async () => {
  await assert.rejects(
    () => probePostgres({ connectionString: DATABASE_URL, collation: 'x"; DROP TABLE users; --' }),
    /refusing to use unsafe collation identifier/,
  );
});

test('Node.js and PostgreSQL are compared as two behavioural observations', { skip }, async () => {
  const node = probeNode({ locale: 'de-DE' });
  const postgres = await probePostgres({ connectionString: DATABASE_URL, locale: 'de-DE' });

  const outcome = compareObservations(node, postgres);

  // The comparison must be decidable — PASS or DIFFERENCE — never INCONCLUSIVE
  // because of a malformed observation, and never ERROR.
  assert.ok(
    outcome.status === STATUS.PASS || outcome.status === STATUS.DIFFERENCE,
    `unexpected status ${outcome.status}: ${outcome.reason ?? ''}`,
  );

  // A metadata difference alone must not be reported as a behavioural failure.
  if (outcome.status === STATUS.PASS) {
    assert.equal(outcome.first_difference, null);
  } else {
    assert.ok(outcome.first_difference);
    assert.notEqual(node.result.result_hash, postgres.result.result_hash);
  }
});
