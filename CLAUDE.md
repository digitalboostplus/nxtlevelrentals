# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next Level Rentals is a property management tenant portal built with Next.js 14, React, TypeScript, and Firebase. It provides a public landing page, tenant portal, and admin dashboard for property management operations.

## Development Commands

### Essential Commands
```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint
```

### Firebase Commands
```bash
# Deploy everything (builds Next.js app + deploys to Firebase)
npm run deploy

# Deploy hosting only
npm run deploy:hosting

# Deploy Firestore and Storage rules only
npm run deploy:rules

# Start Firebase emulators for local testing
npm run emulators

# Seed user roles (requires service account JSON path)
npm run seed:roles
```

### Utility Scripts
Located in `scripts/` directory:
- `seed-roles.js` - Create initial user roles in Firestore (update UIDs before running)
- `manual-sync-ghl.js` - Manually sync individual tenant from GoHighLevel
- `sync-all-tenants.js` - Sync all tenant data from GoHighLevel
- `seed-maintenance.js` - Seed maintenance request data

Run with: `node scripts/<script-name>.js [args]`

## Architecture Overview

### Authentication & Authorization

- **AuthContext** (`context/AuthContext.tsx`): Global auth state with Firebase Authentication
  - User roles: `tenant`, `admin`, `super-admin`
  - Session persistence: `browserSessionPersistence` (logout on tab close)
  - Auto-loads user profile from Firestore `users/{uid}` collection
  - Exposes: `user`, `profile`, `role`, `loading`, `signIn`, `signOutUser`, `refreshProfile`

- **AuthGuard** (`components/Auth/AuthGuard.tsx`): Page-level auth protection
  - Redirects unauthenticated users to `/login` with `?next=` redirect
  - Enforces role-based access (`super-admin` bypasses all restrictions)
  - Shows loading spinner during auth checks

- **Page-level auth**: Add static properties to Next.js pages
  ```typescript
  PageComponent.requireAuth = true;
  PageComponent.allowedRoles = ['admin', 'super-admin'];
  ```

### Firebase Integration

- **Client SDK** (`lib/firebase.ts`): Lazy-initialized Firebase services
  - Mock mode support: Set `NEXT_PUBLIC_USE_MOCK=true` or omit Firebase env vars
  - Exports: `getFirebaseApp`, `getFirebaseAuth`, `getFirestoreClient`, `getStorageClient`, `getMessagingClient`, `getAnalyticsClient`
  - Singleton pattern prevents duplicate initialization

