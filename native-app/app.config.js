const fs = require("fs");
const path = require("path");

// EAS uploads only git-tracked files, and the Firebase native config files are
// gitignored (see .gitignore). On EAS builders they come from the
// GOOGLE_SERVICES_INFO_PLIST and GOOGLE_SERVICES_JSON file environment variables;
// locally, drop your own copies next to app.json. Secret file variables are not
// available when `eas build` evaluates this config on your machine, so a missing
// file is skipped here rather than failing the command.
function resolveFile(envVar, fallback) {
  if (process.env[envVar]) return process.env[envVar];
  return fs.existsSync(path.join(__dirname, fallback)) ? fallback : undefined;
}

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile: resolveFile("GOOGLE_SERVICES_INFO_PLIST", "./GoogleService-Info.plist"),
  },
  android: {
    ...config.android,
    googleServicesFile: resolveFile("GOOGLE_SERVICES_JSON", "./google-services.json"),
  },
});
