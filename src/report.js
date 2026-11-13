/**
 * HTML report rendering.
 *
 * The report is a *projection* of a comparison outcome, not a second opinion.
 * Every value on the generated page is read from the comparison outcome or
 * from one of the two observations it was computed from. Nothing is invented:
 *
 *   - the verdict is `outcome.status`, and the document refuses to render if
 *     the outcome is internally inconsistent (a PASS that carries a
 *     first_difference, a DIFFERENCE with no difference, a decided outcome
 *     with no reproducible hashes);
 *   - corpus verification is `outcome.corpus_verified`, reported as its own
 *     fact, never folded into the verdict;
 *   - a quantity this repository does not measure (elapsed time, memory,
 *     wall-clock timestamps, a multi-locale matrix) is printed as *not
 *     measured* together with the reason, because a blank-looking placeholder
 *     reads as a measurement;
 *   - rendering is pure: same inputs produce byte-identical output, no clock,
 *     no randomness, no process id, and the inputs are not mutated.
 *
 * The generated document contains no JavaScript. Untrusted observation content
 * therefore only ever reaches a text node or a double-quoted attribute value,
 * both of which are escaped, and there is no script context to break out of.
 */

import { STATUS } from './compare.js';
import { canonicalJson } from './observation.js';

export const REPORT_SCHEMA = 'materna.report/1';

const STATUS_VALUES = new Set(Object.values(STATUS));
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** How many ordering rows are inlined per side before the list is summarised. */
const MAX_ORDER_ROWS = 48;
/** How many characters of raw JSON are inlined per side. */
const MAX_RAW_CHARS = 12000;

/**
 * Escape a value for a text node or a double-quoted attribute value.
 *
 * `&` first, so the entities introduced below are not escaped twice. Line and
 * paragraph separators are escaped as well: they are valid in HTML text but
 * they terminate a JavaScript string literal, and this output is meant to stay
 * safe if a consumer ever inlines it.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\u2028/g, '&#8232;')
    .replace(/\u2029/g, '&#8233;');
}

function valueOr(value, fallback) {
  if (value === null || value === undefined) {
    return `<span class="absent">${escapeHtml(fallback)}</span>`;
  }
  if (typeof value === 'string' && value.length === 0) {
    return `<span class="absent">${escapeHtml(fallback)}</span>`;
  }
  return escapeHtml(value);
}

function readPath(value, path) {
  return path.split('.').reduce((accumulator, key) => {
    if (accumulator === null || typeof accumulator !== 'object') {
      return undefined;
    }
    return accumulator[key];
  }, value);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Reject an outcome that contradicts itself.
 *
 * This is the guard that keeps the page honest: the renderer is not allowed to
 * present a verdict the outcome did not decide, and it is not allowed to
 * present a decided verdict whose supporting evidence is missing. A doctored or
 * truncated comparison document fails here instead of producing a confident
 * page.
 */
export function assertOutcomeConsistency(outcome) {
  if (!isPlainObject(outcome)) {
    throw new TypeError('report: outcome must be an object');
  }

  const { status } = outcome;
  if (!STATUS_VALUES.has(status)) {
    throw new TypeError(`report: outcome carries no known status (got ${JSON.stringify(status)})`);
  }

  if (typeof outcome.reason !== 'string' || outcome.reason.length === 0) {
    throw new TypeError(`report: ${status} outcome carries no reason`);
  }

  if (status === STATUS.PASS && outcome.first_difference !== undefined && outcome.first_difference !== null) {
    throw new TypeError('report: PASS outcome carries a first_difference, which contradicts PASS');
  }

  if (status === STATUS.DIFFERENCE && !isPlainObject(outcome.first_difference)) {
    throw new TypeError('report: DIFFERENCE outcome carries no first_difference');
  }

  if (status === STATUS.PASS || status === STATUS.DIFFERENCE) {
    if (typeof outcome.corpus_verified !== 'boolean') {
      throw new TypeError(`report: ${status} outcome does not state whether the corpus was verified`);
    }
    const metadata = outcome.metadata;
    if (!isPlainObject(metadata)) {
      throw new TypeError(`report: ${status} outcome carries no comparison metadata`);
    }
    for (const field of ['left_hash', 'right_hash']) {
      if (!SHA256_HEX.test(String(metadata[field]))) {
        throw new TypeError(`report: ${status} outcome carries no reproducible ${field}`);
      }
    }
  }

  return outcome;
}