- **Admin SDK** (`lib/firebase-admin.ts`): Server-side Firebase operations
  - Supports service account credentials via env vars (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
  - Falls back to Application Default Credentials if env vars not set
  - Exports: `firebaseAdmin`, `adminDb`, `adminAuth`
  - Used in API routes and scripts only

- **Firebase Utils** (`lib/firebase-utils.ts`): High-level Firestore operations
  - Organized by domain: `authUtils`, `userUtils`, `maintenanceUtils`, `propertyUtils`, `paymentUtils`, `adminUtils`, `storageUtils`, `messagingUtils`, `analyticsUtils`
  - All mutations use `serverTimestamp()` for consistency
  - Includes TypeScript interfaces for all data models

### Firestore Collections

- `users/{uid}` - User profiles with role-based data
  - Fields: `role`, `email`, `displayName`, `propertyIds`, `managedProperties`, `unit`, `address`, `monthlyRent`
- `properties/{id}` - Property listings
- `maintenanceRequests/{id}` - Maintenance tickets
- `payments/{id}` - Payment records
- `ledger/{id}` - Financial ledger entries (charges, payments, adjustments)
- `paymentPlans/{id}` - Payment plan agreements
- `leaseDocuments/{id}` - Lease documents and addendums

**Security**: See `firestore.rules` for access control. Tenants can only read/write their own data; admins/super-admins have full access.

### GoHighLevel (GHL) Integration

- **GHL Client** (`lib/ghl.ts`): External CRM integration
  - `getGHLContactByEmail(email)` - Search contacts and parse custom fields
  - Custom field IDs hardcoded: `LEASE_START`, `LEASE_END`, `LEASE_ACTIVE`
  - Requires env vars: `GHL_ACCESS_TOKEN`, `LOCATION_ID`
  - Uses V2 API: `POST /contacts/search` with `Version: 2021-07-28` header

- **Lease Webhook** (`pages/api/ghl/lease.ts`): Receives lease updates from GHL

### Page Structure

- **Public**: `/` (landing), `/login`
- **Tenant**: `/portal` (requires `tenant` role)
- **Admin**: `/admin/*` (requires `admin` or `super-admin` role)
  - `/admin` - Dashboard with portfolio stats
  - `/admin/tenants` - Tenant management
  - `/admin/properties` - Property management
  - `/admin/ledger/[tenantId]` - Tenant ledger and payment plans

### Component Organization

- `components/Landing/` - Public landing page sections
- `components/Portal/` - Tenant portal features
- `components/Admin/` - Admin dashboard components
- `components/Auth/` - Authentication guards and flows
- `components/Layout/` - Site-wide layouts (Header, Footer, SiteLayout)
- `components/common/` - Shared UI components

### Styling

- CSS-in-JSX using `<style jsx>` (Next.js styled-jsx)
- Global styles: `styles/globals.css`
- Design tokens: CSS custom properties (e.g., `var(--color-primary)`)
- Responsive breakpoints in component-level styles

### TypeScript Configuration

- Path alias: `@/*` maps to project root
- Strict mode enabled
- Target: ES5 for broad browser compatibility

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required for Development
- `NEXT_PUBLIC_FIREBASE_*` - Firebase web config (API key, project ID, etc.)
- `FIREBASE_CLIENT_EMAIL` - Service account email (for admin operations)
- `FIREBASE_PRIVATE_KEY` - Service account private key (escape newlines as `\n`)

### Optional Integrations
- `GHL_ACCESS_TOKEN` - GoHighLevel API token
- `LOCATION_ID` - GoHighLevel location ID
- `STRIPE_PUBLIC_KEY` / `STRIPE_SECRET_KEY` - Payment processing
- `SENDGRID_API_KEY` - Transactional emails
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` - Push notifications

**Note**: `.env.example` contains pre-configured Firebase credentials for `rental-app-3ec4a` project. Use these for quick start or replace with your own Firebase project.

## Common Patterns

### Creating Protected Pages
```typescript
import type { NextPageWithAuth } from './_app';

const MyPage: NextPageWithAuth = () => {
  return <div>Protected content</div>;
};

MyPage.requireAuth = true;
MyPage.allowedRoles = ['admin', 'super-admin'];

export default MyPage;
```

### Using Firebase Utils
```typescript
import { maintenanceUtils } from '@/lib/firebase-utils';

// Create maintenance request
const requestId = await maintenanceUtils.createRequest({
  tenantId: user.uid,
  propertyId: 'prop-123',
  title: 'Leaky faucet',
  description: 'Kitchen sink dripping',
  priority: 'medium',
  status: 'pending'
});

// Fetch tenant's requests
const requests = await maintenanceUtils.getRequestsByTenant(user.uid);
```

### Accessing Auth Context
```typescript
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, profile, role, signIn, signOutUser } = useAuth();

  if (role === 'admin') {
    // Show admin features
  }
}
```

### API Routes with Admin SDK
```typescript
import { adminDb } from '@/lib/firebase-admin';

export default async function handler(req, res) {
  const doc = await adminDb.collection('users').doc(uid).get();
  res.json(doc.data());
}
```

## Firebase Deployment

This project uses Firebase Hosting with Next.js integration (`frameworksBackend`):
- Hosting source: `.` (project root)
- Backend region: `us-central1`
- Build command runs automatically during deployment

The `firebase.json` config handles:
- Firestore rules and indexes
- Storage rules
- Next.js server-side rendering via Cloud Functions/Cloud Run

## Important Notes

- **Mock Mode**: Firebase can run in mock mode for UI development without credentials. Mock implementations in `lib/firebase-mock.ts`.
- **Session Security**: Auth uses `browserSessionPersistence` - users logout when browser closes.
- **Super Admin**: The `super-admin` role bypasses all role restrictions.
- **Date Formatting**: Use `formatDate()` from `lib/date.ts` for consistent date display.
- **File Uploads**: Use `storageUtils.uploadFile()` for maintenance request attachments and documents.
- **Server Timestamps**: Always use `serverTimestamp()` for `createdAt`/`updatedAt` fields to ensure consistent timing across timezones.
