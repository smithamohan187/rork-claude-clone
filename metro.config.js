//const { getDefaultConfig } = require("expo/metro-config");
//const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

//const config = getDefaultConfig(__dirname);

//module.exports = withRorkMetro(config);
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

let finalConfig = config;
if (!process.env.EAS_BUILD) {
  const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
  finalConfig = withRorkMetro(config);
}

module.exports = finalConfig;