function declaredCorpus(observation) {
  const corpus = observation?.corpus;
  if (!isPlainObject(corpus)) {
    return null;
  }
  return {
    id: typeof corpus.id === 'string' ? corpus.id : null,
    version: corpus.version === undefined || corpus.version === null ? null : String(corpus.version),
    hash: typeof corpus.hash === 'string' ? corpus.hash : null,
  };
}

function environmentEntries(observation) {
  const environment = observation?.environment;
  if (!isPlainObject(environment)) {
    return null;
  }
  return Object.keys(environment).sort().map((key) => [key, environment[key]]);
}

function sideModel(observation, hashFromOutcome, label) {
  const probe = isPlainObject(observation?.probe) ? observation.probe : {};
  const result = isPlainObject(observation?.result) ? observation.result : {};
  const order = Array.isArray(result.order) ? result.order : null;
  const ties = Array.isArray(result.ties) ? result.ties : null;
  const corpus = declaredCorpus(observation);
  const environment = environmentEntries(observation);

  const resultHash = typeof result.result_hash === 'string' && SHA256_HEX.test(result.result_hash)
    ? result.result_hash
    : (typeof hashFromOutcome === 'string' && SHA256_HEX.test(hashFromOutcome) ? hashFromOutcome : null);

  return {
    label,
    runtime: isPlainObject(observation?.environment) && typeof observation.environment.runtime === 'string'
      ? observation.environment.runtime
      : null,
    locale: typeof probe.locale === 'string' && probe.locale.length > 0 ? probe.locale : null,
    localeResolved: typeof probe.locale_resolved === 'string' && probe.locale_resolved.length > 0 ? probe.locale_resolved : null,
    localeSupported: probe.locale_supported === undefined ? null : probe.locale_supported,
    sensitivity: readPath(observation, 'probe.options.sensitivity') ?? null,
    numeric: readPath(observation, 'probe.options.numeric') ?? null,
    corpus,
    resultHash,
    environment,
    orderLength: order === null ? null : order.length,
    orderRows: order === null ? null : order.slice(0, MAX_ORDER_ROWS),
    orderOmitted: order === null ? 0 : Math.max(0, order.length - MAX_ORDER_ROWS),
    ties,
    tieCount: ties === null ? null : ties.length,
  };
}

/**
 * Turn `{ left, right, outcome }` into a view model.
 *
 * Only two things can leave this function: values copied from the outcome and
 * values copied from the observations. There is no third source.
 */
export function buildReportModel({ left, right, outcome }) {
  assertOutcomeConsistency(outcome);

  const status = outcome.status;
  const corpusVerified = outcome.corpus_verified === true;
  const metadata = isPlainObject(outcome.metadata) ? outcome.metadata : {};

  const leftSide = sideModel(left, metadata.left_hash, 'left');
  const rightSide = sideModel(right, metadata.right_hash, 'right');

  const model = {
    schema: REPORT_SCHEMA,
    status,
    corpus_verified: corpusVerified,
    reason: outcome.reason,
    property: typeof metadata.property === 'string' && metadata.property.length > 0
      ? metadata.property
      : (leftSide.property ?? null),
    corpusLabel: typeof metadata.corpus === 'string' && metadata.corpus.length > 0 ? metadata.corpus : null,
    sides: { left: leftSide, right: rightSide },
    firstDifference: isPlainObject(outcome.first_difference) ? outcome.first_difference : null,
    metadataDifferences: Array.isArray(outcome.metadata_differences) ? outcome.metadata_differences : [],
    incompatible: Array.isArray(outcome.incompatible) ? outcome.incompatible : [],
    missing: isPlainObject(outcome.missing) ? outcome.missing : null,
    invalid: isPlainObject(outcome.invalid) ? outcome.invalid : null,
    unverified: isPlainObject(outcome.unverified) ? outcome.unverified : null,
  };

  // The invariant the page exists for. Both expressions are total functions of
  // the outcome, so this can only fail if the mapping above is changed to
  // disagree with the outcome it was given.
  if (model.status !== outcome.status || model.corpus_verified !== (outcome.corpus_verified === true)) {
    throw new Error('report: rendered status or corpus_verified diverged from the comparison outcome');
  }

  return model;
}

