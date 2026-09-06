import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/Admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { propertyUtils } from '@/lib/firebase-utils';
import type { NextPageWithAuth } from '../../../_app';
const EditProperty: NextPageWithAuth = () => {
  const router = useRouter(); const { user } = useAuth(); const id = router.query.id as string;
  const [form, setForm] = useState<any>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) void propertyUtils.getProperty(id).then(p => {
    if (!p) throw new Error('Property unavailable');
    setForm({ ...p, rent: p.rent ?? p.defaultRentAmount ?? 0, features: (p.features || p.amenities || []).join(', '), images: p.images || [], units: p.units || [], status: p.status || 'vacant' });
  }).catch(e => setError(e.message)); }, [id]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!user) return; setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/update-property', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ ...form, propertyId: id }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message);
      await router.push(`/admin/properties/${id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); } finally { setSaving(false); }
  };
  const set = (key: string, value: unknown) => setForm({ ...form, [key]: value });
  return <AdminLayout title="Edit property and units"><div style={{ padding: '2rem', maxWidth: 1000 }}>
    <h1>Edit property and units</h1>{error && <p role="alert">{error}</p>}
    {!form ? <p>Loading property...</p> : <form onSubmit={save}><fieldset disabled={saving} style={{ border: 0, display: 'grid', gap: '1rem' }}>
      <label>Name <input required value={form.name} onChange={e => set('name', e.target.value)} /></label>
      {typeof form.address === 'object' ? ['street', 'city', 'state', 'zipCode'].map(key => <label key={key}>{key}<input required value={form.address[key] || ''} onChange={e => set('address', { ...form.address, [key]: e.target.value })} /></label>) : <label>Address <input value={form.address || ''} onChange={e => set('address', e.target.value)} /></label>}
      {['bedrooms', 'bathrooms', 'squareFeet'].map(key => <label key={key}>{key}<input type="number" min="0" step="any" value={form[key] || 0} onChange={e => set(key, Number(e.target.value))} /></label>)}
      <label>Description <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
      <label>Target rent <input type="number" min="0" step="0.01" value={form.rent} onChange={e => set('rent', Number(e.target.value))} /></label>
      <label>Owner user ID <input value={form.landlordId || ''} onChange={e => set('landlordId', e.target.value)} /></label>
      <label>Status <select value={form.status} onChange={e => set('status', e.target.value)}><option>vacant</option><option>occupied</option><option>maintenance</option></select></label>
      <label>Amenities (comma separated) <input value={form.features} onChange={e => set('features', e.target.value)} /></label>
      <label>Photo URLs (one HTTPS URL per line) <textarea value={form.images.join('\n')} onChange={e => set('images', e.target.value.split('\n').filter(Boolean))} /></label>
      <label><input type="checkbox" checked={!!form.archived} onChange={e => set('archived', e.target.checked)} /> Archive property (keeps history and removes availability)</label>
      <h2>Units</h2>
      {form.units.map((unit: any, index: number) => <fieldset key={unit.id}><legend>Unit {unit.unitNumber || index + 1}</legend>
        {['unitNumber', 'rent', 'bedrooms', 'bathrooms', 'squareFeet'].map(key => <label key={key}>{key} <input value={unit[key] ?? ''} type={key === 'unitNumber' ? 'text' : 'number'} min="0" step="any" onChange={e => set('units', form.units.map((u: any, i: number) => i === index ? { ...u, [key]: key === 'unitNumber' ? e.target.value : Number(e.target.value) } : u))} /></label>)}
        <select aria-label="Unit status" value={unit.status} onChange={e => set('units', form.units.map((u: any, i: number) => i === index ? { ...u, status: e.target.value } : u))}><option>vacant</option><option>occupied</option><option>maintenance</option></select>
        <label><input type="checkbox" checked={!!unit.archived} onChange={e => set('units', form.units.map((u: any, i: number) => i === index ? { ...u, archived: e.target.checked } : u))} /> Archived</label>
      </fieldset>)}
      <button type="button" onClick={() => set('units', [...form.units, { id: crypto.randomUUID(), unitNumber: '', rent: 0, status: 'vacant', bedrooms: 0, bathrooms: 0, squareFeet: 0 }])}>Add unit</button>
      <button type="submit">{saving ? 'Saving...' : 'Save property'}</button>
    </fieldset></form>}
  </div></AdminLayout>;
};
EditProperty.requireAuth = true; EditProperty.allowedRoles = ['admin', 'super-admin'];
export default EditProperty;
