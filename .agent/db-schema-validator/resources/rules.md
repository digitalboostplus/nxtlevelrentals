rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - properly secured
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      allow delete: if false;
      
      // User's private notifications subcollection
      match /notifications/{notificationId} {
        allow read: if request.auth.uid == userId;
        allow write: if false; // Only written by Cloud Functions
      }
    }
    
    // Products collection - public read, admin write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Orders collection - user can only access their own
    match /orders/{orderId} {
      allow read: if request.auth != null && 
                    resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && 
                      request.resource.data.user_id == request.auth.uid;
      allow update, delete: if false;
    }
    
    // Admin-only collection
    match /admin_settings/{document} {
      allow read, write: if request.auth != null && 
                           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