const STATUS_LABEL = Object.freeze({
  PASS: 'Pass',
  DIFFERENCE: 'Difference',
  INCONCLUSIVE: 'Inconclusive',
  ERROR: 'Error',
});

const STATUS_GLOSS = Object.freeze({
  PASS: 'Both observations produced the same normalised result: the same ordering and the same tie structure.',
  DIFFERENCE: 'Both observations are comparable and their normalised results differ. This is a behavioural divergence, not necessarily a defect.',
  INCONCLUSIVE: 'The comparison could not decide: evidence is missing, the documents are not comparable, or a document does not match the corpus it names.',
  ERROR: 'The comparison itself failed. Nothing about the behaviour under test is known from this run.',
});

const CORPUS_GLOSS = Object.freeze({
  verified: 'Both observations were checked against the corpus they name: their orderings are rearrangements of exactly those samples, and their declared corpus version and hash match it.',
  unverified: 'The declared corpus could not be resolved in this checkout, so the orderings were never checked against it. The fingerprints still prove the documents are unedited; they do not prove the experiment happened.',
});

function renderVerdict(model) {
  const corpusVerified = model.corpus_verified;
  return `
<section class="verdict" data-status="${escapeHtml(model.status)}">
  <div class="verdict-head">
    <span class="badge badge-${escapeHtml(model.status.toLowerCase())}">${escapeHtml(STATUS_LABEL[model.status] ?? model.status)}</span>
    <span class="badge badge-corpus" data-corpus-verified="${corpusVerified ? 'true' : 'false'}">corpus ${corpusVerified ? 'verified' : 'not verified'}</span>
  </div>
  <p class="verdict-gloss">${escapeHtml(STATUS_GLOSS[model.status] ?? '')}</p>
  <dl class="pairs">
    <div class="pair"><dt>Outcome status</dt><dd class="mono">${escapeHtml(model.status)}</dd></div>
    <div class="pair"><dt>Reason given by the comparison</dt><dd>${escapeHtml(model.reason)}</dd></div>
    <div class="pair"><dt>Corpus verification</dt><dd>${corpusVerified ? 'verified' : 'not verified'} — ${escapeHtml(CORPUS_GLOSS[corpusVerified ? 'verified' : 'unverified'])}</dd></div>
  </dl>
  <p class="note">Integrity is not authenticity. A matching fingerprint shows a document was not edited after the fact; it does not show that the run it describes ever happened, or that it happened here. Corpus verification is the only check on this page that constrains what the observation actually is, and it is reported separately from the verdict.</p>
</section>`;
}

