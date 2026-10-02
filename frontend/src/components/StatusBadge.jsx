import React from 'react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const s = String(status || '').toUpperCase();

  const configs = {
    // Room & Booking Statuses
    AVAILABLE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    RESERVED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    OCCUPIED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    CHECKED_IN: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    CLEANING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    MAINTENANCE: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    CHECKED_OUT: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/30',
    NO_SHOW: 'bg-purple-500/15 text-purple-400 border-purple-500/30',

    // Payment Statuses
    PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    PARTIALLY_PAID: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PENDING: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    UNPAID: 'bg-rose-500/15 text-rose-400 border-rose-500/30',

    // Attendance Statuses
    PRESENT: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    ABSENT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    LEAVE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    HALF_DAY: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const currentClass = configs[s] || 'bg-slate-800 text-slate-300 border-slate-700';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border ${currentClass} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {s.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
