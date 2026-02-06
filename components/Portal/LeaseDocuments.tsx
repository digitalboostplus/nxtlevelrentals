import type { LeaseDocument } from '@/data/portal';

import { formatLocalDate } from '@/lib/date';

type LeaseDocumentsProps = {
  documents: LeaseDocument[];
};

export default function LeaseDocuments({ documents }: LeaseDocumentsProps) {
  return (
    <section className="section section--muted" id="documents">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Lease & documents</h2>
          <span className="tag tag--neutral">Secure storage</span>
        </div>
        <div className="documents-grid">
          {documents.length === 0 ? (
            <div className="documents-empty">
              <h3>No documents uploaded yet</h3>
              <p>Request a copy of your lease or onboarding documents from the management team.</p>
              <a className="outline-button" href="mailto:support@nxtlevelrentals.com">
                Request documents
              </a>
            </div>
          ) : (
            documents.map((document) => (
              <div className="document-row" key={document.id}>
                <div className="document-row__info">
                  <span className="document-row__title">{document.title}</span>
                  <span className="document-row__meta">Updated {formatLocalDate(document.updatedOn)}</span>
                </div>
                <a className="outline-button" href={document.downloadUrl}>
                  Download
                </a>
              </div>
            ))
          )}
        </div>
      </div>
      <style jsx>{`
        .documents-empty {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
          padding: 2rem;
          display: grid;
          gap: 0.75rem;
          color: var(--color-muted);
        }

        .documents-empty h3 {
          margin: 0;
          color: var(--color-text);
        }

        .documents-empty .outline-button {
          justify-self: flex-start;
        }
      `}</style>
    </section>
  );
}
