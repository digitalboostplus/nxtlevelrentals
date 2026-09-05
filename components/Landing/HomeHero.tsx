import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { company, emergencyPhone } from '@/data/site';

type Tile = {
  title: string;
  copy: string;
  href: string;
  icon: ReactNode;
  tone?: 'primary' | 'danger';
  external?: boolean;
};

function CardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.7-6.7Z" />
      <path d="M9 15 4.5 19.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function HomeHero() {
  const emergency = emergencyPhone();

  const tiles: Tile[] = [
    {
      title: 'Pay rent',
      copy: 'Card, bank transfer, or autopay in the portal',
      href: '/login?next=/portal',
      icon: <CardIcon />,
    },
    {
      title: 'Request a repair',
      copy: 'Two minutes, no account needed',
      href: '#maintenance',
      icon: <WrenchIcon />,
      tone: 'primary',
    },
    {
      title: 'Emergency',
      copy: `Call ${emergency.display}, any hour`,
      href: `tel:${emergency.tel}`,
      icon: <PhoneIcon />,
      tone: 'danger',
      external: true,
    },
    {
      title: 'Local guide',
      copy: 'Utilities, trash days, who to call',
      href: '#local-guide',
      icon: <PinIcon />,
    },
  ];

  return (
    <section className="home-hero" aria-labelledby="homeHeroHeading">
      <div className="home-hero__photo" aria-hidden="true">
        <Image
          src="/images/kc-skyline.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 42%' }}
        />
        <div className="home-hero__overlay" />
      </div>
      <a
        className="home-hero__credit"
        href="https://commons.wikimedia.org/wiki/File:Kansas_City_skyline_as_night_descends.jpg"
        target="_blank"
        rel="noreferrer"
      >
        Photo: Caleb Zahnd, CC BY 2.0
      </a>
      <div className="home-hero__inner">
        <div className="home-hero__intro">
          <p className="section-eyebrow">{company.city} residents</p>
          <h1 id="homeHeroHeading">Welcome home.</h1>
          <p className="home-hero__lede">
            Pay rent, report a repair, or find the number you need. Everything you need from us is one tap away, no
            login required.
          </p>
        </div>

        <div className="home-hero__tiles" role="list">
          {tiles.map((tile) => {
            const className = `home-tile${tile.tone ? ` home-tile--${tile.tone}` : ''}`;
            const body = (
              <>
                <span className="home-tile__icon" aria-hidden="true">
                  {tile.icon}
                </span>
                <span className="home-tile__text">
                  <strong>{tile.title}</strong>
                  <span>{tile.copy}</span>
                </span>
              </>
            );
            return tile.external ? (
              <a key={tile.title} href={tile.href} className={className} role="listitem">
                {body}
              </a>
            ) : (
              <Link key={tile.title} href={tile.href} className={className} role="listitem">
                {body}
              </Link>
            );
          })}
        </div>

        <div className="home-hero__facts">
          <span>
            Call or text{' '}
            <a href={`tel:${company.phoneTel}`} className="home-hero__fact-strong">
              {company.phoneDisplay}
            </a>
          </span>
          {company.officeHours ? (
            <span>
              Office hours <span className="home-hero__fact-strong">{company.officeHours}</span>
            </span>
          ) : null}
          <span>Owner-operated in {company.city}</span>
          <span className="home-hero__owner">
            Property owner? <Link href="/login?next=/landlord">Sign in to the landlord console</Link>
          </span>
        </div>
      </div>

      <style jsx>{`
        .home-hero {
          position: relative;
          overflow: hidden;
          padding: calc(var(--header-height) + clamp(3rem, 7vw, 6rem)) 1.5rem clamp(3rem, 5vw, 4.5rem);
          background: var(--color-surface);
        }

        /* Skyline sits behind everything; the overlay keeps the left column and tiles readable. */
        .home-hero__photo {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .home-hero__overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(17, 24, 39, 0.96) 0%, rgba(17, 24, 39, 0.82) 45%, rgba(17, 24, 39, 0.45) 100%),
            linear-gradient(180deg, rgba(17, 24, 39, 0.35) 0%, rgba(17, 24, 39, 0.1) 40%, rgba(17, 24, 39, 0.92) 100%),
            radial-gradient(circle at top left, rgba(47, 128, 237, 0.18), transparent 55%);
        }

        .home-hero__credit {
          position: absolute;
          right: 1rem;
          bottom: 0.6rem;
          z-index: 1;
          font-size: 0.7rem;
          color: rgba(154, 167, 184, 0.7);
        }

        .home-hero__credit:hover {
          color: var(--color-text);
        }

        .home-hero__inner {
          position: relative;
          z-index: 1;
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: clamp(1.75rem, 4vw, 2.5rem);
        }

        .home-hero__intro {
          max-width: 760px;
          display: grid;
          gap: 1rem;
        }

        .home-hero__intro h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          line-height: 1.1;
          color: var(--color-text);
        }

        .home-hero__lede {
          font-size: clamp(1.05rem, 1.5vw, 1.2rem);
          line-height: 1.7;
          color: var(--color-muted);
        }

        .home-hero__tiles {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        .home-hero__facts {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem 2rem;
          align-items: center;
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        .home-hero__fact-strong {
          color: var(--color-text);
          font-weight: 600;
        }

        .home-hero__owner {
          margin-left: auto;
        }

        .home-hero__owner :global(a) {
          color: var(--color-primary);
          font-weight: 600;
        }

        @media (max-width: 960px) {
          .home-hero__tiles {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-hero__owner {
            margin-left: 0;
          }
        }

        @media (max-width: 480px) {
          .home-hero__facts {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.4rem;
          }
        }
      `}</style>

      <style jsx global>{`
        .home-tile {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1.5rem;
          min-height: 176px;
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          background: var(--glass-background);
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-sm);
          color: var(--color-text);
          transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
        }

        .home-tile:hover,
        .home-tile:focus-visible {
          transform: translateY(-3px);
          border-color: rgba(59, 155, 255, 0.45);
          box-shadow: var(--shadow-md);
        }

        .home-tile--primary {
          border-color: rgba(59, 155, 255, 0.45);
          box-shadow: var(--shadow-glow);
        }

        .home-tile--danger {
          border-color: rgba(248, 113, 113, 0.45);
        }

        .home-tile--danger:hover,
        .home-tile--danger:focus-visible {
          border-color: rgba(248, 113, 113, 0.7);
        }

        .home-tile__icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--color-primary-light);
          color: var(--color-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .home-tile--danger .home-tile__icon {
          background: var(--tag-error-bg);
          color: var(--tag-error-text);
        }

        .home-tile__text {
          display: grid;
          gap: 0.25rem;
        }

        .home-tile__text strong {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .home-tile__text span {
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        @media (max-width: 480px) {
          .home-tile {
            min-height: 140px;
            padding: 1.25rem;
          }

          .home-tile__text strong {
            font-size: 1.05rem;
          }
        }
      `}</style>
    </section>
  );
}
