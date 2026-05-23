# Shopify Theme — Claude Code Guidelines

## Project

- **Store**: `rangtarini.myshopify.com` | **Theme**: Dawn (15.4.1)
- **Stack**: Liquid, vanilla CSS, vanilla ES6+ (no build step, no frameworks)
- **Workflow**: Edit files in this GitHub repo only. Never run `shopify theme push` or touch store theme files directly.

---

## How to Work

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask — don't guess silently.
- If multiple interpretations exist, present them. Don't pick one without saying so.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop and name what's confusing.

### 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No unrequested features, abstractions, flexibility, or defensive error handling.
- If you write 200 lines and it could be 50, rewrite it.
- Ask: *"Would a senior engineer call this overcomplicated?"* If yes, simplify.

### 3. Surgical Changes
- Touch only what the request requires. Don't improve adjacent code or reformat.
- Match existing style even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that **your** changes made unused. Leave pre-existing dead code alone.
- Every changed line should trace directly to the request.

### 4. Goal-Driven Execution
- Transform tasks into verifiable goals: *"Add validation"* → *"Write tests for invalid inputs, then make them pass"*
- For multi-step tasks, state a brief plan upfront:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  ```

---

## MCP (Connected — Use It)

MCP is the source of truth. Use it before writing, not after.

- **Before any GraphQL**: call `introspect_admin_schema` — never guess field names
- **Before referencing any Shopify API/filter**: call `search_docs_chunks`
- **Before proposing GraphQL**: call `validate_graphql_codeblocks`
- MCP can write live store data — every write is irreversible. Confirm before executing.
- Bulk ops (>5 objects): dry-run first. Rate limit: ~1,000 cost points/min.

---

## Project Structure

```
assets/      CSS, JS, static files
config/      settings_schema.json + settings_data.json (never overwrite without pulling first)
layout/      theme.liquid (keep lean), password.liquid
locales/     en.default.json is source of truth
sections/    OS 2.0 sections
snippets/    Reusable Liquid partials
templates/   JSON templates only
```

`.gitignore` must include: `config/settings_data.json`, `node_modules/`, `.env`, `.DS_Store`

---

## Liquid

- `{% render %}` only — never `{% include %}` (deprecated, leaks scope)
- Logic in snippets, not templates. Max 3 nesting levels.
- Whitespace control in loops: `{%- -%}` / `{{- -}}`
- Always null-check metafields; always provide fallbacks: `{{ x | default: 'y' }}`
- Never output raw user data without `escape` or `strip_html`

---

## Sections & Schema

- All merchant-editable content → section/block with `{% schema %}`. Never hardcode copy.
- Sections must be self-contained and re-renderable in isolation (Section Rendering API).
- Include `presets`, `name`, `class` in every schema. Malformed schema JSON silently breaks the Theme Editor — validate it.
- App block support: add `{ "type": "@app" }` to the `blocks` array.
- Metafields: read-only in theme. No writing from Liquid or JS. Document all custom namespaces/keys in `README.md`.

---

## JS, CSS & Performance

**JS**: Web Components for interactive UI (Dawn's pattern). No jQuery/frameworks. No global scope pollution (`window.Rangtarini = ...`). `addEventListener` only. `try/catch` on all fetch/Cart API calls.

**CSS**: Custom properties for all tokens. No `!important`. BEM-like scoping. No inline styles except dynamic CSS variables.

**Performance**: `image_url` filter with `width` always (never raw CDN URLs). `loading="lazy"` below fold. `fetchpriority="high"` above fold. Defer non-critical JS. Target Lighthouse ≥ 80 mobile.

**A11y**: All strings via `{{ 'key' | t }}`. Semantic HTML. Every input has a `<label>`. Modals trap focus + close on `Escape`. WCAG 2.1 AA minimum.

---

## Never Do

- Edit store theme files directly or run `shopify theme push`
- Use `{% include %}` in new code
- Hardcode English strings in templates
- Use raw CDN image URLs (bypass `image_url`)
- Write metafields from Liquid or JS
- Write GraphQL without MCP schema validation
- Run bulk MCP store operations without a dry-run

---

## Store Context

- Custom CSS overrides in `assets/`; Meta Ads pixel + GA in `layout/theme.liquid` — don't duplicate in sections
- Products use `custom` namespace metafields for materials, care instructions, dimensions — verify keys in `README.md`
- Collections are hand-curated (manual, not smart rules)

---