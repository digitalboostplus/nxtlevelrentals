import Image from 'next/image';
import SectionTitle from '@/components/common/SectionTitle';
import { featuredProperties } from '@/data/properties';

export default function PropertiesSection() {
  return (
    <section className="section section--muted" id="properties">
      <div className="section__inner">
        <SectionTitle
          title="Featured communities"
          subtitle="Explore smart residences designed for comfort, security, and convenience. Every property is supported by in-house concierge teams and smart home integrations."
        />
        <div className="properties-grid">
          {featuredProperties.map((property) => (
            <article className="property-card" key={property.id}>
              <Image
                className="property-card__image"
                src={property.image}
                alt={property.name}
                width={800}
                height={600}
              />
              <div className="property-card__body">
                <div>
                  <h3 className="property-card__title">{property.name}</h3>
                  <p>{property.location}</p>
                </div>
                <div className="property-card__meta">
                  <span>{property.bedrooms} Bedrooms</span>
                  <span>{property.bathrooms} Bathrooms</span>
                </div>
                <p className="property-card__price">{property.price}</p>
                <p>{property.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
