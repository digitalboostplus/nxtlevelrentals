# Firebase Integration Guide

This document outlines the Firebase services integrated into the NextLevel Rentals application and how to use them.

## 🔥 Firebase Services Integrated

### 1. Firebase Authentication
- **Email/Password Authentication**: Users can sign up and sign in
- **User Role Management**: Tenant and Admin roles with Firestore-based permissions
- **Auth State Management**: Real-time authentication state tracking

### 2. Cloud Firestore Database
- **Collections**:
  - `users`: User profiles and roles
  - `properties`: Property listings and details
  - `maintenanceRequests`: Maintenance request tracking
  - `leaseDocuments`: Lease document management
  - `payments`: Payment history and tracking
- **Security Rules**: Role-based access control
- **Indexes**: Optimized queries for common operations

### 3. Firebase Storage
- **File Uploads**: Property images, maintenance request attachments, lease documents
- **Security Rules**: Role-based file access
- **Organized Structure**: Files organized by collection and user

### 4. Firebase Cloud Messaging (FCM)
- **Push Notifications**: Real-time notifications for maintenance updates
- **Background Messages**: Notifications when app is not active
- **Service Worker**: Handles background message processing

### 5. Firebase Analytics
- **User Tracking**: Login, signup, and feature usage analytics
- **Custom Events**: Maintenance requests, property views, etc.
- **Performance Monitoring**: App performance insights

### 6. Firebase Hosting
- **Static Hosting**: Deploy the Next.js app to Firebase
- **Custom Domain**: Configure custom domain for production
- **SSL Certificate**: Automatic HTTPS

## 🚀 Getting Started

### 1. Environment Setup
Copy the environment file and add your Firebase configuration:

```bash
cp env.example .env.local
```

Update `.env.local` with your Firebase project details:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase CLI Setup
Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

Login to Firebase:
```bash
firebase login
```

### 4. Deploy Firebase Rules
Deploy Firestore and Storage security rules:
```bash
firebase deploy --only firestore:rules,storage
```

### 5. Deploy to Firebase Hosting
Build and deploy your app:
```bash
npm run build
firebase deploy --only hosting
```

## 📱 Usage Examples

### Authentication
```typescript
import { authUtils } from '@/lib/firebase-utils';

// Sign in
await authUtils.signIn('user@example.com', 'password');

// Sign up
await authUtils.signUp('user@example.com', 'password', 'John Doe');

// Sign out
await authUtils.signOut();
```

### Firestore Operations
```typescript
import { maintenanceUtils, propertyUtils } from '@/lib/firebase-utils';

// Create maintenance request
const requestId = await maintenanceUtils.createRequest({
  tenantId: 'user123',
  propertyId: 'property456',
  title: 'Broken faucet',
  description: 'Kitchen faucet is leaking',
  priority: 'medium',
  status: 'pending'
});

// Get properties
const properties = await propertyUtils.getProperties();
```

### File Upload
```typescript
import { storageUtils } from '@/lib/firebase-utils';

// Upload file
const fileUrl = await storageUtils.uploadFile(
  file, 
  `properties/${propertyId}/images/${file.name}`
);
```

### Push Notifications
```typescript
import { messagingUtils } from '@/lib/firebase-utils';

// Request permission and get token
const token = await messagingUtils.requestPermission();

// Listen for messages
messagingUtils.onMessage((payload) => {
  console.log('Message received:', payload);
});
```

## 🔒 Security Rules

### Firestore Rules
- Users can only read/write their own user document
- Properties are readable by all authenticated users, writable by admins only
- Maintenance requests are readable by the tenant who created them and admins
- Lease documents and payments follow similar tenant/admin access patterns

### Storage Rules
- Users can upload their own profile images
- Property images are readable by all, writable by admins
- Maintenance request attachments are accessible by the requesting tenant and admins
- Lease documents are readable by tenants, writable by admins

## 📊 Analytics Events

The app tracks the following events:
- `login`: User login events
- `sign_up`: User registration events
- `maintenance_request_created`: New maintenance requests
- `property_viewed`: Property page views
- `payment_made`: Payment completion

## 🛠️ Development

### Local Development
```bash
npm run dev
```

### Firebase Emulator Suite
For local development with Firebase services:
```bash
firebase emulators:start
```

### Linting
```bash
npm run lint
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase
```bash
firebase deploy
```

### Deploy Specific Services
```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage
```

## 📋 Available Firebase MCP Tools

The Firebase MCP server provides the following tools for your application:

### Project Management
- `firebase_get_environment`: Get current Firebase environment
- `firebase_list_projects`: List available Firebase projects
- `firebase_create_project`: Create new Firebase project
- `firebase_get_project`: Get current project details

### Authentication
- `firebase_auth_get_user`: Get user by email/phone/UID
- `firebase_auth_list_users`: List all users
- `firebase_auth_disable_user`: Enable/disable user accounts
- `firebase_auth_set_claim`: Set custom user claims

### Firestore
- `firestore_get_documents`: Get documents by path
- `firestore_query_collection`: Query collections with filters
- `firestore_list_collections`: List all collections
- `firestore_get_rules`: Get current security rules
- `firestore_validate_rules`: Validate security rules

### Storage
- `storage_get_rules`: Get Storage security rules
- `storage_validate_rules`: Validate Storage rules
- `storage_get_object_download_url`: Get download URLs

### Hosting
- `firebase_list_apps`: List registered apps
- `firebase_get_sdk_config`: Get SDK configuration

### Messaging
- `messaging_send_message`: Send push notifications

### Analytics & Remote Config
- `remoteconfig_get_template`: Get Remote Config
- `remoteconfig_publish_template`: Publish Remote Config

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Errors**: Check Firebase project configuration and API keys
2. **Permission Denied**: Verify Firestore/Storage security rules
3. **Build Errors**: Ensure all environment variables are set
4. **Deployment Issues**: Check Firebase CLI authentication and project selection

### Getting Help

- Check Firebase Console for project status
- Review security rules in Firebase Console
- Use Firebase CLI logs for deployment issues
- Consult Firebase documentation for specific service issues
