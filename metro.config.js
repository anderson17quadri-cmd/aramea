const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// No Termux o node_modules pode ser um symlink para fora da pasta do projeto.
const nodeModulesPath = path.resolve(__dirname, 'node_modules');
const isSymlink = fs.existsSync(nodeModulesPath) && fs.lstatSync(nodeModulesPath).isSymbolicLink();
if (isSymlink) {
  const realNodeModules = fs.realpathSync(nodeModulesPath);
  config.watchFolders = [realNodeModules];
  config.resolver.nodeModulesPaths = [realNodeModules];
}

module.exports = config;
