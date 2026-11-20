	#!/usr/bin/env bash
# materna v1.0.0 — release prep for Termux
# Run at project root: chmod +x prep.sh && ./prep.sh
set -euo pipefail

# ── colors ────────────────────────────────────────────────
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'
say()  { printf "${B}▶${N} %s\n" "$*"; }
ok()   { printf "${G}✔${N} %s\n" "$*"; }
warn() { printf "${Y}⚠${N} %s\n" "$*"; }
die()  { printf "${R}✖${N} %s\n" "$*" >&2; exit 1; }

FAIL=0
soft() { local n="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else warn "$n FAILED (non-blocking)"; fi; }
hard() { local n="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else printf "${R}✖${N} %s FAILED\n" "$n"; FAIL=1; fi; }

# ── 1. preflight ──────────────────────────────────────────
say "Preflight checks"
[ -f package.json ] || die "package.json not found — run from project root"
command -v node >/dev/null || die "node missing — run: pkg install nodejs"
command -v npm  >/dev/null || die "npm missing — run: pkg install nodejs"
command -v git  >/dev/null || die "git missing — run: pkg install git"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 22 ] || die "Node >=22 required (found $NODE_MAJOR). Run: pkg upgrade nodejs"
ok "Node $(node -v) / npm $(npm -v)"
ok "Project root: $(pwd)"

if [ -f src/cli.js ] && ! head -1 src/cli.js | grep -q '^#!'; then
  warn "src/cli.js has no shebang — CLI will not execute when installed"
  warn "Add as line 1 of src/cli.js:  #!/usr/bin/env node"
fi

# ── 2. backup ─────────────────────────────────────────────
BACKUP=".materna-backup-$(date +%s)"
mkdir -p "$BACKUP"
for f in package.json .gitignore CHANGELOG.md; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done
ok "Backup → $BACKUP/"

# ── 3. write files ────────────────────────────────────────
say "Writing config files"

cat > package.json <<'JSON'
{
  "name": "materna",
  "version": "1.0.0",
  "private": false,
  "description": "Behavioral locale parity probing for Node.js and PostgreSQL",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./cli": {
      "import": { "types": "./dist/cli.d.ts", "default": "./dist/cli.js" },
      "require": { "types": "./dist/cli.d.cts", "default": "./dist/cli.cjs" }
    },
    "./package.json": "./package.json"
  },
  "bin": { "materna": "./dist/cli.js" },
  "files": ["dist", "CHANGELOG.md"],
  "sideEffects": false,
  "repository": { "type": "git", "url": "git+https://github.com/shaonkabir8/materna.git" },
  "homepage": "https://materna.js.org",
  "bugs": { "url": "https://github.com/shaonkabir8/materna/issues" },
  "license": "MIT",
  "author": "Shaon Kabir",
  "keywords": ["collation","locale","i18n","icu","cldr","postgresql","postgres","parity","testing","unicode"],
  "scripts": {
    "build": "tsup",
    "test": "node --test",
    "test:coverage": "node --test --experimental-test-coverage",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "probe:node": "node src/cli.js node",
    "probe:postgres": "node src/cli.js postgres",
    "check:package": "publint && attw --pack",
    "prepublishOnly": "npm run build && npm test && npm run check:package"
  },
  "engines": { "node": ">=22" },
  "dependencies": { "pg": "^8.16.3" },
  "devDependencies": {
    "@arethetypeswrong/cli": "^0.17.0",
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "globals": "^15.0.0",
    "prettier": "^3.0.0",
    "publint": "^0.3.0",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0"
  },
  "publishConfig": { "access": "public", "provenance": true }
}
JSON
ok "package.json"

cat > tsup.config.js <<'JS'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js', 'src/cli.js'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
  treeshake: true,
});
JS
ok "tsup.config.js"

cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.js"],
  "exclude": ["node_modules", "dist"]
}
JSON
ok "tsconfig.json"

cat > eslint.config.js <<'JS'
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
JS
ok "eslint.config.js"

cat > .prettierrc <<'JSON'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
JSON
ok ".prettierrc"

