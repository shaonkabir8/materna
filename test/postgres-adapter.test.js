import assert from 'node:assert/strict';
import { test } from 'node:test';

import { postgresEnvironment, quoteCollation } from '../src/adapters/postgres.js';

test('quoteCollation quotes a single identifier and accepts real collation names', () => {
  assert.equal(quoteCollation('de_DE'), '"de_DE"');
  assert.equal(quoteCollation('en_US$1'), '"en_US$1"');
  // Real ICU names, which the quote-only rule used to reject outright.
  assert.equal(quoteCollation('en-US-x-icu'), '"en-US-x-icu"');
  // A dotted name is one identifier. Schema qualification is resolved against
  // pg_collation by resolveCollation(), not guessed from the string: see
  // test/collation-identifier.test.js for why splitting on the dot is unsound.
  assert.equal(quoteCollation('pg_catalog.C'), '"pg_catalog.C"');
});

test('quoteCollation rejects injection attempts', () => {
  for (const hostile of [
    'x"; DROP TABLE users; --',
    "x' OR '1'='1",
    'x y',
    'x;--',
    '',
    '"quoted"',
    'a.b.c',
    null,
    42,
  ]) {
    assert.throws(() => quoteCollation(hostile), /collation name must be a non-empty string|refusing to use unsafe collation identifier/);
  }
});

test('postgresEnvironment records collation metadata separately from behaviour', () => {
  const environment = postgresEnvironment({
    serverVersion: 'PostgreSQL 16.15',
    settings: { server_encoding: 'UTF8', lc_collate: 'C.UTF-8', lc_ctype: 'C.UTF-8' },
    collation: { collname: 'C', collprovider: 'c', collversion: null },
  });

  assert.equal(environment.runtime, 'postgres');
  assert.equal(environment.server_version, 'PostgreSQL 16.15');
  assert.equal(environment.encoding, 'UTF8');
  assert.equal(environment.collation_name, 'C');
  assert.equal(environment.collation_provider, 'c');
});

test('postgresEnvironment tolerates absent metadata without throwing', () => {
  const environment = postgresEnvironment({});
  assert.equal(environment.runtime, 'postgres');
  assert.equal(environment.server_version, null);
  assert.equal(environment.collation_name, null);
});
