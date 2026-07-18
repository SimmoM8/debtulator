# Native Liquid Glass architecture note

The app now prefers Apple-native controls wherever the platform exposes them. Shared primitives such as buttons and text fields delegate to the iOS-specific wrappers in the UI layer, while the remaining surfaces use the shared glass semantics only as a fallback when native support is unavailable.

New UI work should route through the primitives in `src/components/ui` rather than composing raw `Pressable`, `TextInput`, `Switch`, or `Modal` controls directly. The native wrappers preserve the existing app shell and behavior on iOS while keeping the fallback experience consistent on other platforms.
