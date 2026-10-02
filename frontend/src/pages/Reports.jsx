import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, FileSpreadsheet, FileText, Printer, 
  Calendar, Download, ArrowUpRight, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { reportService } from '../services/reportService';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeModule, setActiveModule] = useState('bookings');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportService.getSummary(startDate, endDate);
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error('Failed to load report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExportExcel = async (module) => {
    try {
      setDownloadingExcel(true);
      await reportService.downloadExcel(module || activeModule);
    } catch (err) {
      console.error('Excel download failed:', err);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleExportPdf = async (module) => {
    try {
      setDownloadingPdf(true);
      await reportService.downloadPdf(module || activeModule);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const netOperational = summaryData
    ? (summaryData.total_revenue || 0) - (summaryData.total_daily_expenses || 0) - (summaryData.total_site_expenses || 0)
    : 0;

  const chartData = summaryData ? [
    { name: 'Revenue', amount: summaryData.total_revenue || 0 },
    { name: 'Daily Expenses', amount: summaryData.total_daily_expenses || 0 },
    { name: 'Site Expenses', amount: summaryData.total_site_expenses || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Branded Official Print Header */}
      <div className="hidden print:flex items-center justify-between pb-4 mb-4 border-b-2 border-amber-600">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="GoldenSwan Hotel" className="h-16 w-auto object-contain" />
          <div>
            <h1 className="font-serif font-bold text-2xl text-slate-900 tracking-tight">GoldenSwan Hotel</h1>
            <p className="text-xs text-slate-600">Luxury Boutique Stays & Hospitality • Executive Financial Audit</p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 font-mono">
          <p className="font-bold text-slate-700">GSTIN: 30AAACG1234F1Z5</p>
          <p>Reporting: {startDate} → {endDate}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Executive Financial Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-dimensional operational audit, tax summaries, and downloadable statements</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={downloadingExcel}
            onClick={() => handleExportExcel(activeModule)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{downloadingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
          </button>
          <button
            disabled={downloadingPdf}
            onClick={() => handleExportPdf(activeModule)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>{downloadingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Module Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['bookings', 'payments', 'expenses', 'site-expenses', 'staff'].map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeModule === mod
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mod.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field text-xs py-1"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field text-xs py-1"
          />
          <button
            onClick={fetchReports}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Collections</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summaryData ? formatCurrency(summaryData.total_revenue) : '—'}
          </p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Room nights & charges</span>
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Hotel Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summaryData ? formatCurrency(summaryData.total_daily_expenses) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Groceries & maintenance</p>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Site Capital Outlay</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summaryData ? formatCurrency(summaryData.total_site_expenses) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Contractors & repairs</p>
        </div>

        <div className={`card p-5 border-l-4 ${netOperational >= 0 ? 'border-l-blue-600' : 'border-l-rose-600'}`}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Operational Cash Flow</p>
          <p className={`text-2xl font-bold mt-1 ${netOperational >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {formatCurrency(netOperational)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Revenue minus all outlays</p>
        </div>
      </div>

      {/* Financial Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <span>Revenue vs Operational Outlays Comparison</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                />
                <Tooltip 
                  formatter={(val) => [formatCurrency(val), 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="amount" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Report Download Cards */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm mb-2">Export Specific Statements</h3>
          
          <div className="space-y-3">
            {[
              { id: 'bookings', label: 'Bookings Register', desc: 'All guest stays, rates, check-in & check-out' },
              { id: 'payments', label: 'Payments & Collections', desc: 'Cash, UPI, and credit card audit log' },
              { id: 'expenses', label: 'Daily Expense Ledger', desc: 'Category-wise hotel operations overhead' },
              { id: 'site-expenses', label: 'Site & Capital Outlay', desc: 'Vendor disbursements & contractor dues' },
              { id: 'staff', label: 'Staff & Payroll Roster', desc: 'Staff compensation & designations' },
            ].map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 hover:bg-amber-50/40 rounded-xl transition-colors border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs">{item.label}</h4>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleExportExcel(item.id)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExportPdf(item.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
