# Tech: PoseLah

## Stack

- Next.js 16.4.6, App Router (`app/` directory).
- React 19.3.0.
- TypeScript, `strict` mode.
- Tailwind CSS 4.3.3, via `@tailwindcss/turbopack` (Turbopack is the bundler).
- ESLint with `eslint-config-next` core-web-vitals and TypeScript configs.
- Fonts: Geist and Geist Mono via `next/font/google`.

## Next.js 16 is not the Next.js you remember

Per `AGENTS.md`, this Next.js version has breaking changes. Before writing or
modifying Next.js code, read the relevant guide in
`node_modules/next/dist/docs/` (resolved from the repo root) and heed
deprecation notices. Do not rely on memory of older Next.js APIs.

## Conventions

- Path alias: `@/*` maps to the project root. Use it for imports above the
  current file.
- App Router: routes and layouts live under `app/`. `layout.tsx` is the root
  layout; `page.tsx` is the home route; `globals.css` holds Tailwind import and
  theme tokens.
- Client vs server: anything using the camera, browser APIs, or state/effects
  is a client component (`"use client"`). Keep server components as the default.
- Styling: Tailwind utility classes. The design direction is white, minimal,
  and calm — see `product.md`. No emoji anywhere.

## Platform constraints

- The camera (getUserMedia) and the motion sensors only work on HTTPS pages. localhost is exempt. Test on a phone through the deployed Vercel URL.
- Android Chrome: read the compass from the `deviceorientationabsolute` event. Only fall back to `deviceorientation` if the absolute event never fires. Listening to both at once mixes two different references and makes the heading jump.
- iPhone: motion sensors need `DeviceOrientationEvent.requestPermission()`, called from a user tap.
- This is a photography coach for the person holding the phone. Do not add human pose detection, body tracking or extra machine-learning libraries unless the user asks.
- Do not add any third-party service or AI API without the user's approval.

## Secrets and environment

- Never commit API keys or other secrets. Never print, log, or echo them.
- `.env*` files are gitignored and stay ignored. Do not stage, commit, or
  un-ignore them.
- Secrets belong in environment variables, read with the Next.js env handling.
  Prefix only what the browser must see with `NEXT_PUBLIC_`; keep the rest
  server-only. Do not expose server secrets to client bundles.

## Workflow

- Make small changes. One task at a time, the smallest change that satisfies it.
- After each task, run `npm run build` and fix every error before considering
  the task done. Run `npm run lint` as well if it is quick to do so.
- Do not leave the tree in a broken state. If a change is exploratory, keep it
  reversible and scoped.
- No unrequested refactors or features. Recommend follow-ups instead of
  building them.

## Verification and reporting

- Say what was actually verified and what was not. Do not claim a camera or
  motion feature works on a real phone unless it was tested on one.
- Desktop checks do not count as phone verification. Browser DevTools device
  mode does not count as a real phone.
- When finishing, list what is still untested on a real phone (camera
  permission, facing-mode, frame rate, compass, tilt and roll behavior on Android and iPhone
  touch interaction, orientation, etc.).
