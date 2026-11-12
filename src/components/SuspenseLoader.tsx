import React, { Suspense } from 'react';

interface SuspenseLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultSkeletonFallback: React.FC = () => (
  <div
    className="flex min-h-0 flex-1 flex-col bg-[var(--bg-canvas)]"
    aria-busy="true"
    aria-label="Loading section"
  >
    <div className="flex h-12 items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-panel)] px-5 sm:px-6">
      <div className="h-5 w-48 animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-inset)]" />
      <div className="h-6 w-24 animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-inset)]" />
    </div>
    <div className="divide-y divide-[var(--border-hairline)]">
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="flex items-center gap-4 px-5 py-[var(--row-py)] sm:px-6">
          <div className="h-[var(--thumb-h)] w-[var(--thumb-w)] shrink-0 animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-inset)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-inset)]" />
            <div className="h-3 w-1/3 animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-inset)]" />
            <div className="h-1 w-full animate-pulse rounded-full bg-[var(--bg-inset)]" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({
  children,
  fallback,
}) => {
  return (
    <Suspense fallback={fallback ?? <DefaultSkeletonFallback />}>
      {children}
    </Suspense>
  );
};

export default SuspenseLoader;
