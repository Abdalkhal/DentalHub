// Was app.json (static JSON). Converted to a dynamic config so the two
// Firebase native config files — gitignored because this repo is public,
// see .gitignore's comment — can come from an EAS file-type environment
// variable during EAS Build (GOOGLE_SERVICES_JSON / GOOGLE_SERVICES_INFO_PLIST,
// uploaded via `eas env:set`) instead of the git-tracked working copy. EAS
// writes the secret to a path outside the project and points the env var at
// it; locally (no such env var set) this just falls back to the real file
// sitting next to this config, same as before.
module.exports = {
  expo: {
    name: "Dent Hub",
    slug: "native-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "dentalhub",
    userInterfaceStyle: "light",
    ios: {
      icon: "./assets/images/icon.png",
      bundleIdentifier: "com.khazer.denthub",
      supportsTablet: true,
      googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST || "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.khazer.denthub",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#2563EB",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "https",
              host: "dental-hub-df069.web.app",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      permissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
    },
    web: {
      output: "static",
      bundler: "metro",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-dev-client",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#EFF5FC",
          image: "./assets/images/splash-branded.png",
          resizeMode: "cover",
        },
      ],
      "expo-image",
      "expo-font",
      [
        "expo-camera",
        {
          cameraPermission: "Allow Dent Hub to use the camera to scan product barcodes.",
        },
      ],
      "expo-notifications",
      "expo-sharing",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false,
    },
    extra: {
      router: {},
      eas: {
        projectId: "e631dca8-3a36-4416-82d8-9389cd4ad63b",
      },
    },
    owner: "khaliqedans-team",
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/e631dca8-3a36-4416-82d8-9389cd4ad63b",
    },
  },
};
