const fetch = require('node-fetch');

// USAGE: USER_EMAIL="tenant@example.com" node scripts/manual-sync-ghl.js
// Note: This script mocks the "verifyIdToken" part by needing a way to bypass it OR we can make a temp "admin-only" endpoint.
// BUT, since we are running locally, we can just use the Admin SDK directly in a script to populate the DB, instead of hitting the API.
// That is much easier.

const admin = require('firebase-admin');

// 1. Initialize Firebase Admin (ADC)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nxtlevel-7986e'
    });
}

const db = admin.firestore();

// 2. GHL Fetch Function (Duplicated from lib/ghl.ts approx, but simplified for script)
async function getGHLContact(email) {
    const token = process.env.GHL_ACCESS_TOKEN || 'pit-8eac004c-5c6b-4027-a01f-285398cc05ab';
    const locationId = process.env.LOCATION_ID || 'ewas9FYYHk4acPyw4taq';

    console.log(`Searching GHL for: ${email}`);

    const searchUrl = 'https://services.leadconnectorhq.com/contacts/search';
    const res = await fetch(searchUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            locationId,
            query: email,
        })
    });

    if (!res.ok) {
        console.error('GHL Error:', await res.text());
        return null;
    }

    const data = await res.json();
    const contact = data.contacts?.find(c => c.email?.toLowerCase() === email.toLowerCase());
    return contact;
}

async function runSync() {
    // 3. Get User Email from command line or hardcode
    const targetEmail = process.argv[2];
    if (!targetEmail) {
        console.error('Please provide an email: node scripts/manual-sync-ghl.js <email>');
        process.exit(1);
    }

    // 4. Find User in Firestore (to get UID)
    console.log('Finding user in Firestore...');
    const usersSnap = await db.collection('users').where('email', '==', targetEmail).get();

    if (usersSnap.empty) {
        console.error('User not found in Firestore. Please create the user first.');
        process.exit(1);
    }

    const userDoc = usersSnap.docs[0];
    const uid = userDoc.id;
    console.log(`Found Firestore User: ${uid}`);

    // 5. Fetch from GHL
    const ghlContact = await getGHLContact(targetEmail);
    if (!ghlContact) {
        console.error('Contact not found in GHL.');
        process.exit(1);
    }
    console.log(`Found GHL Contact: ${ghlContact.id}`);

    // 6. Push to 'leaseDocuments'
    // Field IDs mapping
    const FIELD_IDS = {
        LEASE_START: 'xflK4edwKFVm1pHLJxew',
        LEASE_END: 'nMzB4QirjN9XP6BQwp0N',
        LEASE_ACTIVE: 'KMpvAs09LKwF1mQoY6LV',
    };

    const getFieldVal = (id) => ghlContact.customFields?.find(f => f.id === id)?.value;

    const leaseData = {
        tenantId: uid,
        email: targetEmail,
        ghlContactId: ghlContact.id,
        leaseStart: getFieldVal(FIELD_IDS.LEASE_START) || null,
        leaseEnd: getFieldVal(FIELD_IDS.LEASE_END) || null,
        isLeaseActive: Boolean(getFieldVal(FIELD_IDS.LEASE_ACTIVE)),
        title: 'Lease Agreement (GHL)',
        syncedAt: new Date().toISOString()
    };

    console.log('Syncing Data:', leaseData);

    const leaseDocId = `lease-${uid}`;
    await db.collection('leaseDocuments').doc(leaseDocId).set(leaseData, { merge: true });

    console.log('✅ Successfully synced to leaseDocuments collection!');
}

runSync();