function renderDeclarations(model) {
  const left = model.sides.left;
  const right = model.sides.right;

  const corpusRows = ['left', 'right'].map((side) => {
    const corpus = model.sides[side].corpus;
    return `<tr><th scope="row">${side} corpus</th><td class="mono">${corpus === null
      ? valueOr(null, 'not recorded')
      : `${valueOr(corpus.id, 'not recorded')}@${valueOr(corpus.version, '?')}<br><span class="dim">hash ${valueOr(corpus.hash, 'not recorded')}</span>`}</td></tr>`;
  }).join('');

  return `
<section class="card">
  <h2>What the observations declare</h2>
  <table class="grid">
    <tbody>
      <tr><th scope="row">Property</th><td class="mono">${valueOr(model.property ?? left.property, 'not recorded')}</td></tr>
      <tr><th scope="row">Locale requested</th><td class="mono">${valueOr(left.locale, 'not recorded')} / ${valueOr(right.locale, 'not recorded')}</td></tr>
      <tr><th scope="row">Locale resolved</th><td class="mono">${valueOr(left.localeResolved, 'not recorded')} / ${valueOr(right.localeResolved, 'not recorded')}</td></tr>
      <tr><th scope="row">Locale supported</th><td class="mono">${left.localeSupported === null ? valueOr(null, 'not recorded') : escapeHtml(String(left.localeSupported))} / ${right.localeSupported === null ? valueOr(null, 'not recorded') : escapeHtml(String(right.localeSupported))}</td></tr>
      <tr><th scope="row">Sensitivity · numeric</th><td class="mono">${valueOr(left.sensitivity, 'not recorded')} · ${valueOr(left.numeric, 'not recorded')} / ${valueOr(right.sensitivity, 'not recorded')} · ${valueOr(right.numeric, 'not recorded')}</td></tr>
      <tr><th scope="row">Corpus compared</th><td class="mono">${valueOr(model.corpusLabel, 'not compared')}</td></tr>
      ${corpusRows}
      <tr><th scope="row">Ordering length</th><td class="mono">${valueOr(left.orderLength, 'not recorded')} / ${valueOr(right.orderLength, 'not recorded')}</td></tr>
      <tr><th scope="row">Tie groups</th><td class="mono">${valueOr(left.tieCount, 'not recorded')} / ${valueOr(right.tieCount, 'not recorded')}</td></tr>
    </tbody>
  </table>
</section>`;
}

function renderEnvironment(model) {
  const column = (side) => {
    const entries = model.sides[side].environment;
    if (entries === null) {
      return `<div class="env-col"><h3>${side}</h3><p class="absent">not recorded — this observation carries no environment block</p></div>`;
    }
    const rows = entries.map(([key, value]) => `<tr><th scope="row" class="mono">${escapeHtml(key)}</th><td class="mono">${escapeHtml(
      typeof value === 'string' ? value : canonicalJson(value),
    )}</td></tr>`).join('');
    return `<div class="env-col"><h3>${side}${model.sides[side].runtime ? ` · ${escapeHtml(model.sides[side].runtime)}` : ''}</h3><table class="grid tight"><tbody>${rows}</tbody></table></div>`;
  };

  return `
<section class="card">
  <h2>Environment recorded by each probe</h2>
  <p class="note">Copied from each observation's own <code>environment</code> block. Differences here are reported as metadata, not as a behavioural result.</p>
  <div class="env-grid">${column('left')}${column('right')}</div>
</section>`;
}

function renderFingerprints(model) {
  const left = model.sides.left.resultHash;
  const right = model.sides.right.resultHash;
  const comparable = left !== null && right !== null;
  const identical = comparable && left === right;

  return `
<section class="card">
  <h2>Result fingerprints</h2>
  <table class="grid">
    <tbody>
      <tr><th scope="row">left result_hash</th><td class="mono">${valueOr(left, 'not recorded')}</td></tr>
      <tr><th scope="row">right result_hash</th><td class="mono">${valueOr(right, 'not recorded')}</td></tr>
      <tr><th scope="row">Fingerprints identical</th><td class="mono">${comparable ? (identical ? 'yes' : 'no') : valueOr(null, 'not comparable — a fingerprint is missing')}</td></tr>
    </tbody>
  </table>
  <p class="note">Each hash is SHA-256 over the canonical JSON of <code>{order, ties}</code>, as recomputed by <code>validateObservation()</code>. A document whose hash does not reproduce is not rendered as evidence.</p>
</section>`;
}

function renderFirstDifference(model) {
  if (model.status !== STATUS.DIFFERENCE) {
    return '';
  }
  const difference = model.firstDifference;
  const position = difference.position === null || difference.position === undefined
    ? 'not positional'
    : String(difference.position);

  return `
<section class="card">
  <h2>First difference</h2>
  <table class="grid">
    <tbody>
      <tr><th scope="row">Kind</th><td class="mono">${valueOr(difference.kind, 'not recorded')}</td></tr>
      <tr><th scope="row">Position</th><td class="mono">${escapeHtml(position)}</td></tr>
      <tr><th scope="row">left</th><td class="mono">${valueOr(typeof difference.left === 'string' ? difference.left : canonicalJson(difference.left), 'not recorded')}</td></tr>
      <tr><th scope="row">right</th><td class="mono">${valueOr(typeof difference.right === 'string' ? difference.right : canonicalJson(difference.right), 'not recorded')}</td></tr>
    </tbody>
  </table>
</section>`;
}

