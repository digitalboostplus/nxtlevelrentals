// Phone helpers shared by the public repair form and the contractor roster.

/**
 * Normalize a typed phone number to E.164. Ten US digits get a +1; eleven
 * digits starting with 1 keep it; anything else keeps its digits behind a +.
 * Returns '' when nothing usable was typed.
 */
export function normalizePhoneE164(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return '';
}

export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

/** (816) 555-0100 for US numbers; other numbers are returned as stored. */
export function formatPhoneDisplay(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
