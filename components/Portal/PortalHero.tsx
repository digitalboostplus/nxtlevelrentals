import Link from 'next/link';

type PortalHeroProps = {
  residentName: string;
  propertyName: string;
  unit: string;
  nextDueDate: string;
};

export default function PortalHero({ residentName, propertyName, unit, nextDueDate }: PortalHeroProps) {
  return (
    <section className="portal-hero">
      <div className="portal-hero__inner">
        <div>
          <p className="hero__eyebrow" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Tenant Portal
          </p>
          <h1 className="portal-hero__title">Welcome back, {residentName}</h1>
          <p className="portal-hero__subtitle">
            Access everything you need in one place—rent payments, maintenance updates, important documents, and community
            announcements.
          </p>
          <Link href="/" className="ghost-button">
            View Landing Page
          </Link>
        </div>
        <div className="portal-hero__details">
          <div>
            <strong>Property:</strong> {propertyName}
          </div>
          <div>
            <strong>Unit:</strong> {unit}
          </div>
          <div>
            <strong>Next rent due:</strong> {new Date(nextDueDate).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
