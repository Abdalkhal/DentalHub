import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

let _adminInitialized = false;

function getAdminAuthInstance() {
  if (!_adminInitialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [
        ...(!projectId ? ["FIREBASE_PROJECT_ID"] : []),
        ...(!clientEmail ? ["FIREBASE_CLIENT_EMAIL"] : []),
        ...(!privateKey ? ["FIREBASE_PRIVATE_KEY"] : []),
      ];
      throw new Error(
        `Missing Firebase admin environment variable(s): ${missing.join(", ")}. Add service account credentials to your .env file.`,
      );
    }

    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };

    initializeApp({ credential: cert(serviceAccount) }, "admin");
    _adminInitialized = true;
  }

  return getAdminAuth();
}

export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const adminAuth = getAdminAuthInstance();
    const decoded = await adminAuth.verifyIdToken(token);

    if (!decoded.uid) {
      throw new Error("Unauthorized: No user ID found in token");
    }

    return next({
      context: {
        userId: decoded.uid,
        claims: decoded,
      },
    });
  },
);
