import type { Firestore, DocumentData } from 'firebase-admin/firestore';

function pick(data: DocumentData, keys: string[]) {
  return Object.fromEntries(keys.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
}
export function serializeOwnerData(value: any): any {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeOwnerData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeOwnerData(v)]));
  return value;
}

export async function loadOwnerData(db: Firestore, uid: string, propertyId?: string) {
  const role = (await db.doc(`users/${uid}`).get()).data()?.role;
  if (role !== 'landlord') throw new Error('Owner access required');
  const propertySnapshot = await db.collection('properties').where('landlordId', '==', uid).get();
  const ownedIds = new Set(propertySnapshot.docs.map(d => d.id));
  if (propertyId && !ownedIds.has(propertyId)) throw new Error('Property unavailable');
  const propertyDocs = propertySnapshot.docs.filter(d => !propertyId || d.id === propertyId);
  const properties = propertyDocs.map(d => ({ id: d.id, ...pick(d.data(), ['name', 'address', 'landlordId', 'status', 'available', 'rent', 'defaultRentAmount', 'bedrooms', 'bathrooms', 'squareFeet', 'images', 'description', 'features', 'amenities', 'units', 'totalUnits', 'archived']) }));
  const fields: Record<string, string[]> = {
    leases: ['propertyId', 'unitId', 'unit', 'tenantId', 'tenantName', 'landlordId', 'startDate', 'endDate', 'monthlyRent', 'securityDeposit', 'paymentDueDay', 'isActive', 'status', 'fileIds'],
    ledger: ['propertyId', 'tenantId', 'landlordId', 'amount', 'type', 'category', 'date', 'status', 'description', 'paymentMethod'],
    maintenanceRequests: ['propertyId', 'title', 'description', 'status', 'priority', 'category', 'createdAt', 'updatedAt', 'assignedVendorName', 'scheduledDate', 'scheduledTime', 'timeZone', 'assignedVendorPhone', 'estimatedCost', 'actualCost', 'fileIds'],
    landlordExpenses: ['propertyId', 'propertyName', 'landlordId', 'amount', 'category', 'expenseType', 'date', 'paidDate', 'status', 'vendor', 'description', 'fileIds']
  };
  const collected: Record<string, DocumentData[]> = {};
  await Promise.all(Object.entries(fields).map(async ([collection, keys]) => {
    const lists = await Promise.all(propertyDocs.map(d => db.collection(collection).where('propertyId', '==', d.id).get()));
    collected[collection] = lists.flatMap(list => list.docs.filter(d => !d.data().landlordId || d.data().landlordId === uid)
      .map(d => ({ id: d.id, ...pick(d.data(), keys) })));
  }));
  const [payouts, documents, profile] = await Promise.all([
    db.collection('payouts').where('landlordId', '==', uid).get(),
    db.collection('landlordDocuments').where('landlordId', '==', uid).get(),
    db.doc(`landlords/${uid}`).get()
  ]);
  const fee = profile.data()?.managementFee;
  if (fee && (!['percentage', 'flat_monthly', 'flat_per_unit'].includes(fee.type) || typeof fee.amount !== 'number' || !Number.isFinite(fee.amount) || fee.amount < 0 || (fee.type === 'percentage' && fee.amount > 100))) throw new Error('Invalid management fee configuration');
  for (const p of payouts.docs) {
    if (typeof p.data().netAmount !== 'number' || !Number.isFinite(p.data().netAmount)) throw new Error('Invalid payout amount');
  }
  return serializeOwnerData({ properties, leases: collected.leases, ledger: collected.ledger,
    maintenanceRequests: collected.maintenanceRequests, expenses: collected.landlordExpenses,
    managementFee: profile.data()?.managementFee || null,
    payouts: payouts.docs.map(d => ({ id: d.id, processedDate: d.data().processedDate || d.data().completedDate || null, ...pick(d.data(), ['netAmount', 'rentCollected', 'managementFees', 'totalDeductions', 'payoutMethod', 'status', 'scheduledDate', 'processedDate', 'completedDate', 'payoutPeriodStart', 'payoutPeriodEnd']) })),
    documents: documents.docs.filter(d => !d.data().propertyId || ownedIds.has(d.data().propertyId)).map(d => ({ id: d.id,
      ...pick(d.data(), ['fileName', 'documentType', 'fileSize', 'status', 'createdAt', 'updatedAt']),
      downloadable: typeof d.data().storagePath === 'string' && d.data().storagePath.startsWith(`landlordDocuments/${uid}/`) }))
  });
}

export async function ownerDocumentPath(db: Firestore, uid: string, id: string) {
  if (!id || id.includes('/')) throw new Error('Document unavailable');
  if ((await db.doc(`users/${uid}`).get()).data()?.role !== 'landlord') throw new Error('Owner access required');
  const data = (await db.doc(`landlordDocuments/${id}`).get()).data();
  if (!data || data.landlordId !== uid) throw new Error('Document unavailable');
  if (data.propertyId && (await db.doc(`properties/${data.propertyId}`).get()).data()?.landlordId !== uid) throw new Error('Document unavailable');
  if (typeof data.storagePath !== 'string' || !data.storagePath.startsWith(`landlordDocuments/${uid}/`) || data.storagePath.includes('..')) throw new Error('Document storage requires migration');
  return { storagePath: data.storagePath as string, fileName: String(data.fileName || 'document.pdf') };
}
