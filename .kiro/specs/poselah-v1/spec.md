# PoseLah v1 — Requirements

## Introduction

PoseLah is a phone camera photography coach for the person holding the phone.
The phone coaches the photographer, not the subject: it tells them which
direction to face, how to angle and level the phone, and how to frame the shot,
then captures and stores the result.

This is the v1 specification, built for the Kiroween (Halloween) hackathon,
Costume Contest category. Scope is a demo: the simplest version that proves the
coaching loop end to end.

Everything runs client-side in a mobile browser. The camera and motion sensors
are phone-only APIs; see "Verification constraints" for what must be confirmed
on a real device before it is claimed to work. There is no human pose detection
anywhere in the product: the pose outline is a static guide.

## Functional requirements

### FR-1 Full-screen camera viewfinder
The live camera feed is the primary surface and fills the screen edge to edge.
Controls overlay it.

Acceptance criteria:
- The camera feed fills the full viewport using cover fit (crop to fill), with
  no surrounding chrome framing it.
- Request a camera stream up to 1920x1080. The actual negotiated resolution is
  shown in a small debug readout on the viewfinder.
- Camera access is requested on first use. A denied permission shows the
  camera permission-denied copy (FR-10) with a retry path. No emoji.
- The camera stream is released when the viewfinder is not visible (for
  example, when the gallery is open).
- Controls and overlays are laid out so they never obscure the active mode
  outline; the outline stays fully visible at all times.

### FR-2 Front/back camera flip and front-camera handling
A control switches between the world-facing (back) and user-facing (front)
cameras in place.

Acceptance criteria:
- Default camera is the back camera.
- Toggling switches cameras without leaving the viewfinder.
- The active camera is indicated.
- Camera and mode are kept consistent in both directions:
  - Selecting a mode switches to its camera: Selfie selects the front camera;
    Full body, Half body, and Spooky select the back camera.
  - Flipping to the front camera selects Selfie; flipping to the back camera
    selects the last-used back-camera mode (default Full body).
- The front-camera preview is mirrored (as a selfie mirror).
- For the front camera, heading and tilt are interpreted from the user's
  facing perspective, and the left/right guidance arrows are flipped to match
  what the user sees in the mirrored preview.
- Switching camera or mode clears the current target and prompts a rescan
  (FR-5).

### FR-3 Orientation readings: compass, tilt, level
Three live readings derived from device orientation sensors: compass heading
(direction the phone faces), tilt (pitch, nose up/down), and level (roll,
side-to-side).

Acceptance criteria:
- All three update live as the phone moves. Units are degrees throughout.
- Prefer the absolute orientation event for heading
  (`deviceorientationabsolute` on Android). Fall back to the relative
  `deviceorientation` event only if the absolute event never fires, as on
  iPhone.
- On iOS, motion access is requested through a user gesture (a tap) the first
  time; denial shows the motion permission-denied copy (FR-10).
- If sensors are absent or denied, readings show unavailable using the
  sensors-unavailable copy (FR-10), without breaking the rest of the app.

### FR-4 Guidance overlays
Overlays guide the photographer to the target heading, tilt, and level, and
report a ready state.

Acceptance criteria:
- Heading arrows appear on the left and right screen edges indicating which
  way to turn toward the target heading.
- Tilt arrows appear on the top and bottom screen edges indicating which way to
  tilt the phone toward the mode's target tilt.
- A level line runs across the screen, kept parallel to the real horizon. It
  turns solid when within 1.5 degrees of level.
- A calm ready state is shown when heading, tilt, and level are each within
  tolerance of their targets: heading 5 degrees, tilt 5 degrees, level
  3 degrees.
- Arrows shrink or disappear as the user approaches a target; the ready state
  replaces them when all three are on target.
- When no target is set (before the first scan, or after a mode or camera
  switch clears it), the app is neutral: no arrows are shown, only a calm
  prompt to scan. Guidance becomes active once a scan has set a target.
- The level target is the horizon (0 degrees roll) for all modes.

### FR-5 360° scan and target selection
The user turns slowly in place; the app samples frames by compass direction into
12 slices of 30 degrees, scores each slice, and sets the best direction as the
target.

