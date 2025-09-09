const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configurar resolver para AsyncStorage no web
config.resolver.alias = {
  ...config.resolver.alias,
  '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/lib/commonjs/AsyncStorage.web.js',
};

// Configurar plataformas
config.resolver.platforms = ['web', 'ios', 'android', 'native'];

module.exports = config;