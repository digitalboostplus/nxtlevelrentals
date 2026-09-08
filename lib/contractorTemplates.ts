// Client-safe helpers shared by the contractor page and the server.
import type { SmsTemplate, TemplateVars } from '@/types/contractors';

export const SMS_MAX_LENGTH = 1000;

/** Seeded into settings/contractorComms the first time it is read; never overwritten. */
export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'new-job',
    label: 'New job',
    body: 'Hi {contractor}, this is NXT Level Mgmt. We have a job at {property}: {ticket}. Can you take it? Reply here or call the office.',
  },
  {
    id: 'confirm-visit',
    label: 'Confirm visit',
    body: 'Hi {contractor}, confirming your visit to {property} on {date} for {ticket}. Reply YES to confirm or let us know if the time needs to change.',
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    body: 'Hi {contractor}, we need to move the {property} visit ({ticket}). What is the next time you have open? Thanks, NXT Level Mgmt.',
  },
  {
    id: 'invoice-reminder',
    label: 'Invoice reminder',
    body: 'Hi {contractor}, a quick reminder to send the invoice for {ticket} at {property} so we can get you paid. Thanks, NXT Level Mgmt.',
  },
];

/**
 * Fill {contractor} {property} {ticket} {date}. Tokens without a value are
 * left in place so the sender sees what still needs filling in.
 */
export function renderTemplate(body: string, vars: TemplateVars = {}): string {
  const out = String(body ?? '').replace(/\{(contractor|property|ticket|date)\}/g, (token, key: keyof TemplateVars) => {
    const value = vars[key];
    return value === undefined || value === null || value === '' ? token : String(value);
  });
  return out.length > SMS_MAX_LENGTH ? out.slice(0, SMS_MAX_LENGTH) : out;
}
