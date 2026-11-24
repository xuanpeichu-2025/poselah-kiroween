# PoseLah v1 — Design

PoseLah is a portrait photography assistant: scene first (scan, spot, angle,
tilt, framing), then optionally ask the AI Coach for pose and composition advice.

Implements `.kiro/specs/poselah-v1/spec.md`. Core (FR-1–FR-10) is client-side;
Tier 2 (FR-11–FR-17) is the optional, cuttable AI Coach that sends one downscaled
frame to Google's AI after consent. Core stays no-upload and no network. Follow
`tech.md`: Next.js 16 has breaking changes, so read the relevant guide in
`node_modules/next/dist/docs/` before writing framework code.

## Architecture: pure core, impure shell

- `lib/` holds all decision logic as plain TypeScript with no React and no DOM.
  It is unit-tested with property based tests.
- Browser and React code (camera, sensors, canvas, UI) lives in `hooks/`,
  `components/`, and `app/`. It calls into `lib/` for every calculation.
- The boundary is narrow and explicit: impure code produces plain data (pixel
  arrays, sensor readings, dimensions); `lib/` turns that into scores, slices,
  crops, and guidance deltas.

## File breakdown

### `lib/` (pure, no React, no DOM, property-tested)

| File | Responsibility | Key exports |
| --- | --- | --- |
| `lib/heading.ts` | Orientation, angular math, smoothing | see "Sensor math" below |
| `lib/slices.ts` | 12-slice mapping + coverage | `SLICE_COUNT=12`, `SLICE_DEG=30`, `sliceIndex(heading)`, `sliceCenter(i)`, `Coverage` with `markSlice`, `coveredCount`, `isComplete` (≥11), `canStop` (≥3) |
| `lib/crop.ts` | Viewfinder crop math | `coverCrop(srcW, srcH, targetAspect)` → `{sx, sy, sw, sh}` |
| `lib/modes.ts` | Mode settings (data) | `ModeId`, `Camera`, `Mode`, `MODES` record |
| `lib/outline.ts` | Static outline geometry + safe area (data) | `OutlineId`, `Outline`, `OUTLINES`, `SAFE_BOTTOM` |
| `lib/poses.ts` | Pose library: ≤6 poses per mode (data) | `POSES` (per mode, `[{ id, label, outline, tip }]`), `defaultPoseId(mode)`, `isValidPoseId(mode, id)` |
| `lib/regions.ts` | Region masks from frame dims + mode | `outerStrips`, `centerRect`, `ovalMask` → index lists |
| `lib/metrics.ts` | Pixel array → metrics | `FrameMetrics`, `computeMetrics(pixels, regions)` |
| `lib/scoring.ts` | Metrics + mode → score | `TUNING`, `scoreSlice(metrics, profile)` |
| `lib/vignette.ts` | Spooky vignette params (data) | `vignetteParams(mode)` → `{innerRadius, outerRadius, strength}` or `null` |
| `lib/downscale.ts` | Downscale dimension math (pure) | `computeDownscaleDimensions(srcW, srcH, maxSide=768)` → `{dw, dh}` |
| `lib/ratelimit.ts` | Rate-limit decision (pure) | `allow(store, key, now, limits)` → boolean |
| `lib/coach.ts` | Validate model JSON (pure) | `CoachAdvice`, `validateCoachJSON(obj, mode)` |

### `hooks/` (impure browser wiring, React)

| File | Responsibility |
| --- | --- |
| `hooks/useCamera.ts` | `getUserMedia` up to 1920x1080, `facingMode`, front/back toggle, negotiated resolution for the debug readout, release on hide/unmount, permission state |
| `hooks/useDeviceOrientation.ts` | Sensor listeners (Android absolute-first rule, iPhone permission tap), derives heading/tilt/roll via `lib/heading.ts`, smooths, throttles UI updates to ~25 Hz, keeps raw values in refs. The `deviceorientation` fallback timer starts only after motion permission is granted or the first event arrives. |
| `hooks/useScan.ts` | Scan state machine: sample the cover-crop area downscaled to ~64px, ≤5 Hz, `willReadFrequently`; `computeMetrics` → `scoreSlice`; auto-finish at 11/12, manual stop ≥3; best score per slice → target; clears on mode/camera change |
| `hooks/useGallery.ts` | Blob URLs, most-recent-8, revoke oldest, Save (download + open fallback) |
| `hooks/useCapture.ts` | Render the saved photo from the raw video frame (cover crop, mirror for front, bake Spooky vignette) → blob URL |

