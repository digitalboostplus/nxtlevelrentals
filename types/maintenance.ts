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
  scheduledDate?: number; // timestamp
  technicianNotes?: string;
  adminNotes?: string;
}
