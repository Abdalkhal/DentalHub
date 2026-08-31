// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig as lovableDefineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ConfigEnv, Plugin, UserConfig } from "vite";

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
  return resolved;
}
