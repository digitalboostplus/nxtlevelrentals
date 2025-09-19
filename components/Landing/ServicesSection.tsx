import SectionTitle from '@/components/common/SectionTitle';
import { serviceCategories } from '@/data/properties';

export default function ServicesSection() {
  return (
    <section className="section" id="services">
      <div className="section__inner">
        <SectionTitle
          title="Full-service property management"
          subtitle="A single platform that empowers your team to deliver concierge-level service with automation, analytics, and real-time communication."
        />
        <div className="services-grid">
          {serviceCategories.map((service) => (
            <article className="service-card" key={service.title}>
              <h3 className="service-card__title">{service.title}</h3>
              <p>{service.description}</p>
              <ul className="service-card__features">
                {service.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
