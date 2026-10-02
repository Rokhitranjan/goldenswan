import React from 'react';

export const Skeleton = ({ className = 'h-4 w-full', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse bg-slate-800/80 rounded ${className} mb-2 last:mb-0`}
        />
      ))}
    </>
  );
};

export const CardSkeleton = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-7 w-36 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4">
    <div className="flex gap-4 mb-4 pb-3 border-b border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 py-3 border-b border-slate-800/50 last:border-0">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonTable = TableSkeleton;

export default Skeleton;
