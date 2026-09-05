/**
 * Expo config plugin to inject the ADI registration token file
 * into the Android assets folder during prebuild.
 * Required for Google Play package name verification.
 * This can be removed after verification is complete.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ADI_TOKEN = "C25XHLDIOIAWIAAAAAAAAAAAAA";

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(
        path.join(assetsDir, "adi-registration.properties"),
        ADI_TOKEN
      );
      console.log("✅ ADI registration token file injected into Android assets");
      return config;
    },
  ]);
};
