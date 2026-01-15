import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserSessionPersistence,
  type AuthError,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, type DocumentData } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase';

export type UserRole = 'admin' | 'tenant' | 'super-admin' | 'landlord';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  propertyIds?: string[];
  managedProperties?: string[];
  landlordId?: string; // Reference to landlords/{id} for landlord users
  unit?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  monthlyRent?: number;
};

type AuthContextValue = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: AuthError | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseProfile = (user: FirebaseUser, data: DocumentData | undefined): UserProfile => {
  const role = (data?.role as UserRole | undefined) ?? 'tenant';

  return {
    id: user.uid,
    email: data?.email ?? user.email ?? '',
    displayName: data?.displayName ?? data?.fullName ?? user.displayName ?? 'Resident',
    role,
    propertyIds: data?.propertyIds,
    managedProperties: data?.managedProperties,
    landlordId: data?.landlordId,
    unit: data?.unit,
    address: data?.address,
    city: data?.city,
    state: data?.state,
    zip: data?.zip,
    monthlyRent: data?.monthlyRent ? Number(data.monthlyRent) : undefined
  } satisfies UserProfile;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);
      if (!firebaseUser) {
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      await loadProfile(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const db = getFirestoreClient();
      const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
      const parsed = parseProfile(firebaseUser, snapshot.data());
      setProfile(parsed);
      setRole(parsed.role);
    } catch (err) {
      console.error('Failed to load user profile', err);
      const fallbackProfile = parseProfile(firebaseUser, undefined);
      setProfile(fallbackProfile);
      setRole(fallbackProfile.role);
    }
  };

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    setError(null);
    try {
      setLoading(true);
      // Force session persistence (logout on tab close) for stricter security
      await setPersistence(auth, browserSessionPersistence);
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      await loadProfile(credentials.user);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, role, loading, signIn, signOutUser, refreshProfile, error }),
    [user, profile, role, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
