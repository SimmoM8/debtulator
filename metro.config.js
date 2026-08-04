const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Work around local Watchman stalls that can block bundle generation.
config.resolver.useWatchman = false;

// Expo SQLite's web worker imports its WebAssembly binary as an asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
