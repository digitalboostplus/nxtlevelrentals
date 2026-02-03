import Link from 'next/link';

import { formatLocalDate } from '@/lib/date';

type PortalHeroProps = {
  residentName: string;
  propertyName: string;
  unit: string;
  nextDueDate: string;
};

export default function PortalHero({ residentName, propertyName, unit, nextDueDate }: PortalHeroProps) {
  return (
    <section className="portal-hero" id="overview">
      <div className="portal-hero__inner">
        <div>
          <p className="portal-hero__eyebrow">
            Tenant Portal
          </p>
          <h1 className="portal-hero__title">Welcome back, {residentName}</h1>
          <p className="portal-hero__subtitle">
            Access everything you need in one place - rent payments, maintenance updates, important documents, and community
            announcements.
          </p>
          <Link href="/" className="ghost-button">
            View Landing Page
          </Link>
          <nav className="portal-hero__nav" aria-label="Portal sections">
            <a href="#overview">Overview</a>
            <a href="#payments">Payments</a>
            <a href="#maintenance">Maintenance</a>
            <a href="#documents">Documents</a>
          </nav>
        </div>
        <div className="portal-hero__details">
          <div>
            <strong>Property:</strong> {propertyName}
          </div>
          <div>
            <strong>Unit:</strong> {unit}
          </div>
          <div>
            <strong>Next rent due:</strong>{' '}
            {formatLocalDate(nextDueDate, { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </section>
  );
}
