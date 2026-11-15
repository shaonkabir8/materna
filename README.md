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

As a dependency:

```bash
npm install materna
```

As a CLI, without writing it into a project:

```bash
npx materna node
```

From source (the only route that currently works end to end — see
[release status](#release-status)):

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
```

Requires Node.js 22+ (executed on 22, 24 and 26). The single runtime dependency
is `pg`, used only by the PostgreSQL probe; it is imported dynamically, so
`import 'materna'` and `materna node` work with no database driver loaded and no
dashboard or build step.

PostgreSQL is **not** required to install, import, or run the Node.js probe.
Only `materna postgres` needs a server. Locally verified against PostgreSQL
16.15; PostgreSQL 14 is configured in CI and has not been observed passing (see
the [compatibility matrix](#compatibility)).

## Run

Subcommands are `node`, `postgres`, `compare` and `report`. The examples below
use the installed bin name; from a source checkout, `node src/cli.js` is
equivalent.

```bash
# Probe the Node.js runtime
materna node

# Probe PostgreSQL (DATABASE_URL is honoured; a local default is used otherwise)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' materna postgres

# Compare two observations
materna compare --left de.json --right pg.json

# Same, machine-readable
materna node --json > de.json
materna postgres --json > pg.json
materna compare --left de.json --right pg.json --json
```

`materna <command> --help` is not a subcommand flag; run `materna --help` for the
global usage block. In a source checkout, `npm run probe:node` and
`npm run probe:postgres` are the same two probes.

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

## Compatibility

Claims are separated by evidence level. **E3** = executed here, output
recorded. **E1** = configured in the repository, not executed on hosted
runners.

| Surface | Verified | Evidence level |
|:---|:---|:---|
| Node.js 22.23.5, Linux x86_64, ICU 78.3 | full suite, 98/98 | E3 — executed |
| Node.js 24.22.3, Linux x86_64 | full suite, 98/98 | E3 — executed |
| Node.js 26.13.1, Linux x86_64 | full suite, 98/98 | E3 — executed |
| PostgreSQL 16.15, Linux x86_64 | full suite incl. 11 live tests, 98/98 | E3 — executed |
| PostgreSQL 14, Linux x86_64 | configured in `ci.yml` | E1 — never observed passing |
| macOS, Windows | not executed | UNVERIFIED |
| MySQL, SQLite, browsers | not implemented | — |

`engines.node` is `>=22`, matching the oldest line that is still supported and
that executes the full suite. Node 20 reached end of life on 2026-04-30
([official schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json));
the suite still passes on 20.20.2, but an end-of-life runtime is not advertised
as supported, so it is neither in `engines` nor in the CI matrix.

`ci.yml` also runs the TAP summary through a gate that fails the build when any
test was skipped. That gate recognises both summary formats, because Node ≤ 22
prints `# skipped N` while Node ≥ 24 prints `ℹ skipped N` — a gate matching only
the first form would have failed every Node 24 and 26 job for the wrong reason.

## Release status

| Requirement | State |
|:---|:---|
| Package name `materna` on npm | **unclaimed** at the time of writing (`npm view materna` → 404) |
| `npm install materna` | **does not work yet** — nothing has been published |
| Package tarball | validated: `npm pack`, installed into a clean consumer project, import + bin smoke-tested |
| CI workflow (`.github/workflows/ci.yml`) | committed, **not yet executed** on hosted runners (E1) |
| Release workflow (`.github/workflows/release.yml`) | committed, **blocked** on a Trusted Publisher configuration in npm package settings (E1). It refuses to publish unless CI has reported success on the exact tagged commit |
| Publication | **not performed.** Publishing is an irreversible, human-authorized action |

The unclaimed name is a snapshot of one registry lookup, not a reservation: a
name can be taken at any time before the publish. The repository is
`shaonkabir8/materna` and is not renamed, scoped, or republished under another
identity.

## Limitations

- Two proven probes only: Node.js `Intl.Collator` and PostgreSQL `ORDER BY`.
  MySQL, SQLite and browser runtimes are not implemented.
- PostgreSQL support is verified against PostgreSQL 16.15 on Linux (x86_64) for
  this revision. PostgreSQL 14 is configured in the CI matrix but its
  integration tests have **not** been observed passing, so it is not called
  verified. `docs/ENGINEERING_LOG.md` records PostgreSQL 18.6 from an earlier
  loop; that run was not reproduced for this commit and is treated as historical
  documentation, not as current evidence. See
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
