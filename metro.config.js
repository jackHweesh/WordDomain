// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure MP3 and other audio files are handled
config.resolver.assetExts.push('mp3', 'wav', 'm4a', 'aac', 'ogg');

module.exports = config;
