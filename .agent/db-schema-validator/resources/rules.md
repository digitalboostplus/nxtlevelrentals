rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super-admin'];
    }

    // Helper function to check if user is landlord
    function isLandlord() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'landlord';
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth.uid == userId || isAdmin();
      allow delete: if isAdmin();
      
      match /notifications/{notificationId} {
        allow read: if request.auth.uid == userId;
        allow write: if isAdmin(); // Usually written by system/admin
      }
      
      match /activityLogs/{logId} {
        allow read: if request.auth.uid == userId || isAdmin();
        allow create: if request.auth.uid == userId;
      }
    }
    
    // Properties collection
    match /properties/{propertyId} {
      allow read: if request.auth != null;
      allow write: if isAdmin() || (isLandlord() && request.resource.data.landlordId == request.auth.uid);
    }
    
    // Leases collection
    match /leases/{leaseId} {
      allow read: if request.auth != null && (
        resource.data.tenantId == request.auth.uid || 
        resource.data.landlordId == request.auth.uid || 
        isAdmin()
      );
      allow write: if isAdmin() || isLandlord();
    }
    
    // Payments collection
    match /payments/{paymentId} {
      allow read: if request.auth != null && (
        resource.data.tenantId == request.auth.uid || 
        resource.data.landlordId == request.auth.uid || 
        isAdmin()
      );
      allow create: if request.auth != null; // Tenants can trigger payment creation via API
      allow update: if isAdmin();
    }
    
    // Maintenance Requests
    match /maintenanceRequests/{requestId} {
      allow read: if request.auth != null && (
        resource.data.tenantId == request.auth.uid || 
        resource.data.landlordId == request.auth.uid || 
        isAdmin()
      );
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        resource.data.tenantId == request.auth.uid || 
        isAdmin() || isLandlord()
      );
    }

    // Ledger
    match /ledger/{entryId} {
      allow read: if request.auth != null && (
        resource.data.tenantId == request.auth.uid || 
        resource.data.landlordId == request.auth.uid || 
        isAdmin()
      );
      allow write: if isAdmin();
    }

    // Landlord Expenses
    match /landlordExpenses/{expenseId} {
      allow read, write: if isAdmin() || (isLandlord() && resource.data.landlordId == request.auth.uid);
    }

    // Saved Payment Methods
    match /savedPaymentMethods/{methodId} {
      allow read, delete: if request.auth != null && resource.data.tenantId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.tenantId == request.auth.uid;
      allow update: if false; // Re-create instead of update for security
    }
  }
}
