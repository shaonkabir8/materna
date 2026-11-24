# DESIGN.md — Materna Homepage v2

**Status:** 🔒 FROZEN  
**Design source:** https://ua-generator.js.org (also an open-source DropOutLab product)  
**Content source:** https://materna.js.org · https://github.com/shaonkabir8/materna  
**Scope:** `index.html` — the entire marketing + docs landing page  
**Rule:** Design tokens are immutable. Content is the only variable.

---

## 1. Purpose

This document is the **design-system contract** for the Materna homepage.

It records:

1. Exactly which design tokens were inherited from `ua-generator.js.org` and are **frozen**.
2. How each section of the template was **mapped** to Materna content.
3. The **validation checklist** that every future PR must pass to guarantee no design drift.

Any future change to `index.html` that touches a token listed here is a **design-system violation** and must be rejected in review — unless it originates from a coordinated update to `ua-generator.js.org` first.

---

## 2. Design source declaration

| Field | Value |
|-------|-------|
| Template source URL | https://ua-generator.js.org |
| Template source repo | https://github.com/shaonkabir8/user-agents-generator |
| Materna repo | https://github.com/shaonkabir8/materna |
| Materna live site | https://materna.js.org |
| Framework | None — single-file HTML + inline CSS + inline JS |
| External deps | Google Fonts only (Inter + Space Mono), preconnected |

The homepage is a **content-only fork** of the ua-generator template. Section structure, CSS classes, JS behaviors, ARIA wiring, and layout primitives are inherited verbatim.

---

## 3. Frozen design tokens

The following CSS custom properties are declared under `:root` and `html[data-theme="dark"]`. **Do not modify their values.** Only their names may be referenced in new content.

### 3.1 Color — light theme

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#fafafa` | Page background |
| `--bg-elev` | `#ffffff` | Elevated surfaces (cards, terminals, rail) |
| `--fg` | `#0a0a0a` | Primary text, brand-mark background |
| `--fg-muted` | `#525252` | Secondary text |
| `--fg-subtle` | `#a3a3a3` | Tertiary text, metadata, section eyebrows |
| `--border` | `#e5e5e5` | All 1px dividers |
| `--border-strong` | `#d4d4d4` | Input borders, table header rule |
| `--muted` | `#f3f3f5` | Hover surfaces, table headers |
| `--code-bg` | `#f7f7f8` | Inline `<code>` background |
| `--accent` | `#7c5cff` | Brand accent, focus rings, active rail item |
| `--accent-soft` | `rgba(124, 92, 255, .1)` | Accent tint (rail active, palette selected) |
| `--accent-strong` | `#6847ff` | Accent hover |
| `--accent-fg` | `#131313` | Primary button background |
| `--accent-contrast` | `#ffffff` | Primary button text |
| `--success` | `#16a34a` | Success states, "yes" answers, status dot |
| `--danger` | `#dc2626` | Error states, "no" answers |
| `--green` | `#16a34a` | Terminal prompt arrow |
| `--blue` | `#2563eb` | Terminal prompt path |
| `--pink` | `#ec4899` | Brand gradient stop |
| `--brand-a` | `#7c5cff` | Gradient start (eyebrow dot, newsletter badge) |
| `--brand-b` | `#ec4899` | Gradient end |

### 3.2 Color — dark theme

| Token | Value |
|-------|-------|
| `--bg` | `#08080c` |
| `--bg-elev` | `#0f0f15` |
| `--fg` | `#f5f5f7` |
| `--fg-muted` | `#a1a1aa` |
| `--fg-subtle` | `#71717a` |
| `--border` | `#1e1e26` |
| `--border-strong` | `#2e2e38` |
| `--muted` | `#15151c` |
| `--code-bg` | `#0c0c12` |
| `--accent` | `#8b74ff` |
| `--accent-soft` | `rgba(139, 116, 255, .14)` |
| `--accent-strong` | `#a48fff` |
| `--accent-fg` | `#fafafa` |
| `--accent-contrast` | `#131313` |
| `--success` | `#4ade80` |
| `--danger` | `#f87171` |
| `--green` | `#4ade80` |
| `--blue` | `#60a5fa` |
| `--brand-a` | `#8b74ff` |
| `--brand-b` | `#f472b6` |

### 3.3 Typography

