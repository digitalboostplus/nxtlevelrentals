import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { FunctionCallResult } from '@/types/chat';

// Execute a function call from the AI
export async function executeChatFunction(
  functionName: string,
  args: Record<string, unknown>,
  userId: string,
  userRole: 'tenant' | 'admin' | 'super-admin'
): Promise<FunctionCallResult> {
  try {
    switch (functionName) {
      // Tenant functions
      case 'submit_maintenance_request':
        return await submitMaintenanceRequest(userId, args);

      case 'check_payment_status':
        return await checkPaymentStatus(userId);

      case 'get_lease_details':
        return await getLeaseDetails(userId);

      case 'get_payment_history':
        return await getPaymentHistory(userId, args.months as number || 6);

      case 'escalate_to_human':
        return await escalateToHuman(userId, args.reason as string, args.conversationId as string);

      // Admin functions
      case 'get_portfolio_summary':
        if (userRole !== 'admin' && userRole !== 'super-admin') {
          return { success: false, error: 'Unauthorized' };
        }
        return await getPortfolioSummary();

      case 'get_overdue_tenants':
        if (userRole !== 'admin' && userRole !== 'super-admin') {
          return { success: false, error: 'Unauthorized' };
        }
        return await getOverdueTenants();

      case 'get_tenant_details':
        if (userRole !== 'admin' && userRole !== 'super-admin') {
          return { success: false, error: 'Unauthorized' };
        }
        return await getTenantDetails(args.tenantId as string, args.tenantName as string);

      case 'get_maintenance_queue':
        if (userRole !== 'admin' && userRole !== 'super-admin') {
          return { success: false, error: 'Unauthorized' };
        }
        return await getMaintenanceQueue(args.priority as string, args.status as string);

      case 'get_property_rent_status':
        if (userRole !== 'admin' && userRole !== 'super-admin') {
          return { success: false, error: 'Unauthorized' };
        }
        return await getPropertyRentStatus(args.propertyId as string);

      default:
        return {
          success: false,
          error: `Unknown function: ${functionName}`
        };
    }
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred'
    };
  }
}

// Tenant Functions

async function submitMaintenanceRequest(
  userId: string,
  args: Record<string, unknown>
): Promise<FunctionCallResult> {
  const { title, description, priority, category } = args;

  if (!title || !description || !priority || !category) {
    return {
      success: false,
      error: 'Missing required fields: title, description, priority, category'
    };
  }

  // Get user's property
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const propertyId = userData?.propertyIds?.[0];

  if (!propertyId) {
    return {
      success: false,
      error: 'No property associated with this tenant',
      message: 'I couldn\'t find a property linked to your account. Please contact support.'
    };
  }

  // Create the maintenance request
  const requestRef = await adminDb.collection('maintenanceRequests').add({
    tenantId: userId,
    propertyId,
    title,
    description,
    priority,
    category,
    status: 'submitted',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return {
    success: true,
    data: {
      requestId: requestRef.id,
      title,
      priority,
      status: 'submitted'
    },
    message: `Your maintenance request "${title}" has been submitted successfully. A technician will be assigned shortly.`
  };
}

async function checkPaymentStatus(userId: string): Promise<FunctionCallResult> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const monthlyRent = userData?.monthlyRent || 0;

  // Get current month's ledger entries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('tenantId', '==', userId)
    .where('date', '>=', monthStart)
    .where('date', '<=', monthEnd)
    .get();

  const entries = ledgerSnap.docs.map(doc => doc.data());

  const charges = entries
    .filter(e => e.type === 'charge')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const payments = entries
    .filter(e => e.type === 'payment')
    .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

  const balance = charges - payments;
  const lastPayment = entries.find(e => e.type === 'payment');

  let status = 'pending';
  if (payments >= monthlyRent) {
    status = 'paid';
  } else if (payments > 0) {
    status = 'partial';
  } else if (now.getDate() > 5) {
    status = 'overdue';
  }

  return {
    success: true,
    data: {
      monthlyRent,
      amountPaid: payments,
      balance: Math.max(0, balance),
      status,
      lastPaymentDate: lastPayment?.date?.toDate?.()?.toLocaleDateString() || null,
      lastPaymentAmount: lastPayment ? Math.abs(lastPayment.amount) : null
    },
    message: status === 'paid'
      ? `Your rent for this month is paid in full. Thank you!`
      : status === 'partial'
        ? `You've paid $${payments.toLocaleString()} of your $${monthlyRent.toLocaleString()} rent. Balance due: $${balance.toLocaleString()}.`
        : `Your rent of $${monthlyRent.toLocaleString()} is ${status}. Please make a payment to stay current.`
  };
}

async function getLeaseDetails(userId: string): Promise<FunctionCallResult> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  // Check for GHL lease data on user profile
  const leaseStart = userData?.leaseStart;
  const leaseEnd = userData?.leaseEnd;
  const isActive = userData?.isLeaseActive;

  // Also check lease documents
  const leaseSnap = await adminDb
    .collection('leaseDocuments')
    .where('tenantId', '==', userId)
    .where('documentType', '==', 'lease')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const leaseDoc = leaseSnap.docs[0]?.data();

  // Determine lease status
  let status = 'Unknown';
  if (leaseEnd) {
    const endDate = new Date(leaseEnd);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (endDate < now) {
      status = 'Expired';
    } else if (endDate < thirtyDaysFromNow) {
      status = 'Expiring Soon';
    } else {
      status = 'Active';
    }
  }

  return {
    success: true,
    data: {
      startDate: leaseStart || null,
      endDate: leaseEnd || null,
      status,
      hasDocument: !!leaseDoc,
      documentUrl: leaseDoc?.documentUrl || null
    },
    message: leaseStart && leaseEnd
      ? `Your lease runs from ${leaseStart} to ${leaseEnd}. Status: ${status}.`
      : 'Lease details are not available. Please contact the office for more information.'
  };
}

