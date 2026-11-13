#!/usr/bin/env node
/**
 * Materna CLI.
 *
 *   materna node                     probe Node.js collation
 *   materna postgres                 probe PostgreSQL collation
 *   materna compare --left A --right B   compare two observation files
 *   materna report --left A --right B    render that comparison as HTML
 *
 * Exit codes are a contract, see docs/README.md.
 *
 * Options are validated per subcommand. An unknown or malformed option is a
 * caller error and exits 3: an ignored option is worse than a rejected one,
 * because the resulting observation looks like it was produced with settings
 * that were never applied.
 */

import { readFileSync } from 'node:fs';
import { probeNode } from './probe.js';
import { compareObservations, STATUS } from './compare.js';
import { validateObservation } from './observation.js';

const EXIT = Object.freeze({
  PASS: 0,
  DIFFERENCE: 1,
  INCONCLUSIVE: 2,
  ERROR: 3,
});

// A closed consumer (for example `materna node | head`) is not an error: it
// must not surface as an unhandled EPIPE crash with a stack trace.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error) => {
    if (error && error.code === 'EPIPE') {
      process.exit(EXIT.PASS);
    }
  });
}

const USAGE = `materna — behavioral locale parity probing

Usage:
  materna node                        Probe Node.js collation and print the observation
  materna postgres                    Probe PostgreSQL collation and print the observation
  materna compare --left <path> --right <path>
                                      Compare two observation documents (use "-" for stdin)

Options for node/postgres:
  --locale <tag>        Locale to probe (default: de-DE)
  --sensitivity <level> base | accent | case | variant (default: variant)
  --numeric <bool>      true | false (default: false)
  --corpus <id>         Corpus id (default: collation-core-v1)
  --json                Print the raw observation JSON only

Options for postgres only:
  --collation <name>    PostgreSQL collation to order by, e.g. en-US-x-icu, C, de_DE.
                        Resolved against pg_collation; an unknown name is an error.

Options for report:
  --out <path>          Write the HTML document to <path> (default: stdout)
  --json                Print the comparison outcome JSON instead of HTML

Environment:
  DATABASE_URL          PostgreSQL connection string
  PG_COLLATION          Default for --collation

Exit codes:
  0 PASS   1 DIFFERENCE   2 INCONCLUSIVE   3 ERROR
`;

const SENSITIVITIES = new Set(['base', 'accent', 'case', 'variant']);

const COMMON_OPTIONS = ['locale', 'sensitivity', 'numeric', 'corpus', 'json'];

const OPTIONS = Object.freeze({
  node: new Set(COMMON_OPTIONS),
  postgres: new Set([...COMMON_OPTIONS, 'collation']),
  compare: new Set(['left', 'right', 'json']),
  report: new Set(['left', 'right', 'out', 'json']),
});

const BOOLEAN_OPTIONS = new Set(['json']);

/**
 * Parse `--key value` and `--key=value`. A flag with no value is only legal
 * for declared booleans.
 */
function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`unexpected argument: ${token}`);
    }

    const body = token.slice(2);
    const separator = body.indexOf('=');
    const key = separator === -1 ? body : body.slice(0, separator);

    if (key.length === 0) {
      throw new Error('empty option name');
    }
    if (Object.hasOwn(flags, key) || Object.hasOwn(flags, key)) {
      throw new Error(`--${key} was given more than once`);
    }

    if (separator !== -1) {
      flags[key] = body.slice(separator + 1);
      continue;
    }

    if (key === 'json') {
      flags.json = true;
      continue;
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`--${key} requires a value`);
    }
    flags[key] = value;
    index += 1;
  }
  return flags;
}

/**
 * Reject options the subcommand does not implement, and reject values it
 * cannot honour. Both are reported before any work is done.
 */