### `components/` (React UI, all `"use client"`)

| File | Responsibility |
| --- | --- |
| `components/CoachView.tsx` | Top-level orchestrator: mode, camera, target, scan, theme; wires the hooks |
| `components/CameraView.tsx` | `<video>` cover-fit, mirrored front preview, resolution debug readout |
| `components/overlays/HeadingArrows.tsx` | Left/right edge arrows (flipped for front camera) |
| `components/overlays/TiltArrows.tsx` | Top/bottom edge arrows |
| `components/overlays/LevelLine.tsx` | Horizon line, solid within 1.5° |
| `components/overlays/ModeOutline.tsx` | Dashed white silhouette + selfie oval + one-line pose tip; ghostly in Spooky; fits above `SAFE_BOTTOM`; renders the chosen pose from `lib/poses.ts` |
| `components/overlays/ScanRing.tsx` | Slice coverage ring during scan |
| `components/overlays/ReadyState.tsx` | Calm ready indicator (slow flicker in Spooky) |
| `components/overlays/SpookyFog.tsx` | Soft fog gradient at screen edges (Spooky only) |
| `components/ModeSwitcher.tsx` | The four modes |
| `components/CaptureButton.tsx` | Capture action |
| `components/Gallery.tsx`, `components/GalleryPhoto.tsx` | Session gallery, Save (download + open fallback) |
| `components/StatusMessage.tsx` | FR-10 copy + the iPhone motion-permission tap button |
| `components/AICoach.tsx` | Coach button + Photo goal box + first-use consent; captures+downscales one frame, POSTs to `/api/coach`, handles failure UX (Tier 2) |
| `components/CoachPanel.tsx` | Advice panel + Close, theme-aware, Spooky voice (Tier 2) |
| `components/ShowSubject.tsx` | Full-screen outline + pose tip, no camera; hidden in Selfie (Tier 2) |

### `app/`

- `app/page.tsx` — server shell that renders `<CoachView />`.
- `app/layout.tsx` — root layout, fonts, metadata (update title/description).
- `app/globals.css` — Tailwind import + theme tokens for normal and Spooky.
- `app/api/coach/route.ts` — Tier 2 coach route (server-only; receives one downscaled frame).

## Sensor math (`lib/heading.ts`)

All functions are pure and property-tested. **All public functions take
degrees; conversion to radians happens inside the functions.** Angle property
tests compare with a tolerance of about `1e-9`, not exact equality, because of
floating point.

- `headingFromOrientation(alpha, beta, gamma)` — direction the BACK of the phone
  points. Inputs are degrees; converted to radians internally. With a, b, g the
  radian forms:
  ```
  rA = -cos(a)*sin(g) - sin(a)*sin(b)*cos(g)
  rB = -sin(a)*sin(g) + cos(a)*sin(b)*cos(g)
  heading = (degrees(atan2(rA, rB)) + 360) % 360
  ```
  Do not use alpha alone (it breaks when the phone is upright).
- `tiltFromBeta(beta) = beta - 90` (degrees in and out; positive = camera looks
  up).
- `rollFromOrientation(beta, gamma)` — degrees in; converted to radians
  internally:
  ```
  roll = ROLL_SIGN * degrees(asin(clamp(-sin(g)*cos(b), -1, 1)))
  ```
  `ROLL_SIGN` is a constant, default `1`; the sign is unverified on a device.
- `headingDelta(from, to)` — shortest signed difference in `[-180, 180]`.
- `shortestTurn(from, to)` — `0` when `from === to` (same math as
  `headingDelta`).
- `headingWithinTolerance(value, target, tol)` — circular, via
  `headingDelta`: `abs(headingDelta(value, target)) <= tol`. Used for heading
  so 359 and 1 are 2 degrees apart.