function renderMetadataDifferences(model) {
  const differences = model.metadataDifferences;
  const body = differences.length === 0
    ? `<p class="absent">No environment field differs between the two observations.</p>`
    : `<table class="grid"><thead><tr><th scope="col">field</th><th scope="col">left</th><th scope="col">right</th></tr></thead><tbody>${differences.map((item) => `
        <tr><td class="mono">${valueOr(item?.field, 'not recorded')}</td><td class="mono">${valueOr(
          typeof item?.left === 'string' ? item.left : canonicalJson(item?.left ?? null), 'not recorded',
        )}</td><td class="mono">${valueOr(
          typeof item?.right === 'string' ? item.right : canonicalJson(item?.right ?? null), 'not recorded',
        )}</td></tr>`).join('')}</tbody></table>`;

  return `
<section class="card">
  <h2>Metadata differences</h2>
  <p class="note">A difference in the environment is not a behavioural difference. It is listed so that a reader can see the two runs were not identical in every respect.</p>
  ${body}
</section>`;
}

function renderProblems(model) {
  const sections = [];

  const list = (title, entries, gloss) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return '';
    }
    return `<h3>${escapeHtml(title)}</h3><p class="note">${escapeHtml(gloss)}</p><ul class="problems">${entries
      .map((entry) => `<li class="mono">${valueOr(entry, 'not recorded')}</li>`).join('')}</ul>`;
  };

  if (model.missing !== null) {
    for (const side of ['left', 'right']) {
      sections.push(list(`${side}: missing or malformed evidence`, model.missing[side], 'Required observed evidence was absent or malformed. Nothing was inferred to fill it.'));
    }
  }

  if (model.invalid !== null) {
    for (const side of ['left', 'right']) {
      sections.push(list(`${side}: not what it declares`, model.invalid[side], 'The ordering is not a rearrangement of the corpus the observation names, or the declared corpus version or hash does not match it.'));
    }
  }

  if (model.incompatible.length > 0) {
    sections.push(`<h3>Declarations differ, so the results are not comparable</h3><p class="note">These fields must agree before two fingerprints can be compared at all.</p><table class="grid"><thead><tr><th scope="col">field</th><th scope="col">left</th><th scope="col">right</th></tr></thead><tbody>${model.incompatible
      .map((item) => `<tr><td class="mono">${valueOr(item?.field, 'not recorded')}</td><td class="mono">${valueOr(
        typeof item?.left === 'string' ? item.left : canonicalJson(item?.left ?? null), 'not recorded',
      )}</td><td class="mono">${valueOr(
        typeof item?.right === 'string' ? item.right : canonicalJson(item?.right ?? null), 'not recorded',
      )}</td></tr>`).join('')}</tbody></table>`);
  }

  if (model.unverified !== null) {
    sections.push(list('Corpus verification was required and could not be performed', [model.unverified.left, model.unverified.right].filter((entry) => typeof entry === 'string'), 'The comparison was asked to require corpus verification, and at least one declared corpus was not resolvable.'));
  }

  if (sections.length === 0) {
    return '';
  }

  return `
<section class="card">
  <h2>Why this outcome</h2>
  ${sections.join('\n')}
</section>`;
}

