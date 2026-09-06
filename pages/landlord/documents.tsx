import Head from 'next/head';
import { useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import { company } from '@/data/site';
import { useAuth } from '@/context/AuthContext';
import { useLandlordData, type OwnerDocument } from '@/hooks/useLandlordData';
import { formatLocalDate } from '@/lib/date';
import type { NextPageWithAuth } from '../_app';

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

const Documents: NextPageWithAuth = () => {
  const { documents, loading, error, refresh } = useLandlordData();
  const { user } = useAuth();
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState('');

  const download = async (document: OwnerDocument) => {
    if (!user) return;
    setDownloading(document.id);
    setDownloadError('');
    try {
      const res = await fetch(`/api/landlord/document?id=${encodeURIComponent(document.id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!res.ok) throw new Error((await res.json()).message || 'Download unavailable');
      const url = URL.createObjectURL(await res.blob());
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading('');
    }
  };

  return (
    <LandlordLayout title="Documents">
      <Head>
        <title>Owner documents - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>Owner documents</h1>
            <p className="owner-page__sub">Statements, agreements and certificates management has provided for your account. Contact management to add or update a document.</p>
          </div>
          <div className="owner-page__actions">
            <a href={`mailto:${company.email}?subject=${encodeURIComponent('Document request')}`} className="outline-button">
              Request a document
            </a>
          </div>
        </div>

        {downloadError ? (
          <div className="owner-alert" role="alert">
            {downloadError}
          </div>
        ) : null}

        {loading ? (
          <LoadingState message="Loading documents..." />
        ) : error ? (
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="owner-card">
            <h2>Available documents</h2>
            {documents.length === 0 ? (
              <p className="owner-empty">No documents have been provided yet.</p>
            ) : (
              <ul className="owner-list">
                {documents.map((d) => (
                  <li key={d.id}>
                    <span className="owner-list__icon" aria-hidden="true">
                      <FileIcon />
                    </span>
                    <div className="owner-list__text">
                      <strong>{d.fileName}</strong>
                      <span>
                        {d.documentType}
                        {formatLocalDate(d.updatedAt || d.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }) ? ` · ${formatLocalDate(d.updatedAt || d.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      </span>
                    </div>
                    <span className={`tag ${d.downloadable ? 'tag--success' : 'tag--warning'}`}>{d.downloadable ? d.status || 'Available' : 'Pending file'}</span>
                    {d.downloadable ? (
                      <button type="button" className="owner-small-button" disabled={Boolean(downloading)} onClick={() => void download(d)}>
                        {downloading === d.id ? 'Downloading...' : 'Download'}
                      </button>
                    ) : (
                      <span className="owner-note">Ask management to attach the file</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </LandlordLayout>
  );
};

Documents.requireAuth = true;
Documents.allowedRoles = ['landlord'];

export default Documents;
