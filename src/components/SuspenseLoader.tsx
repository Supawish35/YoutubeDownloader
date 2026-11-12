import React, { Suspense } from 'react';

interface SuspenseLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultSkeletonFallback: React.FC = () => (
  <div
    className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1E293B]"
    aria-busy="true"
    aria-label="Loading section"
  >
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-36 rounded-md bg-slate-200 dark:bg-slate-700/70" />
        <div className="h-7 w-24 rounded-lg bg-slate-200 dark:bg-slate-700/70" />
      </div>
      <div className="h-20 w-full rounded-xl bg-slate-100 dark:bg-slate-800/80" />
      <div className="h-20 w-full rounded-xl bg-slate-100 dark:bg-slate-800/80" />
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
