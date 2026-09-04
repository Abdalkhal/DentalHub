# DentalHub — mobile app

React Native (Expo) client for DentalHub. The web app lives in the repository
root; this directory is a separate Expo project with its own dependencies.

## Setup

Two config files are **not** in git — this repository is public and both carry
Firebase credentials. You need to provide them before the app will run.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create `.env`** with the Firebase *client* config (Firebase console ->
   Project settings -> Your apps -> Web app). These are public by design; the
   service-account private key must never go here.

   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

   Without these the app throws `Missing Firebase environment variable(s)` and
   renders a blank screen.

3. **Download `google-services.json`** (Android) and, for iOS builds,
   `GoogleService-Info.plist`, from Firebase console -> Project settings ->
   Your apps. Place them in this directory. Native builds fail without them.

4. **Run it**

   ```bash
   npx expo run:android      # builds and installs a dev build
   ```

   `expo-dev-client` is configured, so plain `npx expo start` expects a dev
   build. Use `npx expo start --go` if you want Expo Go instead.

## Checks

```bash
npm run typecheck
```

Typed routes only validate navigation once Expo has generated
`.expo/types/router.d.ts`, which is gitignored. If the typecheck guard tells you
route types are missing, run `npx expo start` once and stop it.

## Known issues

- **NativeWind 4.2.6 does not tolerate toggling `shadow-*` classes** on RN
  0.86: switching a shadow class on and off crashes with a misleading
  "Couldn't find a navigation context" error. Keep shadows applied on both
  branches of a conditional `className` and toggle only colour. Upgrading
  NativeWind is the real fix.

---

## Expo template notes

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
