const CALENDAR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseCalendarDateString(value: string): Date | null {
  const normalized = value.trim();

  if (!CALENDAR_DATE_REGEX.test(normalized)) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ? null : date;
}

export function normalizeDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return normalizeDate(value.toDate());
  // Firestore timestamps arrive as {seconds, nanoseconds} from the client SDK and as
  // {_seconds, _nanoseconds} once the Admin SDK has serialized them through an API route.
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const seconds = typeof record.seconds === 'number' ? record.seconds : typeof record._seconds === 'number' ? record._seconds : null;
    if (seconds !== null) {
      const nanos = typeof record.nanoseconds === 'number' ? record.nanoseconds : typeof record._nanoseconds === 'number' ? record._nanoseconds : 0;
      return new Date(seconds * 1000 + Math.floor(nanos / 1e6));
    }
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const calendarDate = parseCalendarDateString(trimmed);

    if (CALENDAR_DATE_REGEX.test(trimmed)) {
      return calendarDate;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Formats calendar dates without introducing timezone shifts for YYYY-MM-DD inputs.
 */
export function formatLocalDate(
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument
): string {
  const date = normalizeDate(value);

  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(locales, options).format(date);
}