Acceptance criteria:
- The user initiates a scan and turns slowly. The app assigns each sampled
  frame to one of 12 slices (index 0 to 11) by compass heading.
- The scan auto-finishes when 11 of 12 slices are covered. The user may also
  stop manually once at least 3 slices are covered.
- On completion, the highest-scoring covered slice becomes the target used by
  FR-4.
- Scan progress and slice coverage are shown with a minimal, calm indicator
  (for example, a ring filling as slices are covered). No emoji.
- Switching mode or camera clears the current target and returns the app to the
  neutral rescan prompt. A new scan must complete before guidance is active
  again.
- The active mode and camera determine the scoring criteria:
  - Back camera, Full body and Half body: score each slice on exposure,
    contrast, and background tidiness, where tidiness is measured as edge
    detail in the outer strips of the frame (less edge detail means tidier).
    Penalise blown highlights.
  - Spooky (back camera): prefer a bright background with a darker subject
    area (silhouette lighting).
  - Selfie (front camera): score light on the face area (the dashed oval from
    FR-6): even left and right light, the face at least as bright as the
    background, and no blown highlights.
- The exact scoring formulas and weights are finalized in design; the inputs
  above are the requirement.

### FR-6 Shot modes
A small set of shot modes. Each mode defines a target tilt and a dashed white
outline overlaid on the viewfinder.

Acceptance criteria:
- v1 modes: Full body, Half body, Selfie, Spooky.
- Each mode specifies a target tilt; the level target is the horizon for all
  modes (see FR-4). Exact tilt values and outline shapes are finalized in
  design.
- Each mode shows a dashed white outline over the viewfinder: a static,
  human-shaped silhouette showing where the subject should stand and how large
  they should be, plus a one-line pose tip. The outline is a static guide only;
  there is no human pose detection and no matching.
- Selfie mode shows a dashed oval marking the face area. The scan (FR-5)
  measures light within this oval.
- Spooky's outline is a ghostly silhouette; see FR-9.
- Camera and mode stay linked in both directions (see FR-2): selecting a mode
  sets the camera; flipping to the front camera selects Selfie; flipping to the
  back camera selects the last-used back-camera mode (default Full body).
- Switching mode or camera updates the outline and tilt target and clears the
  target to prompt a rescan (FR-5).

### FR-7 Photo capture
A capture action takes a still photo from the current camera stream.

Acceptance criteria:
- The saved photo uses the same cover crop as the viewfinder, and for the
  front camera the mirrored image as previewed.
- The saved photo contains no overlays: no arrows, grid, outline, level line,
  or oval. Only the Spooky vignette is baked in when Spooky is active.
- Captured photos are added to the gallery (FR-8).
- Capture feedback is calm and brief. No emoji, no loud effects.

### FR-8 Gallery
A view of captured photos for the session.

Acceptance criteria:
- The gallery lists photos captured this session.
- Photos are held in memory as blob URLs, keeping the most recent 8. When a
  ninth photo is captured, the oldest is dropped and its blob URL revoked.
- A photo can be opened to view it larger.
- A Save button downloads the photo to the device.
- Photos stay on the device; nothing is uploaded.
- The gallery is session-only: photos do not persist across reloads. Deleting
  photos is out of scope for v1.

### FR-9 Spooky mode
A shot mode for backlit silhouettes taken from a low angle, for the Halloween
theme.

Acceptance criteria:
- Target tilt is a low angle (phone angled upward).
- The mode coaches framing the subject against a bright background (backlight)
  to produce a silhouette.
- A dark vignette is applied to the viewfinder and baked into the saved photo
  (FR-7).
- When Spooky is active, the whole interface switches to a haunting theme:
  near-black panels, pale ghost-white lines, a soft fog gradient at the screen
  edges, a slow flicker on the ready state, and the ghostly silhouette outline.
  No emoji.
- Spooky theming must not reduce the legibility of the arrows or the level
  line.
- A short piece of coaching text is shown for the mode.
- Scan scoring for Spooky prefers a bright background with a darker subject
  area (FR-5).

### FR-10 Status and permission copy
Calm, plain-language copy for the failure states. No emoji.

