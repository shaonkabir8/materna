<div align="center">
  <h1>Materna</h1>
  <p><strong>Behavioral locale parity probing for Node.js and PostgreSQL.</strong></p>
  <p>
    <a href="https://github.com/shaonkabir8/materna">
      <img src="https://img.shields.io/github/stars/shaonkabir8/materna?style=flat-square" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/shaonkabir8/materna/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/shaonkabir8/materna?style=flat-square" alt="License" />
    </a>
    <a href="https://github.com/shaonkabir8/materna/pulls">
      <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
    </a>
  </p>
  <p>
    <a href="#what-materna-is">What it is</a> •
    <a href="#install">Install</a> •
    <a href="#run">Run</a> •
    <a href="#api">API</a> •
    <a href="#what-the-output-means">Output</a> •
    <a href="#limitations">Limitations</a> •
    <a href="#verify-it-yourself">Verify</a>
  </p>
</div>

---

## What Materna is

Materna is a small engineering utility: it **observes** locale-sensitive collation
in Node.js and in PostgreSQL, normalises both observations, fingerprints them with
SHA-256, and **compares the fingerprints**.

Versions are metadata. Observed behavior is evidence.

The tool does not declare a mismatch because ICU, CLDR, glibc or PostgreSQL
versions differ. It declares a mismatch only when two runs over the *same*
declared probe and corpus produce different observed orderings or different
tie structures.

## Install

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
```

Requires Node.js 20+. The single runtime dependency is `pg`, used only by the
PostgreSQL probe.

## Run

```bash
# Probe the Node.js runtime
npm run probe:node

# Probe PostgreSQL (DATABASE_URL is honoured; a local default is used otherwise)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' npm run probe:postgres

# Compare two observations
node src/cli.js compare --left de.json --right pg.json

# Same, machine-readable
node src/cli.js node --json > de.json
node src/cli.js postgres --json > pg.json
node src/cli.js compare --left de.json --right pg.json --json
```

Flags for `node` and `postgres`: `--locale`, `--sensitivity` (`base`, `accent`,
`case`, `variant`), `--numeric`, `--corpus`, `--json`.

Environment: `DATABASE_URL`, and `PG_COLLATION` to force a named PostgreSQL
collation in `ORDER BY`.

### Exit codes

| Code | Status | Meaning |
|---:|:---|:---|
| 0 | `PASS` | Fingerprints match |
| 1 | `DIFFERENCE` | Fingerprints differ; the first differing position is printed |
| 2 | `INCONCLUSIVE` | Evidence missing, unsupported locale, unreadable input, or observations that are not comparable |
| 3 | `ERROR` | Malformed JSON, bad arguments, unsafe identifier, driver failure |

## API

```js
import { probeNode, probePostgres, compareObservations } from 'materna';

const left = probeNode({ locale: 'de-DE' });
const right = await probePostgres({
  locale: 'de-DE',
  connectionString: process.env.DATABASE_URL,
});

const outcome = compareObservations(left, right);

if (outcome.status === 'INCONCLUSIVE') {
  // Missing or non-comparable evidence. Never treat this as compatibility.
  throw new Error(outcome.reason);
}

if (outcome.status === 'DIFFERENCE') {
  console.error(outcome.first_difference);
  process.exit(1);
}
```

Also exported: `loadCorpus`, `validateObservation`, `canonicalJson`,
`resultHash`, `sha256Hex`, `firstDifference`, `STATUS`, `OBSERVATION_SCHEMA`.

## What the output means

An observation records four things separately:

| Section | Contents |
|:---|:---|
| `probe` | What was declared: property, version, locale, resolved locale, support flag, sensitivity, numeric |
| `corpus` | Input identity: `collation-core-v1@1` plus a hash of the samples |
| `environment` | Node/ICU/Unicode/V8, or PostgreSQL version, encoding, `datcollate`, collation provider |
| `result` | The observed ordering, the observed tie groups, and `result_hash` |

`result_hash` is SHA-256 over the canonical JSON of `{order, ties}`. Ties are
included because two runtimes can agree on order while disagreeing on which
values are equal.

Comparison rules:

- Fingerprints match → `PASS`. A differing `environment` is reported as
  `metadata_differences` and is **not** a failure.
- Fingerprints differ → `DIFFERENCE`, with `first_difference`.
- Observed evidence missing → `INCONCLUSIVE`.
- Declarations differ (`locale`, `sensitivity`, `numeric`, `corpus`, probe
  version) → `INCONCLUSIVE`, because the fingerprints were never comparable.
- A declared `result_hash` that does not match the observed ordering →
  `INCONCLUSIVE`. A self-inconsistent document is not evidence.
- Unsafe collation identifier → `ERROR`, rejected before any connection is
  opened.

## Limitations

- Two proven probes only: Node.js `Intl.Collator` and PostgreSQL `ORDER BY`.
  MySQL, SQLite and browser runtimes are not implemented.
- PostgreSQL support is verified against PostgreSQL 16.15 on Linux. Other
  versions and other operating systems are not verified here.
- The default PostgreSQL connection uses `C.UTF-8` unless `PG_COLLATION` names
  another collation, so a `DIFFERENCE` against Node's ICU ordering is expected
  and is a property of that configuration, not a bug.
- The corpus is deliberately small (16 samples). It targets specific
  discriminators, not exhaustive CLDR coverage.
- Ties are only collected when a named collation is used.
- No hosted control plane, no production-scale claims, no market claims.

## Verify it yourself

```bash
npm test
```

The suite covers canonical serialisation, fingerprint stability, corpus
immutability, probe determinism, the `de-DE` vs `sv-SE` ordering split, the
Turkish dotted/dotless I case, unsupported-locale fallback, tie-structure
differences, metadata-only false-positive resistance, missing-evidence handling,
hash-tampering detection, collation-identifier injection, and — when
`DATABASE_URL` is reachable — live PostgreSQL probing including a check that the
temporary table is not left behind.

Live database tests **skip** when no server is reachable. A skipped test is
recorded as skipped, never as a pass.

## Contributing

Adapters for other runtimes, a larger corpus, and richer reporters are welcome.
Keep changes small, add a behavioural test, and do not claim a result you have
not observed.

## License

MIT — see [`LICENSE`](LICENSE).
