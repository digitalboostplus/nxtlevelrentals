/* eslint-disable no-console */
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountArg = process.argv[2];

// Initialize Firebase Admin
if (serviceAccountArg) {
    const serviceAccountPath = path.resolve(serviceAccountArg);
    const serviceAccount = require(serviceAccountPath);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id
        });
    }
} else {
    // Try using Application Default Credentials (ADC)
    console.log('No service account provided. Attempting to use Application Default Credentials...');
    if (!admin.apps.length) {
        // If running outside nextjs (script), we might need to load env vars manually or hardcode project ID
        // Check if we can get project ID from env or arg
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nxtlevel-7986e';
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: projectId
        });
    }
}

const db = admin.firestore();

// Sample tenant IDs - IN A REAL SCENARIO THESE SHOULD MATCH ACTUAL USERS
// For this seeder, we will assume some dummy UIDs or you can replace them.
const TENANT_ID_1 = 'REPLACE_WITH_TENANT_UID_1';
const TENANT_ID_2 = 'REPLACE_WITH_TENANT_UID_2';
const PROPERTY_ID_1 = 'lakeside-17b';
const PROPERTY_ID_2 = 'aurora-lofts-101';

const seedRequests = [
    {
        tenantId: TENANT_ID_1,
        propertyId: PROPERTY_ID_1,
        category: 'plumbing',
        priority: 'high',
        title: 'Leaking Sink',
        description: 'The kitchen sink is leaking continuously.',
        status: 'submitted',
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now() - 86400000
    },
    {
        tenantId: TENANT_ID_1,
        propertyId: PROPERTY_ID_1,
        category: 'appliance',
        priority: 'medium',
        title: 'Dishwasher Making Noise',
        description: 'Strange grinding noise during drain cycle.',
        status: 'received',
        createdAt: Date.now() - 172800000, // 2 days ago
        updatedAt: Date.now() - 170000000
    },
    {
        tenantId: TENANT_ID_2,
        propertyId: PROPERTY_ID_2,
        category: 'hvac',
        priority: 'emergency',
        title: 'No Heat',
        description: 'Heater stopped working last night.',
        status: 'in_progress',
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now(),
        adminNotes: 'Contractor dispatched.'
    }
];

async function run() {
    try {
        const batch = db.batch();
        const collectionRef = db.collection('maintenanceRequests');

        seedRequests.forEach((req) => {
            // Create a new ref for each doc
            const ref = collectionRef.doc();
            batch.set(ref, req);
        });

        await batch.commit();
        console.log(`Successfully seeded ${seedRequests.length} maintenance requests.`);
        console.log('NOTE: Ensure TENANT_IDs match actual authorized users if testing security rules.');
    } catch (error) {
        console.error('Failed to seed maintenance requests:', error);
    } finally {
        // Only delete app if we created it locally in this script
        // but typically safe to close to end process
        await admin.app().delete();
    }
}

void run();
