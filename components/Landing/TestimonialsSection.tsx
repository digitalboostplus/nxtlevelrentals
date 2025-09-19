import SectionTitle from '@/components/common/SectionTitle';
import { testimonials } from '@/data/properties';

export default function TestimonialsSection() {
  return (
    <section className="section" id="testimonials">
      <div className="section__inner">
        <SectionTitle
          title="Loved by residents and property owners"
          subtitle="We obsess over responsive support, transparent communication, and delightful digital experiences."
        />
        <div className="testimonials-grid">
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <p className="testimonial-card__quote">{testimonial.quote}</p>
              <div className="testimonial-card__author">{testimonial.name}</div>
              <p>{testimonial.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
