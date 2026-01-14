type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card';

type SkeletonProps = {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
};

export default function Skeleton({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  className = ''
}: SkeletonProps) {
  const getStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (width) {
      styles.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height) {
      styles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return styles;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`skeleton-lines ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton--text"
            style={{
              ...getStyles(),
              width: i === lines - 1 ? '70%' : width || '100%'
            }}
          />
        ))}
        <style jsx>{`
          .skeleton-lines {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .skeleton {
            background: linear-gradient(
              90deg,
              var(--color-border) 25%,
              var(--color-surface-elevated) 50%,
              var(--color-border) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          .skeleton--text {
            height: 16px;
            border-radius: 4px;
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div
        className={`skeleton skeleton--${variant} ${className}`}
        style={getStyles()}
      />
      <style jsx>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--color-border) 25%,
            var(--color-surface-elevated) 50%,
            var(--color-border) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton--text {
          height: 16px;
          border-radius: 4px;
          width: 100%;
        }
        .skeleton--circular {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }
        .skeleton--rectangular {
          width: 100%;
          height: 100px;
          border-radius: var(--radius-sm);
        }
        .skeleton--card {
          width: 100%;
          height: 200px;
          border-radius: var(--radius-lg);
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
}

// Preset skeleton layouts for common use cases
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rectangular" height={140} />
      <div className="skeleton-card__body">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" lines={2} />
        <Skeleton variant="text" width="40%" />
      </div>
      <style jsx>{`
        .skeleton-card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .skeleton-card__body {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table__header">
        <Skeleton variant="text" width="15%" />
        <Skeleton variant="text" width="25%" />
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="15%" />
        <Skeleton variant="text" width="10%" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table__row">
          <Skeleton variant="text" width="15%" />
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="15%" />
          <Skeleton variant="text" width="10%" />
        </div>
      ))}
      <style jsx>{`
        .skeleton-table {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }
        .skeleton-table__header,
        .skeleton-table__row {
          display: flex;
          gap: 16px;
          padding: 16px;
          align-items: center;
        }
        .skeleton-table__header {
          background: var(--color-background);
          border-bottom: 1px solid var(--color-border);
        }
        .skeleton-table__row {
          border-bottom: 1px solid var(--color-border);
        }
        .skeleton-table__row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat">
          <Skeleton variant="text" width="60%" height={12} />
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="50%" height={12} />
        </div>
      ))}
      <style jsx>{`
        .skeleton-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
        }
        .skeleton-stat {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
