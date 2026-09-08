export type SourceTenant = {
  id: string; name: string; email: string | null; phone: string | null;
  active: boolean; leaseChecked: boolean; propertyIds: string[];
};
export type SourceProperty = { id: string; name: string; address: string; status: string };
export type TenantSource = {
  locationId: string; objectKey: string; contacts: SourceTenant[]; properties: SourceProperty[];
};
export type Eligibility = { eligible: boolean; property: SourceProperty | null; warnings: string[]; reasons: string[] };

export function tenantEligibility(contact: SourceTenant, properties: SourceProperty[]): Eligibility {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (!contact.active) reasons.push('Missing active tag');
  const ids = Array.from(new Set(contact.propertyIds));
  if (!ids.length) reasons.push('Missing Tenant relationship');
  const linked = ids.map(id => properties.find(p => p.id === id));
  if (linked.some(p => !p)) reasons.push('Related property is missing');
  if (linked.some(p => p && !['occupied', 'vacant', 'maintenance'].includes(p.status))) reasons.push('Unknown property status');
  const occupied = linked.filter((p): p is SourceProperty => p?.status === 'occupied');
  if (ids.length && !occupied.length) reasons.push('No occupied property');
  if (occupied.length > 1) reasons.push('Multiple occupied properties need review');
  if (!contact.email) warnings.push('Missing email; directory only');
  if (!contact.leaseChecked) warnings.push('Active Lease Agreement is not checked');
  return { eligible: !reasons.length, property: occupied.length === 1 ? occupied[0] : null, warnings, reasons };
}

/** Require an explicit, stable total; never mistake a short or repeated page for completion. */
export async function completePages<T extends { id: string }>(
  fetchPage: (page: number, skip: number) => Promise<{ items: T[]; total: number }>,
  maxPages = 100
): Promise<T[]> {
  const items: T[] = [];
  const ids = new Set<string>();
  let expected: number | undefined;
  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchPage(page, items.length);
    if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total) || result.total < 0) throw new Error('Incomplete GHL response');
    if (expected !== undefined && expected !== result.total) throw new Error('GHL changed during pagination; preview again');
    expected = result.total;
    for (const item of result.items) {
      if (!item.id || ids.has(item.id)) throw new Error('Missing or repeated GHL record');
      ids.add(item.id);
      items.push(item);
    }
    if (items.length === expected) return items;
    if (!result.items.length || items.length > expected) throw new Error('Incomplete GHL pagination');
  }
  throw new Error('GHL pagination limit reached; import disabled');
}
