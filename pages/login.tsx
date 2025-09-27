import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { AuthErrorCodes } from 'firebase/auth';
import SiteLayout from '@/components/Layout/SiteLayout';
import { useAuth } from '@/context/AuthContext';

const errorMap: Record<string, string> = {
  [AuthErrorCodes.INVALID_PASSWORD]: 'Incorrect email or password. Try again.',
  [AuthErrorCodes.USER_DELETED]: 'No account found for that email.',
  [AuthErrorCodes.INVALID_EMAIL]: 'Enter a valid email address.',
  [AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER]: 'Too many attempts. Please wait a moment and retry.'
};

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, error, loading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTarget = typeof router.query.next === 'string' ? router.query.next : '/portal';

  useEffect(() => {
    if (user) {
      void router.replace(redirectTarget);
    }
  }, [redirectTarget, router, user]);

  useEffect(() => {
    if (!error) {
      setFormError(null);
      return;
    }

    const mapped = errorMap[error.code] ?? 'Unable to sign in. Please try again.';
    setFormError(mapped);
  }, [error]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      await signIn(email.trim(), password);
      await router.replace(redirectTarget);
    } catch (err) {
      console.error('Authentication failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <Head>
        <title>Sign in - Next Level Rentals</title>
      </Head>
      <div className="auth">
        <section className="auth-card" aria-labelledby="loginHeading">
          <div className="auth-card__header">
            <h1 id="loginHeading">Welcome back</h1>
            <p>Sign in to continue to your tenant or admin portal.</p>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-form__label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />

            <label className="auth-form__label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />

            {formError ? <p className="auth-form__error" role="alert">{formError}</p> : null}

            <button type="submit" className="primary-button auth-form__submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className="auth-card__footer">
            <span>Need access?</span>
            <Link href="mailto:management@nxtlevelrentals.com">Contact the management team</Link>
          </div>
        </section>
      </div>
      <style jsx>{`
        .auth {
          display: flex;
          justify-content: center;
          padding: 6rem 1.5rem;
        }

        .auth-card {
          width: min(450px, 100%);
          background: var(--color-surface);
          padding: 3rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          border: 1px solid rgba(108, 92, 231, 0.08);
          display: grid;
          gap: 2rem;
        }

        .auth-card__header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }

        .auth-card__header p {
          color: var(--color-muted);
        }

        .auth-form {
          display: grid;
          gap: 1rem;
        }

        .auth-form__label {
          font-weight: 600;
          color: #111827;
        }

        .auth-form input {
          border-radius: 12px;
          border: 1px solid var(--color-border);
          padding: 0.85rem 1rem;
          font-size: 1rem;
          transition: border 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-form input:focus {
          outline: none;
          border-color: rgba(108, 92, 231, 0.45);
          box-shadow: 0 0 0 4px rgba(108, 92, 231, 0.12);
        }

        .auth-form__error {
          color: #dc2626;
          font-weight: 500;
        }

        .auth-form__submit {
          margin-top: 0.5rem;
        }

        .auth-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: var(--color-muted);
        }

        .auth-card__footer a {
          color: var(--color-primary);
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .auth-card {
            padding: 2.25rem;
          }
        }
      `}</style>
    </SiteLayout>
  );
}
