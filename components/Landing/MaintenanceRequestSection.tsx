import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  company,
  emergencyCriteria,
  emergencyPhone,
  maintenanceCategories,
  maintenancePriorities,
  type PublicMaintenanceCategory,
  type PublicMaintenancePriority,
} from '@/data/site';

type FieldErrors = Partial<Record<'name' | 'phone' | 'email' | 'address' | 'description', string>>;

const MAX_PHOTOS = 3;

// Shrink a photo in the browser so three of them fit comfortably inside one
// Firestore document (1 MiB cap) without needing an authenticated upload.
async function compressImage(file: File, maxEdge = 1200, quality = 0.72): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function MaintenanceRequestSection() {
  const emergency = emergencyPhone();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<PublicMaintenanceCategory>('Plumbing');
  const [priority, setPriority] = useState<PublicMaintenancePriority>('Medium');
  const [description, setDescription] = useState('');
  const [permissionToEnter, setPermissionToEnter] = useState(true);
  const [hasPets, setHasPets] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    const digits = phone.replace(/\D/g, '');
    if (!digits && !email.trim()) next.phone = 'We need a phone number or email to reach you.';
    if (digits && digits.length < 10) next.phone = 'Please enter a full phone number.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'That email does not look right.';
    if (address.trim().length < 5) next.address = 'Please enter the property address.';
    if (description.trim().length < 15) next.description = 'Add a few more details (15+ characters).';
    return next;
  };

  const handlePhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_PHOTOS - images.length);
    event.target.value = '';
    if (files.length === 0) return;
    const compressed = await Promise.all(files.map((file) => compressImage(file)));
    setImages((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      // trailingSlash is on in next.config.js; hit the canonical URL to skip the 308.
      const response = await fetch('/api/maintenance/public/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          category,
          priority,
          description: description.trim(),
          permissionToEnter,
          hasPets,
          images,
          website: honeypot,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.errors) setErrors(data.errors as FieldErrors);
        throw new Error(data?.message || 'We could not send your request.');
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not send your request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="repair" id="maintenance" aria-labelledby="repairHeading">
      <div className="repair__inner">
        <div className="repair__form-col">
          <div className="repair__header">
            <p className="section-eyebrow">Maintenance request</p>
            <h2 id="repairHeading">Something need fixing?</h2>
            <p>
              Tell us what is going on and add a photo if you can. We text you a confirmation and keep you posted
              until it is done.
            </p>
          </div>

          {submitted ? (
            <div className="repair__success" role="status">
              <strong>Got it. We will be in touch shortly.</strong>
              <p>
                If it gets worse before you hear from us, call or text{' '}
                <a href={`tel:${emergency.tel}`}>{emergency.display}</a>.
              </p>
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setSubmitted(false);
                  setDescription('');
                  setImages([]);
                }}
              >
                Send another request
              </button>
            </div>
          ) : (
            <form className="repair__form" onSubmit={handleSubmit} noValidate>
              <label className="repair__field">
                <span>Your name</span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First and last name"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name ? <em>{errors.name}</em> : null}
              </label>

              <label className="repair__field">
                <span>Mobile phone</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="We text updates to this number"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone ? <em>{errors.phone}</em> : null}
              </label>

              <label className="repair__field repair__field--wide">
                <span>
                  Email <small>(optional, for a written copy)</small>
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <em>{errors.email}</em> : null}
              </label>

              <label className="repair__field repair__field--wide">
                <span>Property address</span>
                <input
                  type="text"
                  name="address"
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address and unit, if any"
                  aria-invalid={Boolean(errors.address)}
                />
                {errors.address ? <em>{errors.address}</em> : null}
              </label>

              <label className="repair__field">
                <span>Category</span>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PublicMaintenanceCategory)}
                >
                  {maintenanceCategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="repair__field repair__priority">
                <legend>How urgent is it?</legend>
                <div className="repair__chips" role="radiogroup" aria-label="Urgency">
                  {maintenancePriorities.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={priority === option}
                      className={`filter-chip${priority === option ? ' filter-chip--active' : ''}`}
                      onClick={() => setPriority(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="repair__field repair__field--wide">
                <span>What is happening?</span>
                <textarea
                  name="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Where it is, when it started, and anything you have already tried."
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description ? <em>{errors.description}</em> : null}
              </label>

              <div className="repair__field repair__field--wide">
                <label className={`repair__upload${images.length >= MAX_PHOTOS ? ' repair__upload--full' : ''}`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void handlePhotos(e)}
                    disabled={images.length >= MAX_PHOTOS}
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                  {images.length >= MAX_PHOTOS ? `Up to ${MAX_PHOTOS} photos added` : 'Add photos (optional)'}
                </label>
                {images.length > 0 ? (
                  <ul className="repair__thumbs">
                    {images.map((src, index) => (
                      <li key={index}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Photo ${index + 1}`} />
                        <button
                          type="button"
                          aria-label={`Remove photo ${index + 1}`}
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="repair__checks repair__field--wide">
                <label>
                  <input type="checkbox" checked={permissionToEnter} onChange={(e) => setPermissionToEnter(e.target.checked)} />
                  OK to enter if I am not home
                </label>
                <label>
                  <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} />
                  There are pets in the home
                </label>
              </div>

              {/* Honeypot: hidden from people, filled by bots. */}
              <label className="repair__honeypot" aria-hidden="true">
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </label>

              {submitError ? (
                <p className="repair__error repair__field--wide" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="repair__actions repair__field--wide">
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send request'}
                </button>
                <span>
                  Have an account? <Link href="/login?next=/portal">Sign in</Link> to track past requests.
                </span>
              </div>
            </form>
          )}
        </div>

        <aside className="repair__aside">
          <div className="repair__steps card">
            <h3>What happens next</h3>
            <ol>
              <li>
                <span>1</span>
                <p>You get a text confirming we received it, usually within the hour during office hours.</p>
              </li>
              <li>
                <span>2</span>
                <p>We call to schedule. Non-urgent repairs are typically handled {company.repairWindow}.</p>
              </li>
              <li>
                <span>3</span>
                <p>You get a text when it is done. Sign in to the portal any time to see status and history.</p>
              </li>
            </ol>
          </div>
          <div className="repair__emergency">
            <div className="repair__emergency-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              This is an emergency if...
            </div>
            <p>
              {emergencyCriteria} Skip the form and call{' '}
              <a href={`tel:${emergency.tel}`}>{emergency.display}</a>. Fire, medical, or a crime in progress: call
              911 first.
            </p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .repair {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-background);
          scroll-margin-top: var(--header-height);
        }

        .repair__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
          gap: clamp(2rem, 4vw, 3rem);
          align-items: start;
        }

        .repair__form-col {
          display: grid;
          gap: 1.5rem;
        }

        .repair__header {
          display: grid;
          gap: 0.75rem;
        }

        .repair__header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          line-height: 1.15;
          color: var(--color-text);
        }

        .repair__header p {
          color: var(--color-muted);
          line-height: 1.7;
          max-width: 560px;
        }

        .repair__form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .repair__field {
          display: grid;
          gap: 0.4rem;
          margin: 0;
          padding: 0;
          border: 0;
          min-width: 0;
        }

        .repair__field > span,
        .repair__field > legend {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
          padding: 0;
        }

        .repair__field small {
          font-weight: 400;
          color: var(--color-muted);
        }

        .repair__field--wide {
          grid-column: span 2;
        }

        .repair__field input[type='text'],
        .repair__field input[type='tel'],
        .repair__field input[type='email'],
        .repair__field select,
        .repair__field textarea {
          width: 100%;
          min-height: 48px;
          padding: 0.7rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: 0.95rem;
          font-family: inherit;
        }

        .repair__field textarea {
          resize: vertical;
          line-height: 1.5;
        }

        .repair__field input::placeholder,
        .repair__field textarea::placeholder {
          color: var(--color-muted);
        }

        .repair__field [aria-invalid='true'] {
          border-color: var(--color-error);
        }

        .repair__field em {
          font-style: normal;
          font-size: 0.8rem;
          color: var(--color-error);
        }

        .repair__chips {
          display: flex;
          gap: 0.5rem;
        }

        .repair__chips :global(.filter-chip) {
          flex: 1;
          min-height: 48px;
          font-size: 0.9rem;
        }

        .repair__upload {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          min-height: 64px;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px dashed rgba(59, 155, 255, 0.45);
          background: var(--color-accent-subtle);
          color: var(--color-primary);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .repair__upload--full {
          cursor: default;
          color: var(--color-muted);
          border-color: var(--color-border);
          background: transparent;
        }

        .repair__upload input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .repair__thumbs {
          list-style: none;
          margin: 0.75rem 0 0;
          padding: 0;
          display: flex;
          gap: 0.75rem;
        }

        .repair__thumbs li {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }

        .repair__thumbs img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .repair__thumbs button {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          border: none;
          background: var(--overlay-strong);
          color: #fff;
          cursor: pointer;
          line-height: 1;
        }

        .repair__checks {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem 1.75rem;
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .repair__checks label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-height: 44px;
          cursor: pointer;
        }

        .repair__checks input {
          width: 20px;
          height: 20px;
          accent-color: var(--color-primary);
        }

        .repair__honeypot {
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        .repair__error {
          color: var(--color-error);
          font-size: 0.9rem;
        }

        .repair__actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1.25rem;
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .repair__actions :global(a) {
          color: var(--color-primary);
          font-weight: 600;
        }

        .repair__success {
          display: grid;
          gap: 0.75rem;
          padding: 1.75rem;
          border-radius: var(--radius-lg);
          background: var(--tag-success-bg);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: var(--color-text);
          justify-items: start;
        }

        .repair__success strong {
          font-size: 1.15rem;
        }

        .repair__success a {
          font-weight: 600;
        }

        .repair__aside {
          display: grid;
          gap: 1rem;
        }

        .repair__steps h3 {
          font-size: 1.2rem;
          margin-bottom: 1.25rem;
          color: var(--color-text);
        }

        .repair__steps ol {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 1.25rem;
        }

        .repair__steps li {
          display: flex;
          gap: 0.9rem;
        }

        .repair__steps li span {
          flex: none;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: var(--color-primary-light);
          color: var(--color-primary);
          font-weight: 700;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .repair__steps p {
          color: var(--color-muted);
          line-height: 1.6;
        }

        .repair__emergency {
          padding: 1.5rem 1.75rem;
          border-radius: var(--radius-lg);
          background: var(--tag-error-bg);
          border: 1px solid rgba(248, 113, 113, 0.35);
          display: grid;
          gap: 0.5rem;
        }

        .repair__emergency-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--tag-error-text);
          font-weight: 700;
          font-size: 0.95rem;
        }

        .repair__emergency p {
          color: var(--color-text);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .repair__emergency a {
          color: var(--color-text);
          font-weight: 700;
          text-decoration: underline;
        }

        @media (max-width: 960px) {
          .repair__inner {
            grid-template-columns: 1fr;
          }

          .repair__aside {
            order: -1;
          }

          .repair__steps {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .repair__form {
            grid-template-columns: 1fr;
          }

          .repair__field--wide {
            grid-column: auto;
          }
        }
      `}</style>
    </section>
  );
}
