/**
 * Regression tests for the PostgreSQL collation identifier boundary.
 *
 * The previous quote-only implementation rejected every ICU collation
 * (`en-US-x-icu`, `und-x-icu`) — 723 of them in a stock PostgreSQL 18 catalog —
 * so the documented PG_COLLATION feature could not express a single
 * locale-correct collation, while accepting `C.utf8` and reinterpreting it as
 * schema `C`, relation `utf8`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { quoteCollation, quoteIdent } from '../src/adapters/postgres.js';

test('real PostgreSQL collation names are accepted', () => {
  // ICU
  assert.equal(quoteCollation('en-US-x-icu'), '"en-US-x-icu"');
  assert.equal(quoteCollation('de-DE-x-icu'), '"de-DE-x-icu"');
  assert.equal(quoteCollation('und-x-icu'), '"und-x-icu"');
  // libc
  assert.equal(quoteCollation('de_DE'), '"de_DE"');
  assert.equal(quoteCollation('en_US.utf8'), '"en_US.utf8"');
  // internal
  assert.equal(quoteCollation('ucs_basic'), '"ucs_basic"');
  assert.equal(quoteCollation('C'), '"C"');
  assert.equal(quoteCollation('POSIX'), '"POSIX"');
});

test('a dotted name is quoted as one identifier, never split on the dot', () => {
  // The previous implementation split on the dot and produced "C"."utf8",
  // which names a relation, not the collation. `en_US.utf8` has exactly the
  // same shape as `schema.name`, so no pattern can decide; only pg_collation
  // can, which is resolveCollation()'s job (covered by the live tests).
  assert.equal(quoteCollation('C.utf8'), '"C.utf8"');
  assert.equal(quoteCollation('en_US.utf8'), '"en_US.utf8"');
  assert.equal(quoteCollation('pg_catalog.C'), '"pg_catalog.C"');
});

test('statement syntax is still refused before any connection is opened', () => {
  for (const hostile of [
    'x"; DROP TABLE users; --',
    "x' OR '1'='1",
    'x y',
    'x;--',
    'x\nDROP',
    'x\\',
    'a.b.c' /* more than one dot: ambiguous, refused */,
    '',
    ' leading',
    'x--comment',
    null,
    42,
    {},
  ]) {
    assert.throws(
      () => quoteCollation(hostile),
      /collation name must be a non-empty string|refusing to use unsafe collation identifier/,
      `expected ${JSON.stringify(hostile)} to be refused`,
    );
  }
});

test('quoteIdent doubles embedded quotes so an identifier cannot terminate early', () => {
  assert.equal(quoteIdent('value'), '"value"');
  assert.equal(quoteIdent('we"ird'), '"we""ird"');
  // Even a hostile part becomes a single harmless identifier.
  assert.equal(quoteIdent('x" ; DROP TABLE t; --'), '"x"" ; DROP TABLE t; --"');
});
