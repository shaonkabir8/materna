# Materna

<p align="center">
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/v/materna.svg?style=flat-square&color=blue" alt="versión de npm"></a>&nbsp;
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/dm/materna.svg?style=flat-square&color=brightgreen" alt="descargas de npm"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/materna.svg?style=flat-square&color=green" alt="licencia"></a>&nbsp;
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/materna.svg?style=flat-square&color=orange" alt="versión de Node"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/actions"><img src="https://img.shields.io/github/actions/workflow/status/shaonkabir8/materna/ci.yml?branch=main&style=flat-square" alt="estado de CI"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/stargazers"><img src="https://img.shields.io/github/stars/shaonkabir8/materna.svg?style=flat-square&color=yellow" alt="estrellas en GitHub"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/network/members"><img src="https://img.shields.io/github/forks/shaonkabir8/materna.svg?style=flat-square" alt="forks en GitHub"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/issues"><img src="https://img.shields.io/github/issues/shaonkabir8/materna.svg?style=flat-square" alt="issues en GitHub"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/commits/main"><img src="https://img.shields.io/github/last-commit/shaonkabir8/materna.svg?style=flat-square" alt="último commit"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs bienvenidos"></a>&nbsp;
  <a href="https://github.com/sponsors/shaonkabir8"><img src="https://img.shields.io/github/sponsors/shaonkabir8?label=Sponsor&logo=GitHub&style=flat-square&color=ff69b4" alt="Patrocinador"></a>
</p>

> **Sondeo conductual de paridad de locales para Node.js y PostgreSQL.**
> Deja de comparar números de versión. Empieza a comparar el comportamiento real de las colaciones.

---

