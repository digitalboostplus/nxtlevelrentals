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

const portalHighlights = [
  {
    title: 'Plan ahead with smart alerts',
    description: 'Receive push, email, or SMS notifications for weather, maintenance appointments, and community news.'
  },
  {
    title: 'Keep documents at your fingertips',
    description: 'Download leases, renewal offers, and inspection reports from a secure digital vault whenever you need them.'
  },
  {
    title: 'Report issues in minutes',
    description: 'Submit maintenance requests with photos, pick preferred times, and chat with technicians in real time.'
  }
];

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
        <title>Sign in · Next Level Rentals Tenant Portal</title>
        <meta
          name="description"
          content="Access your Next Level Rentals tenant portal to view documents, submit maintenance requests, and stay informed about community updates."
        />
      </Head>
      <div className="auth" aria-labelledby="loginHeading">
        <section className="auth__welcome" aria-label="Resident experience highlights">
          <div className="auth__welcome-inner">
            <p className="auth__eyebrow">Tenant access</p>
            <h1 id="loginHeading">Sign in to manage your home</h1>
            <p className="auth__intro">
              Your personalized resident hub keeps payments, documents, maintenance, and neighborhood updates organized. Sign in
              to stay connected to your property team.
            </p>
            <ul className="auth__highlights">
              {portalHighlights.map((highlight) => (
                <li key={highlight.title}>
                  <strong>{highlight.title}</strong>
                  <p>{highlight.description}</p>
                </li>
              ))}
            </ul>
            <div className="auth__support">
              <span>Need help accessing your account?</span>
              <Link href="mailto:support@nxtlevelrentals.com">Email resident support</Link>
            </div>
          </div>
        </section>
        <section className="auth-card" aria-label="Tenant login form">
          <header className="auth-card__header">
            <h2>Welcome back</h2>
            <p>Use your registered email and password to access the tenant portal.</p>
          </header>
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
              disabled={loading || submitting}
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
              disabled={loading || submitting}
            />

            {formError ? <p className="auth-form__error" role="alert">{formError}</p> : null}

            <button type="submit" className="primary-button auth-form__submit" disabled={submitting || loading}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <footer className="auth-card__footer">
            <div>
              <span>New to the community?</span>
              <Link href="mailto:welcome@nxtlevelrentals.com">Request an invite</Link>
            </div>
            <div>
              <span>Looking for the resident handbook?</span>
              <Link href="/">Return to landing page</Link>
            </div>
          </footer>
        </section>
      </div>
      <style jsx>{`
        .auth {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          min-height: calc(100vh - 120px);
          background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.18), transparent 55%), #f8fafc;
        }

        .auth__welcome {
          display: flex;
          align-items: center;
          padding: clamp(3rem, 6vw, 4.5rem) clamp(2rem, 6vw, 5rem);
        }

        .auth__welcome-inner {
          max-width: 460px;
          display: grid;
          gap: 1.5rem;
        }

        .auth__eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.28em;
          font-weight: 700;
          font-size: 0.85rem;
          color: rgba(15, 23, 42, 0.6);
        }

        .auth__intro {
          color: rgba(15, 23, 42, 0.72);
          line-height: 1.7;
        }

        .auth__highlights {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 1rem;
        }

        .auth__highlights li {
          background: white;
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          box-shadow: var(--shadow-sm);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .auth__highlights strong {
          display: block;
          font-size: 1rem;
          color: #1e293b;
          margin-bottom: 0.35rem;
        }

        .auth__highlights p {
          color: rgba(15, 23, 42, 0.65);
          line-height: 1.6;
        }

        .auth__support {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.5rem;
          font-size: 0.95rem;
          color: rgba(15, 23, 42, 0.65);
        }

        .auth__support a {
          color: var(--color-primary);
          font-weight: 600;
        }

        .auth-card {
          background: white;
          padding: clamp(3rem, 5vw, 4rem);
          display: grid;
          gap: 2rem;
          border-radius: 0;
          box-shadow: none;
        }

        .auth-card__header h2 {
          font-size: 2rem;
          color: #0f172a;
        }

        .auth-card__header p {
          color: rgba(15, 23, 42, 0.6);
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
          padding: 0.9rem 1rem;
          font-size: 1rem;
          transition: border 0.2s ease, box-shadow 0.2s ease;
          background: #f8fafc;
        }

        .auth-form input:focus {
          outline: none;
          border-color: rgba(108, 92, 231, 0.45);
          box-shadow: 0 0 0 4px rgba(108, 92, 231, 0.12);
        }

        .auth-form input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-form__error {
          color: #dc2626;
          font-weight: 500;
        }

        .auth-form__submit {
          margin-top: 0.5rem;
        }

        .auth-card__footer {
          display: grid;
          gap: 1rem;
          font-size: 0.95rem;
          color: rgba(15, 23, 42, 0.6);
        }

        .auth-card__footer a {
          color: var(--color-primary);
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .auth {
            min-height: auto;
          }

          .auth-card {
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            box-shadow: var(--shadow-md);
          }
        }
      `}</style>
    </SiteLayout>
  );
}