- `withinTolerance(value, target, tol)` — plain `abs(value - target) <= tol`,
  used for tilt and level.
- `orientForCamera(heading, tilt, camera)` — the front camera faces the
  opposite direction. Front: `{ heading: (heading + 180) % 360, tilt: -tilt }`;
  back: unchanged. Do not use `360 - heading`. Mirroring is separate: the
  component flips left/right arrows for the front camera because the preview is
  mirrored; that is not part of this function.
- `smoothAngle(prev, next, factor)` — circular low-pass for heading:
  `delta = headingDelta(prev, next); return (prev + factor * delta + 360) % 360`.
  Output always in `[0, 360)`. Averaging 359 and 1 gives about 0, not 180.
- `smooth(prev, next, factor)` — linear low-pass for tilt and roll:
  `prev + factor * (next - prev)`.

Property tests for all of the above: output ranges (`headingFromOrientation` and
`smoothAngle` in `[0, 360)`; `rollFromOrientation` in `[-90, 90]`); wraparound
(`smoothAngle(359, 1, 0.5) ≈ 0`, within tolerance); equal inputs give no change
(`smoothAngle(x, x, f)` ≈ `x % 360`, `smooth(x, x, f)` ≈ `x`), all within the
`1e-9` tolerance.

### `lib/slices.ts`

- `sliceIndex(heading) = floor(((heading % 360) + 360) % 360 / 30)` → `0..11`.
- `Coverage` is a pure record of 12 booleans; `isComplete` at 11 covered,
  `canStop` at 3 covered.

Property tests: `headingDelta` always in `[-180, 180]` and `0` when equal;
`sliceIndex` always in `0..11`. Angle comparisons use the `1e-9` tolerance.

## Mode settings (`lib/modes.ts`)

Sign convention: `targetTiltDeg` is pitch in degrees, positive means the camera
looks up. All tilt values are starting guesses and are **untested on a real
phone**.

| Mode | camera | targetTilt (deg) | outline | pose tip (draft) | scoring |
| --- | --- | --- | --- | --- | --- |
| Full body | back | 8 | `fullBody` | "Stand inside the outline, feet at the bottom." | `back` |
| Half body | back | -6 | `halfBody` | "Line up your waist with the guide." | `back` |
| Selfie | front | -12 | `selfie` | "Center your face in the oval." | `selfie` |
| Spooky | back | 10 | `spooky` | "Stand against the bright sky and hold still." | `spooky` |

Camera and mode are linked in both directions (see FR-2, FR-6):

- Selecting a mode switches to its camera (Selfie → front; Full body, Half body,
  Spooky → back).
- Flipping to the front camera selects Selfie; flipping to the back camera
  selects the last-used back-camera mode (default Full body).
- Switching mode or camera clears the current target and prompts a rescan
  (FR-5).

Pose tips are draft copy; tune on device.

## Outlines (`lib/outline.ts`, `lib/poses.ts`)

Each outline is a static, normalized (0..1 viewport space) dashed human-shaped
silhouette showing where the subject stands and how large. Selfie adds a dashed
oval marking the face area the scan measures. Spooky's silhouette is the ghostly
variant. There is no pose detection and no matching. Exact shapes and sizes are
an open question; the design ships placeholder geometry and tunes it on device.

Each mode has a fixed library of at most 6 pre-drawn poses (`lib/poses.ts`), each
`{ id, label, outline, tip }`. The default (first) pose shows in Core; the AI
Coach (Tier 2) may select another by `pose_id`. `lib/poses.ts` is pure and shared
by the client (render) and the coach route (validate).

`SAFE_BOTTOM` is a fraction (draft `0.18`, untested) reserved at the bottom of
the viewport for the controls. Outlines and arrows are fit into the area above
`1 - SAFE_BOTTOM`, so the silhouette's feet line is never hidden. This satisfies
the FR-1 layout rule.

## Regions and metrics (`lib/regions.ts`, `lib/metrics.ts`)

`computeMetrics(pixels, regions)` is pure: it takes `{width, height, data:
Uint8ClampedArray}` and region masks, and returns `FrameMetrics`. Luma is
`L = (0.299R + 0.587G + 0.114B) / 255` in `[0, 1]`.

