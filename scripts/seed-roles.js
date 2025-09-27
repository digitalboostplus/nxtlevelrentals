/* eslint-disable no-console */
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountArg = process.argv[2];
if (!serviceAccountArg) {
  console.error('Usage: node scripts/seed-roles.js <path-to-serviceAccountKey.json>');
  process.exit(1);
}

const serviceAccountPath = path.resolve(serviceAccountArg);
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id
});

const db = admin.firestore();

const seedUsers = [
  {
    uid: 'REPLACE_WITH_ADMIN_UID',
    data: {
      displayName: 'Aliyah Carson',
      email: 'aliyah@nxtlevelmngmnt.com',
      role: 'admin',
      managedProperties: ['Lakeside', 'Aurora Lofts']
    }
  },
  {
    uid: 'REPLACE_WITH_SUPER_ADMIN_UID',
    data: {
      displayName: 'Jordan Blake',
      email: 'jordan@nxtlevelmngmnt.com',
      role: 'super-admin'
    }
  },
  {
    uid: 'REPLACE_WITH_TENANT_UID',
    data: {
      displayName: 'Morgan Rivera',
      email: 'morgan@example.com',
      role: 'tenant',
      propertyIds: ['lakeside-17b']
    }
  }
];

async function run() {
  try {
    const batch = db.batch();

    seedUsers.forEach((user) => {
      if (user.uid.startsWith('REPLACE')) {
        return;
      }

      const ref = db.collection('users').doc(user.uid);
      batch.set(ref, user.data, { merge: true });
    });

    await batch.commit();
    console.log('Seed complete. Update your UIDs in scripts/seed-roles.js before running again.');
  } catch (error) {
    console.error('Failed to seed roles:', error);
  } finally {
    await admin.app().delete();
  }
}

void run();
