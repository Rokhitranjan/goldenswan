import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  LogIn,
  LogOut,
  IndianRupee,
  Receipt,
  AlertCircle,
  Users,
  Activity,
  PlusCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { expenseService } from '../services/expenseService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { CardSkeleton } from '../components/Skeleton';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [activity, setActivity] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [overviewRes, trendRes, activityRes, catRes] = await Promise.all([
          dashboardService.getOverview(),
          dashboardService.getRevenueTrend(),
          dashboardService.getRecentActivity(),
          expenseService.getCategorySummary(),
        ]);

        if (overviewRes.success) setOverview(overviewRes.data);
        if (trendRes.success) setTrends(trendRes.data);
        if (activityRes.success) setActivity(activityRes.data);
        if (catRes.success) setCategoryBreakdown(catRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Occupancy Donut Data
  const rooms = overview?.rooms || {};
  const occupancyData = [
    { name: 'Occupied', value: rooms.occupied || 0, color: '#F43F5E' },
    { name: 'Available', value: rooms.available || 0, color: '#10B981' },
    { name: 'Reserved', value: rooms.reserved || 0, color: '#3B82F6' },
    { name: 'Cleaning', value: rooms.cleaning || 0, color: '#F59E0B' },
    { name: 'Maintenance', value: rooms.maintenance || 0, color: '#64748B' },
  ].filter((d) => d.value > 0);

  const kpis = [
    {
      label: 'Room Occupancy',
      value: `${overview?.occupancy_rate || 0}%`,
      sub: `${rooms.occupied || 0} of ${rooms.total || 0} occupied`,
      icon: BedDouble,
      color: 'from-amber-500/20 to-gold-500/10 text-gold-400 border-gold-500/30',
      action: () => navigate('/rooms'),
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(overview?.revenue?.today || 0),
      sub: `Month: ${formatCurrency(overview?.revenue?.this_month || 0)}`,
      icon: IndianRupee,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
      action: () => navigate('/payments'),
    },
    {
      label: "Today's Expenses",
      value: formatCurrency(overview?.expenses?.today || 0),
      sub: `Pending: ${formatCurrency(overview?.expenses?.pending || 0)}`,
      icon: Receipt,
      color: 'from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30',
      action: () => navigate('/expenses'),
    },
    {
      label: "Today's Arrivals / Departures",
      value: `${overview?.bookings?.today_checkins || 0} / ${overview?.bookings?.today_checkouts || 0}`,
      sub: 'Check-ins vs Check-outs',
      icon: CalendarCheck,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30',
      action: () => navigate('/bookings'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-navy-900 to-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <h2 className="text-xl font-bold text-slate-100">Welcome to GoldenSwan Hotel Operations</h2>
          </div>
          <p className="text-sm text-slate-400">
            Real-time hotel management, room telemetry, and financial ledger synced with MongoDB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/check-in')}
            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-slate-950 font-bold rounded-xl shadow-md shadow-gold-500/10 transition-all text-xs flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Guest Check-In</span>
          </button>
          <button
            onClick={() => navigate('/bookings/new')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all text-xs flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-gold-400" />
            <span>New Booking</span>
          </button>
          <button
            onClick={() => navigate('/check-out')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all text-xs flex items-center gap-2"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Check-Out</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={kpi.action}
              className={`p-5 rounded-2xl bg-gradient-to-br bg-slate-900 border transition-all cursor-pointer hover:scale-[1.02] shadow-sm ${kpi.color}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-current">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100 mb-1">{kpi.value}</div>
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{kpi.sub}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-400">Available Rooms</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{rooms.available || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-400">Pending Receivables</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {formatCurrency(overview?.revenue?.pending_receivables || 0)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-400">Staff Present Today</p>
          <p className="text-xl font-bold text-blue-400 mt-1">
            {overview?.staff?.present || 0} / {overview?.staff?.total || 0}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-400">Site Vendor Expenses</p>
          <p className="text-xl font-bold text-indigo-400 mt-1">
            {formatCurrency(overview?.site_expenses?.total || 0)}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Expenses Trend Chart */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-100 text-base">Revenue vs Expense Trend</h3>
              <p className="text-xs text-slate-400">Aggregated daily operations over the past 14 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Occupancy Donut */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-100 text-base">Room Status Distribution</h3>
            <p className="text-xs text-slate-400">Current live allocation across all 30 rooms</p>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gold-400" />
              <h3 className="font-bold text-slate-100 text-base">Live Hotel Activity Feed</h3>
            </div>
            <span className="text-xs text-slate-500">Real-time audit log</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent activity logged.</p>
            ) : (
              activity.map((item, idx) => (
                <div key={idx} className="py-3 flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-gold-400 shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {item.action?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Initiated by <strong className="text-slate-300">{item.user_name || 'System'}</strong> in{' '}
                      <span className="text-gold-400">{item.module}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm">
          <h3 className="font-bold text-slate-100 text-base mb-1">Expense Categories</h3>
          <p className="text-xs text-slate-400 mb-4">Operating costs by department</p>

          <div className="space-y-3.5">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No expense categories data.</p>
            ) : (
              categoryBreakdown.slice(0, 5).map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.category}</span>
                    <span className="text-slate-100 font-semibold">{formatCurrency(cat.total_amount)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-500 to-amber-600 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, (cat.total_amount / 20000) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
