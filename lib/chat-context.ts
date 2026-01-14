import { adminDb } from './firebase-admin';
import type { TenantChatContext, AdminChatContext } from '@/types/chat';

// Helper to format Firestore timestamp to string
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Build context for tenant users
export async function buildTenantContext(userId: string): Promise<TenantChatContext> {
  // Fetch user profile
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data() || {};

  // Fetch maintenance requests
  const maintenanceSnap = await adminDb
    .collection('maintenanceRequests')
    .where('tenantId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  interface MaintenanceDoc {
    id: string;
    title?: string;
    status?: string;
    priority?: string;
    createdAt?: any;
  }

  const maintenanceRequests: MaintenanceDoc[] = maintenanceSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as MaintenanceDoc));

  const openRequests = maintenanceRequests.filter(
    r => r.status === 'submitted' || r.status === 'in_progress'
  ).length;

  // Fetch recent payments from ledger
  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('tenantId', '==', userId)
    .orderBy('date', 'desc')
    .limit(10)
    .get();

  const ledgerEntries = ledgerSnap.docs.map(doc => doc.data());

  // Calculate balance (charges - payments)
  const charges = ledgerEntries
    .filter(e => e.type === 'charge')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const payments = ledgerEntries
    .filter(e => e.type === 'payment')
    .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

  const currentDue = charges - payments;

  // Find last payment
  const lastPayment = ledgerEntries.find(e => e.type === 'payment');

  // Fetch active payment plan
  const paymentPlanSnap = await adminDb
    .collection('paymentPlans')
    .where('tenantId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  let paymentPlan;
  if (!paymentPlanSnap.empty) {
    const planData = paymentPlanSnap.docs[0].data();
    const nextInstallment = planData.installments?.find(
      (i: any) => i.status === 'pending'
    );
    paymentPlan = {
      totalAmount: planData.totalAmount || 0,
      remainingAmount: planData.remainingAmount || 0,
      nextDueDate: nextInstallment?.dueDate ? formatTimestamp(nextInstallment.dueDate) : '',
      nextDueAmount: nextInstallment?.amount || 0
    };
  }

  // Fetch lease documents for dates
  const leaseSnap = await adminDb
    .collection('leaseDocuments')
    .where('tenantId', '==', userId)
    .where('documentType', '==', 'lease')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  // Default lease status
  let leaseStatus: 'Active' | 'Expiring' | 'Expired' | 'Unknown' = 'Unknown';
  let leaseStartDate = '';
  let leaseEndDate = '';

  // Check if user has GHL lease data
  if (userData.leaseStart || userData.leaseEnd) {
    leaseStartDate = userData.leaseStart || '';
    leaseEndDate = userData.leaseEnd || '';

    if (userData.leaseEnd) {
      const endDate = new Date(userData.leaseEnd);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (endDate < now) {
        leaseStatus = 'Expired';
      } else if (endDate < thirtyDaysFromNow) {
        leaseStatus = 'Expiring';
      } else {
        leaseStatus = 'Active';
      }
    }
  }

  return {
    profile: {
      displayName: userData.displayName || 'Tenant',
      unit: userData.unit,
      address: userData.address,
      city: userData.city,
      state: userData.state,
      monthlyRent: userData.monthlyRent
    },
    balance: {
      currentDue: Math.max(0, currentDue),
      lastPaymentDate: lastPayment ? formatTimestamp(lastPayment.date) : undefined,
      lastPaymentAmount: lastPayment ? Math.abs(lastPayment.amount) : undefined
    },
    lease: {
      startDate: leaseStartDate,
      endDate: leaseEndDate,
      status: leaseStatus
    },
    maintenance: {
      openRequests,
      recentRequests: maintenanceRequests.slice(0, 3).map(r => ({
        id: r.id,
        title: r.title || '',
        status: r.status || '',
        priority: r.priority || '',
        createdAt: formatTimestamp(r.createdAt)
      }))
    },
    recentPayments: ledgerEntries
      .filter(e => e.type === 'payment')
      .slice(0, 5)
      .map(p => ({
        date: formatTimestamp(p.date),
        amount: Math.abs(p.amount || 0),
        status: p.status || 'completed',
        method: p.paymentMethod
      })),
    paymentPlan
  };
}

