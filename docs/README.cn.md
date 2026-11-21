# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <a href="README.es.md">🇪🇸 Español</a>
  <a href="README.pt.md">🇧🇷 Português</a>
  <a href="README.de.md">🇩🇪 Deutsch</a>
  <strong>🇨🇳 简体中文</strong>
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

> **面向 Node.js 与 PostgreSQL 的、基于行为的区域设置一致性探测。**  
> 别再比较版本号了。开始比较真实的排序规则行为。

---

## 目录

- [✨ 为什么需要 Materna？](#why-materna)
- [🚀 功能亮点](#feature-highlights)
- [📋 环境要求](#requirements)
- [📦 安装](#install)
- [⚡ 快速开始](#quick-start)
- [📖 API 参考](#api-reference)
- [🧠 设计说明](#design-notes)
- [⚠️ 局限与兼容性](#limitations-and-compatibility)
- [🛠 开发](#development)
- [💖 支持与持续维护](#support-and-continuous-maintenance)
- [🤝 参与贡献](#contributing)
- [📄 许可证](#license)

---

<a id="why-materna"></a>
## ✨ 为什么需要 Materna？

**区域设置相关的缺陷极其隐蔽。** 数据库对 `"ä"` 的排序结果与你的 Node.js 运行时并不一致，而版本字符串根本不会告诉你这一点。

| 传统方式（版本元数据） | 新方式（行为证据） |
| :--- | :--- |
| 你检查 `process.versions.icu === '78.3'`，然后就假定兼容。 | 你运行 `probeNode()` 与 `probePostgres()`，然后比较两者**实际观测到的排序结果**。 |
| 一次 ICU 或 glibc 升级就静默地破坏了排序。 | Materna 用 SHA-256 对*实际*排序规则输出做指纹。 |
| 直到生产环境中 `ORDER BY` 结果不一致时你才发现。 | 在测试套件里就能发现，并给出精确的 `first_difference`。 |
| “我们用 PostgreSQL 16 加 Node 22，应该没问题。” | “我们证明了在完全相同的 `de-DE` 语料上，两者产生完全一致的排序与并列结构。” |

Materna 把**版本视为元数据**，把**观测到的行为视为证据**。只有在同一份声明的探针与语料上运行两次、却产生不同的观测排序时，它才会判定为不一致。

---

<a id="feature-highlights"></a>
## 🚀 功能亮点

| **零配置探测** | **数据库与运行时一致性** | **确定性的 HTML 报告** |
| :--- | :--- | :--- |
| `npx materna node` 开箱即用。 | 原生探测 Node.js 的 `Intl.Collator` 与 PostgreSQL 的 `ORDER BY`。 | 生成可审阅、可 diff 的 HTML，不含 JavaScript。 |
| **E3/E1 证据等级** | **严格的退出码** | **感知并列结构** |
| 清晰区分“在此处实际执行”与“仅在 CI 中配置”。 | 对 CI 友好（0=PASS，1=DIFFERENCE，2=INCONCLUSIVE，3=ERROR）。 | 能识别相等分组中的细微差异，而不只看顺序。 |
| **仅一个运行时依赖** | **无托管控制平面** | **不可变语料** |
| `pg` 为动态导入；`import 'materna'` 不会加载任何数据库驱动。 | 完全在你的机器或 CI 上运行，没有 SaaS。 | 样本经哈希校验，任何篡改都会被拒绝。 |

---

<a id="requirements"></a>
## 📋 环境要求

| 组件 | 要求 |
| :--- | :--- |
| **Node.js** | `>=22`（在 CI 中于 22、24、26 上执行）。 |
| **PostgreSQL** | **可选。** 仅当你运行 `materna postgres` 时才需要。已在本地针对 PostgreSQL 16.15 验证。 |
| **运行时** | Node、Bun、Deno。 |

---

<a id="install"></a>
## 📦 安装

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ 快速开始

### 1. CLI（无需写代码）

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API（编程方式）

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

### 3. HTML 报告

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*生成的报告不含 JavaScript。所有取值均经转义。相同输入产生逐字节相同的 HTML。*

---

<a id="api-reference"></a>
## 📖 API 参考

### `probeNode(options)`

同步返回对 Node.js `Intl.Collator` 的一次观测。

- `options.locale`（字符串）：例如 `'de-DE'`。
- `options.sensitivity`（字符串）：`'base'`、`'accent'`、`'case'` 或 `'variant'`。
- `options.numeric`（布尔值）：是否启用数字排序。
- `options.corpus`（数组）：自定义样本（默认使用不可变的 16 个核心样本）。

### `probePostgres(options)`

异步探测 PostgreSQL 的 `ORDER BY`。

- `options.connectionString`：PostgreSQL 连接 URL。
- `options.collation`（字符串）：例如 `'en-US-x-icu'`。通过参数化查询解析；未知名称会抛出错误（不做静默回退）。
- 其余选项与 `probeNode` 相同。

### `compareObservations(left, right, [opts])`

返回一个结果对象：

- `status`：`'PASS'`、`'DIFFERENCE'` 或 `'INCONCLUSIVE'`。
- `first_difference`：排序第一次出现分歧时的确切索引与取值。
- `metadata_differences`：环境差异数组（例如 ICU 版本），这些差异**不会**导致失败。

### 退出码

| 退出码 | 状态 | 含义 |
| :--- | :--- | :--- |
| `0` | `PASS` | 指纹一致。 |
| `1` | `DIFFERENCE` | 指纹不同；会打印第一处差异。 |
| `2` | `INCONCLUSIVE` | 证据缺失、区域设置不受支持，或输入不可读。 |
| `3` | `ERROR` | JSON 格式错误、参数非法、标识符不安全，或驱动故障。 |

---

<a id="design-notes"></a>
## 🧠 设计说明

- **用指纹代替猜测**：`result_hash` 是对 `{ order, ties }` 规范化 JSON 计算的 SHA-256。之所以把并列关系纳入，是因为两个运行时可能在顺序上一致，却在*哪些取值相等*上不一致。
- **拒绝自相矛盾**：若某次观测的 `order` 不是其语料的一种重排，或所声明的哈希不匹配，则视为 `INCONCLUSIVE`（或 `ERROR`），绝不当作证据。
- **元数据不等于失败**：如果 Node 使用 ICU 78、PostgreSQL 使用 glibc，但两者产生相同的顺序与并列结构，结果就是 `PASS`。
- **报告不变式**：`report.status` 必须等于 `outcome.status`。带有 `first_difference` 的 `PASS` 会被拒绝。

---

<a id="limitations-and-compatibility"></a>
## ⚠️ 局限与兼容性

### 兼容性矩阵

| 环境 | 已验证情况 | 证据等级 |
| :--- | :--- | :--- |
| **Node.js 22.23.5、Linux x86_64、ICU 78.3** | 完整测试套件，98/98 | **E3** — 在此处实际执行 |
| **Node.js 24.22.3、Linux x86_64** | 完整测试套件，98/98 | **E3** — 在此处实际执行 |
| **PostgreSQL 16.15、Linux x86_64** | 完整测试套件，含 11 个在线测试，98/98 | **E3** — 在此处实际执行 |
| **PostgreSQL 14、Linux x86_64** | 已在 `ci.yml` 中配置 | **E1** — 从未观测到通过 |
| **macOS / Windows** | 未执行 | 未验证 |
| **MySQL / SQLite / 浏览器** | 未实现 | — |

### 局限

- **仅两种探针**：Node.js 与 PostgreSQL。MySQL 与 SQLite 尚未实现。
- **完整性 ≠ 真实性**：Materna 校验一致性，而非来源。它不会对观测签名。
- **语料规模小**：16 个定向样本，并非完整的 CLDR 覆盖。
- **默认排序规则**：除非设置 `PG_COLLATION`，PostgreSQL 默认使用 `C.UTF-8`。在这种配置下，与 Node 的 ICU 之间出现 `DIFFERENCE` 属于预期结果。

---

<a id="development"></a>
## 🛠 开发

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI 运行于：** Node `22`、`24`、`26` × PostgreSQL `14`、`16`。TAP 汇总被设置为：只要有测试被**跳过**就失败（`# skipped 0` 或 `ℹ skipped 0`）。流水线全绿意味着所有测试都真正执行了。

---

<a id="support-and-continuous-maintenance"></a>
## 💖 支持与持续维护

**Materna 是一个 100% 独立的开源项目。** 为了让这个包持续可靠并保持 7×24 小时的活跃维护，我们依赖社区的支持。

如果 Materna 帮你避开了与区域设置相关的生产事故，请考虑支持它的持续开发：

### 💰 资金支持（资助与捐赠）

持续的资金支持能让维护者投入时间进行全天候维护、快速修复缺陷，并扩展兼容性矩阵。

- **[在 GitHub 上赞助](https://github.com/sponsors/shaonkabir8)**（定期或一次性）
- **[请我喝杯咖啡](https://buymeacoffee.com/shaonkabir8)**（快速捐赠）

*非常欢迎企业赞助。如需企业级支持或定制 SLA，请直接通过 GitHub 联系。*

### 👨‍💻 代码贡献

我们一直在寻找有热情的开发者参与贡献！无论是新增探针（例如 MySQL/SQLite）、扩充测试语料、改进 HTML 报告器，还是修复缺陷，都非常欢迎你提交 pull request。

- 查看[已有的 issue](https://github.com/shaonkabir8/materna/issues)，或新开一个来讨论想法。
- 保持改动小、附带行为测试，并且**不要声称你并未实际观测到的结果**。

---

<a id="contributing"></a>
## 🤝 参与贡献

欢迎为其他运行时（MySQL、SQLite）添加适配器、扩充语料，以及实现更丰富的报告器。请保持改动小、附带行为测试，并且**不要声称你并未实际观测到的结果**。

---

<a id="license"></a>
## 📄 许可证

MIT — 参见 [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE)。

由 [Codazi](https://github.com/codazi) 构建与维护 · 维护者：[shaonkabir8](https://github.com/shaonkabir8)。