function renderOrdering(model) {
  const column = (side) => {
    const modelSide = model.sides[side];
    if (modelSide.orderRows === null) {
      return `<div class="order-col"><h3>${side}</h3><p class="absent">not recorded — this observation carries no ordering</p></div>`;
    }
    const rows = modelSide.orderRows.map((value, index) => `<li><span class="pos">${String(index).padStart(2, '0')}</span><span class="mono">${escapeHtml(
      typeof value === 'string' ? value : canonicalJson(value),
    )}</span></li>`).join('');
    const omitted = modelSide.orderOmitted > 0
      ? `<p class="note">${escapeHtml(`${modelSide.orderOmitted} further rows are not inlined; the fingerprint covers all ${modelSide.orderLength}.`)}</p>`
      : '';
    const ties = modelSide.ties === null
      ? `<p class="absent">tie structure not recorded</p>`
      : (modelSide.ties.length === 0
        ? `<p class="note">No tie groups: every sample compared as distinct.</p>`
        : `<p class="note">${escapeHtml(`${modelSide.ties.length} tie group(s), members in observed order:`)}</p><ul class="ties">${modelSide.ties
          .map((group) => `<li class="mono">${Array.isArray(group) ? group.map((member) => escapeHtml(member)).join(' · ') : escapeHtml(canonicalJson(group))}</li>`).join('')}</ul>`);

    return `<div class="order-col"><h3>${side}</h3><ol class="order">${rows}</ol>${omitted}${ties}</div>`;
  };

  return `
<section class="card">
  <h2>Observed ordering</h2>
  <p class="note">The evidence the verdict was computed from, as recorded. A tie group is a set of samples the runtime treats as equal; two runtimes that agree on order but not on ties have still diverged.</p>
  <div class="order-grid">${column('left')}${column('right')}</div>
</section>`;
}

function renderNotMeasured() {
  return `
<section class="card">
  <h2>Not measured by this run</h2>
  <p class="note">These quantities are absent from every observation Materna produces. They are listed as unmeasured rather than omitted, because a reader who expects a performance section will otherwise read the silence as a measurement, and because a plausible-looking number is indistinguishable from a real one.</p>
  <table class="grid">
    <tbody>
      <tr><th scope="row">Elapsed time</th><td>not measured — the probes record no timings</td></tr>
      <tr><th scope="row">Peak heap / memory</th><td>not measured — no process memory is sampled</td></tr>
      <tr><th scope="row">Run timestamp</th><td>not recorded — observations carry no clock reading, and this report renders without one so that identical inputs stay byte-identical</td></tr>
      <tr><th scope="row">Locale matrix</th><td>not applicable — one locale is probed per observation; this report covers exactly the two documents named above, not a sweep</td></tr>
      <tr><th scope="row">PII redaction</th><td>not performed — the corpus is fixed sample data; no user content is probed or redacted</td></tr>
    </tbody>
  </table>
</section>`;
}

function renderRaw(observation, label) {
  if (observation === null || observation === undefined) {
    return `<div class="raw-col"><h3>${label}</h3><p class="absent">not supplied</p></div>`;
  }

  let serialised;
  try {
    serialised = JSON.stringify(observation, null, 2) ?? String(observation);
  } catch {
    serialised = '(this observation could not be serialised)';
  }

  const truncated = serialised.length > MAX_RAW_CHARS;
  const shown = truncated ? serialised.slice(0, MAX_RAW_CHARS) : serialised;
  const note = truncated
    ? `<p class="note">${escapeHtml(`${serialised.length - MAX_RAW_CHARS} further characters are not inlined.`)}</p>`
    : '';

  return `<div class="raw-col"><h3>${label}</h3><pre class="raw mono">${escapeHtml(shown)}</pre>${note}</div>`;
}

function renderRawObservations(left, right) {
  return `
<section class="card">
  <h2>Inputs, verbatim</h2>
  <p class="note">The two documents this page was rendered from, so the report can be reproduced without asking anyone what was compared.</p>
  <div class="raw-grid">${renderRaw(left, 'left')}${renderRaw(right, 'right')}</div>
</section>`;
}

