#!/usr/bin/env node

/**
 * Guards `npm run typecheck`.
 *
 * `typedRoutes` only validates navigation once Expo has generated
 * `.expo/types/router.d.ts`. That directory is gitignored, so on a fresh clone
 * it does not exist — and without it expo-router's `Href` silently degrades to
 * plain `string`, meaning `tsc` happily accepts routes that do not exist.
 *
 * Rather than let the typecheck pass for the wrong reason, fail loudly and tell
 * the developer how to generate the types (running the dev server once is
 * currently the only way — there is no standalone `expo typegen` command).
 */

const fs = require("fs");
const path = require("path");

const typesFile = path.join(__dirname, "..", ".expo", "types", "router.d.ts");

if (!fs.existsSync(typesFile)) {
  console.error(
    [
      "",
      "  Route types are missing: .expo/types/router.d.ts",
      "",
      "  Without them `typedRoutes` is inert and typecheck cannot catch bad",
      "  navigation targets. Generate them by starting the dev server once:",
      "",
      "      npx expo start",
      "",
      "  (wait for Metro to boot, then stop it — the file is written on startup)",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
