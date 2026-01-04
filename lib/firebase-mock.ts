// Mock Firebase implementation for local development
import type { User } from 'firebase/auth';

// Mock user for local development
const mockUser: Partial<User> = {
  uid: 'mock-user-123',
  email: 'tenant@nxtlevelrentals.com',
  displayName: 'John Doe',
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => { },
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token' } as any),
  reload: async () => { },
  toJSON: () => ({}),
  phoneNumber: null,
  photoURL: null,
  providerId: 'mock'
};

// Mock Auth
export const getFirebaseAuth = () => {
  return {
    currentUser: mockUser as User,
    signInWithEmailAndPassword: async (email: string, password: string) => {
      console.log('Mock sign in:', email);
      return { user: mockUser };
    },
    signOut: async () => {
      console.log('Mock sign out');
    },
    onAuthStateChanged: (callback: (user: User | null) => void) => {
      // Simulate logged in user
      setTimeout(() => callback(mockUser as User), 100);
      return () => { }; // unsubscribe function
    }
  };
};

// Mock Firestore
export const getFirestoreClient = () => {
  const mockMaintenanceRequest = {
    id: 'mock-req-1',
    tenantId: 'mock-user-123',
    propertyId: 'prop-123',
    category: 'plumbing',
    priority: 'high',
    title: 'Leaking Sink',
    description: 'The kitchen sink is leaking continuously.',
    status: 'submitted',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const createMockQuery = () => ({
    get: async () => ({
      docs: [
        {
          id: mockMaintenanceRequest.id,
          data: () => mockMaintenanceRequest
        }
      ]
    }),
    where: () => createMockQuery(),
    orderBy: () => createMockQuery(),
  });

  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists: () => true,
          data: () => {
            if (name === 'users') {
              return {
                role: 'tenant',
                displayName: 'John Doe',
                email: 'tenant@nxtlevelrentals.com',
                propertyIds: ['prop-123'],
                createdAt: new Date()
              };
            }
            if (name === 'maintenanceRequests') {
              return mockMaintenanceRequest;
            }
            return {};
          }
        }),
        set: async (data: any) => {
          console.log('Mock Firestore set:', { collection: name, id, data });
        },
        update: async (data: any) => {
          console.log('Mock Firestore update:', { collection: name, id, data });
        }
      }),
      // Support query chaining
      where: () => createMockQuery(),
      orderBy: () => createMockQuery(),
      get: async () => ({
        docs: [
          {
            id: mockMaintenanceRequest.id,
            data: () => mockMaintenanceRequest
          }
        ]
      }),
      add: async (data: any) => {
        console.log('Mock Firestore add:', { collection: name, data });
        return { id: 'mock-doc-id' };
      }
    })
  };
};

// Mock Storage
export const getStorageClient = () => {
  return {
    ref: (path: string) => ({
      put: async (file: File) => {
        console.log('Mock Storage upload:', path);
        return {
          ref: {
            getDownloadURL: async () => 'https://via.placeholder.com/150'
          }
        };
      },
      getDownloadURL: async () => 'https://via.placeholder.com/150'
    })
  };
};

// Mock Messaging
export const getMessagingClient = () => null;

// Mock Analytics
export const getAnalyticsClient = () => null;

// Mock Firebase App
export const getFirebaseApp = () => ({
  name: 'mock-app',
  options: {},
  automaticDataCollectionEnabled: false
});
