import { FormEvent, useState } from 'react';
import SectionTitle from '@/components/common/SectionTitle';

const buildConfirmationMessage = (
  name: FormDataEntryValue | null,
  email: FormDataEntryValue | null,
  message: FormDataEntryValue | null
) => {
  const recipientName = typeof name === 'string' && name.trim() ? name : 'there';
  const emailDisplay = typeof email === 'string' && email.trim() ? email : 'you';
  const summary = typeof message === 'string' && message.trim() ? ` We've noted your message: “${message.trim()}”.` : '';
  return `Thanks ${recipientName}! Our team will reach out to ${emailDisplay} shortly.${summary}`;
};

export default function CTASection() {
  const [status, setStatus] = useState<string>('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    setStatus(buildConfirmationMessage(name, email, message));
    event.currentTarget.reset();
  };

  return (
    <section className="section">
      <div className="section__inner">
        <SectionTitle
          title="Scale without sacrificing service"
          subtitle="Partner with Next Level Rentals to deliver next-generation tenant experiences, reduce operational overhead, and unlock predictable revenue growth."
        />
        <div className="cta-card">
          <div>
            <h3 className="cta-card__title">Ready to modernize your portfolio?</h3>
            <p className="cta-card__description">
              Tell us about your properties and we will create a tailored onboarding plan—from migrating lease documents to
              enabling autopay and smart maintenance workflows.
            </p>
            <div className="cta-card__contact">
              <div>
                <strong>Email:</strong> support@nxtlevelrentals.com
              </div>
              <div>
                <strong>Phone:</strong> (555) 123-4567
              </div>
              <div>
                <strong>Documentation:</strong>{' '}
                <a href="https://docs.nxtlevelrentals.com" target="_blank" rel="noreferrer">
                  docs.nxtlevelrentals.com
                </a>
              </div>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" placeholder="Your name" required />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div>
              <label htmlFor="message">How can we help?</label>
              <textarea id="message" name="message" placeholder="Tell us about your portfolio"></textarea>
            </div>
            <button type="submit" className="secondary-button">
              Request a strategy session
            </button>
            {status ? <p>{status}</p> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