| Token | Value |
|-------|-------|
| `--font` | `"Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--mono` | `"Space Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| Base body | `16px` / `line-height: 1.6` |
| Weights loaded | `400`, `500`, `600`, `700` |
| Hero `h1` | `clamp(40px, 6vw, 64px)` / `700` / `-0.035em` |
| Section `h2` | `1.35rem` / `600` / `-0.02em` |
| Section `h3` | `18px` / `600` |
| Eyebrow `.sec-meta` | `0.68rem` / mono / uppercase / `0.08em` |
| Body `.sec-lead` | `0.88rem` / `--fg-muted` |
| Code | `.875em` of parent, mono family |

### 3.4 Spacing & layout

| Token | Value |
|-------|-------|
| `--container` | `1200px` |
| Container gutter | `24px` (mobile `16px`) |
| `--header-h` | `56px` |
| `--rail-w` | `264px` |
| Section vertical rhythm | `margin-bottom: 64px` between sections |
| Hero padding | `96px 24px 80px` (mobile `64px 20px 56px`) |
| Card grid gap | `.6rem` |
| Feature grid | `repeat(2, 1fr)` — collapses to `1fr` under `700px` |
| Contrib grid | `repeat(4, 1fr)` — collapses to `2fr` under `720px` |

### 3.5 Shape

| Token | Value |
|-------|-------|
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |
| Pill radius | `999px` (eyebrow, scroll CTA, status dot) |
| Card radius | `var(--radius-sm)` for `.fcard`; `var(--radius-md)` for `.usage-accordion`, `.faq-group` |
| Newsletter radius | `24px` |

### 3.6 Motion

| Token | Value |
|-------|-------|
| `--transition` | `160ms cubic-bezier(.2, .7, .2, 1)` |
| `--spring` | `520ms cubic-bezier(.16, 1, .3, 1)` |
| Accordion open | `320ms cubic-bezier(.2, .7, .2, 1)` (grid-template-rows) |
| Terminal typing | `26ms` per character |
| FAQ flowchart edge | `500ms` draw + `160ms` dot fade in / `320ms` dot fade out |
| FAQ flowchart node | `480ms` spring scale in |
| Caret blink | `1.06s step-end infinite` |

### 3.7 CTA buttons

All CTAs share one primitive. **Do not introduce new button variants.**

```css
.button {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
}
.button-primary {
  background: var(--accent-fg);
  color: var(--accent-contrast);
}
.button-secondary {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg);
}
```

### 3.8 Shadows

| Surface | Value |
|---------|-------|
| Terminal (light) | `0 1px 2px rgba(0,0,0,.04), 0 16px 40px -20px rgba(124,92,255,.28)` |
| Terminal (dark) | `0 1px 2px rgba(0,0,0,.4), 0 24px 60px -20px rgba(139,116,255,.4)` |
| Newsletter | `0 1px 2px rgba(0,0,0,.04), 0 24px 64px -24px rgba(124,92,255,.22)` |
| Palette dialog | `0 20px 60px -20px rgba(0,0,0,.55)` |

### 3.9 Theme switching

```html
<html lang="en" data-theme="light">   <!-- or data-theme="dark" -->
```

- Persisted to `localStorage` under key `materna-theme`
- Falls back to `prefers-color-scheme: dark` on first visit
- Theme toggle button swaps `data-theme` on the root
- `meta[name="theme-color"]` updates to match (`#fafafa` light / `#08080c` dark)

---

## 4. Component inventory

These components exist in the ua-generator template and are inherited **verbatim** by Materna. Only their internal content changes.

| Component | Class | Notes |
|-----------|-------|-------|
| Header | `.site-header`, `.nav-shell` | Sticky, blurred backdrop, 56px tall |
| Brand mark | `.brand-mark` | Square chip with monogram |
| Terminal | `.terminal`, `.terminal-chrome`, `.pkg-tabs`, `.terminal-body` | Package-manager tabs with roving tabindex |
| Buttons | `.button`, `.button-primary`, `.button-secondary` | 36px tall, 8px radius |
| Feature card | `.fcard`, `.fcard-head` | 2-col grid |
| API table | `.api-table` | 3-col, mono first column |
| Callout | `.callout` | Accent left border |
| Usage accordion | `.usage-accordion`, `.usage-trigger`, `.usage-panel` | One-open-at-a-time, grid-row transition |
| Code canvas | `.canvas`, `.canvas-window`, `.canvas-chrome`, `.canvas-code` | Dark editor window with copy button |
| Contribution grid | `.contrib` | 4-col quick-link cards |
| FAQ accordion | `.faq-group`, `.faq-item`, `.faq-q`, `.faq-a` | Plus-icon rotate on open |
| FAQ flowchart | `.flow-wrap`, `.flow-svg`, `.flow-node`, `.flow-edge` | Inline SVG, drawn node-by-node |
| Rail | `.rail`, `.rail-group`, `.rail-list` | Sticky docs navigation |
| Command palette | `.palette-backdrop`, `.palette`, `.palette-results` | `⌘K` modal |
| Newsletter | `.newsletter`, `.nl-form`, `.nl-input`, `.nl-submit` | Floating label |
| Scroll CTA | `.scroll-cta`, `.scroll-up`, `.scroll-down` | Fixed pill, appears after 400px |
| Footer | `.site-footer`, `.footer-main`, `.footer-col`, `.footer-bottom` | 4-col layout |
| Status dot | `.footer-status-dot` | Pulsing green dot |
| Skip link | `.skip` | Fixed, reveals on focus |
| Section eyebrow | `.sec-meta` | Dot + label |
| Section lead | `.sec-lead` | Muted intro paragraph |