cat > .prettierignore <<'EOF'
dist/
node_modules/
coverage/
package-lock.json
CHANGELOG.md
EOF
ok ".prettierignore"

cat > .gitignore <<'EOF'
node_modules/
dist/
coverage/
*.tgz
.env
.env.*
!.env.example
.DS_Store
.materna-backup-*/
EOF
ok ".gitignore"

DATE=$(date +%Y-%m-%d)
cat > CHANGELOG.md <<EOF
# Changelog

## 1.0.0 — $DATE

### Added
- First stable release.
- Dual ESM/CJS publishing with TypeScript declaration files.
- CLI subcommands \`materna node\` and \`materna postgres\`.

### Stabilized
- Public API surface of \`materna\` (\`src/index.js\`) is now frozen.
- CLI flags and environment variable contract are locked for \`1.x\`.
EOF
ok "CHANGELOG.md"

# ── 4. clean install ──────────────────────────────────────
say "Clean install (this takes a minute on Termux)"
rm -rf node_modules dist package-lock.json
npm install --no-audit --no-fund
ok "npm install complete"

# ── 5. build ──────────────────────────────────────────────
say "Build"
npm run build
ok "build complete"

# ── 6. verify dist artifacts ──────────────────────────────
say "Verify dist/ artifacts"
EXPECTED=(index.js index.cjs index.d.ts index.d.cts cli.js cli.cjs cli.d.ts cli.d.cts)
for f in "${EXPECTED[@]}"; do
  [ -f "dist/$f" ] || die "Missing dist/$f — check tsup output"
done
ok "All 8 expected dist files present"

if compgen -G "dist/*.mjs" >/dev/null; then
  die "Stale .mjs files in dist/ — package.json expects .js"
fi
ok "No stale .mjs files"

if head -1 dist/cli.js 2>/dev/null | grep -q '^#!'; then
  ok "dist/cli.js shebang preserved"
else
  warn "dist/cli.js missing shebang — CLI will not run when installed"
fi

# ── 7. hard gates ─────────────────────────────────────────
say "Hard gates (must pass)"
hard "npm test"           npm test
hard "npm run check:package" npm run check:package

# ── 8. soft gates ─────────────────────────────────────────
say "Soft gates (warn only — may reflect pre-existing code)"
soft "npm run typecheck"    npm run typecheck
soft "npm run lint"         npm run lint
soft "npm run format:check" npm run format:check

# ── 9. smoke tests ────────────────────────────────────────
say "Runtime smoke tests"
hard "ESM import"   node -e "import('./dist/index.js').then(m=>{if(typeof m!=='object')throw new Error('esm broken')})"
hard "CJS require"  node -e "require('./dist/index.cjs')"
hard "CLI executes" node dist/cli.js --help || true   # tolerate missing --help

# ── 10. tarball preview ───────────────────────────────────
say "Tarball preview"
npm pack --dry-run 2>&1 | sed 's/^/    /'

# ── 11. verdict ───────────────────────────────────────────
echo
if [ "$FAIL" -eq 0 ]; then
  printf "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  printf "${G}  ✔ ALL HARD GATES PASSED — READY TO SHIP${N}\n"
  printf "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  cat <<'NEXT'

Next steps (manual — do NOT run in Termux):

  1. Review soft-gate warnings above and fix pre-publish.
  2. Commit and tag:
       git add package.json tsup.config.js tsconfig.json \
               eslint.config.js .prettierrc .prettierignore \
               .gitignore CHANGELOG.md
       git commit -m "chore: v1.0.0 release prep"
       git tag -s v1.0.0 -m "v1.0.0 — first stable release"
       git push && git push --tags

  3. Add .github/workflows/release.yml with:
       permissions:
         contents: write
         id-token: write     # required for provenance

  4. Publish from CI (NOT from Termux — provenance will fail):
       npm publish

NEXT
  exit 0
else
  printf "${R}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  printf "${R}  ✖ HARD GATE FAILURE — DO NOT PUBLISH${N}\n"
  printf "${R}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  printf "\nRoll back any file: cp %s/<file> .\n" "$BACKUP"
  exit 1
fi
