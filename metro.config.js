const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite uses WebAssembly on web — tell Metro to treat .wasm as a binary asset
config.resolver.assetExts.push('wasm');

module.exports = config;