export function validateFlags(flags, command) {
  const allowed = OPTIONS[command];
  if (!allowed) {
    throw new Error(`unknown command: ${command}`);
  }

  for (const key of Object.keys(flags)) {
    if (!allowed.has(key)) {
      const hint = key === 'collation' ? ' (--collation applies to "postgres" only)' : '';
      throw new Error(`unknown option --${key} for "materna ${command}"${hint}`);
    }
    if (BOOLEAN_OPTIONS.has(key) && flags[key] !== true) {
      throw new Error(`--${key} does not take a value`);
    }
  }

  if (flags.sensitivity !== undefined && !SENSITIVITIES.has(flags.sensitivity)) {
    throw new Error(`--sensitivity must be one of: ${[...SENSITIVITIES].join(', ')}`);
  }
  if (flags.numeric !== undefined && flags.numeric !== 'true' && flags.numeric !== 'false') {
    throw new Error('--numeric must be "true" or "false"');
  }
  if (flags.locale !== undefined && flags.locale.length === 0) {
    throw new Error('--locale must not be empty');
  }
  if (flags.corpus !== undefined && flags.corpus.length === 0) {
    throw new Error('--corpus must not be empty');
  }
  if (flags.collation !== undefined && flags.collation.length === 0) {
    throw new Error('--collation must not be empty');
  }
  if (flags.out !== undefined && flags.out.length === 0) {
    throw new Error('--out must not be empty');
  }

  return flags;
}

function readInput(path, label) {
  if (path === '-') {
    return readFileSync(0, 'utf8');
  }
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    const hint = error && error.code === 'ENOENT' ? 'file not found' : 'file could not be read';
    throw new Error(`${label}: ${hint} (${path})`);
  }
}