`FrameMetrics`:

- `meanLuma`, `contrast` (std of L), `blownFraction` (fraction `L >
  blownThreshold`), `outerEdgeDetail` (mean `|∇L|` in outer strips)
- selfie: `faceLuma`, `leftLuma`, `rightLuma`, `bgLuma` (outside oval)
- spooky: `subjectLuma` (center), `bgLuma` (outer strips)

Property-tested invariant: returns finite numbers for all-black (L=0) and
all-white (L=1) frames; denominators use `eps = 1e-6`.

## Scoring (`lib/scoring.ts`)

`scoreSlice(metrics, profile)` dispatches by profile. Every output is clamped to
`[0, 1]`; all denominators add `eps`. Property-tested: always finite, including
all-black and all-white metrics.

### Back camera (Full body, Half body)

```
exposure  = clamp(1 - 2*abs(meanLuma - targetLuma), 0, 1)
contrastS = clamp(contrast / contrastRef, 0, 1)
tidiness  = clamp(1 - outerEdgeDetail / edgeRef, 0, 1)
blown     = blownFraction
score     = wExp*exposure + wCon*contrastS + wTidy*tidiness - wBlown*blown
```

`TUNING.back = { targetLuma: 0.5, contrastRef: 0.18, edgeRef: 0.12,
blownThreshold: 0.96, outerStripFraction: 0.15, wExp: 0.35, wCon: 0.25,
wTidy: 0.25, wBlown: 0.5 }`

### Selfie (front camera)

```
faceBright = clamp(faceLuma / targetFaceLuma, 0, 1)
evenness   = clamp(1 - abs(leftLuma - rightLuma)/(leftLuma + rightLuma + eps), 0, 1)
faceVsBg   = clamp((faceLuma - bgLuma)/faceVsBgRef, 0, 1)
blown      = blownFraction (face oval)
score      = wFace*faceBright + wEven*evenness + wFaceVsBg*faceVsBg - wBlown*blown
```

`TUNING.selfie = { targetFaceLuma: 0.6, faceVsBgRef: 0.2, blownThreshold: 0.96,
wFace: 0.35, wEven: 0.25, wFaceVsBg: 0.25, wBlown: 0.5 }`

### Spooky (back camera)

```
bgBright   = clamp(bgLuma / targetBgLuma, 0, 1)
silhouette = clamp((bgLuma - subjectLuma)/silhouetteRef, 0, 1)
score      = wBack*bgBright + wSil*silhouette
```

No blown penalty: a backlit sky may clip by design.

`TUNING.spooky = { targetBgLuma: 0.7, silhouetteRef: 0.3, centerFraction: 0.3,
outerStripFraction: 0.2, wBack: 0.5, wSil: 0.5 }`

### Vignette (`lib/vignette.ts`)

`vignetteParams("spooky") = { innerRadius: 0.35, outerRadius: 0.9, strength:
0.55 }` (fractions of half-diagonal); `null` otherwise. Applied in the capture
canvas, not in `lib/`.

## Data flow

Both the scan and the guidance use the **camera-corrected heading**, i.e.
`orientForCamera(rawHeading, tilt, camera).heading`. For the back camera this is
the raw heading; for the front camera it is `(rawHeading + 180) % 360`. This
keeps the scan's slice space and the guidance's target space identical.

1. **Camera.** `useCamera` calls `getUserMedia({ video: { width: { ideal:
   1920 }, height: { ideal: 1080 }, facingMode } })`, attaches the stream to the
   `<video>`, and reads `track.getSettings()` for the actual resolution shown in
   the debug readout. The viewfinder renders cover-fit (cropped to fill); the
   crop rectangle comes from `lib/crop.ts`.
2. **Sensors.** `useDeviceOrientation` prefers `deviceorientationabsolute`
   (Android) for true heading. It starts the `deviceorientation` fallback timer
   only after motion permission is granted or the first event arrives; on iPhone
   the absolute event never fires, so it falls back. On iOS, motion access is
   requested through `DeviceOrientationEvent.requestPermission()` on a user tap
   (`StatusMessage` button). On each event it derives
   `headingFromOrientation`, `tiltFromBeta`, and `rollFromOrientation` (all
   pure), applies `ROLL_SIGN`, smooths with `smoothAngle`/`smooth`, and
   throttles UI updates to about 25 per second. Raw sensor values are kept in
   refs; only the throttled, smoothed values enter React state.
