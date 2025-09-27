import type { LeaseDocument } from '@/data/portal';

import { formatLocalDate } from '@/lib/date';

type LeaseDocumentsProps = {
  documents: LeaseDocument[];
};

export default function LeaseDocuments({ documents }: LeaseDocumentsProps) {
  return (
    <section className="section section--muted">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Lease & documents</h2>
          <span className="tag tag--neutral">Secure storage</span>
        </div>
        <div className="documents-grid">
          {documents.map((document) => (
            <div className="document-row" key={document.id}>
              <div className="document-row__info">
                <span className="document-row__title">{document.title}</span>
                <span className="document-row__meta">Updated {formatLocalDate(document.updatedOn)}</span>
              </div>
              <a className="outline-button" href={document.downloadUrl}>
                Download
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
