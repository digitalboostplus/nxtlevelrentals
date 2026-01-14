const fetch = require('node-fetch');
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nxtlevel-7986e'
    });
}

const db = admin.firestore();

// Helper: Fetch by ID (Reliable)
async function getGHLContactById(id) {
    const url = `https://services.leadconnectorhq.com/contacts/${id}`;
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN || 'pit-8eac004c-5c6b-4027-a01f-285398cc05ab'}`,
                'Version': '2021-07-28',
                'Accept': 'application/json'
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.contact;
    } catch (e) {
        return null;
    }
}

async function syncAll() {
    console.log('--- Starting Bulk Sync (Using IDs) ---');

    // 1. Get all tenants from Firestore
    const usersSnap = await db.collection('users').get();

    // Field IDs mapping
    const FIELD_IDS = {
        LEASE_START: 'xflK4edwKFVm1pHLJxew',
        LEASE_END: 'nMzB4QirjN9XP6BQwp0N',
        LEASE_ACTIVE: 'KMpvAs09LKwF1mQoY6LV',
        MONTHLY_RENT: 'r9QRb2yRF9i0CjCDhpNA'
    };

    let syncedCount = 0;

    for (const doc of usersSnap.docs) {
        const userData = doc.data();
        const uid = doc.id;
        const ghlId = userData.ghlContactId;

        if (!ghlId) {
            console.log(`Skipping User ${uid} (No GHL ID linked)`);
            continue;
        }

        process.stdout.write(`Syncing ${userData.email} (${ghlId})... `);

        const ghlContact = await getGHLContactById(ghlId);

        if (!ghlContact) {
            console.log('❌ Contact not found in GHL (invalid ID?)');
            continue;
        }

        // Helper to extract custom field value safely
        const getFieldVal = (id) => {
            const fields = ghlContact.customFields || [];
            const val = fields.find(f => f.id === id)?.value;
            return val !== undefined ? val : null;
        };

        // Parse Fields
        const activeRaw = getFieldVal(FIELD_IDS.LEASE_ACTIVE);
        const isLeaseActive = Array.isArray(activeRaw) ? activeRaw.length > 0 : Boolean(activeRaw);

        const monthlyRent = getFieldVal(FIELD_IDS.MONTHLY_RENT);

        // Parse Address
        const address = ghlContact.address1 || null;
        const city = ghlContact.city || null;
        const state = ghlContact.state || null;
        const zip = ghlContact.postalCode || null;

        const leaseData = {
            tenantId: uid,
            email: userData.email,
            ghlContactId: ghlContact.id,
            leaseStart: getFieldVal(FIELD_IDS.LEASE_START) || null,
            leaseEnd: getFieldVal(FIELD_IDS.LEASE_END) || null,
            monthlyRent: monthlyRent || null,
            status: isLeaseActive ? 'Active' : 'Inactive',
            title: 'Lease Agreement (Synced)',
            lastSyncedAt: new Date().toISOString()
        };

        const leaseDocId = `lease-${uid}`;
        await db.collection('leaseDocuments').doc(leaseDocId).set(leaseData, { merge: true });

        // Update User Profile
        await db.collection('users').doc(uid).set({
            address: address,
            city: city,
            state: state,
            zip: zip,
            monthlyRent: monthlyRent,
            unit: address ? address.split(' ').pop() : null
        }, { merge: true });

        console.log(`✅ Synced! Rent: ${monthlyRent}, Addr: ${address}`);
        syncedCount++;

        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\nSync Complete. Updated ${syncedCount} records.`);
}

syncAll();
