# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <a href="README.es.md">🇪🇸 Español</a>
  <a href="README.pt.md">🇧🇷 Português</a>
  <strong>🇩🇪 Deutsch</strong>
  <a href="README.cn.md">🇨🇳 简体中文</a>
  <a href="README.ru.md">🇷🇺 Русский</a>
  <a href="README.tr.md">🇹🇷 Türkçe</a>
  <a href="README.ja.md">🇯🇵 日本語</a>
</p>
<!-- i18n-nav:end -->

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

> **Verhaltensbasierte Prüfung der Locale-Parität für Node.js und PostgreSQL.**  
> Hören Sie auf, Versionsnummern zu vergleichen. Beginnen Sie, tatsächliches Collation-Verhalten zu vergleichen.

---

## Inhaltsverzeichnis

- [✨ Warum Materna?](#why-materna)
- [🚀 Funktionsübersicht](#feature-highlights)
- [📋 Voraussetzungen](#requirements)
- [📦 Installation](#install)
- [⚡ Schnellstart](#quick-start)
- [📖 API-Referenz](#api-reference)
- [🧠 Designhinweise](#design-notes)
- [⚠️ Einschränkungen und Kompatibilität](#limitations-and-compatibility)
- [🛠 Entwicklung](#development)
- [💖 Unterstützung und kontinuierliche Wartung](#support-and-continuous-maintenance)
- [🤝 Mitwirken](#contributing)
- [📄 Lizenz](#license)

---

<a id="why-materna"></a>
## ✨ Warum Materna?

**Locale-Bugs sind heimtückisch.** Ihre Datenbank sortiert `"ä"` anders als Ihre Node.js-Laufzeit. Versionsstrings verraten Ihnen das nicht.

| Der alte Weg (Versionsmetadaten) | Der neue Weg (Verhaltensevidenz) |
| :--- | :--- |
| Sie prüfen `process.versions.icu === '78.3'` und nehmen Kompatibilität an. | Sie führen `probeNode()` und `probePostgres()` aus und vergleichen anschließend deren **tatsächlich beobachtete Reihenfolgen**. |
| Ein ICU- oder glibc-Update bricht die Sortierung stillschweigend. | Materna fingerprintet die *tatsächliche* Collation-Ausgabe mit SHA-256. |
| Sie erfahren es in der Produktion, wenn `ORDER BY` nicht übereinstimmt. | Sie erfahren es in Ihrer Testsuite, mit einem präzisen `first_difference`. |
| „Wir nutzen PostgreSQL 16 und Node 22, das passt schon.“ | „Wir haben bewiesen, dass der exakte `de-DE`-Korpus identische Reihenfolgen und Gleichstandsstrukturen erzeugt.“ |

Materna behandelt **Versionen als Metadaten** und **beobachtetes Verhalten als Evidenz**. Eine Abweichung wird *nur* dann gemeldet, wenn zwei Läufe über dieselbe deklarierte Probe und denselben Korpus unterschiedliche beobachtete Reihenfolgen erzeugen.

---

<a id="feature-highlights"></a>
## 🚀 Funktionsübersicht

| **Probing ohne Konfiguration** | **Parität von Datenbank und Laufzeit** | **Deterministische HTML-Berichte** |
| :--- | :--- | :--- |
| `npx materna node` funktioniert sofort. | Prüft nativ `Intl.Collator` von Node.js und `ORDER BY` von PostgreSQL. | Erzeugt prüfbares, diffbares HTML ohne JavaScript. |
| **Evidenzstufen E3/E1** | **Strikte Exit-Codes** | **Gleichstandsstruktur-bewusst** |
| Trennt klar „hier ausgeführt“ von „in CI konfiguriert“. | CI-freundlich (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Erkennt feine Unterschiede in Gleichheitsgruppen, nicht nur in der Reihenfolge. |
| **Eine einzige Laufzeitabhängigkeit** | **Keine gehostete Steuerungsebene** | **Unveränderlicher Korpus** |
| `pg` wird dynamisch importiert; `import 'materna'` lädt keinen Datenbanktreiber. | Läuft vollständig auf Ihrem Rechner oder in CI. Kein SaaS. | Stichproben werden gehasht und verifiziert. Manipulation wird abgelehnt. |

---

<a id="requirements"></a>
## 📋 Voraussetzungen

| Komponente | Anforderung |
| :--- | :--- |
| **Node.js** | `>=22` (in CI auf 22, 24 und 26 ausgeführt). |
| **PostgreSQL** | **Optional.** Nur erforderlich, wenn Sie `materna postgres` ausführen. Lokal gegen PostgreSQL 16.15 verifiziert. |
| **Laufzeit** | Node, Bun, Deno. |

---

<a id="install"></a>
## 📦 Installation

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ Schnellstart

### 1. CLI (ohne Code)

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API (programmatisch)

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

### 3. HTML-Bericht

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*Der erzeugte Bericht enthält kein JavaScript. Jeder Wert wird escaped. Identische Eingaben erzeugen byte-identisches HTML.*

---

<a id="api-reference"></a>
## 📖 API-Referenz

### `probeNode(options)`

Gibt synchron eine Beobachtung von Node.js `Intl.Collator` zurück.

- `options.locale` (string): z. B. `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'` oder `'variant'`.
- `options.numeric` (boolean): numerische Collation.
- `options.corpus` (array): eigene Stichproben (Standard ist der unveränderliche Kern aus 16 Stichproben).

### `probePostgres(options)`

Prüft `ORDER BY` von PostgreSQL asynchron.

- `options.connectionString`: PostgreSQL-URL.
- `options.collation` (string): z. B. `'en-US-x-icu'`. Wird über eine parametrisierte Abfrage aufgelöst; unbekannte Namen lösen einen Fehler aus (kein stiller Fallback).
- Alle weiteren Optionen entsprechen `probeNode`.

### `compareObservations(left, right, [opts])`

Gibt ein Ergebnisobjekt zurück:

- `status`: `'PASS'`, `'DIFFERENCE'` oder `'INCONCLUSIVE'`.
- `first_difference`: der exakte Index und die Werte, an denen die Reihenfolgen abweichen.
- `metadata_differences`: Array von Umgebungsunterschieden (z. B. ICU-Version), die **nicht** zu einem Fehlschlag führen.

### Exit-Codes

| Code | Status | Bedeutung |
| :--- | :--- | :--- |
| `0` | `PASS` | Fingerprints stimmen überein. |
| `1` | `DIFFERENCE` | Fingerprints unterscheiden sich; der erste Unterschied wird ausgegeben. |
| `2` | `INCONCLUSIVE` | Evidenz fehlt, Locale nicht unterstützt oder Eingabe unlesbar. |
| `3` | `ERROR` | Fehlerhaftes JSON, ungültige Argumente, unsicherer Bezeichner oder Treiberfehler. |

---

<a id="design-notes"></a>
## 🧠 Designhinweise

- **Fingerprints statt Vermutungen**: `result_hash` ist SHA-256 über das kanonische JSON von `{ order, ties }`. Gleichstände sind enthalten, weil zwei Laufzeiten in der Reihenfolge übereinstimmen und dennoch darüber Uneinigkeit haben können, *welche Werte gleich sind*.
- **Selbstinkonsistenz wird abgelehnt**: Eine Beobachtung, deren `order` keine Umordnung ihres Korpus ist oder deren deklarierter Hash nicht übereinstimmt, gilt als `INCONCLUSIVE` (oder `ERROR`), niemals als Evidenz.
- **Metadaten sind kein Fehlschlag**: Wenn Node ICU 78 verwendet und PostgreSQL glibc, beide aber dieselbe Reihenfolge und dieselbe Gleichstandsstruktur erzeugen, lautet das Ergebnis `PASS`.
- **Berichtsinvarianten**: `report.status` muss gleich `outcome.status` sein. Ein `PASS` mit einem `first_difference` wird abgelehnt.

---

<a id="limitations-and-compatibility"></a>
## ⚠️ Einschränkungen und Kompatibilität

### Kompatibilitätsmatrix

| Oberfläche | Verifiziert | Evidenzstufe |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Vollständige Suite, 98/98 | **E3** — hier ausgeführt |
| **Node.js 24.22.3, Linux x86_64** | Vollständige Suite, 98/98 | **E3** — hier ausgeführt |
| **PostgreSQL 16.15, Linux x86_64** | Vollständige Suite inkl. 11 Live-Tests, 98/98 | **E3** — hier ausgeführt |
| **PostgreSQL 14, Linux x86_64** | In `ci.yml` konfiguriert | **E1** — nie als bestanden beobachtet |
| **macOS / Windows** | Nicht ausgeführt | UNGEPRÜFT |
| **MySQL / SQLite / Browser** | Nicht implementiert | — |

### Einschränkungen

- **Nur zwei Probes**: Node.js und PostgreSQL. MySQL und SQLite sind nicht implementiert.
- **Integrität ≠ Authentizität**: Materna prüft Konsistenz, nicht Herkunft. Beobachtungen werden nicht signiert.
- **Kleiner Korpus**: 16 gezielte Stichproben, keine vollständige CLDR-Abdeckung.
- **Standard-Collation**: PostgreSQL verwendet standardmäßig `C.UTF-8`, sofern `PG_COLLATION` nicht gesetzt ist. In dieser Konfiguration ist eine `DIFFERENCE` gegenüber Nodes ICU zu erwarten.

---

<a id="development"></a>
## 🛠 Entwicklung

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI läuft auf:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. Die TAP-Zusammenfassung schlägt fehl, wenn irgendein Test **übersprungen** wird (`# skipped 0` oder `ℹ skipped 0`). Eine grüne Pipeline bedeutet, dass alles gelaufen ist.

---

<a id="support-and-continuous-maintenance"></a>
## 💖 Unterstützung und kontinuierliche Wartung

**Materna ist ein zu 100 % unabhängiges Open-Source-Projekt.** Damit dieses Paket zuverlässig und rund um die Uhr aktiv gepflegt bleibt, sind wir auf die Unterstützung der Community angewiesen.

Wenn Materna Sie vor locale-bedingten Produktionsfehlern bewahrt, unterstützen Sie bitte die kontinuierliche Entwicklung:

### 💰 Finanzielle Unterstützung (Förderung und Spenden)

Nachhaltige Förderung ermöglicht es dem Maintainer, Zeit in die permanente Wartung, schnelle Bugfixes und den Ausbau der Kompatibilitätsmatrix zu investieren.

- **[Auf GitHub sponsern](https://github.com/sponsors/shaonkabir8)** (wiederkehrend oder einmalig)
- **[Spendier mir einen Kaffee](https://buymeacoffee.com/shaonkabir8)** (schnelle Spende)

*Unternehmenssponsoring ist sehr willkommen. Für Enterprise-Support oder individuelle SLAs kontaktieren Sie uns bitte direkt über GitHub.*

### 👨‍💻 Code-Beiträge

Wir suchen immer leidenschaftliche Programmiererinnen und Programmierer! Ob neue Probes (etwa MySQL/SQLite), ein größerer Testkorpus, ein besserer HTML-Reporter oder Bugfixes – Ihre Pull Requests sind sehr willkommen.

- Schauen Sie in die [offenen Issues](https://github.com/shaonkabir8/materna/issues) oder eröffnen Sie ein neues, um Ideen zu besprechen.
- Halten Sie Änderungen klein, fügen Sie einen Verhaltenstest hinzu und **behaupten Sie kein Ergebnis, das Sie nicht beobachtet haben**.

---

<a id="contributing"></a>
## 🤝 Mitwirken

Adapter für weitere Laufzeiten (MySQL, SQLite), ein größerer Korpus und reichhaltigere Reporter sind willkommen. Halten Sie Änderungen klein, fügen Sie einen Verhaltenstest hinzu und **behaupten Sie kein Ergebnis, das Sie nicht beobachtet haben**.

---

<a id="license"></a>
## 📄 Lizenz

MIT — siehe [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

Entwickelt und gepflegt von [Codazi](https://github.com/codazi) · Maintainer: [shaonkabir8](https://github.com/shaonkabir8).