## Índice
- [✨ ¿Por qué Materna?](#-por-qué-materna)
- [🚀 Características destacadas](#-características-destacadas)
- [📋 Requisitos](#-requisitos)
- [📦 Instalación](#-instalación)
- [⚡ Inicio rápido](#-inicio-rápido)
- [📖 Referencia de la API](#-referencia-de-la-api)
- [🧠 Notas de diseño](#-notas-de-diseño)
- [⚠️ Limitaciones y compatibilidad](#️-limitaciones-y-compatibilidad)
- [🛠 Desarrollo](#-desarrollo)
- [💖 Soporte y mantenimiento continuo](#-soporte-y-mantenimiento-continuo)
- [🤝 Contribuir](#-contribuir)
- [📄 Licencia](#-licencia)

---

## ✨ ¿Por qué Materna?

**Los bugs de locale son insidiosos.** Tu base de datos ordena `"ä"` de forma distinta a tu runtime de Node.js. Las cadenas de versión no te lo van a decir.

| La forma antigua (metadatos de versión) | La forma nueva (evidencia conductual) |
| :--- | :--- |
| Compruebas `process.versions.icu === '78.3'` y asumes compatibilidad. | Ejecutas `probeNode()` y `probePostgres()`, y luego comparas sus **ordenaciones observadas reales**. |
| Una actualización de ICU o glibc rompe el ordenamiento en silencio. | Materna calcula una huella del resultado *real* de la colación con SHA-256. |
| Te enteras en producción cuando `ORDER BY` deja de coincidir. | Te enteras en tu suite de tests, con un `first_difference` preciso. |
| «Usamos PostgreSQL 16 y Node 22, así que debería ir bien». | «Demostramos que el corpus exacto de `de-DE` produce ordenaciones y estructuras de empate idénticas». |

Materna trata las **versiones como metadatos** y el **comportamiento observado como evidencia**. Declara una discrepancia *solo* cuando dos ejecuciones sobre el mismo sondeo declarado y el mismo corpus producen ordenaciones observadas distintas.

---

## 🚀 Características destacadas

| **Sondeo sin configuración** | **Paridad entre base de datos y runtime** | **Informes HTML deterministas** |
| :--- | :--- | :--- |
| `npx materna node` funciona al instante. | Sondea de forma nativa `Intl.Collator` de Node.js y `ORDER BY` de PostgreSQL. | Genera HTML revisable y comparable mediante diff, sin JavaScript. |
| **Niveles de evidencia E3/E1** | **Códigos de salida estrictos** | **Consciente de la estructura de empates** |
| Separa claramente «ejecutado aquí» de «configurado en CI». | Compatible con CI (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Detecta diferencias sutiles en los grupos de igualdad, no solo en el orden. |
| **Una única dependencia en runtime** | **Cero plano de control alojado** | **Corpus inmutable** |
| `pg` se importa dinámicamente; `import 'materna'` no carga ningún driver de base de datos. | Se ejecuta íntegramente en tu máquina o en CI. Sin SaaS. | Las muestras se hashean y se verifican. Se rechaza cualquier manipulación. |

---

## 📋 Requisitos

| Componente | Requisito |
| :--- | :--- |
| **Node.js** | `>=22` (ejecutado sobre 22, 24 y 26 en CI). |
| **PostgreSQL** | **Opcional.** Solo es necesario si ejecutas `materna postgres`. Verificado localmente contra PostgreSQL 16.15. |
| **Runtime** | Node, Bun, Deno. |

---

## 📦 Instalación

```bash
# Como dependencia
npm install materna

# Como CLI puntual
npx materna node
```

---

## ⚡ Inicio rápido

### 1. CLI (sin código)

```bash
# Sondear el runtime de Node.js
npx materna node --json > node.json

# Sondear PostgreSQL (se respeta DATABASE_URL)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Comparar las dos observaciones
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
  console.error('Discrepancia encontrada en:', outcome.first_difference);
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

## 📖 Referencia de la API

### `probeNode(options)`
Devuelve de forma síncrona una observación de `Intl.Collator` de Node.js.
- `options.locale` (string): p. ej., `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'` o `'variant'`.
- `options.numeric` (boolean): Colación numérica.
- `options.corpus` (array): Muestras personalizadas (por defecto, el núcleo inmutable de 16 muestras).

### `probePostgres(options)`
Sondea de forma asíncrona `ORDER BY` de PostgreSQL.
- `options.connectionString`: URL de PostgreSQL.
- `options.collation` (string): p. ej., `'en-US-x-icu'`. Se resuelve mediante una consulta parametrizada; los nombres desconocidos lanzan un error (sin fallback silencioso).
- El resto de opciones coinciden con `probeNode`.

### `compareObservations(left, right, [opts])`
Devuelve un objeto de resultado:
- `status`: `'PASS'`, `'DIFFERENCE'` o `'INCONCLUSIVE'`.
- `first_difference`: El índice y los valores exactos donde divergen las ordenaciones.
- `metadata_differences`: Array de diferencias de entorno (p. ej., versión de ICU) que **no** provocan un fallo.

### Códigos de salida

| Código | Estado | Significado |
| :--- | :--- | :--- |
| `0` | `PASS` | Las huellas coinciden. |
| `1` | `DIFFERENCE` | Las huellas difieren; se imprime la primera diferencia. |
| `2` | `INCONCLUSIVE` | Falta evidencia, locale no soportado o entrada ilegible. |
| `3` | `ERROR` | JSON malformado, argumentos incorrectos, identificador inseguro o fallo del driver. |

---

## 🧠 Notas de diseño

- **Huellas en lugar de conjeturas**: `result_hash` es SHA-256 sobre el JSON canónico de `{ order, ties }`. Los empates se incluyen porque dos runtimes pueden coincidir en el orden y discrepar en *qué valores son iguales*.
- **Se rechaza la inconsistencia interna**: Una observación cuyo `order` no sea una reordenación de su corpus, o cuya huella declarada no coincida, se trata como `INCONCLUSIVE` (o `ERROR`), nunca como evidencia.
- **Los metadatos no son un fallo**: Si Node usa ICU 78 y PostgreSQL usa glibc, pero ambos producen el mismo orden y la misma estructura de empates, el resultado es `PASS`.
- **Invariantes del informe**: `report.status` debe ser igual a `outcome.status`. Se rechaza un `PASS` que contenga un `first_difference`.

---

## ⚠️ Limitaciones y compatibilidad

### Matriz de compatibilidad

| Entorno | Verificado | Nivel de evidencia |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Suite completa, 98/98 | **E3** — Ejecutado aquí |
| **Node.js 24.22.3, Linux x86_64** | Suite completa, 98/98 | **E3** — Ejecutado aquí |
| **PostgreSQL 16.15, Linux x86_64** | Suite completa, incl. 11 pruebas en vivo, 98/98 | **E3** — Ejecutado aquí |
| **PostgreSQL 14, Linux x86_64** | Configurado en `ci.yml` | **E1** — Nunca se ha observado pasando |
| **macOS / Windows** | No ejecutado | SIN VERIFICAR |
| **MySQL / SQLite / Navegadores** | No implementado | — |

### Limitaciones
- **Solo dos sondeos**: Node.js y PostgreSQL. MySQL y SQLite no están implementados.
- **Integridad ≠ Autenticidad**: Materna comprueba consistencia, no procedencia. No firma las observaciones.
- **Corpus pequeño**: 16 muestras específicas, no una cobertura exhaustiva de CLDR.
- **Colación por defecto**: PostgreSQL usa `C.UTF-8` por defecto a menos que se establezca `PG_COLLATION`. En esta configuración se espera una `DIFFERENCE` frente al ICU de Node.

---

## 🛠 Desarrollo

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI se ejecuta en:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. El resumen TAP está configurado para fallar si alguna prueba se **omite** (`# skipped 0` o `ℹ skipped 0`). Un pipeline en verde significa que todo se ha ejecutado.

---

## 💖 Soporte y mantenimiento continuo

**Materna es un proyecto de código abierto 100 % independiente.** Para mantener este paquete fiable y con un mantenimiento activo 24/7, dependemos del apoyo de la comunidad.

Si Materna te salva de bugs de producción relacionados con el locale, considera apoyar su desarrollo continuo:

### 💰 Apoyo económico (financiación y donaciones)
La financiación sostenida permite al mantenedor dedicar tiempo al mantenimiento ininterrumpido, a corregir errores con rapidez y a ampliar la matriz de compatibilidad.
- **[Patrocina en GitHub](https://github.com/sponsors/shaonkabir8)** (recurrente o puntual)
- **[Invítame a un café](https://buymeacoffee.com/shaonkabir8)** (donación rápida)

*Los patrocinios corporativos son muy bienvenidos. Ponte en contacto directamente a través de GitHub para soporte empresarial o SLAs personalizados.*

### 👨‍💻 Contribuciones de código
¡Siempre estamos buscando programadores apasionados que quieran contribuir! Ya sea añadir nuevos sondeos (como MySQL/SQLite), ampliar el corpus de pruebas, mejorar el generador de informes HTML o corregir errores, tus pull requests son muy bienvenidas.
- Consulta las [issues abiertas](https://github.com/shaonkabir8/materna/issues) o abre una nueva para debatir ideas.
- Mantén los cambios pequeños, añade una prueba conductual y **no afirmes un resultado que no hayas observado**.

---

## 🤝 Contribuir

Los adaptadores para otros runtimes (MySQL, SQLite), un corpus más amplio y reporteros más completos son bienvenidos. Mantén los cambios pequeños, añade una prueba conductual y **no afirmes un resultado que no hayas observado**.

---

## 📄 Licencia

MIT — consulta [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).
Mantenido por [shaonkabir8](https://github.com/shaonkabir8).
