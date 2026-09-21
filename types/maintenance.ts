export type MaintenanceCategory = 'plumbing' | 'electrical' | 'appliance' | 'general' | 'hvac' | 'other';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';

export type MaintenanceStatus = 'submitted' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  title: string;
  description: string;
  images?: string[];
  status: MaintenanceStatus;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  scheduledDate?: number | string;
  scheduledTime?: string;
  timeZone?: string;
  assignedVendorName?: string;
  assignedVendorPhone?: string;
  actualCost?: number;
  fileIds?: string[]; // timestamp
  technicianNotes?: string;
  adminNotes?: string;
  /** Where the ticket came from: portal | public-form | ai-chat | ghl-site-form | backfill. */
  source?: string;
  /** Public-form / site-form tickets keep the submitter's details until an admin links them. */
  tenantName?: string;
  tenantPhone?: string | null;
  contactEmail?: string | null;
  addressText?: string;
  /** Files the GoHighLevel site form uploaded (URLs hosted by GHL). */
  attachmentUrls?: string[];
  // GoHighLevel "Maintenance Requests" custom-object mirror state (lib/ghl-maintenance-object.ts).
  ghlRecordId?: string | null;
  ghlContactId?: string | null;
  ghlPropertyRecordId?: string | null;
  ghlRelations?: { tenant?: string; property?: string };
  ghlSyncedAt?: number | null;
  ghlSyncError?: string | null;
}
