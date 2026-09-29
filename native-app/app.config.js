// EAS uploads only git-tracked files, and the Firebase native config files are
// gitignored (see .gitignore). On EAS they come from the GOOGLE_SERVICES_INFO_PLIST
// and GOOGLE_SERVICES_JSON file environment variables; locally, drop your own
// copies next to app.json.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? "./GoogleService-Info.plist",
  },
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});
