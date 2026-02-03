import type { NextPage } from 'next';
import type { AppProps } from 'next/app';
import { AuthProvider, type UserRole } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ChatProvider } from '@/components/Chat/ChatProvider';
import AuthGuard from '@/components/Auth/AuthGuard';
import ToastContainer from '@/components/common/Toast';
import ChatWidget from '@/components/Chat/ChatWidget';
import '@/styles/globals.css';

export type NextPageWithAuth<P = Record<string, unknown>, IP = P> = NextPage<P, IP> & {
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
};

type AppPropsWithAuth = AppProps & {
  Component: NextPageWithAuth;
};

export default function App({ Component, pageProps }: AppPropsWithAuth) {
  const content = Component.requireAuth ? (
    <AuthGuard allowedRoles={Component.allowedRoles}>
      <Component {...pageProps} />
    </AuthGuard>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <ToastProvider>
      <AuthProvider>
        <ChatProvider>
          {content}
          <ChatWidget />
          <ToastContainer />
        </ChatProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
