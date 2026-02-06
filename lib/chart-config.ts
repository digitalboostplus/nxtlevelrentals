/**
 * Chart Configuration
 * Centralized configuration for all chart components
 * Provides consistent colors, animations, tooltips, and responsive settings
 */

// Chart color palette using CSS variables
export const CHART_COLORS = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  neutral: 'var(--color-muted)',
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
};

// Chart series colors for multi-series charts
export const CHART_SERIES_COLORS = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
];

// Status-based color mapping
export const STATUS_COLORS = {
  paid: CHART_COLORS.success,
  pending: CHART_COLORS.info,
  overdue: CHART_COLORS.error,
  partial: CHART_COLORS.warning,
  completed: CHART_COLORS.success,
  failed: CHART_COLORS.error,
  processing: CHART_COLORS.info,
};

// Collection rate color thresholds
export const getCollectionRateColor = (rate: number): string => {
  if (rate >= 90) return CHART_COLORS.success;
  if (rate >= 70) return CHART_COLORS.primary;
  if (rate >= 50) return CHART_COLORS.warning;
  return CHART_COLORS.error;
};

// Default animation configuration
export const DEFAULT_ANIMATION = {
  duration: 800,
  easing: 'ease-out' as const,
};

// Recharts animation configuration
export const RECHARTS_ANIMATION = {
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
  isAnimationActive: true,
};

// Default tooltip styling
export const DEFAULT_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    padding: '12px',
  },
  itemStyle: {
    color: 'var(--color-text)',
    fontSize: '14px',
  },
  labelStyle: {
    color: 'var(--color-text-secondary)',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  cursor: {
    fill: 'var(--color-primary-light)',
  },
};

// Responsive chart heights
export const CHART_HEIGHTS = {
  mobile: 250,
  tablet: 300,
  desktop: 350,
  large: 400,
};

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

// Get responsive chart height based on window width
export const getResponsiveHeight = (width: number): number => {
  if (width < BREAKPOINTS.mobile) return CHART_HEIGHTS.mobile;
  if (width < BREAKPOINTS.tablet) return CHART_HEIGHTS.tablet;
  if (width < BREAKPOINTS.desktop) return CHART_HEIGHTS.desktop;
  return CHART_HEIGHTS.large;
};

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  primary: {
    id: 'colorPrimary',
    color: 'var(--color-primary)',
    stops: [
      { offset: '0%', stopColor: 'var(--color-primary)', stopOpacity: 0.2 },
      { offset: '100%', stopColor: 'var(--color-primary)', stopOpacity: 0.05 },
    ],
  },
  success: {
    id: 'colorSuccess',
    color: 'var(--color-success)',
    stops: [
      { offset: '0%', stopColor: 'var(--color-success)', stopOpacity: 0.2 },
      { offset: '100%', stopColor: 'var(--color-success)', stopOpacity: 0.05 },
    ],
  },
  secondary: {
    id: 'colorSecondary',
    color: 'var(--color-secondary)',
    stops: [
      { offset: '0%', stopColor: 'var(--color-secondary)', stopOpacity: 0.2 },
      { offset: '100%', stopColor: 'var(--color-secondary)', stopOpacity: 0.05 },
    ],
  },
  info: {
    id: 'colorInfo',
    color: 'var(--color-info)',
    stops: [
      { offset: '0%', stopColor: 'var(--color-info)', stopOpacity: 0.2 },
      { offset: '100%', stopColor: 'var(--color-info)', stopOpacity: 0.05 },
    ],
  },
};

// Accessibility configuration
export const A11Y_CONFIG = {
  // Minimum color contrast ratio for WCAG AA
  minContrastRatio: 4.5,
  // Respect prefers-reduced-motion
  respectReducedMotion: true,
  // Default ARIA labels
  defaultAriaLabel: 'Data visualization chart',
};

// Legend configuration
export const DEFAULT_LEGEND_CONFIG = {
  verticalAlign: 'bottom' as const,
  height: 36,
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: {
    paddingTop: '16px',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  },
};

// Grid configuration
export const DEFAULT_GRID_CONFIG = {
  strokeDasharray: '3 3',
  stroke: 'var(--chart-grid)',
  opacity: 0.5,
};

// Axis configuration
export const DEFAULT_AXIS_CONFIG = {
  tick: {
    fill: 'var(--color-text-secondary)',
    fontSize: 12,
  },
  axisLine: {
    stroke: 'var(--color-border)',
  },
};

// Export default configuration object
export const DEFAULT_CHART_CONFIG = {
  animation: DEFAULT_ANIMATION,
  tooltip: DEFAULT_TOOLTIP_STYLE,
  responsive: CHART_HEIGHTS,
  legend: DEFAULT_LEGEND_CONFIG,
  grid: DEFAULT_GRID_CONFIG,
  axis: DEFAULT_AXIS_CONFIG,
};
