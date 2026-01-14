export type PortfolioMetric = {
  id: string;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'steady';
  trendValue: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  unit: string;
  leaseEnd: string;
  balance: number;
  autopay: boolean;
};

export type WorkOrder = {
  id: string;
  unit: string;
  submittedOn: string;
  summary: string;
  status: 'Open' | 'Scheduled' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
};

export type DocumentTask = {
  id: string;
  title: string;
  owner: string;
  receivedOn: string;
  status: 'Pending Review' | 'Approved' | 'Needs Update';
};

export const portfolioMetrics: PortfolioMetric[] = [
  {
    id: 'pm-occupancy',
    label: 'Occupancy rate',
    value: '96%',
    trend: 'up',
    trendValue: '+2.4% MoM'
  },
  {
    id: 'pm-rent',
    label: 'Rent collected',
    value: '$182K',
    trend: 'up',
    trendValue: '+$8.6K vs plan'
  },
  {
    id: 'pm-maintenance',
    label: 'Open maintenance',
    value: '12',
    trend: 'down',
    trendValue: '-5 WoW'
  },
  {
    id: 'pm-renewals',
    label: 'Upcoming renewals',
    value: '9',
    trend: 'steady',
    trendValue: 'Next 60 days'
  }
];

export const highPriorityWorkOrders: WorkOrder[] = [
  {
    id: 'wo-1043',
    unit: 'Lakeside - 17B',
    submittedOn: '2024-05-29',
    summary: 'Balcony door alignment impact from storm',
    status: 'Scheduled',
    priority: 'High'
  },
  {
    id: 'wo-1039',
    unit: 'Aurora Lofts - 4A',
    submittedOn: '2024-05-28',
    summary: 'Water heater pilot light failing to stay lit',
    status: 'Open',
    priority: 'High'
  },
  {
    id: 'wo-1034',
    unit: 'Riverpoint - 12C',
    submittedOn: '2024-05-26',
    summary: 'HVAC compressor noise above threshold',
    status: 'Open',
    priority: 'High'
  }
];

export const tenantPortfolio: TenantSummary[] = [
  {
    id: 'tenant-01',
    name: 'Morgan Rivera',
    unit: 'Lakeside - 17B',
    leaseEnd: '2024-09-01',
    balance: 0,
    autopay: true
  },
  {
    id: 'tenant-02',
    name: 'Daniel Cooper',
    unit: 'Aurora Lofts - 4A',
    leaseEnd: '2025-01-14',
    balance: 240,
    autopay: false
  },
  {
    id: 'tenant-03',
    name: 'Priya Nair',
    unit: 'Riverpoint - 12C',
    leaseEnd: '2024-12-30',
    balance: 0,
    autopay: true
  },
  {
    id: 'tenant-04',
    name: 'Ethan Wallace',
    unit: 'Harbor View - 8D',
    leaseEnd: '2024-08-15',
    balance: 120,
    autopay: false
  }
];

export const documentTasks: DocumentTask[] = [
  {
    id: 'doc-task-01',
    title: 'Lakeside - Unit 21A Lease Renewal',
    owner: 'Sarah Lee',
    receivedOn: '2024-05-30',
    status: 'Pending Review'
  },
  {
    id: 'doc-task-02',
    title: 'Aurora Lofts Vendor Insurance',
    owner: 'Northside HVAC',
    receivedOn: '2024-05-27',
    status: 'Needs Update'
  },
  {
    id: 'doc-task-03',
    title: 'Riverpoint Pet Addendum',
    owner: 'Priya Nair',
    receivedOn: '2024-05-24',
    status: 'Approved'
  }
];
