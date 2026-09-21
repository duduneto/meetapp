import admin from "firebase-admin";

let initialized = false;

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

export async function resolveAuthenticatedEmail(authorization?: string) {
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const app = getFirebaseApp();
  if (app && bearer) {
    const decoded = await admin.auth().verifyIdToken(bearer);
    return decoded.email ?? null;
  }

  if (process.env.NODE_ENV !== "production") {
    return process.env.DEV_AUTH_EMAIL ?? "admin@varjotapp.local";
  }

  return null;
}
