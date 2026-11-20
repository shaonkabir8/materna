# Materna

<p align="center">
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/v/materna.svg?style=flat-square&color=blue" alt="npm version"></a>&nbsp;
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/dm/materna.svg?style=flat-square&color=brightgreen" alt="npm downloads"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/materna.svg?style=flat-square&color=green" alt="license"></a>&nbsp;
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/materna.svg?style=flat-square&color=orange" alt="node version"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/actions"><img src="https://img.shields.io/github/actions/workflow/status/shaonkabir8/materna/ci.yml?branch=main&style=flat-square" alt="CI status"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/stargazers"><img src="https://img.shields.io/github/stars/shaonkabir8/materna.svg?style=flat-square&color=yellow" alt="GitHub stars"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/network/members"><img src="https://img.shields.io/github/forks/shaonkabir8/materna.svg?style=flat-square" alt="GitHub forks"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/issues"><img src="https://img.shields.io/github/issues/shaonkabir8/materna.svg?style=flat-square" alt="GitHub issues"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/commits/main"><img src="https://img.shields.io/github/last-commit/shaonkabir8/materna.svg?style=flat-square" alt="last commit"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>&nbsp;
  <a href="https://github.com/sponsors/shaonkabir8"><img src="https://img.shields.io/github/sponsors/shaonkabir8?label=Sponsor&logo=GitHub&style=flat-square&color=ff69b4" alt="Sponsor"></a>
</p>

> **Behavioral locale parity probing for Node.js and PostgreSQL.**  
> Stop comparing version numbers. Start comparing actual collation behavior.

---

## Table of Contents

