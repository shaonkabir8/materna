# Materna — engineering log

Durable engineering memory. One entry per improvement loop. Facts only: what was
known, what was proven, what was wrong, what changed and what remains uncertain.
Replace the "next loop" section at the start of each loop.

---

## Loop 002 — 2026-11-13 — the report becomes a projection, not a mock-up

Base commit: `dcfc9589d70121a66b948a7a36b2fd989a34ac37` ("feat(core): implement the
documented P0 probing foundation"), plus the loop 001 working tree that was
supplied as `materna-loop-001-repo.zip` and had never been committed.

### A. Repository state before this loop

- Remote `main` was at `dcfc958`. The supplied snapshot contained **uncommitted**
  loop 001 work: 671 insertions across `src/{observation,compare,cli,index}.js`,
  `src/adapters/postgres.js`, `package.json`, `README.md`, `docs/README.md`, both
  HTML pages, plus new `.github/workflows/ci.yml`, `docs/ENGINEERING_LOG.md` and
  four new test files. `git status` on a fresh clone therefore showed 11 modified
  and 6 untracked entries, not a clean tree. Loop 001's delivery existed only as
  an archive, so nothing in it was reproducible from the repository itself.
- Local baseline of that tree, with PostgreSQL 16.15 reachable: **80 tests, 80
  pass, 0 fail, 0 skipped**. Node 22.23.4, npm 10.9.9, Linux x86_64, ICU 78.3,
  Unicode 17.0.
- There was no presentational layer at all. `compareObservations()` returned
  `status`, `reason`, `corpus_verified`, `metadata`, `metadata_differences`,
  `first_difference`, `missing`, `invalid`, `incompatible` — and the CLI printed
  them to stdout and threw them away. Nothing could render an outcome.
- `docs/report/index.html` (1543 lines) was a design shell carrying a hand-written
  demo dataset: `Node 20.11 · PG 16.2`, `8` probes, `6 of 8` diverged, `1,842 ms`,
  `8.7 MB` peak heap with `baseline 4.2`, `1.2 MB` external, `+0.6 MB` growth,
  `ICU 74.2 on both`. It already carried an illustrative banner, so the page was
  not *lying* — but its numbers were still formatted exactly like measurements,
  and no file in the repository could produce any of them. `1,842 ms` and the heap
  figures have no producer: `src/probe.js` records `process.versions.*` only.
- `index.html` (3176 lines) had three corrupted status rows, each an unclosed
  `<span>`: `BLOCKEDVERIFIED · PG 18.6`, `NOT IMPLEMENTEDIMPLEMENTED`,
  `NOT ESTABLISHEDDEFINED · UNEXECUTED`. Two of those claims were also false at
  HEAD: live PostgreSQL verification and the comparison CLI both worked.

### B. Verified defects (reproduced before fixing)

1. **Untraceable report.** Every figure in `docs/report/index.html` was
   unproducible by this repository. Severity: medium (trust/evidence integrity,
   not a runtime vulnerability). Reproduction: grep the literals; grep the source
   tree for any timing or heap instrumentation — none exists.
2. **No outcome → presentation path.** `materna compare` was the end of the line.
   Severity: medium (capability gap). Reproduction: `src/cli.js` subcommands are
   `node`, `postgres`, `compare` only.
3. **Corrupted, unclosed markup in `index.html`.** Severity: low (rendering), but
   the corrupted text carried two false status claims. Reproduction: the three
   rows listed above; each `<span>` lacks `</span>` and the closing `</div>` is
   inside the span's text.

### C. Rejected assumptions

- *"A generated report needs a templating engine."* Rejected: the whole document
  is composed from a fixed set of sections whose values are escaped strings. A
  dependency would add supply-chain surface for zero behavioural gain.
- *"The demo page should be deleted, or replaced by the generated one."* Rejected:
  the brief forbids removing either page, and the shell carries the visual
  identity (design tokens, i18n dictionaries, RTL rules, theme persistence) that a
  generated report should inherit rather than reinvent.
- *"Timing and heap could be measured cheaply and kept."* Rejected for this loop:
  adding instrumentation changes probe semantics and the observation schema, which
  is out of scope. The honest move is to state that the quantity is not measured.
- *"Rendering `JSON.stringify(observation)` into a `<script>` block is safe because
  it is JSON."* Rejected: `</script>` inside a string value terminates the script
  element; JSON is not HTML-safe. The generated document therefore contains **no
  script element at all**, and raw JSON is inlined into an escaped `<pre>`.

### D. Engineering decisions

- **New module `src/report.js`** (no new dependency, no template language). It
  exports `renderReport`, `buildReportModel`, `assertOutcomeConsistency` and
  `escapeHtml`. It is re-exported from `src/index.js` so a consumer can render the
  same bytes the CLI writes.
- **The outcome is the only source of truth.** `buildReportModel()` copies
  `status` and `corpus_verified` from the outcome and then re-asserts
  `model.status === outcome.status` and
  `model.corpus_verified === (outcome.corpus_verified === true)` before returning.
  `assertOutcomeConsistency()` rejects an outcome that contradicts itself, so the
  page fails closed instead of rendering a confident fiction.
- **Refusal cases** (all tested): unknown `status`; `PASS` carrying a
  `first_difference`; `DIFFERENCE` with no `first_difference`; empty `reason`;
  decided outcome with no `corpus_verified` boolean; decided outcome with
  non-hex `left_hash`/`right_hash`; missing `metadata`; non-object outcomes.
- **Unmeasured quantities are named.** A "Not measured by this run" section lists
  elapsed time, peak heap, run timestamp, locale matrix and PII redaction with the
  reason each is absent. A blank or plausible placeholder reads as a measurement;
  an explicit "not measured — the probes record no timings" cannot.
- **Determinism by construction.** No `Date`, no `Math.random`, no `process.pid`,
  no locale-dependent formatting, keys iterated in sorted order. Verified by
  rendering in two child processes under different `TZ` and `LANG` and comparing
  hex bytes, not by inspection.
- **No JavaScript in the output.** With no script context, untrusted observation
  values can only reach an escaped text node or an escaped double-quoted
  attribute. This removes an entire class of bug rather than guarding one context.
- **Bounded inlining.** Orderings are inlined to 48 rows per side and raw JSON to
  12,000 characters per side, with a statement of what was omitted and a reminder
  that the fingerprint still covers the whole result. An observation that fails
  corpus verification can carry an arbitrarily long ordering, so the bound is a
  availability control, not cosmetics.
- **Exit codes reused, not reinvented.** `materna report` returns the same mapping
  as `compare` (0/1/2/3), so it can gate a pipeline. A caller that ignores the
  exit code still gets a file; a caller that honours it gets the verdict.

### E. Implemented changes

| File | Why |
|:---|:---|
| `src/report.js` (new, 660 lines) | The renderer: escaping, model construction, consistency refusal, ten fixed sections, embedded CSS |
| `src/cli.js` | `report` subcommand with `--out` and `--json`, per-subcommand option validation, shared `--left/--right` handling |
| `src/index.js` | Re-export the renderer for programmatic use |
| `test/report.test.js` (new, 18 tests) | Correctness for all four statuses, the invariant, refusal cases, determinism across processes, non-mutation, escaping, CLI contract |
| `docs/report/index.html` | Banner names the real command; every invented figure replaced with "not measured" or relabelled as demo data; header comment states what the file is and is not |
| `index.html` | Three mangled status rows repaired (`VERIFIED · LOCAL PG 16`, `IMPLEMENTED`, `DEFINED · UNEXECUTED`), unclosed spans closed, report row added |
| `README.md`, `docs/README.md` | Document `materna report`, the two invariants, determinism and the escaping model |
| `.github/workflows/ci.yml` | New step renders a report from a real comparison and asserts exit-code parity, status parity, byte-identical re-render, and absence of placeholder metrics |

### F. Test and CI evidence

- Full suite, PostgreSQL 16.15 reachable, Node 22.23.4: **98 tests, 98 pass,
  0 fail, 0 skipped** (`node --test`).
- `test/report.test.js` alone: **18 tests, 18 pass, 0 fail, 0 skipped**.
- Live PostgreSQL suites (`postgres-live`, `postgres-collation-live`) alone:
  **11 tests, 11 pass, 0 fail, 0 skipped** — the adapter tests genuinely executed,
  they did not skip.
- Evidence level for the above: **E3** (automated behavioural verification, one
  environment). Not E4: a single Node and a single PostgreSQL version.
- Two of my own new assertions failed on first run and were **wrong, not the
  code**: one matched the CSS class `badge-difference` in the stylesheet of a PASS
  page, the other expected a benign non-BMP string to be removed rather than
  escaped. Both assertions were corrected; the renderer was not changed. Recorded
  because "the test was wrong" is the most common way a green suite becomes a lie.
- Hosted CI: recorded honestly in the pull request. A workflow file existing is
  E1; only an executed run on a hosted runner is hosted-execution evidence.

### G. Security findings

| Finding | Severity | Status |
|:---|:---|:---|
| Observation documents are untrusted input rendered into HTML (stored-XSS surface) | high if unmitigated | **Mitigated**: no script element in output; every value passes `escapeHtml` into a text node or double-quoted attribute; `&`, `<`, `>`, `"`, `'`, U+2028, U+2029 escaped. Tested with 7 hostile and 4 benign payloads. |
| `</style>` breakout via a sample or environment value | high if unmitigated | **Mitigated**: values never reach the `<style>` block; `</` is escaped wherever it does appear. |
| JSON-in-`<script>` would be terminated by `</script>` inside a string | high if adopted | **Avoided by design**: no script element exists. |
| Forged fingerprint presented as proof of a real run | medium (epistemic) | **Mitigated by wording and structure**: `corpus_verified` is a separate badge; the page states "Integrity is not authenticity" beside the verdict. Integrity is still not authenticity — see §H. |
| Renderer as a DoS amplifier on an arbitrarily long non-verifying ordering | low | **Mitigated**: 48 rows / 12,000 chars per side, with the omission stated. |
| Secret leakage into the page | low | **Mitigated by scope**: only the `environment` block is echoed, and observations contain no connection strings; `src/adapters/postgres.js` records server metadata, never the DSN. No new logging was added. |
| CI privilege | — | Unchanged: `permissions: contents: read`, no `pull_request_target`, no secrets consumed by PR code. The new step only reads and writes workspace files. |
| Comparative diff injection into the page | high if unmitigated | **Mitigated**: `field`, `left`, `right` from `metadata_differences` and `incompatible` are escaped, and non-strings are serialised before escaping. |

### H. Remaining uncertainties

- **An attacker who recomputes `result_hash` over a correctly reordered corpus
  still produces a document that compares.** Corpus conformance constrains the
  multiset, not the ordering's provenance, and there is no signature. A generated
  report cannot do better than the comparison it projects. Unsigned observations
  remain the deepest limitation of the project.
- The rendered page was verified by asserting on its bytes and by reading the
  produced file; it was **not** opened in a real browser engine. No layout,
  contrast or print behaviour was verified, and the demo shell's own client-side
  JS was only inspected statically.
- Hosted CI matrix (Node 20 × PostgreSQL 14) has not been observed for this commit
  in this environment; local evidence is Node 22 × PostgreSQL 16 only.
- The report renders one comparison. It does not aggregate a matrix, and nothing
  in it should be read as a claim about locale coverage.

### I. Deferred work

- A multi-locale matrix runner (the `6 of 8` figure is the shape of that missing
  feature; it stayed unmade deliberately).
- Optional measurement of elapsed time and heap, if and when a probe records them
  at all — with a schema version bump.
- Signed observations, or a provenance field bound to a CI run identity.
- Porting the generated page's sections into the demo shell's tab layout, so the
  shell becomes the renderer's stylesheet rather than a parallel artefact.

### J. Next-loop recommendation

NEXT_LOOP:
  priority: high
  problem: A valid `result_hash` proves a document is unedited, not that the run it
    describes happened. `corpusConformance()` constrains the multiset and the
    ordering is checked for rearrangement, but an attacker can recompute a
    consistent hash over a plausible ordering and still compare PASS.
  evidence: README "Limitations" already states this; loop 001 §B produced a
    self-consistent false observation that compared PASS before corpus checks
    existed, and the check added since narrows but does not close the gap. The
    report now surfaces it as a permanent caveat rather than a fix.
  impact: The project's central claim is behavioural evidence. Unauthenticated
    evidence caps how far it can be trusted.
  confidence: high
  complexity: medium — a detached signature or a CI-issued attestation over the
    canonical observation, verified optionally, without breaking documents that
    carry none.
  security_risk: medium — key handling, and a signature check that silently passes
    when absent would be worse than none.
  smallest_solution: an optional `attestation` block holding a detached Ed25519
    signature over `canonicalJson({probe, corpus, environment, result})`, plus
    `verifyObservation(observation, publicKey)` returning
    verified|absent|invalid, and one report badge that distinguishes "integrity
    verified" from "provenance verified".
  acceptance_criteria: absent attestation stays INCONCLUSIVE-neutral and is labelled
    absent, never "verified"; a tampered result invalidates the signature; an
    invalid signature cannot compare PASS; the report distinguishes the three
    states; no new runtime dependency.
  verification_method: unit tests over signed/tampered/absent documents, a CLI
    round-trip, and a report assertion that the badge text tracks the verification
    result.
  unresolved_questions: where the private key lives in CI; whether the public key
    is published in-repo; whether key rotation is in scope.
  evidence_level: E3 for the current checks; E0 for the proposed design.

---

## Loop 001 — 2026-11-13 — observation integrity + real collation selection

Base commit: `dcfc9589d70121a66b948a7a36b2fd989a34ac37`
("feat(core): implement the documented P0 probing foundation")

### A. Facts discovered (repository state as found)

Inspected: `src/{index,observation,compare,probe,corpus,cli}.js`,
`src/adapters/postgres.js`, `src/corpus/collation-core-v1.json`,
`test/*.js` (7 files, 51 tests), `package.json`, `package-lock.json`,
`README.md`, `docs/README.md`, `index.html` (3179 lines),
`docs/report/index.html` (1542 lines), `LICENSE`, `.gitignore`.

- No `.github/` directory existed: no CI, no reproducible verification. The
  live PostgreSQL tests skip when `DATABASE_URL` is unreachable, so a green
  run could mean "nothing was verified".
- `package.json` declared no `main`, no `exports`, no `bin`, no `files`. The
  tarball contained `test/` but the package could not be imported.
- `compare.js` verified only that a document's `result_hash` matched its own
  `{order, ties}`. It never checked that the ordering was a rearrangement of
  the corpus the document named.
- `adapters/postgres.js` accepted collation names matching `^[A-Za-z_][A-Za-z0-9_$]*$`,
  so every ICU collation was refused. Verified against a real catalog:
  723 of 724 name variants containing a dash were ICU names
  (`af-NA-x-icu`, `de-DE-x-icu`, …), i.e. the only locale-correct collations
  were unreachable through `PG_COLLATION`.
- The single dotted catalog name `C.utf8` was rewritten to `"C"."utf8"`
  (schema `C`, relation `utf8`), a different object.
- `probePostgres` set `localeSupported: collation === null ? null : true`
  — an unverified `true`, not an observed fact.
- PostgreSQL ties were collected **only** when a named collation was passed,
  and were reported as an unordered set of 2-tuples, while the Node.js probe
  reports complete groups in member order. Two runtimes that agreed on ties
  could still produce different tie structures.
- `index.html` documented `import { compareObservations } from "./src/probe.js"`
  — a module that exports only `DEFAULT_PROBE`, `nodeEnvironment`, `probeNode`.
- `index.html` listed "Live PostgreSQL verification: BLOCKED" and
  "Complete comparison CLI: NOT IMPLEMENTED"; both were untrue at HEAD.
- `docs/report/index.html` presented a "Behavioral Report" with specific
  figures (Node 20.11 / PG 16.2, 8 probes, 6 diverged, 1,842 ms, 8.7 MB peak
  heap, "6 of 8 locale probes produced different orderings"). None of it was
  generated by any code in this repository — the CLI has no report generator,
  and the corpus has one locale per run, not 8.

### B. Verified

- Baseline suite at HEAD: **51 tests, 45 pass, 6 skipped, 0 fail** (`node --test`).
- A self-consistent but false observation produced **PASS**:
  a document declaring `collation-core-v1@1` with the real corpus hash, whose
  `order` contained 2 of 16 samples, hashed correctly and compared PASS against
  a second such document.
- Duplicated samples standing in for a lost one (16 entries, 14 distinct) → PASS.
- Tie groups naming values absent from `order` → PASS.
- Non-string members in `order` → PASS.
- `quoteCollation('en-US-x-icu')` → throws (rejected).
- PostgreSQL 18.6 (x86_64-pc-linux-gnu, embedded binaries, `initdb`
  `--locale=C.UTF-8`, port 55433) is reachable, `localeparity` created.
- Catalog facts on that server: 723 collation names contain `-`; 1 contains
  `.` (`C.utf8`); `datcollate = C.UTF-8`, `datlocprovider = c`.

Evidence level for the above: **E3** — automated behavioural evidence on one
machine, one PostgreSQL build.

### C. Rejected assumptions

- *"A matching `result_hash` means the observation is valid."* False. The hash
  binds `{order, ties}` and nothing else. It proves the document was not edited;
  it does not prove the experiment described by the document happened. Corpus
  identity, corpus version and corpus hash were all independently forgeable.
- *"A strict `[A-Za-z_][A-Za-z0-9_$]*` identifier rule is the safe choice."* It
  is safe and it also removes the feature: no ICU collation can be named.
  Safety and usability were both satisfiable by validating syntax and resolving
  the identifier against `pg_collation` instead of pattern-matching it.
- *"Splitting `schema.name` on the first dot is correct."* False for
  `en_US.utf8` and `C.utf8`, which have the same shape as `schema.name`.
  No pattern resolves this; only the catalog can.
- *"Ties only matter for named collations."* False: the database default
  collation also has a tie structure, and it is exactly the configuration a
  default `materna postgres` run uses.

### D. Changes

1. `src/observation.js`
   - `orderProblems()`: every `order` member must be a non-empty string.
   - `tieProblems()`: a tie group must have ≥2 distinct members, every member
     must appear in `order`, and groups must be unique.
   - `corpusConformance()`: checks declared corpus version, declared corpus
     hash, and that `order` is a rearrangement (multiset equality) of the
     named corpus samples.
   - `multiset()` exported; `buildObservation` now refuses non-string members.
2. `src/compare.js`
   - `corpusCheck()` resolves the declared corpus id locally and runs
     `corpusConformance`. A document that is not what it declares is
     INCONCLUSIVE, never PASS.
   - Result carries `corpus_verified`. `requireCorpusVerification: true`
     (third argument) makes an unresolvable corpus fatal.
3. `src/adapters/postgres.js`
   - `quoteIdent()`: PostgreSQL `quote_ident` semantics (double embedded quotes).
   - `quoteCollation()`: accepts the real repertoire (`en-US-x-icu`, `C.utf8`,
     `de_DE`), quotes the whole name as one identifier, refuses multi-dot,
     whitespace, quotes and statement syntax.
   - `resolveCollation()`: catalog-first, parameterized lookup; the interpolated
     identifier is built from the catalog row, not the caller's string. Exact
     match is tried before any `schema.name` split. Unknown collation fails
     loudly.
   - Ties are now always collected, as complete groups in corpus order, via
     `dense_rank() OVER (ORDER BY value COLLATE …)` + `array_agg(ORDER BY ord)`.
   - `environment` gains `collation_requested`, `collation_schema`,
     `collation_source`; `localeSupported` is only `true` when a requested
     collation was actually resolved.
4. `package.json`: `main`, `exports` (`"."`, `"./cli"`, `"./package.json"`),
   `bin` (`materna`), `files` (`src`). The package is now importable and
   runnable; tests are no longer published.
5. `src/index.js`: exports `probePostgres` and the new integrity helpers.
6. `.github/workflows/ci.yml`: Node 20/22 × PostgreSQL 14/16 matrix, `npm ci`,
   full suite against the real adapter, a gate that **fails** when the live
   tests are skipped, and an end-to-end CLI probe→compare check.
7. Tests: `test/observation-integrity.test.js` (10 cases),
   `test/collation-identifier.test.js` (4 cases),
   `test/postgres-collation-live.test.js` (5 live cases).

### E. Decisions

- **Integrity before features.** The false-PASS defect was fixed first and
  `--collation` was not added as a new flag at all: the existing `PG_COLLATION`
  surface was broken, so repairing it needed no new CLI surface.
- **Verify against the catalog, not against a pattern.** The safety boundary
  moved from "does this string look like an identifier" to "does this exact
  name exist, and is the identifier derived from the row the server returned".
  Hostile input is still refused before a connection opens.
- **`quoteCollation` quotes one identifier.** Dotted names are not split.
  Schema qualification is a catalog question. This deliberately changes the
  contract of a previously exported helper, and one legacy assertion was
  updated with the reason recorded in the test itself.
- **No new dependencies.** Node's `crypto`, PostgreSQL's own `dense_rank` /
  `WITH ORDINALITY` / `array_agg` were sufficient.
- **CI is E1, not E3.** The workflow is committed but has not been executed on
  GitHub-hosted runners for this commit. It is labelled as such in the file.

### F. Test evidence

All figures below are from `node --test` runs executed on the working tree that
this commit ships, in this loop, on Node v22.23.4, Ubuntu 24.04.5, PostgreSQL 18.6
(x86_64-pc-linux-gnu). Baseline at `dcfc958` was 51 tests / 45 pass / 6 skipped.

| Run | Command | tests | pass | fail | skipped |
|:--|:--|--:|--:|--:|--:|
| No server reachable | `env -u DATABASE_URL node --test` | 80 | 69 | 0 | 11 |
| Live server | `DATABASE_URL=… node --test` | 80 | 80 | 0 | 0 |

The 11 skips in the first run are exactly the live tests: they report as
skipped, never as passed. The second run proves the adapter against a real
server with nothing skipped.

End-to-end CLI, same commit, same server:

```
node src/cli.js node --json                          -> exit 0
node src/cli.js postgres --json                      -> exit 0
node src/cli.js compare --left node.json --right pg.json
                                                     -> exit 1 (DIFFERENCE)
   status=DIFFERENCE corpus_verified=true
   first_difference={"kind":"order","position":0,"left":"😀","right":"apple"}
```

The DIFFERENCE is correct and expected: the database default collation
(`C.UTF-8`) orders the emoji first, ICU `de-DE` does not. Both documents passed
corpus conformance, so this is real behavioural divergence rather than a defect.

`--collation` end to end: `postgres --collation en-US-x-icu` produced
`collation_name=en-US-x-icu`, `collation_source=requested`,
`collation_requested=en-US-x-icu`, 0 tie groups.

Packaging: `npm pack` now emits only `src/` + `package.json` + docs; a clean
consumer install of the tarball resolves `import('materna')` and exposes 19
named exports plus a `materna` bin. At `dcfc958` the same install failed with
`Cannot find package '/tmp/consumer/node_modules/materna/index.js'`.

### G. Adversarial findings

Reproduced as false PASS before the fix (each now has a regression test):
truncated ordering with a valid corpus hash; duplicated samples; fabricated
corpus hash agreed on by both sides; lying corpus version; tie groups naming
unobserved values; non-string `order` members.

Still open, by design:
- An attacker who recomputes the hash **and** supplies a full, correctly
  reordered corpus still produces a self-consistent document. This is
  unavoidable without a signature or a trusted producer, and is documented as
  a limitation rather than papered over with a misleading integrity claim.
- `corpus_verified: false` is a warning, not a failure, unless the caller opts
  in with `requireCorpusVerification: true`.

### H. Open risks

- Live PostgreSQL evidence is one version on one OS in this loop (18.6, Linux
  x86_64). `docs/README.md`'s earlier claim of PostgreSQL 16.15 was **not**
  re-verified in this loop.
- The ICU collation ordering differs from the Node.js ICU ordering by
  construction (glibc/libicu build, CLDR version, key differences). A
  DIFFERENCE between the two runtimes is expected and is not a defect.
- `docs/report/index.html` figures are synthetic. They are now labelled as
  illustrative; they are still not generated by the tool.

### I. Next loop

```
NEXT_LOOP:
  priority:    P1
  problem:     docs/report/index.html is a hand-written report with invented
               figures. Labelling it illustrative makes it honest but not
               useful. It should be generated from real observation files.
  evidence:    No report generator exists in the repository; the page's 8
               probes/1,842 ms/8.7 MB figures appear nowhere in the source.
  value:       A report generated from two real observation files turns the
               page into evidence instead of decoration, and exercises
               compare() end to end.
  risk:        Scope creep into a static-site generator. Bound it: one
               function, one template, no dependencies, output byte-identical
               for identical input.
  smallest:    `src/report.js` -> renderReport(left, right, outcome) returning
               the HTML fragment injected into the existing page shell.
  verification: golden-file test over two committed observations; assert the
               page contains no number absent from the outcome object.
  unresolved:  whether the page should stay a static artefact for GitHub Pages.
  evidence:    E0 until implemented.
```
