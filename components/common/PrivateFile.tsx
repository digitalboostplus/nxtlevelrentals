import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
export default function PrivateFile({ id, image = false }: { id: string; image?: boolean }) {
  const { user } = useAuth();
  const [url, setUrl] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    if (!user || !image) return;
    let active = true; let objectUrl = '';
    void (async () => {
      try {
        const res = await fetch(`/api/files/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        if (!res.ok) throw new Error('Image unavailable');
        objectUrl = URL.createObjectURL(await res.blob());
        if (active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
      } catch { if (active) setError('Image unavailable'); }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user, id, image]);
  const download = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!res.ok) throw new Error('Download unavailable');
      const blob = await res.blob(); const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = objectUrl;
      const filename = res.headers.get('Content-Disposition')?.split("filename*=UTF-8''")[1];
      link.download = filename ? decodeURIComponent(filename) : 'attachment'; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch { setError('Download unavailable'); }
  };
  return <span style={{ display: 'inline-block', margin: '0.4rem' }}>
    {/* Protected object URLs cannot be passed to the Next image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {image && url && <img src={url} alt="Maintenance attachment" width={100} height={100} style={{ objectFit: 'cover' }} />}
    <button type="button" onClick={download}>Download attachment</button>{error && <span role="alert">{error}</span>}
  </span>;
}