async function getPaymentHistory(userId: string, months: number): Promise<FunctionCallResult> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('tenantId', '==', userId)
    .where('date', '>=', startDate)
    .orderBy('date', 'desc')
    .get();

  const payments = ledgerSnap.docs
    .map(doc => doc.data())
    .filter(e => e.type === 'payment')
    .map(p => ({
      date: p.date?.toDate?.()?.toLocaleDateString() || 'Unknown',
      amount: Math.abs(p.amount || 0),
      method: p.paymentMethod || 'Unknown',
      status: p.status || 'completed'
    }));

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    success: true,
    data: {
      payments,
      totalPaid,
      periodMonths: months
    },
    message: payments.length > 0
      ? `Found ${payments.length} payments totaling $${totalPaid.toLocaleString()} over the last ${months} months.`
      : `No payments found in the last ${months} months.`
  };
}

async function escalateToHuman(
  userId: string,
  reason: string,
  conversationId?: string
): Promise<FunctionCallResult> {
  // Get user info for the notification
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  // Create notification for admins
  const adminsSnap = await adminDb
    .collection('users')
    .where('role', 'in', ['admin', 'super-admin'])
    .get();

  const notifications = adminsSnap.docs.map(doc => ({
    userId: doc.id,
    type: 'chat_escalation',
    title: 'Chat Escalation',
    message: `${userData?.displayName || 'A tenant'} needs assistance: ${reason}`,
    chatConversationId: conversationId,
    escalatedUserId: userId,
    read: false,
    createdAt: FieldValue.serverTimestamp()
  }));

  // Create notifications for all admins
  const batch = adminDb.batch();
  for (const notification of notifications) {
    const notifRef = adminDb.collection('notifications').doc();
    batch.set(notifRef, notification);
  }
  await batch.commit();

  // Update conversation status if provided
  if (conversationId) {
    await adminDb.collection('chatConversations').doc(conversationId).update({
      status: 'escalated',
      escalationReason: reason,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  return {
    success: true,
    data: {
      escalated: true,
      notifiedAdmins: notifications.length
    },
    message: "I've connected you with our support team. A team member will respond to your inquiry shortly. They can be reached at the office during business hours or will follow up via email."
  };
}

// Admin Functions

async function getPortfolioSummary(): Promise<FunctionCallResult> {
  const propertiesSnap = await adminDb.collection('properties').get();
  const tenantsSnap = await adminDb
    .collection('users')
    .where('role', '==', 'tenant')
    .get();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('date', '>=', monthStart)
    .where('date', '<=', monthEnd)
    .get();

  const entries = ledgerSnap.docs.map(doc => doc.data());

  const totalExpected = propertiesSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().rent || 0), 0
  );

  const totalCollected = entries
    .filter(e => e.type === 'payment' && e.category === 'rent')
    .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

  const collectionRate = totalExpected > 0
    ? Math.round((totalCollected / totalExpected) * 100)
    : 0;

  const overdueSnap = await adminDb
    .collection('ledger')
    .where('status', '==', 'overdue')
    .get();

  const overdueAmount = overdueSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().amount || 0), 0
  );

  return {
    success: true,
    data: {
      properties: propertiesSnap.size,
      tenants: tenantsSnap.size,
      totalExpected,
      totalCollected,
      collectionRate,
      overdueAmount
    },
    message: `Portfolio: ${propertiesSnap.size} properties, ${tenantsSnap.size} tenants. This month: $${totalCollected.toLocaleString()} collected of $${totalExpected.toLocaleString()} expected (${collectionRate}% collection rate). Overdue: $${overdueAmount.toLocaleString()}.`
  };
}

