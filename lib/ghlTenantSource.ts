import { getCredentials, ghlFetch, GHL_FIELD_IDS } from './ghl';
import { resolvePropertyObjectKey } from './ghl-properties';
import { completePages, type TenantSource } from './ghlTenantEligibility';

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Read only. An error on any page or relation aborts the entire snapshot. */
export async function readTenantSource(): Promise<TenantSource> {
  const { locationId } = getCredentials();
  if (!locationId) throw new Error('GHL location is not configured');
  const objectKey = await resolvePropertyObjectKey();
  const association = await ghlFetch(`/associations/key/tenant?locationId=${encodeURIComponent(locationId)}`, { version: 'v3' });
  if (!association.id || association.locationId !== locationId ||
      !((association.firstObjectKey === 'contact' && association.secondObjectKey === objectKey) ||
      (association.secondObjectKey === 'contact' && association.firstObjectKey === objectKey))) {
    throw new Error('Tenant association does not connect this location to Properties');
  }
  const [rawContacts, rawProperties] = await Promise.all([
    completePages<any>(async page => {
      const data = await ghlFetch('/contacts/search', { method: 'POST', body: {
        locationId, page, pageLimit: 100, filters: [{ field: 'tags', operator: 'contains', value: 'active' }]
      } });
      return { items: data.contacts, total: data.total };
    }),
    completePages<any>(async page => {
      const data = await ghlFetch(`/objects/${encodeURIComponent(objectKey)}/records/search`, {
        method: 'POST', version: process.env.GHL_OBJECTS_API_VERSION || '2021-07-28',
        body: { locationId, page, pageLimit: 100 }
      });
      return { items: data.records, total: data.total };
    })
  ]);
  const properties = rawProperties.map(p => {
    if (p.locationId !== locationId || p.objectKey !== objectKey || !p.properties || Array.isArray(p.properties)) throw new Error('Unexpected GHL property response');
    return { id: p.id, name: text(p.properties.complete_address), address: text(p.properties.complete_address), status: text(p.properties.vacancy_status).toLowerCase() };
  });
  const contacts: TenantSource['contacts'] = [];
  for (const c of rawContacts) {
    if (c.locationId !== locationId || !Array.isArray(c.tags) || !Array.isArray(c.customFields)) throw new Error('Unexpected GHL contact response');
    const relations = await completePages<any>(async (_page, skip) => {
      const data = await ghlFetch(`/associations/relations/${encodeURIComponent(c.id)}?locationId=${encodeURIComponent(locationId)}&skip=${skip}&limit=100`, { version: 'v3' });
      return { items: data.relations, total: data.total };
    });
    const propertyIds = relations.filter(r => r.associationId === association.id).map(r => {
      if (r.locationId !== locationId) throw new Error('Unexpected relationship location');
      if (r.firstObjectKey === 'contact' && r.firstRecordId === c.id && r.secondObjectKey === objectKey) return r.secondRecordId as string;
      if (r.secondObjectKey === 'contact' && r.secondRecordId === c.id && r.firstObjectKey === objectKey) return r.firstRecordId as string;
      throw new Error('Unexpected Tenant relationship');
    });
    const lease = c.customFields.find((f: any) => f.id === GHL_FIELD_IDS.LEASE_ACTIVE)?.value;
    contacts.push({ id: c.id, name: text(c.contactName) || [text(c.firstName), text(c.lastName)].filter(Boolean).join(' ') || 'Unnamed contact',
      email: text(c.email).toLowerCase() || null, phone: text(c.phone) || null,
      active: c.tags.some((tag: unknown) => text(tag).toLowerCase() === 'active'),
      leaseChecked: Array.isArray(lease) && lease.includes('Yes'), propertyIds: Array.from(new Set<string>(propertyIds)).sort()
    });
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return { locationId, objectKey, contacts: contacts.sort((a, b) => a.id.localeCompare(b.id)), properties: properties.sort((a, b) => a.id.localeCompare(b.id)) };
}