3. **Scan.** `useScan` reads the **camera-corrected heading** (after
   `orientForCamera`), assigns the sample to a slice via `sliceIndex`, draws the
   **same visible cover-crop area** as the viewfinder into a small canvas about
   64px wide (`willReadFrequently: true`), reads those pixels, and calls pure
   `computeMetrics` then `scoreSlice`. Sampling is throttled to about 5 per
   second; it never reads a full 1920x1080 frame. It keeps the best score per
   slice, auto-finishes at 11/12 or on manual stop (≥3), and sets the target
   slice/heading in the same camera-corrected space. Mode or camera change
   clears the target and returns to the neutral rescan prompt.
4. **Target → guidance.** `CoachView` computes `headingDelta` for heading and
   plain deltas for tilt/level against the target, all in the **camera-corrected
   heading** space. Overlays render heading arrows (left/right), tilt arrows
   (top/bottom), the level line, and the ready state. For the front camera,
   `orientForCamera` has already corrected the heading/tilt, and the component
   flips left/right arrow direction to match the mirrored preview. The ready
   state uses `headingWithinTolerance` (heading ≤5°) and `withinTolerance`
   (tilt ≤5°, level ≤3°).
5. **Capture.** `useCapture` renders the saved photo from the raw video frame
   (next section), produces a blob URL, and pushes it to `useGallery`.

## Capture pipeline

The saved photo is rendered from the raw video frame, never from the DOM
overlays, so arrows, grid, outline, level line, and oval are absent:

1. Draw the current `<video>` frame to an offscreen canvas at the negotiated
   resolution (a one-time snapshot, not per-frame).
2. Apply `coverCrop` from `lib/crop.ts` so the saved crop matches the viewfinder.
3. For the front camera, flip the canvas horizontally to match the mirrored
   preview.
4. For Spooky, apply the radial vignette from `vignetteParams` (baked in).
5. `canvas.toBlob` → `URL.createObjectURL` → push to `useGallery`.

`useGallery` keeps the most recent 8 as blob URLs; when a ninth arrives, the
oldest is dropped and `URL.revokeObjectURL` is called on it. Save attempts an
`<a download>`. `<a download>` may not work on iPhone Safari (untested), so the
fallback opens the image (e.g., `window.open(blobUrl)`) so it can be long-pressed
and saved to Photos.

## Guidance rendering

- **Neutral state:** when no target is set (before the first scan, or after a
  mode/camera switch), no arrows are shown, only a calm prompt to scan.
- **Heading arrows** on the left/right edges point toward the target heading;
  for the front camera their direction is flipped.
- **Tilt arrows** on the top/bottom edges point toward the mode's target tilt.
- **Level line** spans the screen, kept parallel to the horizon, and turns solid
  within 1.5°.
- **Ready state** appears when heading ≤5°, tilt ≤5°, and level ≤3° of target.
- Arrows shrink/disappear near target; the ready state replaces them when all
  three are on.
- Overlays and the outline fit above `SAFE_BOTTOM`.

## Theming

Normal modes (Full body, Half body, Selfie) keep the white, minimal, calm
theme. When Spooky is active the whole interface switches to the haunting theme:
near-black panels, pale ghost-white lines, a soft fog gradient at the screen
edges (`SpookyFog`), a slow flicker on the ready state, and the ghostly
silhouette outline. No emoji in either theme. The Spooky fog and flicker must not
reduce legibility of the arrows or the level line (keep fog faint at the exact
edge positions and flicker subtle).

## Tier 2 — AI Coach (optional)

Tier 2 is optional and cuttable; the Core loop works without it. Core stays
client-side with no server and no upload. Tier 2 is the only exception: it
sends one downscaled camera frame to Google's AI, only after consent, and never
stores it.