---

## 5. Content mapping (ua-generator → materna)

For each section slot, this records what was replaced. **Only text and `href` targets changed** — never structure or styling.

| Slot | ua-generator | materna |
|------|--------------|---------|
| `<title>` | user-agents-generator — Realistic User-Agent strings | materna — Behavior is the evidence |
| `<meta name="description">` | Dataset-backed UA strings | Behavioral locale parity probing… |
| Canonical URL | ua-generator.js.org | materna.js.org |
| Favicon monogram | `ua` | `M.` |
| Brand name | user-agents-generator | materna |
| Header nav | Features · Usage · API · Hosting | Features · Usage · API · FAQ · Compatibility |
| GitHub star badge | shaonkabir8/user-agents-generator | shaonkabir8/materna |
| npm link | npmjs.com/package/user-agents-generator | npmjs.com/package/materna |
| Hero eyebrow | v2.0.0 · MIT · Node ≥ 20 | v0.1.0 · now on npm · MIT · Node ≥ 22 |
| Hero headline | Realistic User-Agent strings, on demand | Behavior is the evidence |
| Hero lede | UA-string pitch | SHA-256 digest pitch |
| Terminal commands | `bun/npm/pnpm/yarn add user-agents-generator` | `… add materna` |
| Hero primary CTA | Get Started → `#usage` | Get Started → `#usage` |
| Hero secondary CTA | Browse API → `#api-legacy` | Browse the API → `#api-probe-node` |
| Agent copy prompt | UA-generation prompt | probeNode / probePostgres / compareObservations prompt |
| Rail — Getting started | Introduction · Features | Introduction · Features |
| Rail — Examples | Usage | Usage |
| Rail — Reference | Legacy methods · v2 additions · generate() · headers() · Migration | probeNode() · probePostgres() · compareObservations() · FAQ · Compatibility |
| Rail — Community | Discussion forum · Newsletter · Contributing | Community · Newsletter |
| Features section | 8 UA-feature cards | 9 locale-parity cards |
| Usage accordion | 4 items (CJS, ESM, Puppeteer, Fetch) | 2 items (CLI, API) |
| API sections | `#api-legacy`, `#api-v2`, `#api-generate`, `#api-headers` | `#api-probe-node`, `#api-probe-postgres`, `#api-compare` |
| Migration section | v1 → v2 | Compatibility & why materna |
| Community section | Discussions categories | Issues / PRs / Star / Sponsor |
| Newsletter CTA | Join DropOutLab Family | Join the materna family |
| Footer legal | user-agents-generator · DropOutLab · MIT | materna · Shaon Kabir · MIT |
| Footer status | All systems operational | All systems operational |
| `localStorage` theme key | `ua-theme` | `materna-theme` |
| JSON-LD `SoftwareApplication` | user-agents-generator | materna |
| JSON-LD `codeRepository` | …/user-agents-generator | …/materna |

### 5.1 Sections added (not present in ua-generator)

Two slots were added using **existing** component primitives only:

| Section | Primitive reused | Reason |
|---------|------------------|--------|
| **FAQ** (`#faq`) | `.faq-group`, `.faq-q`, `.faq-a` + `.flow-wrap` (`.canvas-window`-adjacent dark card) | Issue #20 requested an FAQ with logic flowcharts; both container styles already existed |
| **Compatibility** (`#compatibility`) | `.table-wrap` + `.api-table` | Issue #20 requested a "Why materna?" comparison table; `.table-wrap` already existed for the migration table |

No new CSS tokens were introduced. No new color, spacing, radius, or typography values were added.

---

