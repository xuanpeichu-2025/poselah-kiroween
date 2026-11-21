# Structure: PoseLah

## Current layout

```
app/
  layout.tsx      Root layout: <html>/<body>, Geist fonts, metadata.
  page.tsx        Home route.
  globals.css     Tailwind import + theme tokens (--background, --foreground).
  favicon.ico
public/           Static assets served at root (next.svg, vercel.svg, ...).
next.config.ts   Turbopack CSS rules + experimental flags. Edit with care.
tsconfig.json    Strict TS, path alias @/* -> project root.
eslint.config.mjs  next core-web-vitals + typescript configs.
package.json     Scripts: dev, build, start, lint.
AGENTS.md        Next.js 16 guidance — read before writing Next.js code.
```

## Where new code goes

- Routes and layouts: new files under `app/` following App Router conventions
  (`app/<route>/page.tsx`, `app/<route>/layout.tsx`).
- Shared components: a `components/` directory at the project root, imported via
  the `@/components/...` alias. Establish it when the first shared component is
  needed; do not pre-create empty folders.
- Client components (camera, motion, interactivity): add `"use client"` at the
  top. Keep data-fetching and static content as server components.
- Hooks and utilities: `lib/` or `hooks/` at the project root, via `@/lib/...`
  and `@/hooks/...`. Add the directory with the first file that needs it.
  - Pure logic (sensor math, scan scoring, shot-mode settings) goes in `lib/` as plain TypeScript functions with no React code, so it can be tested without a phone.
- Static assets: drop files in `public/`.

Keep additions consistent with what is already there. Do not introduce a new
pattern (a second styling approach, a different state library, a new alias)
without reason; if one is needed, note it.

## Files to keep out of git

- `.env*` files stay gitignored. Never stage, commit, or un-ignore them.
- `node_modules/`, `.next/`, `next-env.d.ts`, and build output stay ignored too.

## Files that must stay in git

- `.kiro/` (steering, specs, hooks) is required by the hackathon rules. NEVER add `.kiro` or anything inside it to `.gitignore`.
- `LICENSE` and `README.md` stay in the repo root.

## Build gate

Per `tech.md`, `npm run build` must pass after each task. The tree should not be
left in a failing state between tasks.
