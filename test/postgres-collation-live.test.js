/**
 * Live PostgreSQL tests for collation selection and tie structure.
 *
 * These require a reachable PostgreSQL server and are skipped — never passed —
 * when none is available.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { probePostgres } from '../src/adapters/postgres.js';
import { validateObservation } from '../src/observation.js';
import { loadCorpus } from '../src/corpus.js';

const DATABASE_URL = process.env.DATABASE_URL ?? null;

async function serverAvailable() {
  if (!DATABASE_URL) return false;
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

test('a keyed ICU collation is accepted and recorded as a fact', { skip }, async () => {
  const observation = await probePostgres({
    connectionString: DATABASE_URL,
    collation: 'en-US-x-icu',
  });

  assert.equal(observation.probe.locale_supported, true);
  assert.equal(observation.probe.locale_resolved, observation.environment.collation_name);
  assert.equal(observation.environment.collation_requested, 'en-US-x-icu');
  assert.equal(observation.environment.collation_source, 'requested');
  assert.equal(validateObservation(observation).ok, true);

  const { samples } = loadCorpus('collation-core-v1');
  assert.deepEqual([...observation.result.order].sort(), [...samples].sort());
});

test('a collation whose name contains a dot is found as itself, not as schema.name', { skip }, async () => {
  // `C.utf8` exists in a stock catalog as a single collation name. Treating the
  // dot as a schema separator yields "C"."utf8", which does not exist.
  const observation = await probePostgres({ connectionString: DATABASE_URL, collation: 'C.utf8' });
  assert.equal(observation.environment.collation_name, 'C.utf8');
  assert.equal(observation.probe.locale_resolved, 'C.utf8');
});

test('an unknown collation fails with a nameable error instead of silently ignoring the request', { skip }, async () => {
  await assert.rejects(
    () => probePostgres({ connectionString: DATABASE_URL, collation: 'no-such-collation-x-icu' }),
    /unknown collation "no-such-collation-x-icu"/,
  );
});

test('tie groups are complete groups whose members the observation ordered', { skip }, async () => {
  // ICU collation of the corpus makes canonical-equivalent and case-equivalent
  // values genuinely equal, so ties must be observed rather than assumed. The
  // structural assertions below hold whether or not this corpus ties.
  const observation = await probePostgres({
    connectionString: DATABASE_URL,
    collation: 'en-US-x-icu',
  });

  const order = observation.result.order;
  const present = new Set(order);

  for (const group of observation.result.ties) {
    assert.ok(Array.isArray(group), 'a tie group must be an array of members');
    assert.ok(group.length >= 2, 'a tie group must have at least two members');
    assert.equal(new Set(group).size, group.length, 'a tie group must not repeat a member');
    for (const member of group) {
      assert.ok(present.has(member), `tie member ${JSON.stringify(member)} must appear in the observed order`);
    }
  }

  // Positionally adjacent members of a tie group must be adjacent in the order.
  for (const group of observation.result.ties) {
    const positions = group.map((member) => order.indexOf(member)).sort((a, b) => a - b);
    for (let index = 1; index < positions.length; index += 1) {
      assert.equal(positions[index], positions[index - 1] + 1, 'tie members must be adjacent in the order');
    }
  }
});

test('requesting a collation changes the observation only through real behaviour', { skip }, async () => {
  const defaults = await probePostgres({ connectionString: DATABASE_URL });
  const icu = await probePostgres({ connectionString: DATABASE_URL, collation: 'C' });

  // Both are valid, self-consistent evidence. Either they agree or they differ;
  // neither outcome may be INCONCLUSIVE, and the metadata must say which
  // collation produced which ordering.
  assert.equal(validateObservation(defaults).ok, true);
  assert.equal(validateObservation(icu).ok, true);
  assert.equal(defaults.environment.collation_source, 'database default');
  assert.equal(icu.environment.collation_source, 'requested');
});
