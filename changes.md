# Changes

## 2026-07-09 (touch gesture support)

Added multi-touch gesture support on the preview canvas (`src/App.tsx`):

- **Single finger**: pan behavior unchanged — drag to reposition the crop.
- **Two fingers (pinch)**: adjusts zoom proportionally to the change in distance between the two touch points, clamped to the same [1, 3] range as the slider. The midpoint between the two fingers also drives panning simultaneously, so you can zoom and reposition in one gesture.
- **Finger-lift transitions**: when going from two fingers to one, the gesture state resets to the current live position so the remaining finger continues smoothly without any snap.

Replaced the single-pointer `dragStateRef` with a `GestureState` ref that tracks `activePointers` (current positions) and `startPointers` (snapshot at gesture start), plus `start*` / `live*` copies of zoom and offsets. `touch-action: none` was already present in CSS on the editable canvas, so no style changes were needed.

Updated the preview hint text to mention pinch-to-zoom.
