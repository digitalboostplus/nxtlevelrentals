import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        // Check if we have individual env vars (as per .env.example)
        if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
        }
        // Fallback: Use Application Default Credentials (ADC)
        // This works if `gcloud auth application-default login` has been run locally
        else {
            console.log('Firebase Admin SDK: Using Application Default Credentials.');
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
    } catch (error) {
        console.error('Firebase Admin SDK initialization failed:', error);
    }
}

export const firebaseAdmin = admin;
export const adminDb = admin.firestore(); // Renamed to avoid confusion with client-side 'db'
export const adminAuth = admin.auth();