### Coach request (`components/AICoach.tsx`)
- Tapping Coach captures one frame from the current camera, downscales it
  (longest side 768px, JPEG quality about 0.7) via `lib/downscale.ts` (pure
  dimension math) plus an offscreen canvas, and POSTs `{ image, mode, photoGoal }`
  to `/api/coach` (as `multipart/form-data`).
- Shows the first-use consent notice once per session (FR-15) before the first
  POST; without consent it sends nothing.
- On any failure, timeout, or quota hit it shows "Coach is resting, try again
  later" and leaves Core running.
- The frame is never stored, logged, or added to the gallery.

### Coach route (`app/api/coach/route.ts`)
- A Next.js Route Handler, server-only. Reads the API key from `GEMINI_API_KEY`
  and the model from `COACH_MODEL` (server env only; never `NEXT_PUBLIC_`).
- Sends the image + mode + photoGoal to Google's AI with the coach system
  prompt (below); 10-second timeout.
- Enforces a request size limit, a per-visitor rate limit (1 per 10 seconds, 20
  per hour), and a global daily cap. Rate-limit decisions use `lib/ratelimit.ts`
  (pure) over an in-memory store (per visitor by IP for the demo).
- Validates the model JSON with `lib/coach.ts`: each of `light`, `background`,
  `framing`, `camera_height_and_tilt`, `top_tip`, `pose_id`, `why` is present and
  about 120 characters or fewer; `pose_id` must be in the mode's library
  (`lib/poses.ts`), else reject. The route never logs or stores the image.

### Env
- Add `.env.example` with blank `GEMINI_API_KEY=` and `COACH_MODEL=`. `.env.local`
  is already gitignored via `.env*`. The key is never committed, printed, or
  sent to the client.

### Coach prompt (draft; no prior version exists to preserve)
- System message: describes the active mode and lists its pose library by `id`
  and `label`; instructs the model to return strict JSON with the fields above
  (each about 120 chars) and `pose_id` from the library; to treat the Photo goal
  as descriptive user data and ignore any instructions inside it; and in Spooky
  mode to phrase advice in a short ghostly voice, otherwise plain and practical.
- The image and the Photo goal are user-role data; only the system role carries
  instructions.

### Advice panel (`components/CoachPanel.tsx`)
- A small, theme-matching panel with a Close button (no emoji) shows the
  returned text fields; the chosen outline shows via the existing `ModeOutline`
  overlay (FR-12). Spooky voice styling applies only in Spooky mode.

### Security and privacy
- API key server-side env only; never committed, printed, or exposed to the
  client (see `tech.md`).
- The frame is sent only after consent and never stored/logged by PoseLah.
- The Photo goal is user data, not instructions; `pose_id` validation is the
  hard guard against a crafted goal smuggling an out-of-library outline.

### Tier 2, not in v1 (cut)
- Reference-photo upload, live or real-time guidance, 3D anchored silhouettes,
  voice.

## Risks

- Free-tier data use: Google's free tier may use submitted data for service
  improvement depending on plan/terms. Mitigation: the consent notice (FR-15)
  makes it explicit; frames are not stored by PoseLah; production would use a
  paid tier with data-use controls (out of v1 scope).
- Quota limits: the free tier has rate/quotas that can exhaust mid-demo.
  Mitigation: per-visitor rate limit (1 per 10s, 20 per hour) and a global daily
  cap (FR-16); graceful "Coach is resting" UX; Core works without the coach.
- Key leakage: an exposed `GEMINI_API_KEY` would let others spend the quota.
  Mitigation: server-only env (never `NEXT_PUBLIC_`), `.env.example` blank,
  `.env.local` gitignored, key never logged or returned to the client; the
  secrets hook scans saved files for committed keys.
- Prompt injection (Photo goal): a crafted goal could try to change the output.
  Mitigation: the goal is user data, not instructions; the route validates
  `pose_id` against the library and rejects anything else; model JSON is
  validated server-side.
- Rate-limit durability: the in-memory rate limiter is best-effort on serverless
  (it resets on cold starts and across instances); the real protection is a
  provider-side quota/spend cap on the Gemini key. App-side limits are courtesy,
  not security.

## Testing

Property-based tests with **Vitest + fast-check**.

