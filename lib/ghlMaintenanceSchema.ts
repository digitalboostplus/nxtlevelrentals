// Declarative schema for the GoHighLevel "Maintenance Requests" custom object
// plus a pure diff against what the location already has. The setup script
// (scripts/setup-ghl-maintenance-object.ts) applies the diff; the mirror
// (lib/ghl-maintenance-object.ts) writes records with these short keys.

import { ISSUE_TYPES, PRIORITY_LABELS, SOURCE_LABELS, STATUS_LABELS } from './maintenanceNormalize';

export type FieldType = 'TEXT' | 'LARGE_TEXT' | 'NUMERICAL' | 'PHONE' | 'MONETORY' | 'DATE' | 'SINGLE_OPTIONS';

export type FieldSpec = { key: string; name: string; dataType: FieldType; options?: readonly string[] };

export const MAINTENANCE_OBJECT = {
  key: 'custom_objects.maintenance_request',
  labels: { singular: 'Maintenance Request', plural: 'Maintenance Requests' },
  description: 'Tenant maintenance tickets mirrored from the NXT Level portal (source of truth: Firestore maintenanceRequests).',
  primary: { key: 'title', name: 'Title', dataType: 'TEXT' as const },
} as const;

export const ASSOCIATIONS = {
  tenant: { key: 'maintenance_tenant', firstObjectKey: 'contact', firstObjectLabel: 'Tenant', secondObjectLabel: 'Maintenance Request' },
  property: { key: 'maintenance_property', firstObjectKey: 'custom_objects.houses', firstObjectLabel: 'Property', secondObjectLabel: 'Maintenance Request' },
} as const;

export const MAINTENANCE_FIELDS: readonly FieldSpec[] = [
  { key: 'ticket_id', name: 'Ticket ID', dataType: 'TEXT' },
  { key: 'issue_type', name: 'Issue Type', dataType: 'SINGLE_OPTIONS', options: ISSUE_TYPES },
  { key: 'priority', name: 'Priority', dataType: 'SINGLE_OPTIONS', options: PRIORITY_LABELS },
  { key: 'issue_description', name: 'Description', dataType: 'LARGE_TEXT' },
  { key: 'property_address', name: 'Property Address', dataType: 'TEXT' },
  { key: 'permission_to_enter', name: 'Permission To Enter', dataType: 'SINGLE_OPTIONS', options: ['Yes', 'No'] },
  { key: 'has_pets', name: 'Pets In Home', dataType: 'SINGLE_OPTIONS', options: ['Yes', 'No'] },
  { key: 'preferred_time', name: 'Preferred Time', dataType: 'TEXT' },
  { key: 'photo_links', name: 'Photo Links', dataType: 'LARGE_TEXT' },
  { key: 'status', name: 'Status', dataType: 'SINGLE_OPTIONS', options: STATUS_LABELS },
  { key: 'scheduled_date', name: 'Scheduled Date', dataType: 'DATE' },
  { key: 'scheduled_time', name: 'Scheduled Time', dataType: 'TEXT' },
  { key: 'vendor_name', name: 'Vendor Name', dataType: 'TEXT' },
  { key: 'vendor_phone', name: 'Vendor Phone', dataType: 'PHONE' },
  { key: 'actual_cost', name: 'Actual Cost', dataType: 'MONETORY' },
  { key: 'admin_notes', name: 'Admin Notes', dataType: 'LARGE_TEXT' },
  { key: 'completed_at', name: 'Completed At', dataType: 'DATE' },
  { key: 'source', name: 'Source', dataType: 'SINGLE_OPTIONS', options: SOURCE_LABELS },
  { key: 'submitted_at', name: 'Submitted At', dataType: 'DATE' },
  { key: 'submitter_name', name: 'Submitter Name', dataType: 'TEXT' },
  { key: 'portal_url', name: 'Portal Link', dataType: 'TEXT' },
];

export function fullFieldKey(shortKey: string, objectKey: string = MAINTENANCE_OBJECT.key): string {
  return `${objectKey}.${shortKey}`;
}

export const shortFieldKey = (fieldKey: string) => fieldKey.slice(fieldKey.lastIndexOf('.') + 1);

/** A field as GHL lists it; options may be objects or bare strings depending on the API version. */
export type ExistingField = { id?: string; fieldKey?: string; dataType?: string; name?: string; options?: Array<{ key?: string; label?: string } | string> };

export type SchemaPlan = {
  create: FieldSpec[];
  updateOptions: Array<{ id: string; key: string; options: string[] }>;
  typeMismatch: Array<{ key: string; expected: FieldType; actual: string }>;
};

const optionLabel = (o: { key?: string; label?: string } | string) => (typeof o === 'string' ? o : o.label ?? o.key ?? '');

/** Compare the declared fields with the ones GHL already has. Never touches the primary field. */
export function diffMaintenanceSchema(existing: ExistingField[]): SchemaPlan {
  const byKey = new Map(existing.filter(f => f.fieldKey).map(f => [shortFieldKey(f.fieldKey!), f]));
  const plan: SchemaPlan = { create: [], updateOptions: [], typeMismatch: [] };
  for (const spec of MAINTENANCE_FIELDS) {
    const current = byKey.get(spec.key);
    if (!current) { plan.create.push(spec); continue; }
    if (current.dataType && current.dataType !== spec.dataType) { plan.typeMismatch.push({ key: spec.key, expected: spec.dataType, actual: current.dataType }); continue; }
    if (spec.options && current.id) {
      const have = new Set((current.options || []).map(optionLabel));
      if (spec.options.some(o => !have.has(o))) {
        plan.updateOptions.push({ id: current.id, key: spec.key, options: Array.from(new Set([...(current.options || []).map(optionLabel), ...spec.options])) });
      }
    }
  }
  return plan;
}
