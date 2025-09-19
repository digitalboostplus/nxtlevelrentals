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
  href: string;
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

export const tenantDashboard = {
  residentName: 'Morgan Rivera',
  propertyName: 'Lakeside Residences',
  unit: 'Unit 17B',
  metrics: {
    currentBalance: 1450,
    dueDate: '2024-06-01',
    autoPayEnabled: true,
    lastPaymentDate: '2024-05-01',
    lastPaymentAmount: 1450,
    maintenanceOpen: 1,
    leaseRenewalDate: '2024-09-01',
    nextInspection: '2024-06-18'
  } satisfies DashboardMetrics,
  payments: [
    {
      id: 'pmt-001',
      amount: 1450,
      date: '2024-05-01',
      status: 'Paid',
      method: 'Bank Transfer',
      receiptUrl: '#'
    },
    {
      id: 'pmt-002',
      amount: 1450,
      date: '2024-04-01',
      status: 'Paid',
      method: 'ACH',
      receiptUrl: '#'
    },
    {
      id: 'pmt-003',
      amount: 1400,
      date: '2024-03-01',
      status: 'Processing',
      method: 'Credit Card',
      receiptUrl: '#'
    }
  ] satisfies PaymentRecord[],
  maintenance: [
    {
      id: 'mnt-001',
      title: 'HVAC Filter Replacement',
      submittedOn: '2024-05-18',
      status: 'Resolved',
      priority: 'Low',
      description: 'Filters were replaced and system inspected. All readings normal.',
      category: 'HVAC'
    },
    {
      id: 'mnt-002',
      title: 'Dishwasher Leak',
      submittedOn: '2024-05-25',
      status: 'In Progress',
      priority: 'High',
      description: 'Technician scheduled for follow-up visit with replacement part delivery on May 28.',
      category: 'Appliance'
    },
    {
      id: 'mnt-003',
      title: 'Balcony Door Alignment',
      submittedOn: '2024-05-29',
      status: 'Open',
      priority: 'Medium',
      description: 'Door alignment shifted after recent storm. Awaiting vendor availability.',
      category: 'Structural'
    }
  ] satisfies MaintenanceRequest[],
  announcements: [
    {
      id: 'ann-001',
      title: 'Community Pool Maintenance',
      postedOn: '2024-05-30',
      content: 'The pool and fitness center will be closed for scheduled maintenance on June 3 from 8am to 4pm.'
    },
    {
      id: 'ann-002',
      title: 'Package Locker Upgrade',
      postedOn: '2024-05-24',
      content: 'Smart package lockers are being installed in the lobby. Look for onboarding instructions in your email.'
    }
  ] satisfies Announcement[],
  messages: [
    {
      id: 'msg-001',
      from: 'Julia Chen - Property Manager',
      sentAt: '2024-05-27T09:30:00Z',
      snippet: 'Following up on your dishwasher repair. The vendor has confirmed the new part will arrive tomorrow.',
      unread: true
    },
    {
      id: 'msg-002',
      from: 'Maintenance Team',
      sentAt: '2024-05-20T16:05:00Z',
      snippet: 'Your HVAC maintenance ticket has been resolved. Please confirm everything is functioning as expected.',
      unread: false
    },
    {
      id: 'msg-003',
      from: 'Community Manager',
      sentAt: '2024-05-15T14:18:00Z',
      snippet: 'Join us for the rooftop sunset social this Friday at 6pm. RSVP in the tenant portal events tab!',
      unread: false
    }
  ] satisfies MessageThread[],
  documents: [
    {
      id: 'doc-001',
      title: 'Residential Lease Agreement',
      updatedOn: '2024-04-12',
      downloadUrl: '#'
    },
    {
      id: 'doc-002',
      title: 'Community Guidelines',
      updatedOn: '2024-02-01',
      downloadUrl: '#'
    },
    {
      id: 'doc-003',
      title: 'Renter Insurance Proof',
      updatedOn: '2024-01-18',
      downloadUrl: '#'
    }
  ] satisfies LeaseDocument[],
  quickActions: [
    {
      id: 'qa-001',
      label: 'Set up AutoPay',
      description: 'Enable automatic rent payments to stay on schedule.',
      href: '#autopay'
    },
    {
      id: 'qa-002',
      label: 'Update Renter Insurance',
      description: 'Upload your active insurance policy for compliance.',
      href: '#insurance'
    },
    {
      id: 'qa-003',
      label: 'Reserve Amenities',
      description: 'Book the rooftop lounge or community workspace.',
      href: '#amenities'
    }
  ] satisfies QuickAction[],
  supportContacts: [
    {
      id: 'sc-001',
      department: 'Property Manager',
      contactName: 'Julia Chen',
      email: 'julia@nxtlevelmngmnt.com',
      phone: '(555) 201-3321',
      hours: 'Mon-Fri - 9am-6pm',
      preferredChannel: 'Email'
    },
    {
      id: 'sc-002',
      department: 'Resident Services',
      contactName: 'Darius Patel',
      email: 'services@nxtlevelmngmnt.com',
      phone: '(555) 201-4440',
      hours: 'Daily - 8am-8pm',
      preferredChannel: 'Chat'
    },
    {
      id: 'sc-003',
      department: 'Emergency Maintenance',
      contactName: 'On-call Technician',
      email: 'urgent@nxtlevelmngmnt.com',
      phone: '(555) 201-9110',
      hours: '24/7 Response',
      preferredChannel: 'Phone'
    }
  ] satisfies SupportContact[],
  residentResources: [
    {
      id: 'rr-001',
      title: 'Move-in Checklist',
      summary: 'Step-by-step guide to settle into your new home.',
      link: '#move-in'
    },
    {
      id: 'rr-002',
      title: 'Community Events',
      summary: 'Stay in the loop on building events and workshops.',
      link: '#events'
    },
    {
      id: 'rr-003',
      title: 'Preferred Vendors',
      summary: 'Discounted services from trusted local partners.',
      link: '#vendors'
    }
  ] satisfies ResidentResource[]
};

export type TenantDashboard = typeof tenantDashboard;
