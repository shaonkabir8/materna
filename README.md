# Materna

[![npm version](https://img.shields.io/npm/v/materna.svg)](https://www.npmjs.com/package/materna)
[![npm downloads](https://img.shields.io/npm/dm/materna.svg)](https://www.npmjs.com/package/materna)
[![license](https://img.shields.io/npm/l/materna.svg)](https://github.com/shaonkabir8/materna/blob/main/LICENSE)
[![node version](https://img.shields.io/node/v/materna.svg)](https://www.npmjs.com/package/materna)
[![CI status](https://github.com/shaonkabir8/materna/actions/workflows/ci.yml/badge.svg)](https://github.com/shaonkabir8/materna/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/shaonkabir8/materna.svg)](https://github.com/shaonkabir8/materna/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/shaonkabir8/materna.svg)](https://github.com/shaonkabir8/materna/network/members)
[![GitHub issues](https://img.shields.io/github/issues/shaonkabir8/materna.svg)](https://github.com/shaonkabir8/materna/issues)
[![last commit](https://img.shields.io/github/last-commit/shaonkabir8/materna.svg)](https://github.com/shaonkabir8/materna/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/shaonkabir8/materna/blob/main/CONTRIBUTING.md)
[![Sponsor](https://img.shields.io/badge/sponsor-30363D?logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/shaonkabir8)

> **Behavioral locale parity probing for Node.js and PostgreSQL.**  
> Stop comparing version numbers. Start comparing actual collation behavior.

## Table of Contents

- [Why Materna?](#why-materna)
- [Install](#install)
- [Feature Highlights](#feature-highlights)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Limitations and Compatibility](#limitations-and-compatibility)
- [License](#license)

## Why Materna?

<a href="https://materna.js.org" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/Open%20Live%20Docs-▶-blue" alt="Open Live Docs">
</a>

**Locale bugs are insidious.** Your database sorts `"ä"` differently than your Node.js runtime. Version strings won't tell you that.

| The Old Way (Version Metadata) | The New Way (Behavioral Evidence) |
| :--- | :--- |
| You check `process.versions.icu === '78.3'` and assume compatibility. | You run `probeNode()` and `probePostgres()`, then compare their **actual observed orderings**. |
| An ICU or glibc update silently breaks sorting. | Materna fingerprints the *actual* collation output with SHA-256. |
| You find out in production when `ORDER BY` mismatches. | You find out in your test suite, with a precise `first_difference`. |
| "We use PostgreSQL 16 and Node 22, so it should be fine." | "We proved the exact `de-DE` corpus produces identical orderings and tie structures." |

Materna treats **versions as metadata** and **observed behavior as evidence**. It declares a mismatch *only* when two runs over the same declared probe and corpus produce different observed orderings.

## Install

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

### Requirements

| Component | Requirement |
| :--- | :--- |
| **Node.js** | `>=22` (executed on 22, 24, and 26 in CI). |
| **PostgreSQL** | **Optional.** Only required if you run `materna postgres`. Locally verified against PostgreSQL 16.15. |
| **Runtime** | Node, Bun, Deno. |

## Feature Highlights

| **Zero-config probing** | **Database & runtime parity** | **Deterministic HTML reports** |
| :--- | :--- | :--- |
| `npx materna node` works instantly. | Natively probes Node.js `Intl.Collator` and PostgreSQL `ORDER BY`. | Generates reviewable, diffable HTML with no JavaScript. |
| **E3/E1 Evidence Levels** | **Strict exit codes** | **Tie-structure aware** |
| Clearly separates "executed here" from "configured in CI." | CI-friendly (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Detects subtle differences in equality groups, not just order. |
| **Single runtime dependency** | **Zero hosted control plane** | **Immutable corpus** |
| `pg` is dynamically imported; `import 'materna'` loads no DB driver. | Runs entirely on your machine or CI. No SaaS. | Samples are hashed and verified. Tampering is refused. |

## Quick Start

### 1. CLI (Zero Code)

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API (Programmatic)

```javascript
import { probeNode, probePostgres, compareObservations } from 'materna';

const left = probeNode({ locale: 'de-DE' });
const right = await probePostgres({
  locale: 'de-DE',
  connectionString: process.env.DATABASE_URL,
});

const outcome = compareObservations(left, right);

if (outcome.status === 'DIFFERENCE') {
  console.error('Mismatch found at:', outcome.first_difference);
  process.exit(1);
}

if (outcome.status === 'INCONCLUSIVE') {
  throw new Error(outcome.reason);
}
```

### 3. HTML Report

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*The generated report contains no JavaScript. Every value is escaped. Identical inputs produce byte-identical HTML.*

## API Reference

### `probeNode(options)`

Synchronously returns an observation of Node.js `Intl.Collator`.

- `options.locale` (string): e.g., `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'`, or `'variant'`.
- `options.numeric` (boolean): Numeric collation.
- `options.corpus` (array): Custom samples (defaults to the immutable 16-sample core).

### `probePostgres(options)`

Asynchronously probes PostgreSQL `ORDER BY`.

- `options.connectionString`: PostgreSQL URL.
- `options.collation` (string): e.g., `'en-US-x-icu'`. Resolved via parameterized query; unknown names throw an error (no silent fallback).
- Other options match `probeNode`.

### `compareObservations(left, right, [opts])`

Returns an outcome object:

- `status`: `'PASS'`, `'DIFFERENCE'`, or `'INCONCLUSIVE'`.
- `first_difference`: The exact index/values where orderings diverge.
- `metadata_differences`: Array of environment differences (e.g., ICU version) that do **not** cause a failure.

### Exit Codes

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `0` | `PASS` | Fingerprints match. |
| `1` | `DIFFERENCE` | Fingerprints differ; first difference printed. |
| `2` | `INCONCLUSIVE` | Evidence missing, unsupported locale, or unreadable input. |
| `3` | `ERROR` | Malformed JSON, bad arguments, unsafe identifier, driver failure. |

## Limitations and Compatibility

### Compatibility Matrix

| Surface | Verified |
| :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Full suite, 98/98 |
| **Node.js 24.22.3, Linux x86_64** | Full suite, 98/98 |
| **PostgreSQL 16.15, Linux x86_64** | Full suite incl. 11 live tests, 98/98 |
| **PostgreSQL 14, Linux x86_64** | Configured in `ci.yml`; never observed passing |
| **macOS / Windows** | Not executed |
| **MySQL / SQLite / Browsers** | Not implemented |

### Limitations

- **Two probes only**: Node.js and PostgreSQL. MySQL and SQLite are not implemented.
- **Integrity ≠ Authenticity**: Materna checks consistency, not provenance. It does not sign observations.
- **Small corpus**: 16 targeted samples, not exhaustive CLDR coverage.
- **Default collation**: PostgreSQL defaults to `C.UTF-8` unless `PG_COLLATION` is set. A `DIFFERENCE` against Node's ICU is expected in this configuration.

## License

MIT — see [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

Built and Maintained by [Codazi](https://github.com/codazi).
