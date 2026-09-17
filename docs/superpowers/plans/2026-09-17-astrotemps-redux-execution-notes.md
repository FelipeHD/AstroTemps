# AstroTemps Redux — Execution Notes

These notes are binding clarifications for `docs/superpowers/plans/2026-09-17-astrotemps-redux.md` and resolve implementation details discovered during plan self-review.

## 1. Single V8 engine directive

`AstroTemps_Redux.js` must not emit a second `#engine v8` before including `AstroTemps_AutoProcessing_Tool.js`, because the included full script already declares the V8 engine.

Redux starts with:

```javascript
#define ASTROTEMPS_LIBRARY_MODE
#include "AstroTemps_AutoProcessing_Tool.js"

#feature-id Utilities > AstroTemps Redux
#feature-info AstroTemps Redux v1.2.0.<br/>One-click opinionated processing workflow for PixInsight 1.9.4+.
```

The full script's feature registration and final `main();` remain suppressed by `ASTROTEMPS_LIBRARY_MODE`, while its processing helpers remain available.

## 2. Creating a Redux Process Icon

The Redux filter dialog must include the standard PixInsight New Instance control in addition to `Capture Filter`, `Skip SPCC`, and `Continue`. This control exists only to let the user create a Process Icon; it is not another processing setting.

The instance must not serialize the current filter selection. The icon stores only an identity marker such as:

```javascript
Parameters.clear();
Parameters.set( "reduxInstance", true );
this.dialog.newInstance();
```

Dragging that Process Icon onto a view uses `Parameters.isViewTarget` to select the target, then still opens the Redux filter dialog every time. This preserves the approved rule that a Process Icon is never bound to a previous capture filter.

## 3. Dialog close behavior

Closing/dismissing the Redux filter dialog without choosing `Continue` or `Skip SPCC` aborts the Redux run. It must not silently interpret window close as `Skip SPCC`.
