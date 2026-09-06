import type { Firestore } from 'firebase-admin/firestore';
import { calculateBalance, moneyToCents } from './ledger';
export async function editProperty(db: Firestore, uid: string, id: string, input: any) {
  if (!/^[\w-]{1,128}$/.test(id)) throw new Error('Invalid property');
  await db.runTransaction(async tx => {
    const actor = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!['admin', 'super-admin'].includes(actor?.role)) throw new Error('Admin access required');
    const ref = db.doc(`properties/${id}`); const current = (await tx.get(ref)).data();
    if (!current) throw new Error('Property not found');
    const leases = await tx.get(db.collection('leases').where('propertyId', '==', id));
    const tickets = await tx.get(db.collection('maintenanceRequests').where('propertyId', '==', id));
    const ledger = await tx.get(db.collection('ledger').where('propertyId', '==', id));
    const expenses = await tx.get(db.collection('landlordExpenses').where('propertyId', '==', id));
    const balances = new Map<string, any[]>();
    for (const row of ledger.docs) {
      const entry = row.data(); const key = entry.tenantId || 'unassigned';
      balances.set(key, [...(balances.get(key) || []), entry]);
    }
    const unsettled = (rows: any[]) => rows.some(e => ['payment', 'credit'].includes(e.type) && ['pending', 'processing'].includes(e.status)) || calculateBalance(rows) !== 0;
    const active = leases.docs.filter(d => d.data().isActive);
    const open = tickets.docs.filter(d => !['completed', 'cancelled'].includes(d.data().status));
    const units = input.units;
    if (!Array.isArray(units) || units.length > 200 || new Set(units.map(u => u.id)).size !== units.length) throw new Error('Invalid unit inventory');
    if (!input.name?.trim() || !['vacant', 'occupied', 'maintenance'].includes(input.status)) throw new Error('Name and valid status are required');
    for (const value of [input.rent, ...units.map(u => u.rent)]) if (typeof value !== 'number' || moneyToCents(value) < 0) throw new Error('Rent must be a nonnegative amount');
    const existing: any[] = current.units || [];
    for (const previous of existing) if (!units.some(u => u.id === previous.id)) throw new Error('Archive units instead of deleting them');
    for (const unit of units) {
      if (!/^[\w-]{1,128}$/.test(unit.id) || !unit.unitNumber?.trim() || !['vacant', 'occupied', 'maintenance'].includes(unit.status)) throw new Error('Invalid unit');
      for (const key of ['bedrooms', 'bathrooms', 'squareFeet']) if (unit[key] !== undefined && (typeof unit[key] !== 'number' || !Number.isFinite(unit[key]) || unit[key] < 0)) throw new Error('Unit specifications must be nonnegative numbers');
      const previous = existing.find(u => u.id === unit.id);
      const busy = active.some(d => !d.data().unitId || d.data().unitId === unit.id);
      if (busy && (unit.archived || unit.status !== 'occupied')) throw new Error('Leased units must remain occupied and active');
      if (!busy && unit.status === 'occupied' && previous?.status !== 'occupied') throw new Error('Activate a lease to mark a unit occupied');
      if (unit.archived && ((previous?.status === 'occupied') || open.some(d => !d.data().unitId || d.data().unitId === unit.id))) throw new Error('Resolve occupancy and work orders before archiving a unit');
    }
    if (!existing.length && units.length && (active.length || current.status === 'occupied')) throw new Error('Reconcile the whole-property lease before adding units');
    if (active.length && !units.length && input.status !== 'occupied') throw new Error('Leased property must remain occupied');
    if (!active.length && input.status === 'occupied' && current.status !== 'occupied' && !units.some(u => u.status === 'occupied')) throw new Error('Activate a lease to mark occupancy');
    if (input.archived || units.some(u => u.archived && !existing.find(e => e.id === u.id)?.archived)) {
      if (Array.from(balances.values()).some(unsettled) || expenses.docs.some(d => ['pending', 'approved'].includes(d.data().status))) throw new Error('Reconcile outstanding financial obligations before archiving');
    }
    if (input.archived) {
      if (active.length || open.length || current.status === 'occupied' || existing.some(u => u.status === 'occupied')) throw new Error('Resolve leases, occupancy and open maintenance before archiving');
    }
    const landlordId = input.landlordId || null;
    if (landlordId && landlordId !== current.landlordId) {
      if (!/^[\w-]{1,128}$/.test(landlordId)) throw new Error('Invalid owner');
      const owner = (await tx.get(db.doc(`users/${landlordId}`))).data();
      if (owner?.role !== 'landlord') throw new Error('Owner must have the landlord role');
    }
    if (landlordId !== (current.landlordId || null) && (leases.size || ledger.size || expenses.size || tickets.size)) throw new Error('Properties with history require a separate ownership transfer');
    const savedUnits = units.map(unit => {
      const previous = existing.find(u => u.id === unit.id) || {};
      return { ...previous, id: unit.id, propertyId: id, unitNumber: unit.unitNumber.trim(), rent: unit.rent,
        status: unit.status, archived: !!unit.archived, bedrooms: Number(unit.bedrooms) || 0, bathrooms: Number(unit.bathrooms) || 0, squareFeet: Number(unit.squareFeet) || 0 };
    });
    const visible = savedUnits.filter(u => !u.archived);
    const status = visible.length ? (visible.every(u => u.status === 'occupied') ? 'occupied' : visible.some(u => u.status === 'vacant') ? 'vacant' : 'maintenance') : units.length ? 'maintenance' : input.status;
    const specs: Record<string, number> = {};
    for (const key of ['bedrooms', 'bathrooms', 'squareFeet']) {
      const value = input[key] ?? current[key] ?? 0;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Property specifications must be nonnegative numbers');
      specs[key] = value;
    }
    const address = input.address ?? current.address ?? '';
    if (typeof address !== 'string' && (!address || ['street', 'city', 'state', 'zipCode'].some(k => typeof address[k] !== 'string'))) throw new Error('Invalid address');
    const images = input.images || [];
    if (!Array.isArray(images) || images.some(url => typeof url !== 'string' || !url.startsWith('https://'))) throw new Error('Photo URLs must use HTTPS');
    tx.update(ref, { ...specs, address, name: input.name.trim(), description: String(input.description || '').slice(0, 5000),
      rent: input.rent, defaultRentAmount: input.rent, status, units: savedUnits, totalUnits: units.length ? visible.length : 1,
      amenities: String(input.features || '').split(',').map(s => s.trim()).filter(Boolean),
      features: String(input.features || '').split(',').map(s => s.trim()).filter(Boolean), images,
      landlordId, archived: !!input.archived, available: !input.archived && status === 'vacant', updatedAt: new Date(), updatedBy: uid });
  });
}
