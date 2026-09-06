import { useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import Card from '@/components/common/Card';
import { useLandlordData, type OwnerDocument } from '@/hooks/useLandlordData';
import { useAuth } from '@/context/AuthContext';
import { formatLocalDate } from '@/lib/date';
import type { NextPageWithAuth } from '../_app';
const Documents: NextPageWithAuth = () => {
  const { documents, loading, error, refresh } = useLandlordData();
  const { user } = useAuth();
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState('');
  const download = async (document: OwnerDocument) => {
    if (!user) return;
    setDownloading(document.id); setDownloadError('');
    try {
      const res = await fetch(`/api/landlord/document?id=${encodeURIComponent(document.id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!res.ok) throw new Error((await res.json()).message || 'Download unavailable');
      const url = URL.createObjectURL(await res.blob());
      const link = window.document.createElement('a'); link.href = url; link.download = document.fileName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setDownloadError(e instanceof Error ? e.message : 'Download failed'); }
    finally { setDownloading(''); }
  };
  return <LandlordLayout title="Documents"><div style={{ padding: '2rem' }}>
    <h1>Owner documents</h1><p>Documents provided for your account. Contact management to add or update a document.</p>
    {downloadError && <p role="alert">{downloadError}</p>}
    {loading ? <p role="status">Loading documents...</p> : error ? <p role="alert">{error} <button onClick={refresh}>Retry</button></p> : <Card title="Available documents">
      {documents.length === 0 ? <p>No documents have been provided yet.</p> : documents.map(d => <div key={d.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }}>
        <h2>{d.fileName}</h2><p>{d.documentType} ? {d.status} ? {formatLocalDate(d.updatedAt || d.createdAt)}</p>
        {d.downloadable ? <button disabled={!!downloading} onClick={() => download(d)}>{downloading === d.id ? 'Downloading...' : 'Download'}</button> : <p>File unavailable. Ask management to attach the document.</p>}
      </div>)}
    </Card>}
  </div></LandlordLayout>;
};
Documents.requireAuth = true;
Documents.allowedRoles = ['landlord'];
export default Documents;
