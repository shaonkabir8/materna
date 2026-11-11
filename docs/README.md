# Materna
> Behavioral Locale Parity Testing

Versions are metadata. Observed behavior is evidence.

Materna is a developer-focused engineering utility for examining locale-sensitive behavioral differences between Node.js and PostgreSQL.

It uses reproducible probes, normalized observations, and SHA-256 result fingerprints to make actual behavioral differences observable.

The project does not declare a mismatch merely because ICU, CLDR, runtime, or database versions differ.

---

Core Principle

«Compatibility must be established through observed behavior, not inferred from version metadata.»

Current Foundation

The existing P0 implementation provides:

- Node.js locale-sensitive collation probing.
- PostgreSQL collation probing.
- A versioned, immutable test corpus.
- Runtime and database environment metadata.
- Normalized ordering observations.
- SHA-256 result fingerprints.
- Programmatic observation comparison.
- Explicit handling of missing evidence.

This is a deliberately small testing foundation, not a complete localization platform.

Requirements

- Node.js 20+
- PostgreSQL 14+ for live PostgreSQL probing.
- npm.
- The project's declared dependencies installed.

Installation

Clone the repository:

git clone https://github.com/shaonkabir8/materna.git
cd materna

Install dependencies:

npm install

1. Run the Node.js Probe

Execute the test suite:

npm test

Run the Node.js probe:

npm run probe:node

The probe uses the existing immutable corpus:

collation-core-v1

Its default configuration is:

Property| Value
Probe ID| "collation.sort"
Probe version| "1"
Corpus ID| "collation-core-v1"
Corpus version| "1"
Locale| "de-DE"
Sensitivity| "variant"
Numeric| "false"

The output includes environment metadata, normalized ordering observations, and a SHA-256 result fingerprint.

2. Run Against PostgreSQL

Create a test database:

CREATE DATABASE localeparity;

Set the connection string:

Linux/macOS:

export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity'

Windows PowerShell:

$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/localeparity"

Execute the PostgreSQL probe:

npm run probe:postgres

If "DATABASE_URL" is omitted, the existing adapter uses:

postgresql://postgres:postgres@localhost:5432/localeparity

PostgreSQL Adapter

The existing adapter:

- Uses a parameter for corpus values.
- Validates and quotes identifiers before SQL interpolation.
- Records PostgreSQL environment metadata.
- Records collation metadata.
- Hashes the actual observed ordering.

Verification limitation

PostgreSQL live integration is not verified in this environment.

The PostgreSQL dependency/runtime verification remains blocked. A successful live execution must be established against an accessible PostgreSQL instance with the required Node.js dependencies installed.

The presence of PostgreSQL adapter source code does not constitute proof of successful live integration.

3. Test a Named PostgreSQL Collation

Set an existing PostgreSQL collation:

export PG_COLLATION='some_collation'

Run:

npm run probe:postgres

Windows PowerShell:

$env:PG_COLLATION="some_collation"
npm run probe:postgres

Check available collations first:

SELECT collname, collprovider, collversion
FROM pg_collation
ORDER BY collname;

Do not assume a collation exists without checking the database.

4. Comparison Semantics

The existing programmatic API exposes:

compareObservations(left, right)

It compares observed result fingerprints.

PASS

Both observations contain the required evidence, and their result fingerprints match.

left.result.result_hash == right.result.result_hash

DIFFERENCE

Both observations contain results, but their fingerprints differ.

The comparison also identifies the first differing position.

INCONCLUSIVE

Required observed result evidence is missing.

Missing evidence must never be treated as compatibility.

ERROR

An unexpected adapter or execution failure occurs.

Errors must not be silently converted into successful comparisons.

Important: CLI limitation

The "compare" CLI mode is informational only.

node src/cli.js compare

It does not execute a comparison workflow. It exits with status "2" and directs users to the programmatic "compareObservations()" API.

The existing CLI does not currently provide a complete two-observation comparison command.

Do not interpret the informational CLI mode as an implemented executable comparison workflow.

5. Deterministic Evidence

The result fingerprint is generated using SHA-256 over the normalized JSON representation of the observed ordering.

Conceptually:

Declared probe
      |
      v
Real environment
      |
      v
Locale-sensitive execution
      |
      v
Observed ordering
      |
      v
Normalized result
      |
      v
SHA-256 fingerprint
      |
      v
Programmatic comparison

Environment metadata provides context.

Observed results provide behavioral evidence.

A metadata difference alone is not a behavioral failure.

6. Safety Boundaries

The existing P0 source:

- Does not modify database data.
- Does not execute arbitrary SQL supplied by users.
- Does not perform "ALTER COLLATION".
- Does not perform "REINDEX".
- Does not upload database credentials.
- Uses synthetic probe data.

Use a disposable test database when investigating PostgreSQL behavior.

Do not assume that a successful probe establishes production safety for every database configuration.

7. Current Limitations

The current P0 foundation does not establish:

- Hosted control-plane correctness.
- Production-scale operation.
- Complete PostgreSQL collation compatibility.
- A complete CLI-based comparison workflow.
- Universal runtime compatibility.
- Market demand.

These require separate implementation and verification.

8. Verification Status

Gate| Status
Node.js deterministic probe| PASS — source test
Controlled behavioral difference| PASS — source test
Metadata-only false-positive resistance| PASS — source test
Missing evidence handling| PASS — source test
PostgreSQL adapter implementation| PRESENT
PostgreSQL live execution| NOT VERIFIED IN THIS ENVIRONMENT
Compare CLI execution| INFORMATIONAL ONLY
Programmatic comparison API| IMPLEMENTED
Production readiness| NOT CLAIMED
Overall technical PASS| NOT CLAIMED

The source-level test results describe the supplied test implementation. They are not a substitute for executing the test suite in the target environment.

9. Project Identity

Materna's canonical product identity and naming conventions are documented in:

""BRAND.md"" (./BRAND.md)

The existing technical identifier remains:

localeparity-p0

Product branding and internal technical identifiers serve different purposes.

Renaming the product does not authorize changing existing package names, module interfaces, probe identifiers, corpus identifiers, database defaults, or CLI interfaces.

Philosophy

Materna is built around a simple engineering discipline:

Observe first. Compare second. Conclude only when evidence exists.

---

Materna — Behavioral Locale Parity Testing.

Verify before declaring PASS.
