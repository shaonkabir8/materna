# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <strong>🇪🇸 Español</strong>
  <a href="README.pt.md">🇧🇷 Português</a>
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

> **Sondeo de paridad de configuración regional basado en comportamiento para Node.js y PostgreSQL.**  
> Deja de comparar números de versión. Empieza a comparar el comportamiento real de las colaciones.

---

## Tabla de contenidos

- [✨ ¿Por qué Materna?](#why-materna)
- [🚀 Características principales](#feature-highlights)
- [📋 Requisitos](#requirements)
- [📦 Instalación](#install)
- [⚡ Inicio rápido](#quick-start)
- [📖 Referencia de la API](#api-reference)
- [🧠 Notas de diseño](#design-notes)
- [⚠️ Limitaciones y compatibilidad](#limitations-and-compatibility)
- [🛠 Desarrollo](#development)
- [💖 Apoyo y mantenimiento continuo](#support-and-continuous-maintenance)
- [🤝 Contribuir](#contributing)
- [📄 Licencia](#license)

---

<a id="why-materna"></a>
## ✨ ¿Por qué Materna?

**Los errores de configuración regional son insidiosos.** Tu base de datos ordena `"ä"` de forma distinta a tu entorno de ejecución de Node.js. Las cadenas de versión no te lo van a decir.

| La forma antigua (metadatos de versión) | La forma nueva (evidencia de comportamiento) |
| :--- | :--- |
| Compruebas `process.versions.icu === '78.3'` y das la compatibilidad por sentada. | Ejecutas `probeNode()` y `probePostgres()` y después comparas sus **ordenaciones realmente observadas**. |
| Una actualización de ICU o de glibc rompe la ordenación en silencio. | Materna registra la huella de la salida *real* de la colación con SHA-256. |
| Te enteras en producción, cuando `ORDER BY` no coincide. | Te enteras en tu suite de pruebas, con un `first_difference` preciso. |
| «Usamos PostgreSQL 16 y Node 22, así que debería estar bien». | «Demostramos que el corpus exacto de `de-DE` produce ordenaciones y estructuras de empate idénticas». |

Materna trata las **versiones como metadatos** y el **comportamiento observado como evidencia**. Declara una discrepancia *solo* cuando dos ejecuciones sobre el mismo sondeo declarado y el mismo corpus producen ordenaciones observadas diferentes.

---

<a id="feature-highlights"></a>
## 🚀 Características principales

| **Sondeo sin configuración** | **Paridad entre base de datos y entorno de ejecución** | **Informes HTML deterministas** |
| :--- | :--- | :--- |
| `npx materna node` funciona al instante. | Sondea de forma nativa `Intl.Collator` de Node.js y `ORDER BY` de PostgreSQL. | Genera HTML revisable y comparable, sin JavaScript. |
| **Niveles de evidencia E3/E1** | **Códigos de salida estrictos** | **Consciente de la estructura de empates** |
| Separa con claridad «ejecutado aquí» de «configurado en CI». | Compatible con CI (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Detecta diferencias sutiles en los grupos de igualdad, no solo en el orden. |
| **Una sola dependencia en tiempo de ejecución** | **Sin plano de control alojado** | **Corpus inmutable** |
| `pg` se importa dinámicamente; `import 'materna'` no carga ningún controlador de base de datos. | Se ejecuta por completo en tu máquina o en tu CI. Sin SaaS. | Las muestras se procesan con hash y se verifican. Se rechaza cualquier manipulación. |

---

<a id="requirements"></a>
## 📋 Requisitos

| Componente | Requisito |
| :--- | :--- |
| **Node.js** | `>=22` (ejecutado en 22, 24 y 26 en CI). |
| **PostgreSQL** | **Opcional.** Solo es necesario si ejecutas `materna postgres`. Verificado localmente con PostgreSQL 16.15. |
| **Entorno de ejecución** | Node, Bun, Deno. |

---

<a id="install"></a>
## 📦 Instalación

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ Inicio rápido

### 1. CLI (sin escribir código)

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API (mediante código)

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

### 3. Informe HTML

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*El informe generado no contiene JavaScript. Todos los valores están escapados. Entradas idénticas producen HTML idéntico byte a byte.*

---

<a id="api-reference"></a>
## 📖 Referencia de la API

### `probeNode(options)`

Devuelve de forma síncrona una observación de `Intl.Collator` de Node.js.

- `options.locale` (string): por ejemplo, `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'` o `'variant'`.
- `options.numeric` (boolean): colación numérica.
- `options.corpus` (array): muestras personalizadas (por defecto, el núcleo inmutable de 16 muestras).

### `probePostgres(options)`

Sondea `ORDER BY` de PostgreSQL de forma asíncrona.

- `options.connectionString`: URL de PostgreSQL.
- `options.collation` (string): por ejemplo, `'en-US-x-icu'`. Se resuelve mediante una consulta parametrizada; los nombres desconocidos lanzan un error (sin retroceso silencioso).
- El resto de las opciones coinciden con `probeNode`.

### `compareObservations(left, right, [opts])`

Devuelve un objeto de resultado:

- `status`: `'PASS'`, `'DIFFERENCE'` o `'INCONCLUSIVE'`.
- `first_difference`: el índice y los valores exactos donde divergen las ordenaciones.
- `metadata_differences`: arreglo de diferencias de entorno (por ejemplo, la versión de ICU) que **no** provocan un fallo.

### Códigos de salida

| Código | Estado | Significado |
| :--- | :--- | :--- |
| `0` | `PASS` | Las huellas coinciden. |
| `1` | `DIFFERENCE` | Las huellas difieren; se imprime la primera diferencia. |
| `2` | `INCONCLUSIVE` | Faltan evidencias, la configuración regional no es compatible o la entrada no se puede leer. |
| `3` | `ERROR` | JSON mal formado, argumentos incorrectos, identificador inseguro o fallo del controlador. |

---

<a id="design-notes"></a>
## 🧠 Notas de diseño

- **Huellas en lugar de conjeturas**: `result_hash` es SHA-256 sobre el JSON canónico de `{ order, ties }`. Los empates se incluyen porque dos entornos pueden coincidir en el orden y discrepar en *qué valores son iguales*.
- **Se rechaza la autocontradicción**: una observación cuyo `order` no sea una reordenación de su corpus, o cuyo hash declarado no coincida, se trata como `INCONCLUSIVE` (o `ERROR`), nunca como evidencia.
- **Los metadatos no son un fallo**: si Node usa ICU 78 y PostgreSQL usa glibc, pero ambos producen el mismo orden y la misma estructura de empates, el resultado es `PASS`.
- **Invariantes del informe**: `report.status` debe ser igual a `outcome.status`. Se rechaza un `PASS` que lleve un `first_difference`.

---

<a id="limitations-and-compatibility"></a>
## ⚠️ Limitaciones y compatibilidad

### Matriz de compatibilidad

| Superficie | Verificado | Nivel de evidencia |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Suite completa, 98/98 | **E3** — ejecutado aquí |
| **Node.js 24.22.3, Linux x86_64** | Suite completa, 98/98 | **E3** — ejecutado aquí |
| **PostgreSQL 16.15, Linux x86_64** | Suite completa, incl. 11 pruebas en vivo, 98/98 | **E3** — ejecutado aquí |
| **PostgreSQL 14, Linux x86_64** | Configurado en `ci.yml` | **E1** — nunca se observó pasando |
| **macOS / Windows** | No ejecutado | SIN VERIFICAR |
| **MySQL / SQLite / navegadores** | No implementado | — |

### Limitaciones

- **Solo dos sondeos**: Node.js y PostgreSQL. MySQL y SQLite no están implementados.
- **Integridad ≠ autenticidad**: Materna comprueba la consistencia, no la procedencia. No firma las observaciones.
- **Corpus pequeño**: 16 muestras dirigidas, no una cobertura exhaustiva de CLDR.
- **Colación predeterminada**: PostgreSQL usa `C.UTF-8` de forma predeterminada salvo que se defina `PG_COLLATION`. En esta configuración, una `DIFFERENCE` frente al ICU de Node es lo esperado.

---

<a id="development"></a>
## 🛠 Desarrollo

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**La CI se ejecuta en:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. El resumen TAP está configurado para fallar si alguna prueba se **omite** (`# skipped 0` o `ℹ skipped 0`). Una canalización en verde significa que todo se ejecutó.

---

<a id="support-and-continuous-maintenance"></a>
## 💖 Apoyo y mantenimiento continuo

**Materna es un proyecto de código abierto 100 % independiente.** Para mantener este paquete fiable y con mantenimiento activo 24/7, dependemos del apoyo de la comunidad.

Si Materna te libra de errores de producción relacionados con la configuración regional, considera apoyar su desarrollo continuo:

### 💰 Apoyo económico (financiación y donaciones)

Una financiación sostenida permite al mantenedor dedicar tiempo al mantenimiento continuo, a correcciones rápidas de errores y a ampliar la matriz de compatibilidad.

- **[Patrocina en GitHub](https://github.com/sponsors/shaonkabir8)** (recurrente o única)
- **[Invítame a un café](https://buymeacoffee.com/shaonkabir8)** (donación rápida)

*Los patrocinios corporativos son muy bienvenidos. Ponte en contacto directamente por GitHub para soporte empresarial o SLA personalizados.*

### 👨‍💻 Contribuciones de código

¡Siempre buscamos programadores apasionados que quieran contribuir! Ya sea añadir nuevos sondeos (como MySQL/SQLite), ampliar el corpus de pruebas, mejorar el generador de informes HTML o corregir errores, tus pull requests son muy bienvenidas.

- Revisa las [incidencias abiertas](https://github.com/shaonkabir8/materna/issues) o abre una nueva para debatir ideas.
- Mantén los cambios pequeños, añade una prueba de comportamiento y **no afirmes un resultado que no hayas observado**.

---

<a id="contributing"></a>
## 🤝 Contribuir

Los adaptadores para otros entornos de ejecución (MySQL, SQLite), un corpus mayor y generadores de informes más completos son bienvenidos. Mantén los cambios pequeños, añade una prueba de comportamiento y **no afirmes un resultado que no hayas observado**.

---

<a id="license"></a>
## 📄 Licencia

MIT — consulta [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

Creado y mantenido por [Codazi](https://github.com/codazi) · Mantenedor: [shaonkabir8](https://github.com/shaonkabir8).
