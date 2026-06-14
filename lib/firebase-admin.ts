import { existsSync } from 'fs';
import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// If GOOGLE_APPLICATION_CREDENTIALS points to a file that doesn't exist (e.g.
// the local key path from .env.local leaked into the deployed backend), drop it
// so Application Default Credentials fall back to the GCP runtime service
// account instead of failing with ENOENT.
const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (gac && !existsSync(gac)) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

// Use a DEDICATED NAMED app rather than the default app slot: the Firebase
// web-frameworks Cloud Run runtime pre-registers its own (non-[DEFAULT]) admin
// app, so any default-app lookup throws `app/no-app`. A named app we own can't
// collide with it.
const ADMIN_APP_NAME = 'nlr-admin';

function getAdminApp(): App {
  const existing = getApps().find((a) => a?.name === ADMIN_APP_NAME);
  if (existing) return existing;

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return initializeApp(
      {
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        }),
      },
      ADMIN_APP_NAME
    );
  }

  // ADC: GOOGLE_APPLICATION_CREDENTIALS locally (see .env.local) or the GCP
  // runtime service account when deployed.
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  return initializeApp({ credential: applicationDefault(), projectId }, ADMIN_APP_NAME);
}

const app = getAdminApp();

export const firebaseAdmin = admin;
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
