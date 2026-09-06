import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLeaseInput, type LeaseActivationInput } from './activateLease';

const valid: LeaseActivationInput = {
  operationId: 'test-operation-123456', propertyId: 'property', tenantId: 'tenant',
  startDate: '2026-09-01', endDate: '2027-08-31', monthlyRent: 1500,
  securityDeposit: 1500, paymentDueDay: 1, lateFeeGraceDays: 5, lateFeeAmount: 50
};
test('lease terms reject invalid dates, identities and money before writing', () => {
  assert.doesNotThrow(() => validateLeaseInput(valid));
  for (const patch of [{ endDate: '2026-08-01' }, { startDate: '2026-02-30' }, { monthlyRent: -1 }, { monthlyRent: 1.001 }, { paymentDueDay: 32 }, { tenantId: 'bad/id' }, { newTenant: { email: 'a@b.com', displayName: 'A' } }]) {
    assert.throws(() => validateLeaseInput({ ...valid, ...patch }));
  }
});