// Build context for admin users
export async function buildAdminContext(): Promise<AdminChatContext> {
  // Fetch portfolio stats
  const propertiesSnap = await adminDb.collection('properties').get();
  const tenantsSnap = await adminDb
    .collection('users')
    .where('role', '==', 'tenant')
    .get();

  // Get current month rent status
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Fetch ledger entries for current month
  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('date', '>=', monthStart)
    .where('date', '<=', monthEnd)
    .get();

  const ledgerEntries = ledgerSnap.docs.map(doc => doc.data());

  // Calculate totals
  const totalExpectedRent = propertiesSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().rent || 0), 0
  );

  const totalCollected = ledgerEntries
    .filter(e => e.type === 'payment' && e.category === 'rent')
    .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

  const collectionRate = totalExpectedRent > 0
    ? (totalCollected / totalExpectedRent) * 100
    : 0;

  // Calculate overdue amount
  const overdueSnap = await adminDb
    .collection('ledger')
    .where('status', '==', 'overdue')
    .get();

  const overdueAmount = overdueSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().amount || 0), 0
  );

  // Calculate rent status counts
  const propertyStatusMap = new Map();

  for (const property of propertiesSnap.docs) {
    const propertyId = property.id;
    const propertyRent = property.data().rent || 0;

    const propertyCharges = ledgerEntries.filter(
      e => e.propertyId === propertyId && e.type === 'charge' && e.category === 'rent'
    );
    const propertyPayments = ledgerEntries.filter(
      e => e.propertyId === propertyId && e.type === 'payment' && e.category === 'rent'
    );

    const totalPaid = propertyPayments.reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

    let status = 'pending';
    if (totalPaid >= propertyRent) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    } else if (now.getDate() > 5) { // After 5th of month
      status = 'overdue';
    }

    propertyStatusMap.set(propertyId, status);
  }

  const rentStatusCounts = {
    paid: Array.from(propertyStatusMap.values()).filter(s => s === 'paid').length,
    pending: Array.from(propertyStatusMap.values()).filter(s => s === 'pending').length,
    overdue: Array.from(propertyStatusMap.values()).filter(s => s === 'overdue').length,
    partial: Array.from(propertyStatusMap.values()).filter(s => s === 'partial').length
  };

  // Fetch maintenance requests
  const maintenanceSnap = await adminDb
    .collection('maintenanceRequests')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  interface AdminMaintenanceDoc {
    id: string;
    title?: string;
    status?: string;
    priority?: string;
    tenantId?: string;
    propertyId?: string;
    createdAt?: any;
  }

  const maintenanceRequests: AdminMaintenanceDoc[] = maintenanceSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AdminMaintenanceDoc));

  const pendingMaintenance = maintenanceRequests.filter(r => r.status === 'submitted');
  const inProgressMaintenance = maintenanceRequests.filter(r => r.status === 'in_progress');
  const urgentMaintenance = maintenanceRequests.filter(r => r.priority === 'urgent');

  // Build tenant name map for maintenance requests
  const tenantIds = Array.from(new Set(maintenanceRequests.map(r => r.tenantId).filter(Boolean))) as string[];
  const tenantMap = new Map<string, string>();

  for (let i = 0; i < tenantIds.length; i++) {
    const tenantId = tenantIds[i];
    const tenantDoc = await adminDb.collection('users').doc(tenantId).get();
    if (tenantDoc.exists) {
      tenantMap.set(tenantId, tenantDoc.data()?.displayName || 'Unknown');
    }
  }

  // Build property address map
  const propertyIds = Array.from(new Set(maintenanceRequests.map(r => r.propertyId).filter(Boolean))) as string[];
  const propertyMap = new Map<string, string>();

  for (let i = 0; i < propertyIds.length; i++) {
    const propertyId = propertyIds[i];
    const propertyDoc = await adminDb.collection('properties').doc(propertyId).get();
    if (propertyDoc.exists) {
      propertyMap.set(propertyId, propertyDoc.data()?.address || 'Unknown');
    }
  }

  return {
    portfolio: {
      totalProperties: propertiesSnap.size,
      activeTenants: tenantsSnap.size,
      collectionRate: Math.round(collectionRate * 10) / 10,
      overdueAmount,
      totalExpectedRent,
      totalCollected
    },
    rentStatus: rentStatusCounts,
    maintenance: {
      pendingCount: pendingMaintenance.length,
      inProgressCount: inProgressMaintenance.length,
      urgentCount: urgentMaintenance.length,
      recentRequests: maintenanceRequests.slice(0, 5).map(r => ({
        id: r.id,
        title: r.title || '',
        tenantName: r.tenantId ? tenantMap.get(r.tenantId) || 'Unknown' : 'Unknown',
        status: r.status || '',
        priority: r.priority || '',
        propertyAddress: r.propertyId ? propertyMap.get(r.propertyId) || '' : ''
      }))
    }
  };
}