## 6. Validation checklist

Every PR that touches `index.html` must pass **all** of the following before merge. Copy this checklist into the PR body and tick each item.

### 6.1 Design tokens

- [ ] `:root` block is byte-identical to `ua-generator.js.org`
- [ ] `html[data-theme="dark"]` block is byte-identical to `ua-generator.js.org`
- [ ] No new CSS custom properties introduced
- [ ] No hard-coded hex colors outside the frozen palette
- [ ] No hard-coded `font-size`, `line-height`, or `letter-spacing` outside the frozen scale
- [ ] No new `box-shadow` values

### 6.2 Component structure

- [ ] Every component listed in §4 renders with its original class names intact
- [ ] No new component primitives introduced without a corresponding `DESIGN.md` update
- [ ] Accordion behaviors, rail scroll-spy, command palette, and terminal tabs work unchanged
- [ ] CTA buttons match `.button` / `.button-primary` / `.button-secondary` exactly

### 6.3 Content

- [ ] All copy matches the README (`README.md` in repo root) and/or the live site at `materna.js.org`
- [ ] No placeholder text (`Lorem ipsum`, `TODO`, `FIXME`) shipped
- [ ] All `href` targets resolve to live URLs or in-page anchors
- [ ] External links have `target="_blank" rel="noopener noreferrer"`

### 6.4 Accessibility

- [ ] Skip-to-content link present and functional
- [ ] All interactive elements have visible `:focus-visible` outlines
- [ ] Every accordion uses `aria-expanded` + `aria-controls`
- [ ] Every `<img>` and decorative SVG is `aria-hidden="true"` or has an `alt`
- [ ] `aria-live` regions present for copy-to-clipboard feedback
- [ ] Palette dialog has `role="dialog" aria-modal="true"` and returns focus on close
- [ ] Lighthouse Accessibility ≥ 95 on desktop and mobile

### 6.5 Motion

- [ ] `prefers-reduced-motion: reduce` disables: terminal typing, caret blink, FAQ flowchart animation, status dot pulse, smooth scroll
- [ ] FAQ flowcharts render fully static under reduced-motion

### 6.6 Theme

- [ ] Toggle persists across reload via `localStorage`
- [ ] First-visit theme respects `prefers-color-scheme`
- [ ] No flashing (`FOUC`) on load — the inline theme script runs before CSS parses
- [ ] `meta[name="theme-color"]` updates on theme switch

### 6.7 Performance

- [ ] No render-blocking external requests beyond Google Fonts (preconnected)
- [ ] No images above the fold (all above-the-fold art is CSS + inline SVG)
- [ ] Lighthouse Performance ≥ 90 on desktop and mobile

---

## 7. Governance

### 7.1 Who can change tokens

Design tokens in §3 are **frozen** at the Materna level. Changing any of them requires:

1. A coordinated PR to `shaonkabir8/user-agents-generator` that changes the same token **first**.
2. That PR landing on `main` and deploying to `ua-generator.js.org`.
3. A **follow-up** PR to `shaonkabir8/materna` that mirrors the change **and** updates this document's §3 tables in the same commit.

Any PR that alters a token without following this process **must be rejected**.

### 7.2 Who can add components

New component primitives (new classes, new layout patterns) require:

1. A corresponding `.canvas` or `.fcard` **reuse** attempt first — prefer composition over creation.
2. An update to §4 of this document if a genuinely new primitive is justified.
3. Review approval from a maintainer.

### 7.3 Content changes

Content changes (copy, URLs, code snippets, API tables) are **unrestricted** and only need to match the source of truth:

- API shapes → `README.md` §API Reference
- Feature list → `README.md` §Feature Highlights
- Quick-start commands → `README.md` §Quick Start
- Legal → `LICENSE` + `package.json`

---

## 8. File manifest

| File | Role |
|------|------|
| `index.html` | The entire homepage — HTML + inline CSS + inline JS. No build step. |
| `DESIGN.md` | This document — the frozen-token contract and content map. |
| `README.md` | Source of truth for all content. |
| `LICENSE` | MIT. Referenced in the footer. |

---

## 9. Versioning

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | Initial release | Single-screen homepage |
| 2.0 | *(this PR)* | Full landing page: hero, features, usage, API, FAQ with flowcharts, compatibility, community, newsletter, footer, command palette, rail nav, scroll CTA |

---

**End of document.**

Any question about whether a change is allowed should resolve to:

> *"Is it a content change? Then yes. Is it a token change? Then no — file a PR on ua-generator first."*