async function getOverdueTenants(): Promise<FunctionCallResult> {
  // Get all tenants
  const tenantsSnap = await adminDb
    .collection('users')
    .where('role', '==', 'tenant')
    .get();

  interface TenantDoc {
    id: string;
    displayName?: string;
    email?: string;
    unit?: string;
    address?: string;
    monthlyRent?: number;
    propertyIds?: string[];
  }

  const tenants: TenantDoc[] = tenantsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TenantDoc));

  // Check each tenant's payment status
  const overdueTenants = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const tenant of tenants) {
    const ledgerSnap = await adminDb
      .collection('ledger')
      .where('tenantId', '==', tenant.id)
      .where('date', '>=', monthStart)
      .where('date', '<=', monthEnd)
      .get();

    const entries = ledgerSnap.docs.map(doc => doc.data());
    const monthlyRent = tenant.monthlyRent || 0;

    const payments = entries
      .filter(e => e.type === 'payment')
      .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

    if (payments < monthlyRent && now.getDate() > 5) {
      overdueTenants.push({
        name: tenant.displayName || 'Unknown',
        unit: tenant.unit || 'N/A',
        address: tenant.address || 'N/A',
        monthlyRent,
        amountPaid: payments,
        amountDue: monthlyRent - payments
      });
    }
  }

  return {
    success: true,
    data: {
      count: overdueTenants.length,
      tenants: overdueTenants
    },
    message: overdueTenants.length > 0
      ? `Found ${overdueTenants.length} tenant(s) with overdue rent:\n${overdueTenants.map(t => `- ${t.name} (${t.unit}): $${t.amountDue.toLocaleString()} due`).join('\n')}`
      : 'All tenants are current on their rent payments.'
  };
}

async function getTenantDetails(
  tenantId?: string,
  tenantName?: string
): Promise<FunctionCallResult> {
  let tenantDoc;

  if (tenantId) {
    tenantDoc = await adminDb.collection('users').doc(tenantId).get();
  } else if (tenantName) {
    // Search by name
    const tenantsSnap = await adminDb
      .collection('users')
      .where('role', '==', 'tenant')
      .get();

    const match = tenantsSnap.docs.find(doc =>
      doc.data().displayName?.toLowerCase().includes(tenantName.toLowerCase())
    );

    if (match) {
      tenantDoc = match;
    }
  }

  if (!tenantDoc?.exists) {
    return {
      success: false,
      error: 'Tenant not found',
      message: `I couldn't find a tenant ${tenantId ? `with ID ${tenantId}` : `named "${tenantName}"`}. Please check the name or ID.`
    };
  }

  const tenant = tenantDoc.data();
  const tenantUserId = tenantDoc.id;

  // Get payment status
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('tenantId', '==', tenantUserId)
    .where('date', '>=', monthStart)
    .get();

  const entries = ledgerSnap.docs.map(doc => doc.data());
  const monthlyRent = tenant?.monthlyRent || 0;
  const payments = entries
    .filter(e => e.type === 'payment')
    .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

  // Get maintenance requests
  const maintenanceSnap = await adminDb
    .collection('maintenanceRequests')
    .where('tenantId', '==', tenantUserId)
    .where('status', 'in', ['submitted', 'in_progress'])
    .get();

  return {
    success: true,
    data: {
      id: tenantUserId,
      name: tenant?.displayName || 'Unknown',
      email: tenant?.email || 'N/A',
      unit: tenant?.unit || 'N/A',
      address: tenant?.address || 'N/A',
      monthlyRent,
      amountPaid: payments,
      balance: Math.max(0, monthlyRent - payments),
      openMaintenanceRequests: maintenanceSnap.size
    },
    message: `${tenant?.displayName || 'Tenant'} (${tenant?.unit || 'N/A'}): Rent $${monthlyRent.toLocaleString()}, Paid $${payments.toLocaleString()}, Balance $${Math.max(0, monthlyRent - payments).toLocaleString()}. Open maintenance: ${maintenanceSnap.size}.`
  };
}

