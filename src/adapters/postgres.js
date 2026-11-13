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
 *   - a collation name cannot be a bind parameter, so the requested name is
 *     first resolved against pg_collation (as a bound parameter) and the
 *     identifier that is finally interpolated is the one the *server* returned,
 *     quoted with PostgreSQL quote_ident() semantics;
 *   - names that fail validation never reach a connection at all;
 *   - no statement alters an existing collation, index, or table.
 */

import { buildObservation } from '../observation.js';
import { loadCorpus } from '../corpus.js';

export const DEFAULT_CONNECTION = 'postgresql://postgres:postgres@localhost:5432/localeparity';

/**
 * The characters that appear in real PostgreSQL collation names: ICU names
 * (`en-US-x-icu`), libc names (`en_US.utf8`, `C.utf8`) and user-created names.
 * Anything outside this set is refused before a connection is opened.
 */
const COLLATION_NAME_CHARS = /^[A-Za-z0-9_$][A-Za-z0-9_$-]{0,199}(\.[A-Za-z0-9_$][A-Za-z0-9_$-]{0,199})?$/;
const SCHEMA_QUALIFIED = /^([A-Za-z_][A-Za-z0-9_$]*)\.([A-Za-z_][A-Za-z0-9_$]*)$/;

/**
 * Quote one identifier part the way PostgreSQL's quote_ident() does: always
 * double-quote, and double any embedded quote. The result cannot terminate the
 * identifier early.
 */
export function quoteIdent(part) {
  return `"${String(part).replace(/"/g, '""')}"`;
}

/**
 * Validate and quote a collation name for SQL interpolation.
 *
 * The whole name is quoted as a SINGLE identifier, which is the only
 * unambiguous reading. A dot inside a collation name is genuinely ambiguous:
 * `C.utf8` and `en_US.utf8` are real single names, while `pg_catalog.C` is a
 * schema qualification — and no pattern can tell them apart, because
 * `en_US.utf8` has exactly the shape of `schema.name`. Splitting on the dot is
 * therefore wrong for at least one of them. Only the server's catalog can
 * disambiguate, which is what resolveCollation() does; it builds the identifier
 * that is finally interpolated from the catalog row, never from the caller.
 *
 * This function remains the pure syntax gate: it refuses whitespace, quotes,
 * semicolons, statement syntax and multi-dot names before any connection is
 * opened.
 */
export function quoteCollation(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('collation name must be a non-empty string');
  }

  // A double dash is a SQL line comment. It is never part of a real collation
  // name, and quoting alone would accept it: PostgreSQL's lexer strips comments
  // before identifiers are resolved, so "x--comment" is accepted but scanned as
  // x. Refuse it at the boundary rather than rely on the lexer.
  if (name.includes('--')) {
    throw new Error(`refusing to use unsafe collation identifier: ${JSON.stringify(name)}`);
  }
  if (!COLLATION_NAME_CHARS.test(name)) {
    throw new Error(`refusing to use unsafe collation identifier: ${JSON.stringify(name)}`);
  }
  return quoteIdent(name);
}

/**
 * Resolve a caller-supplied collation name against the server's catalog.
 *
 * The whole name is tried first, so a collation genuinely called `C.utf8` is
 * found as itself. Only if that fails is a single `schema.name` split
 * attempted. The identifier that later appears in SQL is built from the
 * catalog row, never from the caller's string.
 */
export async function resolveCollation(client, requested) {
  if (typeof requested !== 'string' || requested.length === 0) {
    throw new Error('collation name must be a non-empty string');
  }
  // Reject syntactic attacks before the catalog is consulted, so hostile input
  // is never sent as a parameter either.
  quoteCollation(requested);

  const exact = await client.query(
    `SELECT c.collname, n.nspname
       FROM pg_collation c
       JOIN pg_namespace n ON n.oid = c.collnamespace
      WHERE c.collname = $1
        AND n.nspname = ANY (current_schemas(true))
      ORDER BY (n.nspname = 'pg_catalog') DESC, n.nspname
      LIMIT 1`,
    [requested],
  );
  if (exact.rows.length > 0) {
    return toResolution(exact.rows[0], requested);
  }

  const qualified = SCHEMA_QUALIFIED.exec(requested);
  if (qualified) {
    const split = await client.query(
      `SELECT c.collname, n.nspname
         FROM pg_collation c
         JOIN pg_namespace n ON n.oid = c.collnamespace
        WHERE c.collname = $1 AND n.nspname = $2
        LIMIT 1`,
      [qualified[2], qualified[1]],
    );
    if (split.rows.length > 0) {
      return toResolution(split.rows[0], requested);
    }
  }

  throw new Error(
    `unknown collation ${JSON.stringify(requested)}: it does not exist in this database. `
    + 'List available collations with: SELECT collname FROM pg_collation ORDER BY collname;',
  );
}