const STYLES = `
:root {
  color-scheme: light;
  --bg:#fbfbfd; --surface:#fff; --surface-2:#f5f5f7; --surface-3:#ebebef;
  --text:#1d1d1f; --text-2:#424245; --muted:#6e6e73; --faint:#86868b;
  --border:#d2d2d7; --border-2:#e5e5ea;
  --blue:#0071e3; --blue-soft:#e8f2ff;
  --pass:#30a14e; --pass-bg:#e6f4ea;
  --diff:#c92a2a; --diff-bg:#fff0f0;
  --inc:#6e6e73; --inc-bg:#f0f0f3;
  --err:#8a4b00; --err-bg:#fff4e5;
  --shadow-sm:0 1px 2px rgba(0,0,0,.04);
  --shadow-md:0 4px 16px rgba(0,0,0,.06);
  --radius-sm:8px; --radius-md:14px; --radius-lg:20px;
  --font-sans:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif;
  --font-mono:ui-monospace,"SF Mono",Menlo,"JetBrains Mono",monospace;
  --max:1080px;
}
* { box-sizing: border-box; }
body {
  margin:0; background:var(--bg); color:var(--text);
  font-family:var(--font-sans); font-size:15px; line-height:1.55;
  -webkit-font-smoothing:antialiased;
}
code, .mono { font-family:var(--font-mono); font-size:12.5px; }
.site-header { position:sticky; top:0; z-index:50; background:var(--bg); border-bottom:1px solid var(--border-2); }
.header-inner { max-width:var(--max); margin:0 auto; padding:0 20px; height:52px; display:flex; align-items:center; gap:10px; }
.brand { display:inline-flex; align-items:center; gap:8px; font-weight:700; letter-spacing:-.02em; font-size:15px; }
.brand-mark { width:24px; height:24px; display:grid; place-items:center; background:var(--text); color:var(--bg); border-radius:6px; font-size:13px; font-weight:700; }
.brand-sep { color:var(--faint); font-weight:400; }
.brand-report { color:var(--muted); font-weight:500; font-size:13px; }
main { max-width:var(--max); margin:0 auto; padding:28px 20px 72px; }
.eyebrow { display:inline-flex; align-items:center; gap:7px; font-size:11.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
.eyebrow-dot { width:6px; height:6px; border-radius:50%; background:var(--blue); }
h1 { font-size:34px; line-height:1.15; letter-spacing:-.03em; margin:10px 0 6px; font-weight:700; }
.h1-accent { color:var(--faint); font-weight:400; }
.lede { color:var(--muted); margin:0 0 22px; max-width:70ch; }
.card { background:var(--surface); border:1px solid var(--border-2); border-radius:var(--radius-lg); padding:20px; margin:0 0 16px; box-shadow:var(--shadow-sm); }
.card h2 { font-size:14px; letter-spacing:.01em; margin:0 0 12px; font-weight:650; }
.card h3 { font-size:12.5px; margin:16px 0 6px; color:var(--text-2); font-weight:600; }
.verdict { background:var(--surface); border:1px solid var(--border-2); border-radius:var(--radius-lg); padding:22px; margin:0 0 16px; box-shadow:var(--shadow-md); }
.verdict-head { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.badge { display:inline-flex; align-items:center; padding:4px 11px; border-radius:999px; font-size:12px; font-weight:650; letter-spacing:.01em; background:var(--surface-2); color:var(--text-2); }
.badge-pass { background:var(--pass-bg); color:var(--pass); }
.badge-difference { background:var(--diff-bg); color:var(--diff); }
.badge-inconclusive { background:var(--inc-bg); color:var(--inc); }
.badge-error { background:var(--err-bg); color:var(--err); }
.badge-corpus[data-corpus-verified="true"] { background:var(--pass-bg); color:var(--pass); }
.badge-corpus[data-corpus-verified="false"] { background:var(--err-bg); color:var(--err); }
.verdict-gloss { margin:0 0 14px; color:var(--text-2); max-width:78ch; }
.pairs { margin:0; display:grid; gap:10px; }
.pair { display:grid; grid-template-columns:220px minmax(0,1fr); gap:12px; }
.pair dt { color:var(--muted); font-size:12.5px; }
.pair dd { margin:0; min-width:0; overflow-wrap:anywhere; }
table.grid { width:100%; border-collapse:collapse; }
table.grid th, table.grid td { text-align:left; vertical-align:top; padding:7px 8px; border-bottom:1px solid var(--border-2); overflow-wrap:anywhere; }
table.grid tr:last-child th, table.grid tr:last-child td { border-bottom:none; }
table.grid th[scope="row"] { color:var(--muted); font-weight:500; font-size:12.5px; width:220px; white-space:nowrap; }
table.grid thead th { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--faint); font-weight:600; }
table.grid.tight th, table.grid.tight td { padding:4px 6px; }
table.grid.tight th[scope="row"] { width:auto; }
.note { color:var(--muted); font-size:12.5px; margin:10px 0 0; max-width:82ch; }
.absent { color:var(--faint); font-style:italic; }
.dim { color:var(--faint); font-size:11.5px; }
.env-grid, .order-grid, .raw-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; }
.env-col, .order-col, .raw-col { min-width:0; }
.env-col h3, .order-col h3, .raw-col h3 { margin-top:0; }
ol.order { list-style:none; margin:0; padding:0; border:1px solid var(--border-2); border-radius:var(--radius-sm); overflow:hidden; }
ol.order li { display:flex; gap:10px; padding:3px 10px; font-size:12.5px; }
ol.order li:nth-child(odd) { background:var(--surface-2); }
.pos { color:var(--faint); font-family:var(--font-mono); font-size:11px; min-width:18px; }
ul.ties, ul.problems { margin:6px 0 0; padding-left:18px; }
ul.ties li, ul.problems li { font-size:12.5px; overflow-wrap:anywhere; }
pre.raw { margin:0; padding:12px; background:var(--surface-2); border:1px solid var(--border-2); border-radius:var(--radius-sm); overflow-x:auto; max-height:420px; font-size:11.5px; line-height:1.5; }
footer { max-width:var(--max); margin:0 auto; padding:0 20px 48px; color:var(--faint); font-size:12px; }
@media (max-width:640px) {
  h1 { font-size:26px; }
  .pair { grid-template-columns:1fr; gap:2px; }
  table.grid th[scope="row"] { width:auto; white-space:normal; }
}
`;

