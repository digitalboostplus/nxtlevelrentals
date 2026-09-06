import type { NotificationPreferences } from '@/types/notifications';
export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
  email: {
    enabled: true,
    statusChanges: true,
    notesAdded: true,
    requestConfirmation: true,
    technicianScheduled: true
  },
  push: {
    enabled: true,
    statusChanges: true,
    notesAdded: true,
    requestConfirmation: true,
    technicianScheduled: true
  },
  inApp: {
    enabled: true
  }
};

export const notificationEvents = { statusChanges: 'Maintenance status changes', notesAdded: 'Maintenance notes', requestConfirmation: 'Maintenance request confirmations', technicianScheduled: 'Scheduled maintenance visits' };
export function validatePreferenceUpdates(value: unknown): Record<string, Record<string, boolean>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid preferences');
  const result: Record<string, Record<string, boolean>> = {};
  for (const [channel, values] of Object.entries(value)) {
    if (!['email', 'push', 'inApp'].includes(channel) || !values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid preference category');
    result[channel] = {};
    for (const [event, enabled] of Object.entries(values)) {
      if (!(event === 'enabled' || (channel !== 'inApp' && Object.prototype.hasOwnProperty.call(notificationEvents, event))) || typeof enabled !== 'boolean') throw new Error('Preferences must be supported boolean settings');
      result[channel][event] = enabled;
    }
  }
  if (!Object.keys(result).length) throw new Error('No preferences supplied');
  return result;
}
