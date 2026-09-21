// Parse the payload GoHighLevel's workflow "Webhook" action sends when the
// CARIV AI Studio site's maintenance form enrolls a contact in MR01.
//
// GHL's payload shape is only loosely documented: standard contact fields sit
// at the root, custom fields arrive at the root keyed by their display name
// (or as a customFields array of {id, value}), and anything added under
// "Custom Data" arrives in customData. Each field is therefore resolved by
// its pinned id, then its short key, then a normalized name.

import { createHash } from 'crypto';
import { fromSiteIssueType, fromSitePriority } from './maintenanceNormalize';
import { normalizePhoneE164 } from './phone';

export type ParsedMaintenanceWebhook = {
  contactId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  attachmentUrls: string[];
  source: string;
  workflowName: string;
};

// Contact custom fields the site form writes (CARIV location).
const FIELDS = {
  address: { id: 'wqaOjNSaFgxwcSNpn2BM', key: 'property_address_maintenance', names: ['propertyaddressmaintenance', 'propertyaddress'] },
  issueType: { id: '3kPbrKRBZYbdJOhjQoHY', key: 'maintenance_issue_type', names: ['maintenanceissuetype', 'issuetype'] },
  priority: { id: 'LsuapjXL4dtW6OGkGboY', key: 'maintenance_priority', names: ['maintenancepriority', 'prioritylevel'] },
  description: { id: 'i0RhE3wq4RIQ2N28qxBG', key: 'maintenance_description', names: ['maintenancedescription', 'descriptionoftheissue'] },
  photos: { id: 'l2uP4G0iGvSXWA19SK9w', key: 'maintenance_photovideo', names: ['maintenancephotovideo', 'maintenancephotos', 'photosvideo'] },
} as const;

const MAX_ATTACHMENTS = 5;
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');

type Lookup = { byId: Map<string, unknown>; byKey: Map<string, unknown>; byName: Map<string, unknown> };

function buildLookup(body: Record<string, unknown>): Lookup {
  const byId = new Map<string, unknown>();
  const byKey = new Map<string, unknown>();
  const byName = new Map<string, unknown>();
  const addNamed = (source: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(source)) {
      byKey.set(k, v);
      byName.set(norm(k), v);
    }
  };
  addNamed(body);
  if (body.customData && typeof body.customData === 'object') addNamed(body.customData as Record<string, unknown>);
  const list = Array.isArray(body.customFields) ? body.customFields : Array.isArray(body.customField) ? body.customField : [];
  for (const f of list as Array<Record<string, unknown>>) {
    if (!f || typeof f !== 'object') continue;
    const value = f.value ?? f.fieldValue;
    if (typeof f.id === 'string') byId.set(f.id, value);
    for (const k of [f.key, f.fieldKey, f.name]) if (typeof k === 'string') { byKey.set(k.slice(k.lastIndexOf('.') + 1), value); byName.set(norm(k.slice(k.lastIndexOf('.') + 1)), value); }
  }
  return { byId, byKey, byName };
}

function pick(lookup: Lookup, spec: { id: string; key: string; names: readonly string[] }): unknown {
  if (lookup.byId.has(spec.id)) return lookup.byId.get(spec.id);
  if (lookup.byKey.has(spec.id)) return lookup.byKey.get(spec.id);
  if (lookup.byKey.has(spec.key)) return lookup.byKey.get(spec.key);
  for (const n of [norm(spec.key), ...spec.names]) if (lookup.byName.has(n)) return lookup.byName.get(n);
  return undefined;
}

function toUrls(raw: unknown): string[] {
  const items: unknown[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\s,]+/) : raw && typeof raw === 'object' ? [raw] : [];
  const urls = items.map(i => (typeof i === 'string' ? i : i && typeof i === 'object' ? (i as any).url ?? (i as any).fileUrl ?? '' : '')).map(u => String(u).trim());
  return Array.from(new Set(urls.filter(u => /^https:\/\/\S+$/.test(u)))).slice(0, MAX_ATTACHMENTS);
}

export function parseMaintenanceWebhook(body: unknown): ParsedMaintenanceWebhook {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Unsupported payload');
  const b = body as Record<string, unknown>;
  const lookup = buildLookup(b);
  const contactId = str(b.contact_id ?? b.contactId ?? (typeof b.contact === 'object' && b.contact ? (b.contact as any).id : undefined) ?? b.id, 64);
  const email = str(b.email, 160).toLowerCase();
  const phone = normalizePhoneE164(str(b.phone, 40));
  const name = str(b.full_name ?? b.fullName ?? b.contactName, 120) || [str(b.first_name ?? b.firstName, 60), str(b.last_name ?? b.lastName, 60)].filter(Boolean).join(' ');
  const description = str(pick(lookup, FIELDS.description), 4000);
  if (description.length < 5) throw new Error('Maintenance description is required');
  if (!contactId && !email && !phone) throw new Error('No contact id, email or phone in payload');
  const customData = b.customData && typeof b.customData === 'object' ? (b.customData as Record<string, unknown>) : {};
  return {
    contactId, name, email, phone,
    address: str(pick(lookup, FIELDS.address), 240),
    category: fromSiteIssueType(pick(lookup, FIELDS.issueType)),
    priority: fromSitePriority(pick(lookup, FIELDS.priority)),
    description,
    attachmentUrls: toUrls(pick(lookup, FIELDS.photos)),
    source: str(customData.source, 40) || 'ghl-site-form',
    workflowName: str(typeof b.workflow === 'object' && b.workflow ? (b.workflow as any).name : b.workflow_name, 120),
  };
}

/** Same person, same issue, same UTC day -> same ticket. 24 hex chars for a doc id. */
export function webhookFingerprint(p: ParsedMaintenanceWebhook, now: number = Date.now()): string {
  const day = new Date(now).toISOString().slice(0, 10);
  return createHash('sha256').update([p.contactId, p.email, p.phone, p.category, p.priority, p.address, p.description, day].join('|')).digest('hex').slice(0, 24);
}
