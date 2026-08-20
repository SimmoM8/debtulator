# Native Build Configuration

Debtulator uses Expo Continuous Native Generation. The checked-in sources of
truth are `app.json`, local config plugins, JavaScript dependencies, and the
dependency patch files. The generated `ios/` and `android/` directories are
ignored and must not contain the only copy of a required customization.

## Durable iOS build setting

Xcode can sandbox CocoaPods script phases, including nested tools used to build
Expo module XCFrameworks. [`plugins/withIosUserScriptSandboxing.js`](../../plugins/withIosUserScriptSandboxing.js)
extends the generated Podfile's existing `post_install` hook and sets
`ENABLE_USER_SCRIPT_SANDBOXING=NO` on every Pods target build configuration.
This replaces the former ignored, machine-local Podfile edit.

The plugin intentionally fails prebuild if Expo changes the closing structure
of the Podfile template. A failed generation is safer than silently producing
an iOS project without the required setting. Revalidate the plugin whenever
Expo, React Native, CocoaPods, or Xcode is upgraded, and remove it once the
underlying Expo module build no longer needs the workaround.

Expo Router `56.2.15` and `react-native-screens` `4.25.2` are intentionally
held as a compatibility pair. `package.json` excludes both from automatic Expo
version correction and overrides transitive screens resolution to the direct
pin, preventing two native screens modules from entering one binary.

## Least-privilege permissions

The app currently lets a user choose an existing photo or document. It does not
capture camera media, record audio, deliver native push notifications, or use
Face ID. `app.json` therefore configures `expo-image-picker` with explicit photo
library copy and disables its camera and microphone permissions. Native push
permission declarations are omitted, and the Secure Store plugin explicitly
disables its default Face ID usage description. Add any of these permissions
only with their corresponding runtime implementation and release validation.

## Verification

Run config validation and generate native projects from a clean checkout:

```bash
npm run release:preflight:config -- --env=staging
npx expo config --type introspect
npx expo prebuild --clean --no-install
```

Confirm the generated `ios/Podfile` contains exactly one
`ENABLE_USER_SCRIPT_SANDBOXING` assignment inside `post_install`, then compile
an unsigned simulator build. Android's final merged manifest should not grant
`POST_NOTIFICATIONS`, `CAMERA`, or `RECORD_AUDIO`; the generated source manifest
can contain `tools:node="remove"` entries for blocked permissions.

The `Native Quality` workflow repeats clean Android and unsigned iOS builds on
changes to dependencies, Expo/native configuration, config plugins, or patches.

## Web SQLite headers

The Expo Router plugin supplies `Cross-Origin-Embedder-Policy: credentialless`
and `Cross-Origin-Opener-Policy: same-origin` for EAS Hosting so SQLite's web
worker can use `SharedArrayBuffer`. Other hosting providers must be configured
with the same response headers; the release preflight verifies the checked-in
Expo configuration, not an external host's deployed response.

## Primary references

- [Expo: Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Expo: Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Expo ImagePicker config plugin properties](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo SecureStore config plugin properties](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo SQLite web setup](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/#web-setup)
- [Expo SDK 57 known regressions and Hermes fix](https://expo.dev/changelog/sdk-57#known-regressions)
- [CocoaPods Podfile `post_install` hook](https://guides.cocoapods.org/syntax/podfile.html#post_install)
