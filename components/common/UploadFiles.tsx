import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import PrivateFile from './PrivateFile';
export default function UploadFiles({ kind, propertyId, ids, onChange, onBusy }: {
  kind: 'lease' | 'maintenance' | 'insurance' | 'expense'; propertyId?: string;
  ids: string[]; onChange: (ids: string[]) => void; onBusy?: (busy: boolean) => void;
}) {
  const { user } = useAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const upload = async (files: FileList | null) => {
    if (!user || !files) return;
    setBusy(true); onBusy?.(true); setError('');
    const next = [...ids];
    const selectedFiles = Array.from(files);
    try {
      if (selectedFiles.length + ids.length > 6) throw new Error('Maximum six attachments');
      const token = await user.getIdToken();
      for (const file of selectedFiles) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Maximum file size is 5 MB');
        const query = new URLSearchParams({ kind, name: file.name, ...(propertyId ? { propertyId } : {}) });
        const res = await fetch(`/api/files/upload?${query}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type }, body: file });
        const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Upload failed');
        next.push(data.id); onChange([...next]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setBusy(false); onBusy?.(false); }
  };
  const remove = async (id: string) => {
    if (!user) return;
    setBusy(true); onBusy?.(true); setError('');
    try {
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    if (!res.ok) { setError('Could not discard this file; it may already be attached to a saved record.'); return; }
    onChange(ids.filter(value => value !== id));
    } catch { setError('Unable to discard upload. Please retry.'); }
    finally { setBusy(false); onBusy?.(false); }
  };
  return <div>
    <label>Attachments (5 MB each, up to six)
      <input type="file" multiple disabled={busy || (kind !== 'insurance' && !propertyId)}
        accept={kind === 'lease' ? 'application/pdf' : kind === 'maintenance' ? 'image/png,image/jpeg,image/webp' : 'application/pdf,image/png,image/jpeg,image/webp'}
        onChange={e => { void upload(e.target.files); e.target.value = ''; }} />
    </label>
    {busy && <p role="status">Uploading...</p>}{error && <p role="alert">{error}</p>}
    {ids.map(id => <div key={id}><PrivateFile id={id} image={kind === 'maintenance'} /><button type="button" disabled={busy} onClick={() => void remove(id)}>Discard upload</button></div>)}
  </div>;
}
