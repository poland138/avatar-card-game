// The web app has its own node_modules; Metro must not crawl or resolve into it.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const webDir = escape(path.resolve(__dirname, 'web')).replace(/\\\\|\//g, '[\\\\/]');
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${webDir}[\\\\/].*`),
];

module.exports = config;
