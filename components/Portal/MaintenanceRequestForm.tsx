import { FormEvent, useState } from 'react';
import { maintenanceCategories, type MaintenanceRequest } from '@/data/portal';

type MaintenanceRequestFormProps = {
  onSubmit: (request: Omit<MaintenanceRequest, 'id' | 'submittedOn' | 'status'>) => Promise<void> | void;
  submitting?: boolean;
};

const priorities: MaintenanceRequest['priority'][] = ['Low', 'Medium', 'High'];

type FieldName = 'title' | 'description';

export default function MaintenanceRequestForm({ onSubmit, submitting }: MaintenanceRequestFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<(typeof maintenanceCategories)[number]>('Appliance');
  const [priority, setPriority] = useState<MaintenanceRequest['priority']>('Medium');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});

  const validateField = (field: FieldName, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'This field is required.';
    if (field === 'title' && trimmed.length < 6) return 'Use at least 6 characters.';
    if (field === 'description' && trimmed.length < 15) return 'Add a few more details (15+ characters).';
    return '';
  };

  const updateFieldError = (field: FieldName, value: string) => {
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error || undefined }));
    return error;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    setSubmitError(null);

    const titleError = validateField('title', title);
    const descriptionError = validateField('description', description);
    if (titleError || descriptionError) {
      setFieldErrors({
        title: titleError || undefined,
        description: descriptionError || undefined
      });
      return;
    }

    try {
      await onSubmit({
        title,
        description,
        priority,
        category
      });

      setTitle('');
      setDescription('');
      setPriority('Medium');
      setCategory('Appliance');
      setSuccess(true);
      setFieldErrors({});
    } catch (err) {
      console.error('Failed to submit maintenance request', err);
      setSubmitError('We could not send your request. Please try again.');
    }
  };

  return (
    <section className="section" id="maintenance">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Submit a maintenance request</h2>
          <p style={{ color: 'var(--color-muted)' }}>
            Provide as much detail as possible so our service team can respond quickly.
          </p>
        </div>
        <form className="maintenance-form" onSubmit={handleSubmit}>
          <div className="maintenance-form__group">
            <label htmlFor="requestTitle">
              Issue summary <span className="required-indicator">*</span>
            </label>
            <input
              id="requestTitle"
              name="requestTitle"
              type="text"
              required
              maxLength={80}
              value={title}
              onChange={(event) => {
                const value = event.target.value;
                setTitle(value);
                if (fieldErrors.title) {
                  updateFieldError('title', value);
                }
              }}
              onBlur={() => updateFieldError('title', title)}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={`requestTitleHelp${fieldErrors.title ? ' requestTitleError' : ''}`}
              placeholder="Example: Dishwasher is leaking under the sink"
            />
            <span className="field-helper" id="requestTitleHelp">
              Keep it short and specific (max 80 characters).
            </span>
            {fieldErrors.title ? (
              <span className="field-error" id="requestTitleError" role="alert">
                {fieldErrors.title}
              </span>
            ) : null}
          </div>

          <div className="maintenance-form__grid">
            <div className="maintenance-form__group">
              <label htmlFor="requestCategory">
                Category <span className="required-indicator">*</span>
              </label>
              <select
                id="requestCategory"
                name="requestCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof maintenanceCategories)[number])}
              >
                {maintenanceCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="maintenance-form__group">
              <label htmlFor="requestPriority">
                Priority <span className="required-indicator">*</span>
              </label>
              <select
                id="requestPriority"
                name="requestPriority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as MaintenanceRequest['priority'])}
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="maintenance-form__group">
            <label htmlFor="requestDescription">
              Describe the issue <span className="required-indicator">*</span>
            </label>
            <textarea
              id="requestDescription"
              name="requestDescription"
              rows={5}
              required
              value={description}
              placeholder="Include when the issue started, steps taken, and access instructions."
              onChange={(event) => {
                const value = event.target.value;
                setDescription(value);
                if (fieldErrors.description) {
                  updateFieldError('description', value);
                }
              }}
              onBlur={() => updateFieldError('description', description)}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={`requestDescriptionHelp${fieldErrors.description ? ' requestDescriptionError' : ''}`}
            />
            <span className="field-helper" id="requestDescriptionHelp">
              Mention access details, photos, and when the issue started.
            </span>
            {fieldErrors.description ? (
              <span className="field-error" id="requestDescriptionError" role="alert">
                {fieldErrors.description}
              </span>
            ) : null}
          </div>

          <div className="maintenance-form__actions">
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Send request'}
            </button>
            {success ? <span className="maintenance-form__success">Request received! We will follow up shortly.</span> : null}
            {submitError ? (
              <span className="maintenance-form__error" role="alert">
                {submitError}
              </span>
            ) : null}
          </div>
        </form>
      </div>
      <style jsx>{`
        .maintenance-form {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          border: 1px solid rgba(15, 118, 110, 0.12);
          box-shadow: var(--shadow-md);
          display: grid;
          gap: 1.5rem;
        }

        .maintenance-form__group {
          display: grid;
          gap: 0.6rem;
        }

        label {
          font-weight: 600;
          color: var(--color-text);
        }

        input,
        select,
        textarea {
          border-radius: 12px;
          border: 1px solid var(--color-border);
          padding: 0.85rem 1rem;
          font-size: 1rem;
          transition: border 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
          background: var(--color-surface);
          color: var(--color-text);
        }

        textarea {
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: rgba(15, 118, 110, 0.45);
          box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
        }

        .maintenance-form__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .maintenance-form__actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1rem;
        }

        .field-helper {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .field-error {
          font-size: 0.85rem;
          color: #dc2626;
          font-weight: 600;
        }

        .required-indicator {
          color: var(--color-accent);
        }

        .maintenance-form__success {
          color: var(--color-secondary);
          font-weight: 600;
        }

        .maintenance-form__error {
          color: #dc2626;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .maintenance-form {
            padding: 2rem;
          }
        }
      `}</style>
    </section>
  );
}