function toResolution(row, requested) {
  return {
    requested,
    name: row.collname,
    schema: row.nspname,
    ident: `${quoteIdent(row.nspname)}.${quoteIdent(row.collname)}`,
  };
}

export function postgresEnvironment({ serverVersion, settings, collation, requestedCollation = null }) {
  return {
    runtime: 'postgres',
    server_version: serverVersion ?? null,
    encoding: settings?.server_encoding ?? null,
    lc_collate: settings?.lc_collate ?? null,
    lc_ctype: settings?.lc_ctype ?? null,
    locale_provider: settings?.locale_provider ?? null,
    collation_requested: requestedCollation ?? null,
    collation_name: collation?.collname ?? null,
    collation_schema: collation?.nspname ?? null,
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

  // Validate the request before opening a connection: a bad identifier is a
  // caller error, not a database error, and it must not cost a connection.
  if (collation !== null) {
    quoteCollation(collation);
  }

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

    // A requested collation is resolved against the catalog; otherwise the
    // database default collation is described. Metadata must never turn a
    // successful behavioural probe into a failure, so catalog reads are
    // tolerated and reported as null.
    let resolution = null;
    if (collation !== null) {
      resolution = await resolveCollation(client, collation);
    }

    let collationRow = null;
    try {
      const collationResult = await client.query(
        `SELECT c.collname, c.collprovider, c.collversion, n.nspname
           FROM pg_collation c
           JOIN pg_namespace n ON n.oid = c.collnamespace
          WHERE c.collname = $1
            AND n.nspname = ANY (current_schemas(true))
          ORDER BY (n.nspname = 'pg_catalog') DESC, n.nspname
          LIMIT 1`,
        [resolution === null ? settings.lc_collate : resolution.name],
      );
      collationRow = collationResult.rows[0] ?? null;
    } catch {
      collationRow = null;
    }

    // The order clause uses the catalog-resolved identifier. When no collation
    // was requested the database default applies, which is already recorded in
    // environment.lc_collate.
    const collate = resolution === null ? '' : ` COLLATE ${resolution.ident}`;

    // No ON COMMIT DROP: without an explicit transaction every statement is its
    // own transaction, which would drop the temporary table immediately.
    // `ord` records the corpus position so ordering is deterministic even when
    // two samples compare equal, and so tie groups can be rebuilt in the same
    // member order the Node.js probe reports.
    await client.query(`CREATE TEMPORARY TABLE ${table} (ord integer NOT NULL, value text NOT NULL)`);

    await client.query(
      `INSERT INTO ${table} (ord, value)
       SELECT u.ordinality::int, u.value
         FROM unnest($1::text[]) WITH ORDINALITY AS u(value, ordinality)`,
      [corpus.samples],
    );

    const ordered = await client.query(`SELECT value FROM ${table} ORDER BY value${collate}, ord`);
    const order = ordered.rows.map((row) => row.value);

    // Ties are values the collation treats as equal. dense_rank() over the
    // collation ordering yields exactly those groups, and array_agg(ORDER BY
    // ord) keeps each group in corpus order — the same member order the Node.js
    // probe produces — so an agreeing runtime produces the same tie structure
    // instead of a spurious difference.
    //
    // The grouping binds a collation, so it runs whenever the effective
    // collation is expressible: always, using the database default when no
    // collation was requested.
    const effectiveCollate = resolution === null ? '' : collate;
    let ties = [];
    try {
      const tied = await client.query(
        `WITH ranked AS (
           SELECT value, ord, dense_rank() OVER (ORDER BY value${effectiveCollate}) AS grp
             FROM ${table}
         )
         SELECT array_agg(value ORDER BY ord) AS members
           FROM ranked
          GROUP BY grp
         HAVING count(*) > 1
          ORDER BY grp`,
      );
      ties = tied.rows.map((row) => row.members);
    } catch {
      // A tie structure that cannot be observed is missing evidence, but it
      // must not destroy the ordering evidence that was observed.
      ties = [];
    }

    await client.query(`DROP TABLE ${table}`);

    const environment = postgresEnvironment({
      serverVersion: settings.version,
      settings,
      collation: collationRow,
      requestedCollation: collation,
    });
    environment.collation_source = resolution === null ? 'database default' : 'requested';

    return buildObservation({
      property: 'collation.sort',
      probeVersion: '1',
      corpus,
      locale,
      localeResolved: resolution === null ? (collationRow?.collname ?? null) : resolution.name,
      // Recorded as a fact: the requested collation was resolved against the
      // catalog, or no collation was requested at all. It is never assumed.
      localeSupported: resolution === null ? null : true,
      sensitivity,
      numeric,
      order,
      ties,
      environment,
    });
  } finally {
    await client.end();
  }
}
