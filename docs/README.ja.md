# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <a href="README.es.md">🇪🇸 Español</a>
  <a href="README.pt.md">🇧🇷 Português</a>
  <a href="README.de.md">🇩🇪 Deutsch</a>
  <a href="README.cn.md">🇨🇳 简体中文</a>
  <a href="README.ru.md">🇷🇺 Русский</a>
  <a href="README.tr.md">🇹🇷 Türkçe</a>
  <strong>🇯🇵 日本語</strong>
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

> **Node.js と PostgreSQL のための、振る舞いベースのロケール整合性プロービング。**  
> バージョン番号を比べるのはやめて、実際の照合（collation）の振る舞いを比べましょう。

---

## 目次

- [✨ なぜ Materna なのか](#why-materna)
- [🚀 主な機能](#feature-highlights)
- [📋 動作要件](#requirements)
- [📦 インストール](#install)
- [⚡ クイックスタート](#quick-start)
- [📖 API リファレンス](#api-reference)
- [🧠 設計上のメモ](#design-notes)
- [⚠️ 制約と互換性](#limitations-and-compatibility)
- [🛠 開発](#development)
- [💖 支援と継続的なメンテナンス](#support-and-continuous-maintenance)
- [🤝 コントリビューション](#contributing)
- [📄 ライセンス](#license)

---

<a id="why-materna"></a>
## ✨ なぜ Materna なのか

**ロケール由来の不具合は厄介です。** データベースは `"ä"` を Node.js ランタイムとは違う順序で並べます。バージョン文字列はそのことを教えてくれません。

| 従来の方法（バージョンのメタデータ） | 新しい方法（振る舞いの証拠） |
| :--- | :--- |
| `process.versions.icu === '78.3'` を確認して、互換性があると決めつける。 | `probeNode()` と `probePostgres()` を実行し、**実際に観測された並び順**を比較する。 |
| ICU や glibc の更新が、並び順を静かに壊す。 | Materna は*実際の*照合結果を SHA-256 でフィンガープリント化する。 |
| `ORDER BY` が一致しない本番環境で初めて気づく。 | テストスイートの中で、正確な `first_difference` とともに気づく。 |
| 「PostgreSQL 16 と Node 22 を使っているから大丈夫でしょう」。 | 「同一の `de-DE` コーパスが同一の並び順と同値構造を生み出すことを証明した」。 |

Materna は**バージョンをメタデータ**として、**観測された振る舞いを証拠**として扱います。不一致を宣言するのは、同じ宣言済みプローブと同じコーパスに対する 2 回の実行が、異なる観測結果を生み出したとき*だけ*です。

---

<a id="feature-highlights"></a>
## 🚀 主な機能

| **設定不要のプロービング** | **データベースとランタイムの整合性** | **決定論的な HTML レポート** |
| :--- | :--- | :--- |
| `npx materna node` がすぐに動きます。 | Node.js の `Intl.Collator` と PostgreSQL の `ORDER BY` をネイティブにプローブします。 | JavaScript を含まない、レビューも diff も可能な HTML を生成します。 |
| **E3/E1 の証拠レベル** | **厳格な終了コード** | **同値構造を考慮** |
| 「ここで実行した」と「CI で設定されているだけ」を明確に区別します。 | CI フレンドリー（0=PASS、1=DIFFERENCE、2=INCONCLUSIVE、3=ERROR）。 | 順序だけでなく、同値グループ内の微妙な違いも検出します。 |
| **ランタイム依存は 1 つだけ** | **ホスト型コントロールプレーンなし** | **不変コーパス** |
| `pg` は動的インポートされ、`import 'materna'` はデータベースドライバを一切読み込みません。 | すべて手元のマシンまたは CI 上で動作します。SaaS ではありません。 | サンプルはハッシュ化され検証されます。改ざんは拒否されます。 |

---

<a id="requirements"></a>
## 📋 動作要件

| コンポーネント | 要件 |
| :--- | :--- |
| **Node.js** | `>=22`（CI では 22、24、26 で実行）。 |
| **PostgreSQL** | **任意。** `materna postgres` を実行する場合のみ必要です。ローカルでは PostgreSQL 16.15 で検証済み。 |
| **ランタイム** | Node、Bun、Deno。 |

---

<a id="install"></a>
## 📦 インストール

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ クイックスタート

### 1. CLI（コード不要）

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API（プログラムから利用）

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

### 3. HTML レポート

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*生成されるレポートに JavaScript は含まれません。すべての値はエスケープされます。同一の入力からはバイト単位で同一の HTML が生成されます。*

---

<a id="api-reference"></a>
## 📖 API リファレンス

### `probeNode(options)`

Node.js の `Intl.Collator` に関する観測結果を同期的に返します。

- `options.locale`（string）：例 `'de-DE'`。
- `options.sensitivity`（string）：`'base'`、`'accent'`、`'case'`、`'variant'`。
- `options.numeric`（boolean）：数値としての照合。
- `options.corpus`（array）：独自のサンプル（既定では不変の 16 サンプルからなるコア）。

### `probePostgres(options)`

PostgreSQL の `ORDER BY` を非同期的にプローブします。

- `options.connectionString`：PostgreSQL の URL。
- `options.collation`（string）：例 `'en-US-x-icu'`。パラメータ化クエリで解決され、未知の名前はエラーになります（暗黙のフォールバックはありません）。
- その他のオプションは `probeNode` と同じです。

### `compareObservations(left, right, [opts])`

結果オブジェクトを返します。

- `status`：`'PASS'`、`'DIFFERENCE'`、`'INCONCLUSIVE'` のいずれか。
- `first_difference`：並び順が最初に分岐する正確なインデックスと値。
- `metadata_differences`：失敗を引き起こさ**ない**環境差異（ICU のバージョンなど）の配列。

### 終了コード

| コード | ステータス | 意味 |
| :--- | :--- | :--- |
| `0` | `PASS` | フィンガープリントが一致。 |
| `1` | `DIFFERENCE` | フィンガープリントが相違。最初の差分を出力。 |
| `2` | `INCONCLUSIVE` | 証拠の欠如、未対応のロケール、または読み取れない入力。 |
| `3` | `ERROR` | 不正な JSON、誤った引数、安全でない識別子、またはドライバの失敗。 |

---

<a id="design-notes"></a>
## 🧠 設計上のメモ

- **推測ではなくフィンガープリント**：`result_hash` は `{ order, ties }` の正規化 JSON に対する SHA-256 です。2 つのランタイムが順序では一致しても「どの値が等しいか」で相違しうるため、同値関係も含めています。
- **自己矛盾は拒否**：`order` が自身のコーパスの並べ替えになっていない観測、または宣言されたハッシュが一致しない観測は、`INCONCLUSIVE`（または `ERROR`）として扱われ、決して証拠にはなりません。
- **メタデータは失敗ではない**：Node が ICU 78 を使い PostgreSQL が glibc を使っていても、両者が同じ順序と同じ同値構造を生み出すなら、結果は `PASS` です。
- **レポートの不変条件**：`report.status` は `outcome.status` と等しくなければなりません。`first_difference` を持つ `PASS` は拒否されます。

---

<a id="limitations-and-compatibility"></a>
## ⚠️ 制約と互換性

### 互換性マトリクス

| 対象 | 検証状況 | 証拠レベル |
| :--- | :--- | :--- |
| **Node.js 22.23.5、Linux x86_64、ICU 78.3** | 全スイート、98/98 | **E3** — ここで実行済み |
| **Node.js 24.22.3、Linux x86_64** | 全スイート、98/98 | **E3** — ここで実行済み |
| **PostgreSQL 16.15、Linux x86_64** | 11 件のライブテストを含む全スイート、98/98 | **E3** — ここで実行済み |
| **PostgreSQL 14、Linux x86_64** | `ci.yml` で設定済み | **E1** — 成功は一度も観測されていない |
| **macOS / Windows** | 未実行 | 未検証 |
| **MySQL / SQLite / ブラウザ** | 未実装 | — |

### 制約

- **プローブは 2 種類のみ**：Node.js と PostgreSQL。MySQL と SQLite は未実装です。
- **完全性 ≠ 真正性**：Materna は一貫性を検証しますが、出所は検証しません。観測結果に署名は行いません。
- **小さなコーパス**：CLDR を網羅するものではなく、16 個の的を絞ったサンプルです。
- **既定の照合順序**：`PG_COLLATION` が設定されていない限り、PostgreSQL は既定で `C.UTF-8` を使用します。この構成では、Node の ICU に対する `DIFFERENCE` は想定される結果です。

---

<a id="development"></a>
## 🛠 開発

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI の実行環境：** Node `22`、`24`、`26` × PostgreSQL `14`、`16`。TAP サマリは、いずれかのテストが**スキップ**された場合に失敗するよう設定されています（`# skipped 0` または `ℹ skipped 0`）。グリーンのパイプラインは、すべてが実際に実行されたことを意味します。

---

<a id="support-and-continuous-maintenance"></a>
## 💖 支援と継続的なメンテナンス

**Materna は 100% 独立したオープンソースプロジェクトです。** このパッケージを信頼できる状態に保ち、24 時間 365 日 actively メンテナンスし続けるために、コミュニティの支援に頼っています。

Materna がロケール関連の本番障害からあなたを守っているなら、継続的な開発への支援をご検討ください。

### 💰 資金面での支援（助成・寄付）

継続的な資金があれば、メンテナは常時メンテナンス、迅速なバグ修正、互換性マトリクスの拡充に時間を割くことができます。

- **[GitHub でスポンサーになる](https://github.com/sponsors/shaonkabir8)**（定期または単発）
- **[コーヒーをおごる](https://buymeacoffee.com/shaonkabir8)**（手軽な寄付）

*企業スポンサーは非常に歓迎します。エンタープライズサポートやカスタム SLA については、GitHub 経由で直接ご連絡ください。*

### 👨‍💻 コードによる貢献

情熱あるプログラマーを常に募集しています！新しいプローブ（MySQL/SQLite など）の追加、テストコーパスの拡充、HTML レポータの改善、バグ修正など、プルリクエストを心より歓迎します。

- [オープンな issue](https://github.com/shaonkabir8/materna/issues) を確認するか、アイデアを議論するために新しい issue を作成してください。
- 変更は小さく保ち、振る舞いのテストを追加し、**観測していない結果を主張しないでください**。

---

<a id="contributing"></a>
## 🤝 コントリビューション

他のランタイム（MySQL、SQLite）向けのアダプタ、より大きなコーパス、より充実したレポータを歓迎します。変更は小さく保ち、振る舞いのテストを追加し、**観測していない結果を主張しないでください**。

---

<a id="license"></a>
## 📄 ライセンス

MIT — [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE) を参照してください。

[Codazi](https://github.com/codazi) によって開発・保守 · メンテナ：[shaonkabir8](https://github.com/shaonkabir8)。
