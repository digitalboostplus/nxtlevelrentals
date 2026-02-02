/**
 * Chart Utilities
 * Utility functions for formatting data, tooltips, and accessibility
 */

/**
 * Format number as currency
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

/**
 * Format number as percentage
 * @param value - Number to format (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format date for chart labels
 * @param date - Date to format
 * @param format - Format type ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export function formatChartDate(
  date: Date | string,
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'medium':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    default:
      return d.toLocaleDateString('en-US');
  }
}

/**
 * Format month string (YYYY-MM) to readable format
 * @param monthString - Month in YYYY-MM format
 * @returns Formatted month string
 */
export function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Abbreviate month names for compact displays
 * @param month - Full or abbreviated month name
 * @returns 3-letter month abbreviation
 */
export function abbreviateMonth(month: string): string {
  const monthMap: Record<string, string> = {
    January: 'Jan',
    February: 'Feb',
    March: 'Mar',
    April: 'Apr',
    May: 'May',
    June: 'Jun',
    July: 'Jul',
    August: 'Aug',
    September: 'Sep',
    October: 'Oct',
    November: 'Nov',
    December: 'Dec',
  };

  return monthMap[month] || month.substring(0, 3);
}

/**
 * Calculate percentage difference between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage difference
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Generate accessible ARIA label for chart
 * @param chartType - Type of chart
 * @param dataPoints - Number of data points
 * @param summary - Brief summary of data
 * @returns ARIA label string
 */
export function generateChartAriaLabel(
  chartType: string,
  dataPoints: number,
  summary?: string
): string {
  const baseLabel = `${chartType} chart with ${dataPoints} data point${dataPoints !== 1 ? 's' : ''}`;
  return summary ? `${baseLabel}. ${summary}` : baseLabel;
}

/**
 * Generate gradient ID for SVG definitions
 * @param name - Name for the gradient
 * @param suffix - Optional suffix for uniqueness
 * @returns Unique gradient ID
 */
export function generateGradientId(name: string, suffix?: string): string {
  const id = `gradient-${name}`;
  return suffix ? `${id}-${suffix}` : id;
}

/**
 * Custom tooltip formatter for currency values
 * @param value - Value to format
 * @param name - Series name
 * @returns Formatted tooltip content
 */
export function currencyTooltipFormatter(value: number, name: string): string {
  return `${name}: ${formatCurrency(value)}`;
}

/**
 * Custom tooltip formatter for percentage values
 * @param value - Value to format
 * @param name - Series name
 * @returns Formatted tooltip content
 */
export function percentTooltipFormatter(
  value: number,
  name: string
): string {
  return `${name}: ${formatPercent(value)}`;
}

/**
 * Render custom tooltip content with styling
 * @param props - Recharts tooltip props
 * @returns JSX element or null
 */
export function renderCustomTooltip(props: any) {
  const { active, payload, label } = props;

  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p
        style={{
          margin: '0 0 8px 0',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
        }}
      >
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p
          key={`item-${index}`}
          style={{
            margin: '4px 0',
            fontSize: '14px',
            color: entry.color || 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
            }}
          />
          <span>
            {entry.name}: <strong>{formatCurrency(entry.value)}</strong>
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Truncate label text for compact displays
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateLabel(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
}

/**
 * Get readable status label
 * @param status - Status code
 * @returns Readable status label
 */
export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    partial: 'Partial',
    completed: 'Completed',
    failed: 'Failed',
    processing: 'Processing',
    cancelled: 'Cancelled',
  };

  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Get payment method display name
 * @param method - Payment method code
 * @returns Display name
 */
export function getPaymentMethodLabel(method: string): string {
  const methodMap: Record<string, string> = {
    card: 'Credit/Debit Card',
    ach: 'ACH Transfer',
    cash: 'Cash',
    check: 'Check',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
  };

  return methodMap[method] || method;
}

/**
 * Check if reduced motion is preferred
 * @returns Boolean indicating reduced motion preference
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on reduced motion preference
 * @param normalDuration - Normal animation duration in ms
 * @returns Duration in ms (0 if reduced motion preferred)
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

/**
 * Lighten color for gradients
 * @param color - Hex color code
 * @param amount - Amount to lighten (0-1)
 * @returns Lightened color
 */
export function lightenColor(color: string, amount: number): string {
  // This is a simplified version - works with hex colors
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * amount * 100);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}

/**
 * Format large numbers with K, M, B suffixes
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Sort data for charts
 * @param data - Array of data objects
 * @param key - Key to sort by
 * @param order - Sort order
 * @returns Sorted array
 */
export function sortChartData<T>(
  data: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return order === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
}
