// Trusted operator CLI. Defaults to preview; creates no invitations or GHL writes.
require('./load-env');
require('tsx/cjs');
const fs = require('node:fs');
const { adminDb: db, adminAuth: auth } = require('../lib/firebase-admin.ts');
const { readTenantSource } = require('../lib/ghlTenantSource.ts');
const { previewTenantAccounts, provisionTenantAccount, syncPropertyDirectory } = require('../lib/ghlTenantProvisioning.ts');

(async () => {
  const args = process.argv.slice(2);
  const operatorEmail = args[args.indexOf('--operator-email') + 1];
  if (!args.includes('--operator-email') || !operatorEmail) throw new Error('Provide --operator-email for an existing admin');
  const operator = await auth.getUserByEmail(operatorEmail);
  const profile = (await db.doc(`users/${operator.uid}`).get()).data();
  if (operator.disabled || !['admin', 'super-admin'].includes(profile?.role)) throw new Error('Enabled admin required');
  const source = await readTenantSource();
  const apply = args.includes('--apply');
  const properties = await syncPropertyDirectory(db, source, apply);
  const rows = await previewTenantAccounts({ db, auth }, source);
  const result = { at: new Date().toISOString(), operator: operator.uid, apply, properties, rows, results: [] };
  fs.mkdirSync('.agent-artifacts', { recursive: true });
  const output = `.agent-artifacts/ghl-account-${apply ? 'apply' : 'preview'}-${Date.now()}.json`;
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  if (apply) for (const row of rows.filter(r => ['create', 'resume'].includes(r.action))) {
    result.results.push(await provisionTenantAccount({ db, auth }, source, row.contactId, operator.uid));
    fs.writeFileSync(output, JSON.stringify(result, null, 2));
  }
  const final = apply ? await previewTenantAccounts({ db, auth }, source) : rows;
  result.final = final;
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ properties, counts: final.reduce((counts, row) => { counts[row.action] = (counts[row.action] || 0) + 1; return counts; }, {}), results: result.results.length, report: output }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