- `package.json` devDependencies to add: `vitest`, `fast-check`.
- `package.json` scripts to add:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    test: { environment: "node", include: ["lib/**/*.test.ts"] },
  });
  ```
- Co-located tests: `lib/heading.test.ts`, `lib/slices.test.ts`,
  `lib/crop.test.ts`, `lib/metrics.test.ts`, `lib/scoring.test.ts`,
  `lib/poses.test.ts`, `lib/coach.test.ts`, `lib/downscale.test.ts`,
  `lib/ratelimit.test.ts`.
- Environment is node (pure logic; `Uint8ClampedArray` is available in node, no
  DOM needed).

Angle property tests compare with a tolerance of about `1e-9`, not exact
equality, because of floating point.

Property tests assert the NFR-6 invariants plus the sensor-math invariants:

- `headingDelta` always in `[-180, 180]` and `0` when inputs are equal.
- `sliceIndex` always in `0..11`.
- `shortestTurn` is `0` when heading equals target.
- `headingFromOrientation` and `smoothAngle` always in `[0, 360)`.
- `rollFromOrientation` always in `[-90, 90]`.
- `smoothAngle(359, 1, 0.5) ≈ 0` (within tolerance); `smoothAngle(x, x, f)` ≈
  `x % 360`; `smooth(x, x, f)` ≈ `x`.
- `scoreSlice` always returns a finite number, including all-black and all-white
  metrics.
- `isValidPoseId` returns true only for ids in the mode's library.
- `validateCoachJSON` accepts only well-formed advice with a valid `pose_id` and
  rejects missing/oversized/out-of-library fields.
- `computeDownscaleDimensions` keeps the longest side at 768 and preserves
  aspect.
- Rate-limit logic allows 1 per 10 seconds and 20 per hour, then blocks.

Component and integration tests are out of scope for v1 (the spec requires only
`lib/` property tests).

## Traceability

| Requirement | Designed in |
| --- | --- |
| FR-1 viewfinder + 1920x1080 + debug readout + safe area | `useCamera`, `CameraView`, `lib/crop.ts`, `lib/outline.ts` (`SAFE_BOTTOM`) |
| FR-2 flip + front mirror + mode↔camera both directions | `useCamera`, `CameraView`, `lib/modes.ts`, `orientForCamera` |
| FR-3 readings + Android rule + iPhone tap + fallback timer | `useDeviceOrientation`, `lib/heading.ts` |
| FR-4 guidance + level + ready + neutral + camera-corrected heading | overlays, `lib/heading.ts` (`headingWithinTolerance`, `withinTolerance`) |
| FR-5 scan + 12 slices + scoring + 64px/5Hz + camera-corrected heading | `useScan`, `lib/slices.ts`, `lib/metrics.ts`, `lib/scoring.ts` |
| FR-6 modes + static outline + selfie oval + mode↔camera + pose library | `lib/modes.ts`, `lib/outline.ts`, `lib/poses.ts`, `ModeOutline`, `ModeSwitcher` |
| FR-7 capture, no overlays, Spooky vignette | `useCapture`, `lib/crop.ts`, `lib/vignette.ts` |
| FR-8 gallery, most-recent-8, Save + fallback | `useGallery`, `Gallery*` |
| FR-9 Spooky low angle + theme | `lib/modes.ts`, `lib/scoring.ts`, theming, `SpookyFog` |
| FR-10 status copy | `StatusMessage` |
| FR-11 coach request + response (image) | `AICoach`, `app/api/coach/route.ts`, `lib/downscale.ts`, `lib/coach.ts`, `lib/poses.ts` |
| FR-12 show chosen outline (no detection) | `AICoach`, `ModeOutline` |
| FR-13 Show subject screen (hidden in Selfie) | `ShowSubject` |
| FR-14 Photo goal box (data, not instructions) | `AICoach`, coach prompt |
| FR-15 first-use consent | `AICoach` |
| FR-16 route limits + failure UX | `app/api/coach/route.ts`, `lib/ratelimit.ts`, `AICoach` |
| FR-17 advice panel + Spooky voice | `CoachPanel`, theming |
| NFR-1 design + theming + legibility | theming section |
| NFR-6 testability + finite scoring + angle tolerance | testing section |

## Task order (demo-critical path)

Build in this order so a deployable demo exists early. Verify each step on an
Android phone (Chrome, HTTPS on Vercel) before moving on. The AI Coach comes
after Core is deployed and phone-tested, and before the Spooky fog/flicker and
polish:

1. `lib/heading.ts` and `lib/slices.ts` with property tests.
2. Camera + viewfinder (cover-fit, front/back flip); redeploy and verify on a
   phone.
3. Sensors: heading/tilt/roll from orientation, level line, heading and tilt
   arrows.
4. 360° scan and scoring.
5. Modes and outlines (including `SAFE_BOTTOM`; Spooky = low angle + ghostly
   outline).
6. Capture and gallery (including the Save download + open fallback).
7. AI Coach (Tier 2): consent + route + pose library + downscale + `AICoach` +
   `CoachPanel` + `ShowSubject`.
8. Spooky fog and flicker (atmospheric extras; Spooky stays a minimal mode
   without them).
9. Polish.

The tasks document (`tasks.md`) expands this into small, ordered tasks and puts
the Vercel deployment as an explicit task right after the camera viewfinder.

## Cut list (drop first if time runs short)

Drop in this order, most expendable first:

1. Spooky fog and flicker; keep Spooky as a minimal mode (low angle, vignette,
   ghostly outline) for theme fit.
2. The polish pass.
3. Secondary modes; keep Full body and Selfie.
4. Show subject and the Photo goal box.
5. The scan coverage ring and auto-finish.
6. Gallery extras (most-recent-8 and Save/download; keep only the last photo).
7. The AI Coach (Tier 2) — last, because it is the core of the Frankenstein
   story (sensors, camera, on-device image math, a cloud vision AI, and a pose
   library stitched into one app).

Always keep: the camera + viewfinder on Vercel, `lib/heading` + `lib/slices` and
their tests, sensors + level line + arrows, and basic capture.

Tier 2, not in v1 at all (deliberately excluded): reference-photo upload, live or
real-time guidance, 3D anchored silhouettes, voice.

## Untested on a real phone

Constants and behaviors that must be confirmed on a device before claiming they
work:

- All four `targetTiltDeg` values.
- `ROLL_SIGN` (roll direction).
- `orientForCamera` front-camera heading (`+180`) and tilt negation, and the
  left/right arrow flip.
- `headingFromOrientation` accuracy across phone attitudes (it avoids the
  upright-alpha failure mode but needs device validation).
- **iPhone heading is relative to the start orientation, not true north.** This
  is acceptable for the scan (only relative direction matters) but must be
  verified, and the `deviceorientation` fallback timing must be confirmed.
- Smoothing factor for `smoothAngle`/`smooth` and the ~25 Hz UI throttle rate.
- Every `TUNING` constant (exposure/contrast/tidiness thresholds and weights;
  selfie face and face-vs-bg targets; spooky background and silhouette targets;
  vignette params).
- `SAFE_BOTTOM` value and whether the feet line stays clear of the controls.
- Outline and pose shapes, sizes, and positions; pose tip copy.
- The 1920x1080 request and the actual negotiated resolution across devices.
- `deviceorientationabsolute` availability and the `deviceorientation` fallback
  timing on iPhone.
- Scan sampling under real heading jitter and motion blur at the 64px / 5 Hz
  setting.
- `<a download>` Save on iPhone Safari; the long-press open fallback.
- Spooky fog/flicker legibility outdoors.
- Tier 2 on a phone: coach image capture + downscale POST, first-use consent,
  rate limits/failure UX, advice panel, and "Show subject" screen; the route
  validates `pose_id` server-side and never stores the frame.

## Out of scope

Core adds nothing beyond the spec's Core: no server, accounts, sync, upload of
photos, delete, share, video, filters beyond the Spooky vignette, pose/face
detection, cross-session persistence, calibration UI, PWA, or offline. Tier 2
adds only the optional coach route: no accounts or sync; it sends one downscaled
frame per request after consent and never stores it. Tier 2, not in v1:
reference-photo upload, live or real-time guidance, 3D anchored silhouettes,
voice.
