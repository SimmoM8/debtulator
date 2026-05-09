const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Work around local Watchman stalls that can block bundle generation.
config.resolver.useWatchman = false;

module.exports = config;
