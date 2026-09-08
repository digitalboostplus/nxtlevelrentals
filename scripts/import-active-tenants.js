// Defaults to a read-only operational preview (only the review snapshot is saved).
// node scripts/import-active-tenants.js --operator ADMIN_UID
// node scripts/import-active-tenants.js --operator ADMIN_UID --apply PREVIEW_ID --contacts ID1,ID2
require('./load-env');
require('tsx/cjs');
const { adminDb, adminAuth } = require('../lib/firebase-admin.ts');
const { previewTenantDirectory, applyTenantDirectory, DirectoryError } = require('../lib/ghlTenantDirectory.ts');
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
(async () => {
  const allowed = new Set(['--operator', '--apply', '--contacts', '--dry', '--dry-run']);
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new DirectoryError('Unknown argument; use --operator, --apply, --contacts');
    if (!['--dry', '--dry-run'].includes(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new DirectoryError('Missing argument value');
      i++;
    }
  }
  if (!args.includes('--operator')) throw new DirectoryError('Provide --operator ADMIN_UID');
  const operator = value('--operator');
  const identity = await adminAuth.getUser(operator);
  const role = (await adminDb.collection('users').doc(operator).get()).data()?.role;
  if (identity.disabled || !['admin', 'super-admin'].includes(role)) throw new DirectoryError('Operator must be an enabled admin');
  const deps = { db: adminDb, auth: adminAuth };
  let result;
  if (args.includes('--apply')) {
    if (args.includes('--dry') || args.includes('--dry-run')) throw new DirectoryError('Dry-run cannot apply');
    if (!args.includes('--contacts')) throw new DirectoryError('Select explicit --contacts ID1,ID2');
    result = await applyTenantDirectory(deps, operator, value('--apply'), value('--contacts').split(','));
  } else {
    if (args.includes('--contacts')) throw new DirectoryError('--contacts requires --apply');
    result = await previewTenantDirectory(deps, operator);
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.name === 'DirectoryError' ? error.message : 'Directory command failed; verify configuration, operator and arguments.'); process.exitCode = 1; });
