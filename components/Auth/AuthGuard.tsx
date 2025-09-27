import { useRouter } from 'next/router';
import { useEffect, type ReactNode } from 'react';
import { useAuth, type UserRole } from '@/context/AuthContext';

type AuthGuardProps = {
  allowedRoles?: UserRole[];
  children: ReactNode;
};

const LoadingState = () => (
  <div className="auth-loading">
    <div className="auth-loading__spinner" aria-hidden />
    <p>Preparing your portal...</p>
    <style jsx>{`
      .auth-loading {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--color-muted);
      }

      .auth-loading__spinner {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 6px solid rgba(108, 92, 231, 0.18);
        border-top-color: var(--color-primary);
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const isSuperAdmin = role === 'super-admin';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const query = new URLSearchParams();
      if (router.asPath && router.asPath !== '/login') {
        query.set('next', router.asPath);
      }
      void router.replace(`/login${query.toString() ? `?${query.toString()}` : ''}`);
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role) && !isSuperAdmin) {
      void router.replace('/');
    }
  }, [allowedRoles, isSuperAdmin, loading, role, router, user]);

  const roleRestricted = Boolean(allowedRoles && role && !allowedRoles.includes(role) && !isSuperAdmin);

  if (loading || !user || roleRestricted) {
    return <LoadingState />;
  }

  return <>{children}</>;
}
