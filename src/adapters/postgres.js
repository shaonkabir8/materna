/**
 * PostgreSQL collation probe.
 *
 * The adapter is read-only with respect to user data: it creates its own
 * session-scoped temporary table, inserts the corpus as a single bound
 * parameter, asks PostgreSQL to order it, and drops the table.
 *
 * Safety boundaries:
 *   - corpus samples are never interpolated into SQL text (they travel as a
 *     bound parameter and are expanded server-side with unnest());
 *   - a collation name cannot be a bind parameter, so it is validated against
 *     a strict identifier pattern and double-quoted before interpolation;
 *   - no statement alters an existing collation, index, or table.
 */

import { buildObservation } from '../observation.js';
import { loadCorpus } from '../corpus.js';

export const DEFAULT_CONNECTION = 'postgresql://postgres:postgres@localhost:5432/localeparity';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const SCHEMA_QUALIFIED = /^[A-Za-z_][A-Za-z0-9_$]*\.[A-Za-z_][A-Za-z0-9_$]*$/;

/**
 * Validate and quote a collation name for SQL interpolation.
 * Rejects anything that is not a plain (optionally schema-qualified) identifier.
 */
export function quoteCollation(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('collation name must be a non-empty string');
  }
  if (!IDENTIFIER.test(name) && !SCHEMA_QUALIFIED.test(name)) {
    throw new Error(`refusing to use unsafe collation identifier: ${JSON.stringify(name)}`);
  }
  return name
    .split('.')
    .map((part) => `"${part}"`)
    .join('.');
}

export function postgresEnvironment({ serverVersion, settings, collation }) {
  return {
    runtime: 'postgres',
    server_version: serverVersion ?? null,
    encoding: settings?.server_encoding ?? null,
    lc_collate: settings?.lc_collate ?? null,
    lc_ctype: settings?.lc_ctype ?? null,
    locale_provider: settings?.locale_provider ?? null,
    collation_name: collation?.collname ?? null,
    collation_provider: collation?.collprovider ?? null,
    collation_version: collation?.collversion ?? null,
  };
}

export async function probePostgres(options = {}) {
  const {
    corpus = loadCorpus('collation-core-v1'),
    locale = 'de-DE',
    sensitivity = 'variant',
    numeric = false,
    connectionString = process.env.DATABASE_URL || DEFAULT_CONNECTION,
    collation = process.env.PG_COLLATION || null,
  } = options;

  // Validate the collation before opening a connection: a bad identifier is a
  // caller error, not a database error.
  const quoted = collation === null ? null : quoteCollation(collation);

  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('PostgreSQL probe requires the "pg" dependency. Install it with: npm install pg');
  }

  const Client = pg.default?.Client ?? pg.Client;
  const client = new Client({ connectionString });
  await client.connect();

  const table = `materna_probe_${process.pid}_${Date.now()}`;

  try {
    const version = await client.query(
      // lc_collate / lc_ctype are not GUCs on PostgreSQL 16 (only lc_messages,
      // lc_monetary, lc_numeric and lc_time are), so database-level values are
      // read from pg_database rather than from current_setting().
      `SELECT version() AS version,
              current_setting('server_encoding') AS server_encoding,
              d.datcollate AS lc_collate,
              d.datctype AS lc_ctype,
              d.datlocprovider AS locale_provider
         FROM pg_database d
        WHERE d.datname = current_database()`,
    );
    const settings = version.rows[0] ?? {};

    let collationRow = null;
    try {
      const collationResult = collation
        ? await client.query(
          'SELECT collname, collprovider, collversion FROM pg_collation WHERE collname = $1 LIMIT 1',
          [collation],
        )
        : await client.query(
          'SELECT collname, collprovider, collversion FROM pg_collation WHERE collname = $1 LIMIT 1',
          [settings.lc_collate],
        );
      collationRow = collationResult.rows[0] ?? null;
    } catch {
      // pg_collation is readable on supported versions, but metadata must never
      // turn a successful behavioural probe into a failure.
      collationRow = null;
    }

    // No ON COMMIT DROP: without an explicit transaction every statement is its
    // own transaction, which would drop the temporary table immediately.
    await client.query(`CREATE TEMPORARY TABLE ${table} (value text NOT NULL)`);

    await client.query(`INSERT INTO ${table} (value) SELECT unnest($1::text[])`, [corpus.samples]);

    const orderClause = quoted === null ? 'ORDER BY value' : `ORDER BY value COLLATE ${quoted}`;
    const ordered = await client.query(`SELECT value FROM ${table} ${orderClause}`);
    const order = ordered.rows.map((row) => row.value);

    // Ties are values the collation treats as equal. They are part of the
    // observation because equal-ordering but unequal tie structure is still a
    // behavioural difference between two runtimes.
    let ties = [];
    if (quoted !== null) {
      const tied = await client.query(
        `SELECT a.value AS left_value, b.value AS right_value
           FROM ${table} a
           JOIN ${table} b ON a.value < b.value
          WHERE a.value COLLATE ${quoted} = b.value COLLATE ${quoted}
          ORDER BY a.value, b.value`,
      );
      const grouped = new Set();
      const groups = [];
      for (const row of tied.rows) {
        const key = `${row.left_value}\u0000${row.right_value}`;
        if (!grouped.has(key)) {
          grouped.add(key);
          groups.push([row.left_value, row.right_value]);
        }
      }
      ties = groups;
    }

    await client.query(`DROP TABLE ${table}`);

    return buildObservation({
      property: 'collation.sort',
      probeVersion: '1',
      corpus,
      locale,
      localeResolved: collationRow?.collname ?? null,
      localeSupported: collation === null ? null : true,
      sensitivity,
      numeric,
      order,
      ties,
      environment: postgresEnvironment({ serverVersion: settings.version, settings, collation: collationRow }),
    });
  } finally {
    await client.end();
  }
}
