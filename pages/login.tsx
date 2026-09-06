import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { AuthErrorCodes } from 'firebase/auth';
import SiteLayout from '@/components/Layout/SiteLayout';
import { useAuth } from '@/context/AuthContext';
import { company } from '@/data/site';

const errorMap: Record<string, string> = {
  [AuthErrorCodes.INVALID_PASSWORD]: 'Incorrect email or password. Try again.',
  [AuthErrorCodes.USER_DELETED]: 'No account found for that email.',
  [AuthErrorCodes.INVALID_EMAIL]: 'Enter a valid email address.',
  [AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER]: 'Too many attempts. Please wait a moment and retry.'
};

const portalHighlights = [
  {
    title: 'Residents',
    description: 'See your balance and payment history, send a repair request with photos, and find your lease documents.'
  },
  {
    title: 'Property owners',
    description: 'Monthly statements, expenses, payouts and open work orders across your homes.'
  },
  {
    title: 'No account yet?',
    description: 'Accounts are created by the office when you sign a lease. Call or email and we will set you up.'
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
        <title>Sign in - Next Level Rentals Tenant Portal</title>
        <meta
          name="description"
          content="Access your Next Level Rentals tenant portal to view documents, submit maintenance requests, and stay informed about community updates."
        />
      </Head>
      <div className="owner-page auth" aria-labelledby="loginHeading">
        <div className="auth__grid">
          <section className="auth__welcome" aria-label="What you can do after signing in">
            <p className="section-eyebrow">Sign in</p>
            <h1 id="loginHeading">Welcome back.</h1>
            <p className="auth__intro">
              One sign-in for residents and property owners. Use the email address the office has on file for you.
            </p>
            <ul className="owner-list auth__highlights">
              {portalHighlights.map((highlight) => (
                <li key={highlight.title}>
                  <div className="owner-list__text">
                    <strong>{highlight.title}</strong>
                    <span>{highlight.description}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="auth__support">
              Trouble signing in? Call or text <a href={`tel:${company.phoneTel}`}>{company.phoneDisplay}</a> or email{' '}
              <a href={`mailto:${company.email}`}>{company.email}</a>.
            </p>
          </section>

          <section className="owner-card auth-card" aria-label="Login form">
            <div className="owner-card__head">
              <h2>Sign in to your portal</h2>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="owner-field" htmlFor="email">
                <span>Email address</span>
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
              </label>

              <label className="owner-field" htmlFor="password">
                <span>Password</span>
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
              </label>

              {formError ? <p className="owner-alert" role="alert">{formError}</p> : null}

              <button type="submit" className="primary-button auth-form__submit" disabled={submitting || loading}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <div className="auth-card__foot">
              <p className="owner-note">
                Forgot your password? Call or text <a href={`tel:${company.phoneTel}`}>{company.phoneDisplay}</a> and we will send a reset link.
              </p>
              <p className="owner-note">
                Just need to report a repair? <Link href="/#maintenance">Use the public form</Link>, no sign-in needed.
              </p>
            </div>
          </section>
        </div>
      </div>
      <style jsx>{`
        .auth {
          max-width: var(--max-width);
          margin: 0 auto;
          min-height: calc(100vh - var(--header-height) - 320px);
        }

        .auth__grid {
          display: grid;
          grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
          gap: 3rem;
          align-items: start;
        }

        .auth__welcome {
          display: grid;
          gap: 1.25rem;
          max-width: 560px;
        }

        .auth__welcome h1 {
          margin: 0;
          font-size: clamp(2rem, 4vw, 2.75rem);
          color: var(--color-text);
        }

        .auth__intro {
          margin: 0;
          color: var(--color-muted);
          line-height: 1.7;
        }

        .auth__highlights > :global(li) {
          background: var(--color-surface);
        }

        .auth__support {
          margin: 0;
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .auth__support :global(a),
        .auth-card__foot :global(a) {
          color: var(--color-primary);
          font-weight: 600;
        }

        .auth-card {
          gap: 1.5rem;
        }

        .auth-form {
          display: grid;
          gap: 1rem;
        }

        .auth-form :global(.owner-field input) {
          width: 100%;
          min-height: 48px;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-background);
          color: var(--color-text);
          font: inherit;
          font-size: 1rem;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .auth-form :global(.owner-field input:focus) {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-accent-subtle);
        }

        .auth-form :global(.owner-field input:disabled) {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-form__submit {
          margin-top: 0.25rem;
          width: 100%;
        }

        .auth-card__foot {
          display: grid;
          gap: 0.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--color-border);
        }

        @media (max-width: 900px) {
          .auth__grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .auth-card {
            order: -1;
          }
        }
      `}</style>
    </SiteLayout>
  );
}
