// GoHighLevel (LeadConnector) v2 API client.
//
// Supports reading and writing contacts so the app can both pull CRM data
// (lease terms, rent, address) and push updates back (new tenants, payment
// status, maintenance activity).
//
// Configuration comes from environment variables only — never hardcode tokens.
// Both the documented (.env.example) names and the older names are accepted so
// existing deployments keep working:
//   GHL_API_KEY      (preferred)  or  GHL_ACCESS_TOKEN
//   GHL_LOCATION_ID  (preferred)  or  LOCATION_ID
// Custom Field IDs (from our discovery script)
// These are tied to a specific GHL location — update if migrating to a new account
const FIELD_IDS = {
    LEASE_START: process.env.GHL_FIELD_LEASE_START || 'xflK4edwKFVm1pHLJxew',
    LEASE_END: process.env.GHL_FIELD_LEASE_END || 'nMzB4QirjN9XP6BQwp0N',
    LEASE_ACTIVE: process.env.GHL_FIELD_LEASE_ACTIVE || 'KMpvAs09LKwF1mQoY6LV',
    // LEASE_PDF: '...' // PDF field not found yet
};