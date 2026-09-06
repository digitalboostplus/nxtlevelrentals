const fs = require('node:fs');
const path = require('node:path');

// Accept a packaged backend directory as well as the normal local build.
const root = path.resolve(process.argv[2] || '.');
const buildDir = path.join(root, '.next');
const manifest = JSON.parse(fs.readFileSync(path.join(buildDir, 'server/pages-manifest.json'), 'utf8'));
const required = [
  '/admin/operations', '/admin/leases/new', '/landlord/financials',
  '/landlord/expenses', '/landlord/documents',
  '/api/admin/run-operations', '/api/admin/activate-lease',
  '/api/admin/update-property', '/api/landlord/data',
  '/api/landlord/expense', '/api/files/[id]', '/api/files/upload',
  '/api/notifications/preferences', '/api/payments/pay-rent',
];
const missing = required.filter(route => !manifest[route] ||
  !fs.existsSync(path.join(buildDir, 'server', manifest[route])));
if (missing.length) {
  throw new Error(`Release is missing compiled routes: ${missing.join(', ')}`);
}
const buildId = fs.readFileSync(path.join(buildDir, 'BUILD_ID'), 'utf8').trim();
if (!buildId) throw new Error('Release build ID is empty');
// Firebase excludes nested node_modules links from its upload. Each Turbopack
// external alias therefore needs a real npm dependency in the server package.
const dependencies = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies;
const externals = path.join(buildDir, 'node_modules');
if (fs.existsSync(externals)) {
  for (const name of fs.readdirSync(externals)) {
    const entry = path.join(externals, name);
    if (!fs.lstatSync(entry).isSymbolicLink()) continue;
    const target = path.basename(fs.readlinkSync(entry));
    if (!dependencies[target] || dependencies[name] !== `npm:${target}@${dependencies[target]}`) {
      throw new Error(`Missing matching npm alias for uploaded runtime dependency: ${name}`);
    }
  }
}
console.log(`Verified ${required.length} required routes in build ${buildId}`);
