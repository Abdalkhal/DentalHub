import * as Sentry from "@sentry/react";

/**
 * Crash/error reporting (sentry.io, project "denthub-web").
 *
 * Off unless VITE_SENTRY_DSN is set and this is a production build, so local
 * dev never sends anything. No personal data is attached (dataCollection off);
 * the signed-in user is identified by uid only — see setSentryUser.
 */
export function initSentry(router: unknown) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (typeof window === "undefined" || !dsn || !import.meta.env.PROD) return;
  if (Sentry.getClient()) return;

  const host = window.location.hostname;
  Sentry.init({
    dsn,
    environment: host === "localhost" || host === "127.0.0.1" ? "local" : "production",
    // Medical app: collect nothing beyond the error itself. Query params are
    // off because some links carry names (e.g. /messages?withName=...).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    // Performance sampling kept low to stay inside the free quota.
    tracesSampleRate: 0.1,
  });
}

export function setSentryUser(uid: string | null) {
  if (!Sentry.getClient()) return;
  Sentry.setUser(uid ? { id: uid } : null);
}

export function captureError(error: unknown) {
  if (!Sentry.getClient()) return;
  Sentry.captureException(error);
}
