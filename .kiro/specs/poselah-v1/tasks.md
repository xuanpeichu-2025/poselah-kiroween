# PoseLah v1 — Tasks

Follows the task order and cut list in `design.md`. Each task is small, names its
files, and lists its done criteria and what is untested on a real phone.

Conventions for every task:

- Done means `npm run build` passes; where a task adds tests, `npm test` passes
  too. Fix errors before starting the next task (the `tech.md` build gate).
- Run `npm run build` after each task.
- Do not claim a feature works on a real phone; list it under "Untested on a
  real phone" instead.

## Tasks

- [ ] **T1 — Test harness.** Add `vitest` and `fast-check` as devDependencies.
  Add `vitest.config.ts` (`environment: "node"`, `include: ["lib/**/*.test.ts"]`).
  Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json`. Add
  `lib/smoke.test.ts`.
  - Done: `npm run build` passes; `npm test` passes.
  - Untested on a real phone: none (tooling).

- [ ] **T2 — `lib/heading.ts` part 1: orientation + angular math.** Implement
  `headingFromOrientation(alpha, beta, gamma)` (degrees in; radians converted
  inside; do not use alpha alone), `tiltFromBeta(beta) = beta - 90`,
  `rollFromOrientation(beta, gamma)` with `ROLL_SIGN` (default 1),
  `headingDelta(from, to)` in `[-180, 180]`, `shortestTurn(from, to)`. Property
  tests in `lib/heading.test.ts` using a `1e-9` tolerance for angle comparisons.
  - Done: `npm test` passes; `npm run build` passes.
  - Untested on a real phone: `headingFromOrientation` accuracy across phone
    attitudes; `ROLL_SIGN`.

- [ ] **T3 — `lib/heading.ts` part 2: tolerances + smoothing + camera.**
  Implement `headingWithinTolerance` (circular via `headingDelta`),
  `withinTolerance` (plain), `orientForCamera(heading, tilt, camera)` (front:
  `{(heading + 180) % 360, -tilt}`; back unchanged; no `360 - heading`),
  `smoothAngle(prev, next, factor)` (circular, `[0, 360)`), `smooth(prev, next,
  factor)` (linear). Property tests in `lib/heading.test.ts` for ranges,
  wraparound (`smoothAngle(359, 1, 0.5) ≈ 0`), and equal-inputs-no-change, all
  within `1e-9`.
  - Done: `npm test` passes; `npm run build` passes.
  - Untested on a real phone: `orientForCamera` front `(heading + 180)` and tilt
    negation; left/right arrow flip (rendering); smoothing factor.

- [ ] **T4 — `lib/slices.ts` + tests.** Implement `SLICE_COUNT = 12`,
  `SLICE_DEG = 30`, `sliceIndex(heading)` → `0..11`, `sliceCenter(i)`, and
  `Coverage` with `markSlice`, `coveredCount`, `isComplete` (≥11), `canStop`
  (≥3). Property tests in `lib/slices.test.ts`.
  - Done: `npm test` passes; `npm run build` passes.
  - Untested on a real phone: slice assignment under real heading jitter.

- [ ] **T5 — `lib/crop.ts` + tests.** Implement
  `coverCrop(srcW, srcH, targetAspect)` → `{sx, sy, sw, sh}`. Property tests in
  `lib/crop.test.ts`.
  - Done: `npm test` passes; `npm run build` passes.
  - Untested on a real phone: that the crop matches the viewfinder on device.

- [ ] **T6 — Camera + viewfinder.** `hooks/useCamera.ts` (`getUserMedia` up to
  1920x1080, `facingMode`, front/back toggle, `track.getSettings()` for the
  resolution readout, release on hide/unmount, permission state).
  `components/CameraView.tsx` (cover-fit `<video>`, mirrored front preview,
  resolution debug readout, uses `coverCrop`). `components/StatusMessage.tsx`
  with the FR-10 camera-permission-denied copy. Wire `CameraView` into
  `components/CoachView.tsx` and render `CoachView` from `app/page.tsx`.
  - Done: `npm run build` passes; the camera shows in a desktop browser.
  - Untested on a real phone: permission flow and front/back flip on iOS Safari
    and Android Chrome; cover-fit on device; the actual negotiated resolution.

- [ ] **T7 — Deploy to Vercel.** Deploy so the viewfinder loads over HTTPS
  (required for camera and sensors on a phone). If a phone is available, confirm
  the deployed camera view loads; otherwise confirm the HTTPS load only.
  - Done: `npm run build` passes; the deployed app loads over HTTPS with the
    viewfinder.
  - Untested on a real phone: camera and sensors over HTTPS on the device (carry
    forward until a device is available).

- [ ] **T8 — Sensors + motion permission.** `hooks/useDeviceOrientation.ts`:
  prefer `deviceorientationabsolute`; start the `deviceorientation` fallback
  timer only after motion permission is granted or the first event arrives; on
  iOS call `DeviceOrientationEvent.requestPermission()` from a user tap; derive
  `headingFromOrientation`, `tiltFromBeta`, `rollFromOrientation` (pure); apply
  `ROLL_SIGN`; smooth with `smoothAngle`/`smooth`; throttle UI updates to ~25 Hz;
  keep raw values in refs. Show a debug readout of heading/tilt/roll. Wire the
  motion-permission tap into `components/StatusMessage.tsx` with the FR-10 motion
  copy.
  - Done: `npm run build` passes; the debug readout updates in a desktop
    browser (where sensors are available).
  - Untested on a real phone: sensor accuracy and calibration;
    `deviceorientationabsolute` availability and fallback timing; iPhone heading
    is relative to the start orientation (not true north), acceptable for the
    scan but must be verified; `ROLL_SIGN`; ~25 Hz throttle and smoothing feel.

- [ ] **T9 — Guidance overlays.** `components/overlays/LevelLine.tsx` (solid
  within 1.5°), `HeadingArrows.tsx` (left/right; flipped for front camera),
  `TiltArrows.tsx` (top/bottom), `ReadyState.tsx`. In `CoachView`, compute deltas
  using the **camera-corrected heading** (`orientForCamera`); use
  `headingWithinTolerance` (heading ≤5°) and `withinTolerance` (tilt ≤5°, level
  ≤3°) for the ready state. Neutral state (no arrows, calm scan prompt) when no
  target is set.
  - Done: `npm run build` passes; arrows and the level line respond in a
    desktop browser.
  - Untested on a real phone: front-camera arrow flip; sensor-driven accuracy;
    legibility against the background.

- [ ] **T10 — `lib/regions.ts` + `lib/metrics.ts` + tests.** Implement region
  masks (`outerStrips`, `centerRect`, `ovalMask`) and
  `computeMetrics(pixels, regions)` → `FrameMetrics` (luma
  `(0.299R + 0.587G + 0.114B)/255`). Property tests in `lib/metrics.test.ts`:
  finite numbers for all-black and all-white frames.
  - Done: `npm test` passes; `npm run build` passes.
  - Untested on a real phone: region positions against real frames.

- [ ] **T11 — `lib/scoring.ts` + tests.** Implement `TUNING` (back, selfie,
  spooky) and `scoreSlice(metrics, profile)` per the design formulas; clamp to
  `[0, 1]`, `eps` in denominators. Property tests in `lib/scoring.test.ts`:
  always finite, including all-black and all-white metrics.
  - Done: `npm test` passes; `npm run build` passes.
  - Untested on a real phone: every `TUNING` constant and whether scores feel
    right in real light.

- [ ] **T12 — `useScan` + scan ring.** `hooks/useScan.ts`: read the
  **camera-corrected heading**, assign the sample to a slice via `sliceIndex`,
  draw the visible cover-crop area downscaled to ~64px wide
  (`willReadFrequently: true`), sample ≤5 Hz, `computeMetrics` → `scoreSlice`,
  keep the best score per slice, auto-finish at 11/12, manual stop ≥3, set the
  target in camera-corrected space; clear target on mode/camera change.
  `components/overlays/ScanRing.tsx` for coverage.
  - Done: `npm run build` passes; a scan runs in a desktop browser.
  - Untested on a real phone: scan under real heading jitter and motion blur at
    64px / 5 Hz.

- [ ] **T13 — Modes + outlines.** `lib/modes.ts` (Full body, Half body, Selfie,
  Spooky; cameras; target tilts; scoring profiles; draft pose tips).
  `lib/outline.ts` (silhouettes, selfie oval, `SAFE_BOTTOM` ≈ 0.18).
  `components/ModeSwitcher.tsx` and `components/overlays/ModeOutline.tsx` (dashed
  white, fits above `SAFE_BOTTOM`). Camera↔mode link both directions: selecting a
  mode sets its camera; flipping to front selects Selfie; flipping to back
  selects the last-used back-camera mode (default Full body); switching mode or
  camera clears the target (FR-2, FR-6).
  - Done: `npm run build` passes; modes switch and the outline shows above the
    safe area.
  - Untested on a real phone: the four `targetTiltDeg` values; outline shapes,
    sizes, and positions; `SAFE_BOTTOM`; pose tip copy.

- [ ] **T14 — Capture + gallery.** `lib/vignette.ts` (`vignetteParams`).
  `hooks/useCapture.ts`: render from the raw video frame at the negotiated
  resolution using `coverCrop`, mirror for the front camera, bake the Spooky
  vignette, `toBlob` → blob URL; no overlays. `hooks/useGallery.ts`: most-recent-8
  as blob URLs, revoke the oldest. `components/CaptureButton.tsx`,
  `components/Gallery.tsx`, `components/GalleryPhoto.tsx`. Save: try
  `<a download>`; fallback opens the image for long-press save.
  - Done: `npm run build` passes; capture and gallery work in a desktop browser.
  - Untested on a real phone: capture fidelity (crop and front mirror) on
    device; `<a download>` Save on iPhone Safari; the long-press open fallback;
    most-recent-8 and blob revocation on device.

- [ ] **T15 — Spooky theme.** Apply the haunting theme when Spooky is active:
  near-black panels, pale ghost-white lines, `components/overlays/SpookyFog.tsx`
  (soft fog at screen edges), slow flicker on `ReadyState`, ghostly silhouette
  in `ModeOutline`, and bake the vignette in `useCapture`. Keep arrows and the
  level line legible.
  - Done: `npm run build` passes; Spooky renders with the haunting theme.
  - Untested on a real phone: fog/flicker legibility outdoors; vignette params.

- [ ] **T16 — Polish.** Review against the spec; tighten copy, spacing, and
  transitions; handle edge states (camera denied, sensors unavailable, no
  target). Run `npm run lint`.
  - Done: `npm run build` passes; `npm run lint` passes.
  - Untested on a real phone: per-feature items carry over from T6–T15.

## Cut list (if time runs short)

Drop in this order, most expendable first (from `design.md`):

1. Polish (T16).
2. Spooky fog, flicker, and ghostly outline; keep Spooky as low-angle + vignette
   only (trim T15).
3. Secondary modes; keep Full body and Selfie (trim T13).
4. The scan coverage ring and auto-finish; use a fixed sample count with a
   manual stop (trim T12).
5. Gallery most-recent-8 and Save/download; keep only the last photo (trim T14).

Always keep: the camera + viewfinder on Vercel (T6, T7), `lib/heading` +
`lib/slices` and tests (T2–T4), sensors + level line + arrows (T8, T9), and basic
capture (T14 core).
