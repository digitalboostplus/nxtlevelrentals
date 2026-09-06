import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { migrateAttachment } from '../lib/attachmentMigration';

async function main() {
  const [projectId, bucketName, actor, recordPath, index = '0', mode] = process.argv.slice(2);
  if (!projectId || !bucketName || !actor || !recordPath || !/^\d+$/.test(index) || mode && mode !== '--apply') throw new Error('Usage: tsx scripts/migrate-attachment.ts PROJECT BUCKET ADMIN_UID COLLECTION/ID INDEX [--apply]');
  const app = initializeApp({ projectId, credential: applicationDefault() });
  const result = await migrateAttachment(getFirestore(app), getStorage(app).bucket(bucketName), actor, recordPath, Number(index), mode === '--apply');
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