// Format context as a string for the AI prompt
export function formatContextForPrompt(
  context: TenantChatContext | AdminChatContext,
  role: 'tenant' | 'admin' | 'super-admin'
): string {
  if (role === 'tenant') {
    const ctx = context as TenantChatContext;
    return `
TENANT INFORMATION:
- Name: ${ctx.profile.displayName}
- Unit: ${ctx.profile.unit || 'N/A'}
- Address: ${ctx.profile.address || 'N/A'}
- Monthly Rent: $${ctx.profile.monthlyRent?.toLocaleString() || 'N/A'}

BALANCE:
- Current Amount Due: $${ctx.balance.currentDue.toLocaleString()}
- Last Payment: ${ctx.balance.lastPaymentDate ? `$${ctx.balance.lastPaymentAmount?.toLocaleString()} on ${ctx.balance.lastPaymentDate}` : 'None recorded'}

LEASE:
- Status: ${ctx.lease.status}
- Start Date: ${ctx.lease.startDate || 'N/A'}
- End Date: ${ctx.lease.endDate || 'N/A'}

MAINTENANCE:
- Open Requests: ${ctx.maintenance.openRequests}
${ctx.maintenance.recentRequests.length > 0
  ? '- Recent:\n' + ctx.maintenance.recentRequests.map(r =>
      `  * ${r.title} (${r.status}, ${r.priority} priority)`
    ).join('\n')
  : '- No recent requests'}

${ctx.paymentPlan
  ? `PAYMENT PLAN:
- Total: $${ctx.paymentPlan.totalAmount.toLocaleString()}
- Remaining: $${ctx.paymentPlan.remainingAmount.toLocaleString()}
- Next Payment: $${ctx.paymentPlan.nextDueAmount.toLocaleString()} due ${ctx.paymentPlan.nextDueDate}`
  : ''}
`.trim();
  } else {
    const ctx = context as AdminChatContext;
    return `
PORTFOLIO OVERVIEW:
- Total Properties: ${ctx.portfolio.totalProperties}
- Active Tenants: ${ctx.portfolio.activeTenants}
- Collection Rate: ${ctx.portfolio.collectionRate}%
- Expected Rent (This Month): $${ctx.portfolio.totalExpectedRent.toLocaleString()}
- Collected (This Month): $${ctx.portfolio.totalCollected.toLocaleString()}
- Overdue Amount: $${ctx.portfolio.overdueAmount.toLocaleString()}

RENT STATUS (This Month):
- Paid: ${ctx.rentStatus.paid}
- Pending: ${ctx.rentStatus.pending}
- Partial: ${ctx.rentStatus.partial}
- Overdue: ${ctx.rentStatus.overdue}

MAINTENANCE:
- Pending: ${ctx.maintenance.pendingCount}
- In Progress: ${ctx.maintenance.inProgressCount}
- Urgent: ${ctx.maintenance.urgentCount}
${ctx.maintenance.recentRequests.length > 0
  ? '- Recent:\n' + ctx.maintenance.recentRequests.map(r =>
      `  * ${r.title} at ${r.propertyAddress} (${r.status}, ${r.priority})`
    ).join('\n')
  : ''}
`.trim();
  }
}
