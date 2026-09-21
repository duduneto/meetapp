import admin from "firebase-admin";

let initialized = false;

export type AuthenticatedIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  signInProvider: string;
  development: boolean;
};

function getFirebaseApp() {
  if (initialized) return admin.app();
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    admin.initializeApp({ credential });
    initialized = true;
    return admin.app();
  }
  return null;
}

export async function resolveAuthenticatedIdentity(
  authorization?: string
): Promise<AuthenticatedIdentity | null> {
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const app = getFirebaseApp();
  if (app && bearer) {
    try {
      const decoded = await admin.auth().verifyIdToken(bearer);
      const signInProvider = decoded.firebase?.sign_in_provider;
      if (
        !decoded.email ||
        decoded.email_verified !== true ||
        signInProvider !== "google.com"
      ) {
        return null;
      }

      return {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: true,
        signInProvider,
        development: false
      };
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      uid: process.env.DEV_AUTH_UID ?? "development-admin",
      email: process.env.DEV_AUTH_EMAIL ?? "admin@varjotapp.local",
      emailVerified: true,
      signInProvider: "google.com",
      development: true
    };
  }

  return null;
}