Acceptance criteria:
- Camera permission denied:
  "PoseLah needs your camera to coach the shot. Allow camera access in your
  browser settings and come back."
- Motion permission denied:
  "PoseLah uses motion sensors for the arrows and level line. Allow motion
  access when prompted and try again."
- Sensors unavailable:
  "This device has no motion sensors, so the arrows and level line are off. You
  can still frame and take photos."

## Non-functional requirements

- NFR-1 Design: the interface is calm and uncluttered, with no emoji anywhere
  (UI, copy, code, commits). Normal modes (Full body, Half body, Selfie) use a
  white, minimal theme with restrained color and quiet typography. When Spooky
  is active, the whole interface switches to a haunting theme: near-black
  panels, pale ghost-white lines, a soft fog gradient at the screen edges, a
  slow flicker on the ready state, and the ghostly silhouette outline. In both
  themes, controls and overlays coexist with the mode outline so the outline is
  never hidden. Spooky theming must not reduce the legibility of the arrows or
  the level line. See `product.md`.
- NFR-2 Device: primary target is a phone in portrait, in a mobile browser.
  Desktop is secondary.
- NFR-3 Privacy: photos and camera frames stay on the device. No network
  upload. Camera is active only while the viewfinder is in use.
- NFR-4 Performance: overlays and readings update smoothly. Real frame rate on
  a phone is a verification constraint, not a claim.
- NFR-5 Build gate: `npm run build` must pass; small changes only. See
  `tech.md`.
- NFR-6 Testability: sensor math, scan scoring, and mode settings live in
  `lib/` as pure functions with property-based tests. Required invariants:
  the heading difference is always between -180 and 180 degrees; a heading
  always maps to a slice index from 0 to 11; the shortest turn is zero when
  heading equals target; scoring functions always return finite numbers, even
  for an all-black or all-white frame. The design names a property-based test
  framework (for example Vitest with fast-check) and adds a test script to
  `package.json`.
- NFR-7 Units: all sensor readings are in degrees. No PWA and no offline
  support in v1.

## Out of scope (v1)

- Server, accounts, cloud sync, or upload of photos.
- Deleting photos from the gallery.
- Sharing beyond the in-app Save (download) button.
- Video capture.
- Image filters or post-processing beyond Spooky's vignette.
- Human pose detection or matching; face detection. The face area in Selfie
  mode is a static guide oval, not a detected region.
- Gallery persistence across sessions.
- Sensor calibration UI (rely on OS calibration).
- PWA or offline support.

## Open questions

To be finalized in design (do not assume answers):
- Exact target tilt value per mode, and the exact outline shapes, sizes, and
  positions.
- The exact scoring formulas and weights (inputs are specified in FR-5).

## Verification constraints (must be confirmed on a real phone)

These cannot be claimed working from a desktop or browser device emulation:

- Camera permission flow and front/back flip, including the mirrored front
  preview, on iOS Safari and Android Chrome.
- The actual negotiated camera resolution (requested up to 1920x1080) shown in
  the debug readout, which varies by device.
- `DeviceOrientationEvent` permission request on iOS (requires a user
  gesture).
- `deviceorientationabsolute` availability and fallback to
  `deviceorientation` on iPhone.
- Compass, tilt, and level accuracy and calibration; heading and tilt
  interpretation for the front camera; left/right arrow flipping.
- 360° scan: slice coverage detection while physically turning (11 of 12
  auto-finish, manual stop after at least 3); heading jitter; motion blur.
- Guidance overlays: heading arrows, tilt arrows, level line solid within
  1.5 degrees, ready state at 5/5/3 degree tolerance.
- Scoring feeling right in real light (back exposure/contrast/tidiness, selfie
  face-area light, Spooky backlight silhouette).
- Capture fidelity: the saved photo matches the viewfinder crop and selfie
  mirroring, with no overlays except the Spooky vignette.
- Spooky: low-angle backlit silhouette, dark vignette, ghostly outline, slow
  ready-state flicker, and coaching text outdoors; theming must keep arrows and
  the level line legible.
- Gallery and Save (download) on device; most-recent-8 cap and blob URL
  revocation behaving as specified.
