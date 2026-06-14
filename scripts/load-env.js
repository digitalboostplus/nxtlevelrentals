// Minimal, dependency-free .env loader for standalone node scripts.
//
// Next.js loads .env automatically, but plain `node scripts/foo.js` does not.
// Require this at the top of a script to populate process.env from .env
// (existing real env vars always win, so CI/shell overrides still work).

const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const envPath = path.resolve(process.cwd(), file || '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const withoutExport = line.startsWith('export ') ? line.slice(7) : line;
    const eq = withoutExport.indexOf('=');
    if (eq === -1) continue;

    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();

    // Strip surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Don't clobber values already provided by the real environment.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Load .env.local first (local-only secrets, e.g. GOOGLE_APPLICATION_CREDENTIALS)
// then .env. Real shell env always wins; earlier loads win over later ones.
loadEnv('.env.local');
loadEnv('.env');

module.exports = { loadEnv };
