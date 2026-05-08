const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Prevent Metro from crawling the monorepo root's node_modules.
// Without this, Metro finds ../node_modules/react@19.2.4 alongside
// mobile/node_modules/react@19.1.0 and expo-doctor flags duplicates.
config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
