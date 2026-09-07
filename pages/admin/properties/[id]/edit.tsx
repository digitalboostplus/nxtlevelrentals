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
  const setUnit = (index: number, patch: Record<string, unknown>) =>
    set('units', form.units.map((u: any, i: number) => (i === index ? { ...u, ...patch } : u)));
  const FIELD_LABELS: Record<string, string> = { street: 'Street', city: 'City', state: 'State', zipCode: 'ZIP code', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', squareFeet: 'Square feet', unitNumber: 'Unit number', rent: 'Rent' };
  return (
    <AdminLayout title="Edit property">
      <div className="owner-page edit-property">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Admin · Property</p>
            <h1>Edit property and units</h1>
            <p className="owner-page__sub">{form?.name ? `Update the record for ${form.name}. Changes apply to the admin, owner and tenant views.` : 'Update the property record and its units.'}</p>
          </div>
          <div className="owner-page__actions">
            <button type="button" className="outline-button" onClick={() => router.push(`/admin/properties/${id}`)}>Back to property</button>
          </div>
        </div>
        {error && <p role="alert" className="owner-alert">{error}</p>}
        {!form ? (
          <p className="owner-empty">Loading property...</p>
        ) : (
          <form onSubmit={save} className="edit-property__form">
            <fieldset disabled={saving} className="edit-property__fields">
              <section className="owner-card">
                <div className="owner-card__head"><h2>Property</h2></div>
                <div className="owner-form">
                  <label className="owner-field owner-field--wide"><span>Name</span><input required value={form.name} onChange={e => set('name', e.target.value)} /></label>
                  {typeof form.address === 'object' ? (
                    ['street', 'city', 'state', 'zipCode'].map(key => (
                      <label key={key} className="owner-field"><span>{FIELD_LABELS[key]}</span><input required value={form.address[key] || ''} onChange={e => set('address', { ...form.address, [key]: e.target.value })} /></label>
                    ))
                  ) : (
                    <label className="owner-field owner-field--wide"><span>Address</span><input value={form.address || ''} onChange={e => set('address', e.target.value)} /></label>
                  )}
                  <label className="owner-field"><span>Status</span><select value={form.status} onChange={e => set('status', e.target.value)}><option>vacant</option><option>occupied</option><option>maintenance</option></select></label>
                  <label className="owner-field"><span>Target rent</span><input type="number" min="0" step="0.01" value={form.rent} onChange={e => set('rent', Number(e.target.value))} /></label>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-card__head"><h2>Details</h2></div>
                <div className="owner-form owner-form--3">
                  {['bedrooms', 'bathrooms', 'squareFeet'].map(key => (
                    <label key={key} className="owner-field"><span>{FIELD_LABELS[key]}</span><input type="number" min="0" step="any" value={form[key] || 0} onChange={e => set(key, Number(e.target.value))} /></label>
                  ))}
                  <label className="owner-field owner-field--wide"><span>Description</span><textarea value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
                  <label className="owner-field owner-field--wide"><span>Amenities (comma separated)</span><input value={form.features} onChange={e => set('features', e.target.value)} /></label>
                  <label className="owner-field owner-field--wide"><span>Photo URLs (one HTTPS URL per line)</span><textarea value={form.images.join('\n')} onChange={e => set('images', e.target.value.split('\n').filter(Boolean))} /></label>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-card__head"><h2>Ownership and availability</h2></div>
                <div className="owner-form">
                  <label className="owner-field"><span>Owner user ID</span><input value={form.landlordId || ''} onChange={e => set('landlordId', e.target.value)} /></label>
                  <label className="owner-check edit-property__archive"><input type="checkbox" checked={!!form.archived} onChange={e => set('archived', e.target.checked)} /><span>Archive property (keeps history and removes availability)</span></label>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-card__head">
                  <h2>Units</h2>
                  <button type="button" className="owner-small-button" onClick={() => set('units', [...form.units, { id: crypto.randomUUID(), unitNumber: '', rent: 0, status: 'vacant', bedrooms: 0, bathrooms: 0, squareFeet: 0 }])}>Add unit</button>
                </div>
                {form.units.length === 0 ? <p className="owner-empty">Single-family home. Add a unit only if the property is split into separately leased spaces.</p> : null}
                {form.units.map((unit: any, index: number) => (
                  <fieldset key={unit.id} className="edit-property__unit">
                    <legend>Unit {unit.unitNumber || index + 1}</legend>
                    <div className="owner-form owner-form--3">
                      {['unitNumber', 'rent', 'bedrooms', 'bathrooms', 'squareFeet'].map(key => (
                        <label key={key} className="owner-field"><span>{FIELD_LABELS[key]}</span><input value={unit[key] ?? ''} type={key === 'unitNumber' ? 'text' : 'number'} min="0" step="any" onChange={e => setUnit(index, { [key]: key === 'unitNumber' ? e.target.value : Number(e.target.value) })} /></label>
                      ))}
                      <label className="owner-field"><span>Unit status</span><select aria-label="Unit status" value={unit.status} onChange={e => setUnit(index, { status: e.target.value })}><option>vacant</option><option>occupied</option><option>maintenance</option></select></label>
                      <label className="owner-check"><input type="checkbox" checked={!!unit.archived} onChange={e => setUnit(index, { archived: e.target.checked })} /><span>Archived</span></label>
                    </div>
                  </fieldset>
                ))}
              </section>

              <div className="owner-form__actions">
                <button type="button" className="ghost-button" onClick={() => router.push(`/admin/properties/${id}`)}>Cancel</button>
                <button type="submit" className="primary-button">{saving ? 'Saving...' : 'Save property'}</button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
      <style jsx>{`
        .edit-property {
          max-width: 1000px;
        }
        .edit-property__form,
        .edit-property__fields {
          display: grid;
          gap: 1.5rem;
        }
        .edit-property__fields {
          border: 0;
          padding: 0;
          margin: 0;
          min-width: 0;
        }
        .edit-property__unit {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-background);
          padding: 0.75rem 1.25rem 1.25rem;
          margin: 0;
          min-width: 0;
        }
        .edit-property__unit legend {
          padding: 0 0.5rem;
          font-weight: 700;
          color: var(--color-text);
        }
        .edit-property__archive {
          align-self: end;
        }
      `}</style>
    </AdminLayout>
  );
};
EditProperty.requireAuth = true; EditProperty.allowedRoles = ['admin', 'super-admin'];
export default EditProperty;
