// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig as lovableDefineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv, type Plugin, type UserConfig } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const lovableConfig = lovableDefineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // The app talks to Firebase entirely from the client, so deploy it as a
    // static SPA that Firebase Hosting can serve (no SSR server required).
    // Prerendering is skipped because Firebase Hosting's SPA rewrite already
    // serves index.html for every route.
    spa: { enabled: true, prerender: { enabled: false } },
  },
  // No server runtime is needed — the app is fully client-side, so skip the
  // nitro/Cloudflare build entirely and emit a static SPA for Firebase Hosting.
  nitro: false,
  vite: {
    // Resolve tsconfig `paths` (e.g. `@/*`) natively via Vite, instead of the
    // deprecated `vite-tsconfig-paths` plugin.
    resolve: {
      tsconfigPaths: true,
    },
  },
});

export default async function config(env: ConfigEnv): Promise<UserConfig> {
  const resolved = await lovableConfig(env);
  // The Lovable wrapper injects the deprecated `vite-tsconfig-paths` plugin. It is
  // redundant here (`@/*` is already aliased natively above), so drop it to silence
  // Vite's "supports tsconfig paths resolution natively" warning.
  resolved.plugins = (resolved.plugins ?? []).filter(
    (p) => !p || (p as Plugin).name !== "vite-tsconfig-paths",
  );

  // Upload source maps to Sentry so error stack traces show real file names and
  // lines. Only runs on builds where SENTRY_AUTH_TOKEN is set (a secret kept in
  // .env — never prefix it with VITE_ or it ships to the browser). The maps are
  // "hidden" (no sourceMappingURL comment) and deleted after upload, so they are
  // never published to Firebase Hosting.
  const vars = loadEnv(env.mode, process.cwd(), "");
  if (env.command === "build" && vars.SENTRY_AUTH_TOKEN) {
    const client = resolved.environments?.client ?? {};
    resolved.environments = {
      ...resolved.environments,
      client: { ...client, build: { ...client.build, sourcemap: "hidden" } },
    };
    const sentry = sentryVitePlugin({
      org: "khazer",
      project: "denthub-web",
      authToken: vars.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        assets: ["./dist/client/**"],
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    });
    // Browser bundle only — the SSR pass (which just renders the SPA shell)
    // would otherwise re-upload the already-processed client files.
    for (const p of [sentry].flat() as Plugin[]) {
      resolved.plugins.push({ ...p, applyToEnvironment: (e) => e.name === "client" });
    }
  }
  return resolved;
}