async function getMaintenanceQueue(
  priority?: string,
  status?: string
): Promise<FunctionCallResult> {
  let query: FirebaseFirestore.Query = adminDb.collection('maintenanceRequests');

  // Default to pending/in_progress if no status specified
  if (status) {
    query = query.where('status', '==', status);
  } else {
    query = query.where('status', 'in', ['submitted', 'in_progress']);
  }

  const maintenanceSnap = await query.orderBy('createdAt', 'desc').limit(20).get();

  interface MaintenanceQueueDoc {
    id: string;
    title?: string;
    status?: string;
    priority?: string;
    tenantId?: string;
    createdAt?: any;
  }

  let requests: MaintenanceQueueDoc[] = maintenanceSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  } as MaintenanceQueueDoc));

  // Filter by priority if specified
  if (priority) {
    requests = requests.filter(r => r.priority === priority);
  }

  // Get tenant names
  const tenantIds = requests.map(r => r.tenantId).filter(Boolean) as string[];
  const uniqueTenantIds = Array.from(new Set(tenantIds));
  const tenantMap = new Map<string, string>();

  for (let i = 0; i < uniqueTenantIds.length; i++) {
    const id = uniqueTenantIds[i];
    const doc = await adminDb.collection('users').doc(id).get();
    tenantMap.set(id, doc.data()?.displayName || 'Unknown');
  }

  const formattedRequests = requests.map(r => ({
    id: r.id,
    title: r.title || '',
    tenant: r.tenantId ? tenantMap.get(r.tenantId) || 'Unknown' : 'Unknown',
    priority: r.priority || '',
    status: r.status || '',
    createdAt: r.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'
  }));

  const urgentCount = formattedRequests.filter(r => r.priority === 'urgent').length;
  const highCount = formattedRequests.filter(r => r.priority === 'high').length;

  return {
    success: true,
    data: {
      total: formattedRequests.length,
      urgent: urgentCount,
      high: highCount,
      requests: formattedRequests
    },
    message: formattedRequests.length > 0
      ? `${formattedRequests.length} maintenance requests${priority ? ` (${priority} priority)` : ''}${status ? ` with status "${status}"` : ''}. ${urgentCount} urgent, ${highCount} high priority.`
      : 'No maintenance requests found matching the criteria.'
  };
}

async function getPropertyRentStatus(propertyId?: string): Promise<FunctionCallResult> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get properties
  let propertiesQuery: any = adminDb.collection('properties');
  if (propertyId) {
    const propertyDoc = await propertiesQuery.doc(propertyId).get();
    if (!propertyDoc.exists) {
      return {
        success: false,
        error: 'Property not found',
        message: `Property with ID ${propertyId} not found.`
      };
    }
  }

  const propertiesSnap = propertyId
    ? await adminDb.collection('properties').where('__name__', '==', propertyId).get()
    : await adminDb.collection('properties').get();

  interface PropertyDoc {
    id: string;
    address?: string;
    rent?: number;
  }

  const properties: PropertyDoc[] = propertiesSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as PropertyDoc));

  // Get tenants
  const tenantsSnap = await adminDb
    .collection('users')
    .where('role', '==', 'tenant')
    .get();

  interface RentStatusTenantDoc {
    id: string;
    displayName?: string;
    propertyIds?: string[];
  }

  const tenants: RentStatusTenantDoc[] = tenantsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as RentStatusTenantDoc));

  // Get ledger entries
  const ledgerSnap = await adminDb
    .collection('ledger')
    .where('date', '>=', monthStart)
    .where('date', '<=', monthEnd)
    .get();

  const entries = ledgerSnap.docs.map(doc => doc.data());

  // Build status for each property
  const statuses = properties.map(property => {
    const tenant = tenants.find(t =>
      property.id && t.propertyIds?.includes(property.id)
    );

    const propertyPayments = entries.filter(
      e => e.propertyId === property.id &&
        e.type === 'payment' &&
        e.category === 'rent'
    );

    const totalPaid = propertyPayments.reduce(
      (sum, e) => sum + Math.abs(e.amount || 0), 0
    );

    const rent = property.rent || 0;
    let status = 'pending';

    if (totalPaid >= rent) status = 'paid';
    else if (totalPaid > 0) status = 'partial';
    else if (now.getDate() > 5) status = 'overdue';

    return {
      propertyId: property.id,
      address: property.address || 'Unknown',
      tenantName: tenant?.displayName || 'Vacant',
      monthlyRent: rent,
      amountPaid: totalPaid,
      status
    };
  });

  const summary = {
    total: statuses.length,
    paid: statuses.filter(s => s.status === 'paid').length,
    pending: statuses.filter(s => s.status === 'pending').length,
    partial: statuses.filter(s => s.status === 'partial').length,
    overdue: statuses.filter(s => s.status === 'overdue').length
  };

  return {
    success: true,
    data: {
      properties: statuses,
      summary
    },
    message: propertyId
      ? `Property ${statuses[0]?.address}: Rent $${statuses[0]?.monthlyRent.toLocaleString()}, Paid $${statuses[0]?.amountPaid.toLocaleString()}, Status: ${statuses[0]?.status}`
      : `Rent status: ${summary.paid} paid, ${summary.pending} pending, ${summary.partial} partial, ${summary.overdue} overdue.`
  };
}
