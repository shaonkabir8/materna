#!/usr/bin/env node
/**
 * Materna CLI.
 *
 *   materna node                     probe Node.js collation
 *   materna postgres                 probe PostgreSQL collation
 *   materna compare --left A --right B   compare two observation files
 *
 * Exit codes are a contract, see docs/README.md.
 */

import { readFileSync } from 'node:fs';
import { probeNode } from './probe.js';
import { compareObservations, STATUS } from './compare.js';
import { validateObservation } from './observation.js';

// A closed consumer (for example `materna node | head`) is not an error: it
// must not surface as an unhandled EPIPE crash with a stack trace.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error) => {
    if (error && error.code === 'EPIPE') {
      process.exit(EXIT.PASS);
    }
  });
}

const EXIT = Object.freeze({
  PASS: 0,
  DIFFERENCE: 1,
  INCONCLUSIVE: 2,
  ERROR: 3,
});

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

Environment:
  DATABASE_URL          PostgreSQL connection string
  PG_COLLATION          Optional PostgreSQL collation name to force in ORDER BY

Exit codes:
  0 PASS   1 DIFFERENCE   2 INCONCLUSIVE   3 ERROR
`;

function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`unexpected argument: ${token}`);
    }
    const key = token.slice(2);
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
    return command ? 0 : EXIT.ERROR;
  }

  const flags = parseFlags(rest);

  if (command === 'node') {
    const observation = probeNode({
      locale: flags.locale ?? undefined,
      sensitivity: flags.sensitivity ?? undefined,
      numeric: flags.numeric === undefined ? undefined : flags.numeric === 'true',
      corpus: flags.corpus ? (await import('./corpus.js')).loadCorpus(flags.corpus) : undefined,
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
      locale: flags.locale ?? undefined,
      sensitivity: flags.sensitivity ?? undefined,
      numeric: flags.numeric === undefined ? undefined : flags.numeric === 'true',
      corpus: flags.corpus ? (await import('./corpus.js')).loadCorpus(flags.corpus) : undefined,
    });
    printObservation(observation, flags);
    return EXIT.PASS;
  }

  if (command === 'compare') {
    if (!flags.left || !flags.right) {
      process.stderr.write('compare requires --left <path> and --right <path>\n');
      return EXIT.ERROR;
    }

    let left;
    let right;
    try {
      left = parseObservation(readInput(flags.left, 'left'), 'left');
      right = parseObservation(readInput(flags.right, 'right'), 'right');
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      return error.message.includes('malformed JSON') ? EXIT.ERROR : EXIT.INCONCLUSIVE;
    }

    const outcome = compareObservations(left, right);

    if (flags.json) {
      process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
    } else {
      process.stdout.write(`${outcome.status}\n`);
      process.stdout.write(`  ${outcome.reason}\n`);
      if (outcome.metadata) {
        process.stdout.write(`  left  ${outcome.metadata.left_hash.slice(0, 12)}…  ${Object.values(left.environment ?? {}).slice(0, 4).join(' ')}\n`);
        process.stdout.write(`  right ${outcome.metadata.right_hash.slice(0, 12)}…  ${Object.values(right.environment ?? {}).slice(0, 4).join(' ')}\n`);
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

  process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
  return EXIT.ERROR;
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
