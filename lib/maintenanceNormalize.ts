// One place that maps the app's maintenance values (which differ between the
// portal, the public form, the AI chat and the GoHighLevel site form) onto the
// option labels of the GHL "Maintenance Requests" custom object, and back.
// Pure functions; covered by maintenanceNormalize.test.ts.

export const ISSUE_TYPES = ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Roof/Leak', 'Pest Control', 'Locks/Security', 'Safety', 'Structural', 'Other'] as const;
export const PRIORITY_LABELS = ['Low', 'Medium', 'High', 'Emergency'] as const;
export const STATUS_LABELS = ['Submitted', 'In Progress', 'Completed', 'Cancelled'] as const;
export const SOURCE_LABELS = ['Portal', 'Public Form', 'AI Chat', 'Website Form', 'Backfill'] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];
export type PriorityLabel = (typeof PRIORITY_LABELS)[number];
export type StatusLabel = (typeof STATUS_LABELS)[number];
export type SourceLabel = (typeof SOURCE_LABELS)[number];

const squash = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z]/g, '');

const ISSUE_BY_TOKEN: Record<string, IssueType> = {
  plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC', hvacheatingcooling: 'HVAC', heatingcooling: 'HVAC',
  appliance: 'Appliance', roofleak: 'Roof/Leak', roof: 'Roof/Leak', leak: 'Roof/Leak', pestcontrol: 'Pest Control', pest: 'Pest Control',
  lockssecurity: 'Locks/Security', locks: 'Locks/Security', security: 'Locks/Security', safety: 'Safety', structural: 'Structural', other: 'Other',
};

/** App or site category -> custom object issue type label. Unknown -> Other. */
export function toIssueType(category: unknown): IssueType {
  return ISSUE_BY_TOKEN[squash(category)] ?? 'Other';
}

/** App priority ('low' | 'urgent' | 'Emergency' ...) -> option label. Unknown -> Medium. */
export function toPriorityLabel(priority: unknown): PriorityLabel {
  const p = squash(priority);
  if (p === 'low') return 'Low';
  if (p === 'high') return 'High';
  if (p === 'urgent' || p === 'emergency') return 'Emergency';
  return 'Medium';
}

export function toStatusLabel(status: unknown): StatusLabel {
  const s = squash(status);
  if (s === 'inprogress') return 'In Progress';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return 'Submitted';
}

export function toSourceLabel(source: unknown): SourceLabel {
  const s = squash(source);
  if (s === 'publicform') return 'Public Form';
  if (s === 'aichat') return 'AI Chat';
  if (s === 'ghlsiteform' || s === 'websiteform') return 'Website Form';
  if (s === 'backfill') return 'Backfill';
  return 'Portal';
}

/** Site form issue type label -> the category the app stores (title-case label). */
export function fromSiteIssueType(raw: unknown): IssueType {
  return toIssueType(raw);
}

/** Site form priority label -> the lowercase priority the app stores. */
export function fromSitePriority(raw: unknown): 'low' | 'medium' | 'high' | 'emergency' {
  return toPriorityLabel(raw).toLowerCase() as 'low' | 'medium' | 'high' | 'emergency';
}