function parseObservation(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: malformed JSON`);
  }
}

function probeOptions(flags) {
  return {
    locale: flags.locale ?? undefined,
    sensitivity: flags.sensitivity ?? undefined,
    numeric: flags.numeric === undefined ? undefined : flags.numeric === 'true',
    ...(flags.corpus ? { corpusId: flags.corpus } : {}),
  };
}

async function corpusOption(flags) {
  if (!flags.corpus) {
    return undefined;
  }
  const { loadCorpus } = await import('./corpus.js');
  return loadCorpus(flags.corpus);
}

function printObservation(observation, options) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
    return;
  }

  const { probe, corpus, environment, result } = observation;
  process.stdout.write(`observation ${observation.schema}\n`);
  process.stdout.write(`  probe       ${probe.property} v${probe.version}\n`);
  process.stdout.write(`  locale      ${probe.locale}${probe.locale_supported === false ? ' (NOT SUPPORTED — fell back to ' + probe.locale_resolved + ')' : ''}\n`);
  process.stdout.write(`  options     sensitivity=${probe.options.sensitivity} numeric=${probe.options.numeric}\n`);
  process.stdout.write(`  corpus      ${corpus.id}@${corpus.version} ${corpus.hash.slice(0, 12)}…\n`);
  if (environment.collation_source) {
    process.stdout.write(`  collation   ${environment.collation_name ?? '(unknown)'} (${environment.collation_source})\n`);
  }
  process.stdout.write(`  environment ${Object.entries(environment).map(([key, value]) => `${key}=${value}`).join(' ')}\n`);
  process.stdout.write('  order\n');
  result.order.forEach((value, index) => {
    process.stdout.write(`    ${String(index).padStart(2, ' ')}  ${JSON.stringify(value)}\n`);
  });
  if (result.ties.length > 0) {
    process.stdout.write(`  ties        ${JSON.stringify(result.ties)}\n`);
  }
  process.stdout.write(`  result_hash ${result.result_hash}\n`);
  process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
}

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(USAGE);
    return command ? EXIT.PASS : EXIT.ERROR;
  }

  if (!OPTIONS[command]) {
    process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
    return EXIT.ERROR;
  }

  let flags;
  try {
    flags = validateFlags(parseFlags(rest), command);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return EXIT.ERROR;
  }

  if (command === 'node') {
    const observation = probeNode({
      ...probeOptions(flags),
      corpus: await corpusOption(flags),
    });
    printObservation(observation, flags);
    if (observation.probe.locale_supported === false) {
      process.stderr.write(`warning: locale ${observation.probe.locale} is not supported; observed ordering came from ${observation.probe.locale_resolved}\n`);
      return EXIT.INCONCLUSIVE;
    }
    return EXIT.PASS;
  }

  if (command === 'postgres') {
    const { probePostgres } = await import('./adapters/postgres.js');
    const observation = await probePostgres({
      ...probeOptions(flags),
      corpus: await corpusOption(flags),
      ...(flags.collation === undefined ? {} : { collation: flags.collation }),
    });
    printObservation(observation, flags);
    if (observation.probe.locale_supported === false) {
      process.stderr.write('warning: the requested collation was not applied\n');
      return EXIT.INCONCLUSIVE;
    }
    return EXIT.PASS;
  }

  // command === 'compare' or 'report'
  if (!flags.left || !flags.right) {
    process.stderr.write(`${command} requires --left <path> and --right <path>\n`);
    return EXIT.ERROR;
  }

  let left;
  let right;
  try {
    left = parseObservation(readInput(flags.left, 'left'), 'left');
    right = parseObservation(readInput(flags.right, 'right'), 'right');
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    // Documented contract: unreadable OR malformed input is ERROR (3).
    // INCONCLUSIVE is reserved for documents that parsed but cannot be trusted.
    return EXIT.ERROR;
  }

  const outcome = compareObservations(left, right);

  if (command === 'report') {
    if (flags.json) {
      process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
      return EXIT[outcome.status] ?? EXIT.ERROR;
    }

    // The renderer is the only presenter: it refuses an outcome that
    // contradicts itself rather than drawing a confident page from it.
    const { renderReport } = await import('./report.js');
    const html = renderReport({ left, right, outcome });

    if (flags.out === undefined) {
      process.stdout.write(html);
    } else {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(flags.out, html, 'utf8');
      process.stderr.write(`report written to ${flags.out} (${outcome.status})\n`);
    }
    return EXIT[outcome.status] ?? EXIT.ERROR;
  }

  if (flags.json) {
    process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
  } else {
    process.stdout.write(`${outcome.status}\n`);
    process.stdout.write(`  ${outcome.reason}\n`);
    if (outcome.metadata) {
      process.stdout.write(`  left  ${outcome.metadata.left_hash.slice(0, 12)}…  ${Object.values(left.environment ?? {}).slice(0, 4).join(' ')}\n`);
      process.stdout.write(`  right ${outcome.metadata.right_hash.slice(0, 12)}…  ${Object.values(right.environment ?? {}).slice(0, 4).join(' ')}\n`);
    }
    if (outcome.corpus_verified === false) {
      process.stdout.write('  corpus: NOT verified against a corpus in this repository\n');
    }
    if (outcome.first_difference) {
      const diff = outcome.first_difference;
      process.stdout.write(`  first difference: ${diff.kind} at position ${diff.position}\n`);
      process.stdout.write(`    left  ${JSON.stringify(diff.left)}\n`);
      process.stdout.write(`    right ${JSON.stringify(diff.right)}\n`);
    }
    if (outcome.missing) {
      process.stdout.write(`  missing left:  ${outcome.missing.left.join(', ') || 'none'}\n`);
      process.stdout.write(`  missing right: ${outcome.missing.right.join(', ') || 'none'}\n`);
    }
    if (outcome.invalid) {
      for (const side of ['left', 'right']) {
        for (const problem of outcome.invalid[side]) {
          process.stdout.write(`  invalid ${side}: ${problem}\n`);
        }
      }
    }
    if (outcome.incompatible) {
      for (const item of outcome.incompatible) {
        process.stdout.write(`  incomparable ${item.field}: ${JSON.stringify(item.left)} vs ${JSON.stringify(item.right)}\n`);
      }
    }
    if (outcome.metadata_differences && outcome.metadata_differences.length > 0) {
      process.stdout.write('  metadata only (not behavioral):\n');
      for (const item of outcome.metadata_differences) {
        process.stdout.write(`    ${item.field}: ${JSON.stringify(item.left)} vs ${JSON.stringify(item.right)}\n`);
      }
    }
  }

  return EXIT[outcome.status] ?? EXIT.ERROR;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`error: ${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = EXIT.ERROR;
  });

export { EXIT, USAGE, parseFlags, validateObservation, STATUS };
