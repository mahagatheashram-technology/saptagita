const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Audio files use uppercase .MP3 — tell Metro to treat them as assets
config.resolver.assetExts.push("MP3");

module.exports = withNativeWind(config, { input: "./global.css" });
