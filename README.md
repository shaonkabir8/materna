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

`postgres` also accepts `--collation <name>` — a PostgreSQL collation such as
`en-US-x-icu`, `C.utf8` or `de_DE`. The name is resolved against `pg_collation`
via a parameterized query; the identifier that reaches `ORDER BY` is built from
the catalog row, never from the string you passed. An unknown name is an error,
not a silent fallback to the database default.

Environment: `DATABASE_URL`, and `PG_COLLATION` as the default for
`--collation`.

Unknown or malformed options are rejected with exit code 3. An ignored option is
worse than a rejected one, because the resulting observation would look like it
was produced with settings that were never applied.

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

## Render the comparison as a report

```bash
node src/cli.js node     --json > node.json
node src/cli.js postgres --json > pg.json
node src/cli.js report   --left node.json --right pg.json --out report.html
```

The report is a **projection of the comparison outcome**, not a second opinion.
Every value on the page is read from the comparison outcome or from the two
observation documents; nothing is computed for display. Two invariants hold by
construction and are asserted in tests:

```
report.status          === outcome.status
report.corpus_verified === outcome.corpus_verified
```

An outcome that contradicts itself (a `PASS` carrying a `first_difference`, a
`DIFFERENCE` with no difference, a decided verdict with no reproducible
fingerprints) is **refused** rather than rendered.

Rendering is deterministic: no clock, no randomness, no process id. Identical
inputs produce byte-identical HTML, which is what makes the page reviewable and
diffable. Quantities this project does not measure — elapsed time, heap, a run
timestamp, a multi-locale matrix — are printed as **not measured** with the
reason, because a plausible-looking placeholder number is indistinguishable from
a real one.

Observation documents are untrusted input. The generated page contains no
JavaScript at all, and every value reaches only an escaped text node or an
escaped double-quoted attribute, so a hostile sample, environment string or
`reason` cannot break out of its context.

`materna report` uses the same exit-code contract as `compare` (0 `PASS`,
1 `DIFFERENCE`, 2 `INCONCLUSIVE`, 3 `ERROR`), so it can gate a pipeline directly.

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
- An observation whose `order` is not a rearrangement of the corpus it names, or
  whose declared corpus hash/version does not match that corpus, or whose tie
  groups name values it never ordered → `INCONCLUSIVE`. A fingerprint proves a
  document was not edited; it does not prove the experiment in the document
  happened. Outcomes carry `corpus_verified` so this is visible either way, and
  `compareObservations(l, r, { requireCorpusVerification: true })` makes an
  unresolvable corpus fatal.
- Unsafe collation identifier → `ERROR`, rejected before any connection is
  opened.

## Limitations

- Two proven probes only: Node.js `Intl.Collator` and PostgreSQL `ORDER BY`.
  MySQL, SQLite and browser runtimes are not implemented.
- PostgreSQL support is verified against PostgreSQL 18.6 on Linux (x86_64) in
  this revision, and in a Node 20/22 × PostgreSQL 14/16 CI matrix whose workflow
  is committed but has not yet executed on hosted runners. See
  [`docs/ENGINEERING_LOG.md`](docs/ENGINEERING_LOG.md) for the exact evidence
  level behind each claim.
- Integrity is not authenticity. An attacker who recomputes `result_hash` over a
  correctly reordered corpus produces a document that still compares. Materna
  checks consistency, not provenance; it does not sign observations.
- The default PostgreSQL connection uses `C.UTF-8` unless `PG_COLLATION` names
  another collation, so a `DIFFERENCE` against Node's ICU ordering is expected
  and is a property of that configuration, not a bug.
- The corpus is deliberately small (16 samples). It targets specific
  discriminators, not exhaustive CLDR coverage.
- Ties are collected for the database default collation too, and reported as
  complete groups in corpus order, so an agreeing runtime produces an identical
  tie structure instead of a spurious difference.
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
recorded as skipped, never as a pass — and CI asserts `# skipped 0`, so a green
pipeline cannot mean "nothing was verified".

## Contributing

Adapters for other runtimes, a larger corpus, and richer reporters are welcome.
Keep changes small, add a behavioural test, and do not claim a result you have
not observed.

## License

MIT — see [`LICENSE`](LICENSE).
