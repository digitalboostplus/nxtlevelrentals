export type DashboardMetrics = {
  currentBalance: number;
  dueDate: string;
  autoPayEnabled: boolean;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  maintenanceOpen: number;
  leaseRenewalDate: string;
  nextInspection: string;
};

export type PaymentRecord = {
  id: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Processing' | 'Failed';
  method: 'Bank Transfer' | 'Credit Card' | 'ACH';
  receiptUrl?: string;
};

export type MaintenanceRequest = {
  id: string;
  title: string;
  submittedOn: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  category?: string;
};

export type Announcement = {
  id: string;
  title: string;
  postedOn: string;
  content: string;
};

export type MessageThread = {
  id: string;
  from: string;
  sentAt: string;
  snippet: string;
  unread: boolean;
};

export type LeaseDocument = {
  id: string;
  title: string;
  updatedOn: string;
  downloadUrl: string;
};

export type SupportContact = {
  id: string;
  department: string;
  contactName: string;
  email: string;
  phone: string;
  hours: string;
  preferredChannel: 'Email' | 'Phone' | 'Chat';
};

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
};

export type ResidentResource = {
  id: string;
  title: string;
  summary: string;
  link: string;
};

export const maintenanceCategories = [
  'Appliance',
  'Electrical',
  'HVAC',
  'Plumbing',
  'Safety',
  'Structural',
  'Other'
] as const;