- [✨ Why Materna?](#why-materna)
- [🚀 Feature Highlights](#feature-highlights)
- [📋 Requirements](#requirements)
- [📦 Install](#install)
- [⚡ Quick Start](#quick-start)
- [📖 API Reference](#api-reference)
- [🧠 Design Notes](#design-notes)
- [⚠️ Limitations and Compatibility](#limitations-and-compatibility)
- [🛠 Development](#development)
- [💖 Support and Continuous Maintenance](#support-and-continuous-maintenance)
- [🤝 Contributing](#contributing)
- [📄 License](#license)

---

<a id="why-materna"></a>
## ✨ Why Materna?

**Locale bugs are insidious.** Your database sorts `"ä"` differently than your Node.js runtime. Version strings won't tell you that.

| The Old Way (Version Metadata) | The New Way (Behavioral Evidence) |
| :--- | :--- |
| You check `process.versions.icu === '78.3'` and assume compatibility. | You run `probeNode()` and `probePostgres()`, then compare their **actual observed orderings**. |
| An ICU or glibc update silently breaks sorting. | Materna fingerprints the *actual* collation output with SHA-256. |
| You find out in production when `ORDER BY` mismatches. | You find out in your test suite, with a precise `first_difference`. |
| "We use PostgreSQL 16 and Node 22, so it should be fine." | "We proved the exact `de-DE` corpus produces identical orderings and tie structures." |

Materna treats **versions as metadata** and **observed behavior as evidence**. It declares a mismatch *only* when two runs over the same declared probe and corpus produce different observed orderings.

---

<a id="feature-highlights"></a>
## 🚀 Feature Highlights

| **Zero-config probing** | **Database & runtime parity** | **Deterministic HTML reports** |
| :--- | :--- | :--- |
| `npx materna node` works instantly. | Natively probes Node.js `Intl.Collator` and PostgreSQL `ORDER BY`. | Generates reviewable, diffable HTML with no JavaScript. |
| **E3/E1 Evidence Levels** | **Strict exit codes** | **Tie-structure aware** |
| Clearly separates "executed here" from "configured in CI." | CI-friendly (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Detects subtle differences in equality groups, not just order. |
| **Single runtime dependency** | **Zero hosted control plane** | **Immutable corpus** |
| `pg` is dynamically imported; `import 'materna'` loads no DB driver. | Runs entirely on your machine or CI. No SaaS. | Samples are hashed and verified. Tampering is refused. |

---

<a id="requirements"></a>
## 📋 Requirements

| Component | Requirement |
| :--- | :--- |
| **Node.js** | `>=22` (executed on 22, 24, and 26 in CI). |
| **PostgreSQL** | **Optional.** Only required if you run `materna postgres`. Locally verified against PostgreSQL 16.15. |
| **Runtime** | Node, Bun, Deno. |

---

<a id="install"></a>
## 📦 Install

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ Quick Start

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
  connectionString: process.env.DATABASE_URL 
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

---

<a id="api-reference"></a>
## 📖 API Reference

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

---

<a id="design-notes"></a>
## 🧠 Design Notes

- **Fingerprints over Guesses**: `result_hash` is SHA-256 over the canonical JSON of `{ order, ties }`. Ties are included because two runtimes can agree on order while disagreeing on *which values are equal*.
- **Self-Inconsistency is Rejected**: An observation whose `order` is not a rearrangement of its corpus, or whose declared hash doesn't match, is treated as `INCONCLUSIVE` (or `ERROR`), never as evidence.
- **Metadata is not Failure**: If Node uses ICU 78 and PostgreSQL uses glibc, but both produce the same order and tie structure, the outcome is `PASS`.
- **Report Invariants**: `report.status` must equal `outcome.status`. A `PASS` carrying a `first_difference` is refused.

---

<a id="limitations-and-compatibility"></a>
## ⚠️ Limitations and Compatibility

### Compatibility Matrix

| Surface | Verified | Evidence Level |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Full suite, 98/98 | **E3** — Executed here |
| **Node.js 24.22.3, Linux x86_64** | Full suite, 98/98 | **E3** — Executed here |
| **PostgreSQL 16.15, Linux x86_64** | Full suite incl. 11 live tests, 98/98 | **E3** — Executed here |
| **PostgreSQL 14, Linux x86_64** | Configured in `ci.yml` | **E1** — Never observed passing |
| **macOS / Windows** | Not executed | UNVERIFIED |
| **MySQL / SQLite / Browsers** | Not implemented | — |

### Limitations

- **Two probes only**: Node.js and PostgreSQL. MySQL and SQLite are not implemented.
- **Integrity ≠ Authenticity**: Materna checks consistency, not provenance. It does not sign observations.
- **Small corpus**: 16 targeted samples, not exhaustive CLDR coverage.
- **Default collation**: PostgreSQL defaults to `C.UTF-8` unless `PG_COLLATION` is set. A `DIFFERENCE` against Node's ICU is expected in this configuration.

---

<a id="development"></a>
## 🛠 Development

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI runs on:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. The TAP summary is gated to fail if any test is **skipped** (`# skipped 0` or `ℹ skipped 0`). A green pipeline means everything ran.

---

<a id="support-and-continuous-maintenance"></a>
## 💖 Support and Continuous Maintenance

**Materna is a 100% independent, open-source project.** To keep this package reliable and actively maintained 24/7, we rely on the support of the community. 

If Materna saves you from locale-related production bugs, please consider supporting its continuous development:

### 💰 Financial Support (Funding & Donations)

Sustained funding allows the maintainer to dedicate time to round-the-clock maintenance, rapid bug fixes, and expanding the compatibility matrix. 

- **[Sponsor on GitHub](https://github.com/sponsors/shaonkabir8)** (Recurring or one-time)
- **[Buy me a coffee](https://buymeacoffee.com/shaonkabir8)** (Quick donation)

*Corporate sponsorships are highly appreciated. Please reach out directly via GitHub for enterprise support or custom SLAs.*

### 👨‍💻 Code Contributions

We are always looking for passionate programmers to contribute! Whether it's adding new probes (like MySQL/SQLite), expanding the test corpus, improving the HTML reporter, or fixing bugs—your pull requests are highly welcome. 

- Check out the [open issues](https://github.com/shaonkabir8/materna/issues) or open a new one to discuss ideas.
- Keep changes small, add a behavioral test, and **do not claim a result you have not observed**.

---

<a id="contributing"></a>
## 🤝 Contributing

Adapters for other runtimes (MySQL, SQLite), a larger corpus, and richer reporters are welcome. Keep changes small, add a behavioral test, and **do not claim a result you have not observed**.

---

<a id="license"></a>
## 📄 License

MIT — see [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

Built and maintained by [Codazi](https://github.com/codazi) · Maintainer: [shaonkabir8](https://github.com/shaonkabir8).
