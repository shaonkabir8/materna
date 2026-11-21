# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <a href="README.es.md">🇪🇸 Español</a>
  <strong>🇧🇷 Português</strong>
  <a href="README.de.md">🇩🇪 Deutsch</a>
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

> **Sondagem de paridade de locale baseada em comportamento para Node.js e PostgreSQL.**  
> Pare de comparar números de versão. Comece a comparar o comportamento real de collation.

---

## Sumário

- [✨ Por que o Materna?](#why-materna)
- [🚀 Destaques de recursos](#feature-highlights)
- [📋 Requisitos](#requirements)
- [📦 Instalação](#install)
- [⚡ Início rápido](#quick-start)
- [📖 Referência da API](#api-reference)
- [🧠 Notas de design](#design-notes)
- [⚠️ Limitações e compatibilidade](#limitations-and-compatibility)
- [🛠 Desenvolvimento](#development)
- [💖 Apoio e manutenção contínua](#support-and-continuous-maintenance)
- [🤝 Contribuição](#contributing)
- [📄 Licença](#license)

---

<a id="why-materna"></a>
## ✨ Por que o Materna?

**Bugs de locale são insidiosos.** Seu banco de dados ordena `"ä"` de forma diferente do seu runtime Node.js. Strings de versão não vão te contar isso.

| O jeito antigo (metadados de versão) | O jeito novo (evidência de comportamento) |
| :--- | :--- |
| Você verifica `process.versions.icu === '78.3'` e presume compatibilidade. | Você executa `probeNode()` e `probePostgres()` e então compara as **ordenações realmente observadas**. |
| Uma atualização de ICU ou glibc quebra a ordenação silenciosamente. | O Materna registra a impressão digital da saída *real* da collation com SHA-256. |
| Você descobre em produção, quando `ORDER BY` não corresponde. | Você descobre na sua suíte de testes, com um `first_difference` preciso. |
| “Usamos PostgreSQL 16 e Node 22, então deve estar tudo bem.” | “Provamos que o corpus exato de `de-DE` produz ordenações e estruturas de empate idênticas.” |

O Materna trata **versões como metadados** e **comportamento observado como evidência**. Ele declara uma divergência *apenas* quando duas execuções sobre a mesma sondagem declarada e o mesmo corpus produzem ordenações observadas diferentes.

---

<a id="feature-highlights"></a>
## 🚀 Destaques de recursos

| **Sondagem sem configuração** | **Paridade entre banco de dados e runtime** | **Relatórios HTML determinísticos** |
| :--- | :--- | :--- |
| `npx materna node` funciona na hora. | Sonda nativamente `Intl.Collator` do Node.js e `ORDER BY` do PostgreSQL. | Gera HTML revisável e comparável por diff, sem JavaScript. |
| **Níveis de evidência E3/E1** | **Códigos de saída rigorosos** | **Ciente da estrutura de empates** |
| Separa claramente “executado aqui” de “configurado na CI”. | Amigável para CI (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Detecta diferenças sutis nos grupos de igualdade, não apenas na ordem. |
| **Uma única dependência de runtime** | **Nenhum plano de controle hospedado** | **Corpus imutável** |
| `pg` é importado dinamicamente; `import 'materna'` não carrega nenhum driver de banco de dados. | Roda inteiramente na sua máquina ou na CI. Sem SaaS. | As amostras recebem hash e são verificadas. Qualquer adulteração é recusada. |

---

<a id="requirements"></a>
## 📋 Requisitos

| Componente | Requisito |
| :--- | :--- |
| **Node.js** | `>=22` (executado em 22, 24 e 26 na CI). |
| **PostgreSQL** | **Opcional.** Necessário apenas se você executar `materna postgres`. Verificado localmente com PostgreSQL 16.15. |
| **Runtime** | Node, Bun, Deno. |

---

<a id="install"></a>
## 📦 Instalação

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ Início rápido

### 1. CLI (sem código)

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API (programática)

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

### 3. Relatório HTML

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*O relatório gerado não contém JavaScript. Todo valor é escapado. Entradas idênticas produzem HTML byte a byte idêntico.*

---

<a id="api-reference"></a>
## 📖 Referência da API

### `probeNode(options)`

Retorna de forma síncrona uma observação do `Intl.Collator` do Node.js.

- `options.locale` (string): por exemplo, `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'` ou `'variant'`.
- `options.numeric` (boolean): collation numérica.
- `options.corpus` (array): amostras personalizadas (o padrão é o núcleo imutável de 16 amostras).

### `probePostgres(options)`

Sonda o `ORDER BY` do PostgreSQL de forma assíncrona.

- `options.connectionString`: URL do PostgreSQL.
- `options.collation` (string): por exemplo, `'en-US-x-icu'`. Resolvido por consulta parametrizada; nomes desconhecidos lançam erro (sem fallback silencioso).
- As demais opções são iguais às de `probeNode`.

### `compareObservations(left, right, [opts])`

Retorna um objeto de resultado:

- `status`: `'PASS'`, `'DIFFERENCE'` ou `'INCONCLUSIVE'`.
- `first_difference`: o índice e os valores exatos em que as ordenações divergem.
- `metadata_differences`: array de diferenças de ambiente (por exemplo, versão de ICU) que **não** causam falha.

### Códigos de saída

| Código | Status | Significado |
| :--- | :--- | :--- |
| `0` | `PASS` | As impressões digitais coincidem. |
| `1` | `DIFFERENCE` | As impressões digitais diferem; a primeira diferença é impressa. |
| `2` | `INCONCLUSIVE` | Evidência ausente, locale não suportado ou entrada ilegível. |
| `3` | `ERROR` | JSON malformado, argumentos inválidos, identificador inseguro ou falha do driver. |

---

<a id="design-notes"></a>
## 🧠 Notas de design

- **Impressões digitais em vez de palpites**: `result_hash` é SHA-256 sobre o JSON canônico de `{ order, ties }`. Os empates são incluídos porque dois runtimes podem concordar na ordem e discordar sobre *quais valores são iguais*.
- **Autoinconsistência é rejeitada**: uma observação cujo `order` não seja um rearranjo do seu corpus, ou cujo hash declarado não confira, é tratada como `INCONCLUSIVE` (ou `ERROR`), nunca como evidência.
- **Metadados não são falha**: se o Node usa ICU 78 e o PostgreSQL usa glibc, mas ambos produzem a mesma ordem e a mesma estrutura de empates, o resultado é `PASS`.
- **Invariantes do relatório**: `report.status` precisa ser igual a `outcome.status`. Um `PASS` que carregue um `first_difference` é recusado.

---

<a id="limitations-and-compatibility"></a>
## ⚠️ Limitações e compatibilidade

### Matriz de compatibilidade

| Superfície | Verificado | Nível de evidência |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Suíte completa, 98/98 | **E3** — executado aqui |
| **Node.js 24.22.3, Linux x86_64** | Suíte completa, 98/98 | **E3** — executado aqui |
| **PostgreSQL 16.15, Linux x86_64** | Suíte completa, incl. 11 testes ao vivo, 98/98 | **E3** — executado aqui |
| **PostgreSQL 14, Linux x86_64** | Configurado em `ci.yml` | **E1** — nunca observado passando |
| **macOS / Windows** | Não executado | NÃO VERIFICADO |
| **MySQL / SQLite / navegadores** | Não implementado | — |

### Limitações

- **Apenas duas sondagens**: Node.js e PostgreSQL. MySQL e SQLite não estão implementados.
- **Integridade ≠ autenticidade**: o Materna verifica consistência, não procedência. Ele não assina observações.
- **Corpus pequeno**: 16 amostras direcionadas, não cobertura exaustiva de CLDR.
- **Collation padrão**: o PostgreSQL usa `C.UTF-8` por padrão, a menos que `PG_COLLATION` seja definida. Nessa configuração, uma `DIFFERENCE` em relação ao ICU do Node é esperada.

---

<a id="development"></a>
## 🛠 Desenvolvimento

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**A CI roda em:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. O resumo TAP é configurado para falhar se qualquer teste for **ignorado** (`# skipped 0` ou `ℹ skipped 0`). Um pipeline verde significa que tudo executou.

---

<a id="support-and-continuous-maintenance"></a>
## 💖 Apoio e manutenção contínua

**O Materna é um projeto de código aberto 100% independente.** Para manter este pacote confiável e ativamente mantido 24/7, contamos com o apoio da comunidade.

Se o Materna te poupa de bugs de produção relacionados a locale, considere apoiar seu desenvolvimento contínuo:

### 💰 Apoio financeiro (financiamento e doações)

Financiamento sustentado permite que o mantenedor dedique tempo à manutenção ininterrupta, a correções rápidas de bugs e à ampliação da matriz de compatibilidade.

- **[Patrocine no GitHub](https://github.com/sponsors/shaonkabir8)** (recorrente ou único)
- **[Pague um café](https://buymeacoffee.com/shaonkabir8)** (doação rápida)

*Patrocínios corporativos são muito bem-vindos. Entre em contato diretamente pelo GitHub para suporte empresarial ou SLAs personalizados.*

### 👨‍💻 Contribuições de código

Estamos sempre procurando programadores apaixonados para contribuir! Seja adicionando novas sondagens (como MySQL/SQLite), ampliando o corpus de testes, melhorando o gerador de relatórios HTML ou corrigindo bugs, seus pull requests são muito bem-vindos.

- Confira as [issues abertas](https://github.com/shaonkabir8/materna/issues) ou abra uma nova para discutir ideias.
- Mantenha as mudanças pequenas, adicione um teste de comportamento e **não afirme um resultado que você não observou**.

---

<a id="contributing"></a>
## 🤝 Contribuição

Adaptadores para outros runtimes (MySQL, SQLite), um corpus maior e geradores de relatório mais ricos são bem-vindos. Mantenha as mudanças pequenas, adicione um teste de comportamento e **não afirme um resultado que você não observou**.

---

<a id="license"></a>
## 📄 Licença

MIT — veja [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

Criado e mantido por [Codazi](https://github.com/codazi) · Mantenedor: [shaonkabir8](https://github.com/shaonkabir8).
