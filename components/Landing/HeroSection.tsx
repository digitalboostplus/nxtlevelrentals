import Link from 'next/link';

const heroMetrics = [
  { label: 'Units Managed', value: '2.4k+' },
  { label: 'Resident Satisfaction', value: '97%' },
  { label: 'Avg. Response Time', value: '<2 hrs' }
];

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__inner">
        <div>
          <p className="hero__eyebrow">Modern tenant experiences</p>
          <h1 className="hero__title">Property management reimagined for the next generation</h1>
          <p className="hero__description">
            Empower tenants with a beautiful self-service portal and equip property managers with intelligent workflows backed by
            Firebase and Stripe automation.
          </p>
          <div className="hero__cta">
            <Link href="/portal" className="primary-button">
              Launch Tenant Portal
            </Link>
            <Link href="/#services" className="outline-button">
              Explore Services
            </Link>
          </div>
          <div className="hero__metrics">
            {heroMetrics.map((metric) => (
              <div className="metric-card" key={metric.label}>
                <div className="metric-card__value">{metric.value}</div>
                <div className="metric-card__label">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Real-time tenant engagement</h3>
            <span className="tag tag--info">Powered by Firebase</span>
          </div>
          <p>
            Centralize digital lease signing, payment processing, maintenance coordination, and community communications inside a
            single secure portal.
          </p>
          <ul className="service-card__features" style={{ marginTop: '1.5rem' }}>
            <li>Secure authentication with MFA-ready workflows</li>
            <li>Stripe-powered rent collection and autopay</li>
            <li>Responsive maintenance coordination with photo uploads</li>
            <li>Document vault synced across web and mobile</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
