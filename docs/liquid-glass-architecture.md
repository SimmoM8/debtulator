# Liquid Glass architecture note

The app now uses a single semantic glass abstraction for shared UI surfaces. New or refactored components should render their material layer through `GlassSurface` and choose a semantic role from `src/constants/glass.ts` rather than composing blur, borders, and shadows manually.

This keeps the native Liquid Glass experience on supported iOS versions, preserves the fallback visuals on other platforms, and respects Reduce Transparency through the wrapper’s accessibility-aware behavior.