/**
 * Render a report document.
 *
 * Returns one self-contained HTML string. Same `left`, `right` and `outcome`
 * produce the same bytes, in any process, on any day.
 */
export function renderReport({ left, right, outcome }) {
  const model = buildReportModel({ left, right, outcome });

  const body = [
    renderVerdict(model),
    renderDeclarations(model),
    renderFirstDifference(model),
    renderMetadataDifferences(model),
    renderProblems(model),
    renderFingerprints(model),
    renderEnvironment(model),
    renderOrdering(model),
    renderNotMeasured(),
    renderRawObservations(left, right),
  ].filter((section) => section.length > 0).join('\n');

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="generator" content="materna report v1 (${escapeHtml(REPORT_SCHEMA)})">
<meta name="description" content="Generated from a Materna comparison outcome. Every figure below is read from the two observations or from the outcome; nothing is inferred.">
<title>Materna · Behavioral report · ${escapeHtml(model.status)}</title>
<style>${STYLES}</style>
</head>
<body data-outcome-status="${escapeHtml(model.status)}" data-corpus-verified="${model.corpus_verified ? 'true' : 'false'}">
<header class="site-header">
  <div class="header-inner">
    <span class="brand"><span class="brand-mark">M</span><span>materna</span><span class="brand-sep">/</span><span class="brand-report">Behavioral report</span></span>
  </div>
</header>
<main>
  <div class="eyebrow"><span class="eyebrow-dot"></span><span>Generated report</span></div>
  <h1>Node.js <span class="h1-accent">×</span> PostgreSQL</h1>
  <p class="lede">A projection of one comparison outcome over two observations. Reproduce it with <code>materna report --left &lt;left.json&gt; --right &lt;right.json&gt;</code>; identical inputs produce identical bytes.</p>
${body}
</main>
<footer>
  <p>Rendered by <code>materna report</code> (${escapeHtml(REPORT_SCHEMA)}). This document contains no scripts and makes no network requests: it is a static projection of the inputs inlined at the bottom of the page.</p>
</footer>
</body>
</html>
`;
}
