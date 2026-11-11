<div align="center"> 
  <h1>Materna</h1>  
  <p>
    <strong>Seamless i18n to read, understand, and learn in any native tongue.
  </p>  
   <!-- Badges -->  
  <p>
    <a href="https://github.com/shaonkabir8/materna">
      <img src="https://img.shields.io/github/stars/shaonkabir8/materna?style=flat-square" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/shaonkabir8/materna/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/shaonkabir8/materna?style=flat-square" alt="License" />
    </a>
    <a href="https://github.com/shaonkabir8/materna">
      <img src="https://img.shields.io/github/commit-activity/m/shaonkabir8/materna?style=flat-square" alt="Commit Activity" />
    </a>
    <a href="https://github.com/shaonkabir8/materna/pulls">
      <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
    </a>
  </p>  
  <p>
    <a href="#-the-problem">The Problem</a> •
    <a href="#-features">Features</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-interactive-examples">Interactive Examples</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 🎯 About Materna

**Materna** is a behavioral `i18n` testing framework designed to detect real **collation, sorting, and Unicode differences** across **Node.js, PostgreSQL, ICU, CLDR**, and other runtime environments. 

When your application and database disagree on how native strings are sorted, compared, or normalized, silent bugs happen. Materna catches these discrepancies before they reach production—ensuring users can **read, understand, and learn in any native tongue** without broken search, sorting, or filtering.

---

## ⚠️ The Problem It Solves

Different runtimes ship with different versions of **ICU** (International Components for Unicode) or OS-level **glibc** locales:
- **Node.js** might sort `['ä', 'z', 'a']` differently than **PostgreSQL** (`ORDER BY`).
- Case-folding (`toLowerCase()` vs `LOWER()`) can behave inconsistently in locales like Turkish (`tr-TR`) or Lithuanian (`lt-LT`).
- Diacritics and Unicode normalization (`NFC` vs `NFD`) may cause mismatches between app-level validation and database unique constraints.

**Materna automates behavioral testing across your stack to guarantee consistent i18n behavior.**

---

## ✨ Key Features

- 🔍 **Cross-Runtime Collation Diffing:** Compare string sorting and comparison rules between Node.js (`Intl.Collator`) and databases like PostgreSQL.
- 🗄️ **Database Consistency Verification:** Detect mismatches caused by `glibc` vs `ICU` provider differences in PostgreSQL.
- 🧪 **Behavioral i18n Test Suites:** Pre-built edge-case datasets for complex scripts, diacritics, emojis, and locale-specific casing.
- ⚙️ **CI/CD Ready:** Catch environment drift between macOS (local dev) and Linux (production containers) automatically.
- 📊 **Clear Diff Reports:** Pinpoint the exact strings, locales, and rules where runtime and database behaviors diverge.

---

## 📦 Installation

Install **Materna** via your favorite package manager:

```bash
# Using npm
npm install --save-dev materna

# Using yarn
yarn add --dev materna

# Using pnpm
pnpm add -D materna
```

---

## 🚀 Quick Start

Run a behavioral collation check between your Node.js runtime and PostgreSQL database:

```javascript
import { checkCollation } from 'materna';

const report = await checkCollation({
  locales: ['en-US', 'de-DE', 'sv-SE', 'tr-TR', 'bn-BD'],
  targets: {
    runtime: 'node',
    database: {
      client: 'pg',
      connectionString: process.env.DATABASE_URL,
    },
  },
  samples: ['apple', 'äpfel', 'zebra', 'İstanbul', 'istanbul', 'অ', 'আ'],
});

if (!report.isConsistent) {
  console.error('❌ Collation mismatch detected:', report.diffs);
  process.exit(1);
}

console.log('✅ 100% Runtime & Database Consistency!');
```

---

## 🎮 Interactive Examples (Click to Expand)

Explore real-world locale edge cases that **Materna** detects automatically:

<details>
<summary><b>1. German & Swedish Sorting Discrepancies (<code>de-DE</code> vs <code>sv-SE</code>)</b></summary>
<br>

In German (`de-DE`), `'ä'` sorts near `'a'`, whereas in Swedish (`sv-SE`), `'ä'` sorts after `'z'`. If your Node.js container uses ICU and your Postgres instance uses `C.UTF-8` or mismatched glibc locales, pagination breaks:

```javascript
// Node.js (ICU sv-SE): ['a', 'z', 'ä']
// PostgreSQL (mismatched): ['a', 'ä', 'z']

// Materna flags this immediately:
// Diff: Index mismatch at position 1 for locale 'sv-SE'
```
</details>

<details>
<summary><b>2. The Turkish Dotted/Dotless I Problem (<code>tr-TR</code>)</b></summary>
<br>

Lowercasing `'I'` in Turkish produces `'ı'` (dotless i), not `'i'`. Materna verifies that your runtime and database case-insensitive queries agree:

```javascript
const testResult = await verifyCaseConsistency({
  locale: 'tr-TR',
  input: 'İSTANBUL',
});
// Ensures Node.js .toLocaleLowerCase('tr-TR') === PostgreSQL LOWER('İSTANBUL' COLLATE "tr-TR")
```
</details>

<details>
<summary><b>3. macOS vs Linux Container Drift in CI/CD</b></summary>
<br>

Developers on macOS often experience different `glibc`/`ICU` behavior than Linux Docker images. Add Materna to your GitHub Actions workflow to catch environment drift:

```yaml
- name: Verify i18n Behavior
  run: npx materna verify --locales en-US,fr-FR,ja-JP --db \$DATABASE_URL
```
</details>

---

## 🏷️ Repository Topics

`i18n` • `internationalization` • `localization` • `locale-testing` • `collation` • `postgresql` • `nodejs` • `icu` • `cldr` • `unicode` • `database-testing` • `behavioral-testing`

---

## 🤝 Contributing

Contributions are welcome! Whether it's adding new database adapters (MySQL, SQLite), expanding CLDR edge-case datasets, or improving diff reporters, feel free to open a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/mysql-adapter`)
3. Commit your Changes (`git commit -m 'Add MySQL collation support'`)
4. Push to the Branch (`git push origin feature/mysql-adapter`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <br>
  <p>Built with ❤️ to ensure reliable i18n across every runtime, database, and native language.</p>
</div>
