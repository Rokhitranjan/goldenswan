import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Search, Filter, Calendar, 
  Trash2, AlertCircle, CheckCircle2, Clock, X, Users, Briefcase
} from 'lucide-react';
import { expenseService } from '../services/expenseService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function SiteExpenses() {
  const [siteExpenses, setSiteExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({ total_amount: 0, total_paid: 0, total_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Capital Expenditure',
    vendor: '',
    description: '',
    total_amount: '',
    amount_paid: '0',
    payment_mode: 'BANK_TRANSFER',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSiteExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (vendorFilter) params.vendor = vendorFilter;
      if (statusFilter) params.payment_status = statusFilter;

      const [expRes, venRes, statRes] = await Promise.all([
        expenseService.getSiteExpenses(params),
        expenseService.getVendors(),
        expenseService.getSiteExpenseStats(),
      ]);

      if (expRes.success) setSiteExpenses(expRes.data);
      if (venRes.success) {
        setVendors(venRes.data);
        if (venRes.data.length > 0 && !formData.vendor) {
          setFormData((prev) => ({ ...prev, vendor: venRes.data[0].name }));
        }
      }
      if (statRes.success) setStats(statRes.data);
    } catch (err) {
      console.error('Failed to load site expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteExpenses();
  }, [search, vendorFilter, statusFilter]);

  const handleAddSiteExpense = async (e) => {
    e.preventDefault();
    setError('');

    const total = parseFloat(formData.total_amount);
    const paid = parseFloat(formData.amount_paid) || 0;

    if (isNaN(total) || total <= 0) {
      setError('Please enter a valid total expenditure amount.');
      return;
    }
    if (paid > total) {
      setError('Amount paid cannot exceed total amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await expenseService.createSiteExpense({
        ...formData,
        total_amount: total,
        amount_paid: paid,
      });

      if (res.success) {
        setShowAddModal(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: 'Capital Expenditure',
          vendor: vendors[0]?.name || '',
          description: '',
          total_amount: '',
          amount_paid: '0',
          payment_mode: 'BANK_TRANSFER',
          remarks: '',
        });
        fetchSiteExpenses();
      } else {
        setError(res.message || 'Failed to record site expense.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving site expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedBalance = Math.max(
    0,
    (parseFloat(formData.total_amount) || 0) - (parseFloat(formData.amount_paid) || 0)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Site & Capital Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Infrastructure, renovations, civil contracts, HVAC, and vendor procurements</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Site Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-blue-600">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Site Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.total_amount)}</p>
          <p className="text-xs text-slate-500 mt-1">{siteExpenses.length} total procurement bills</p>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-600">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disbursed to Vendors</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.total_paid)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bank & Cheque settlements</span>
          </p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-600">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Contractor Payables</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.total_pending)}</p>
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Retentions & Balance due</span>
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search descriptions, remarks, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="input-field text-xs py-1.5"
          >
            <option value="">All Contractors & Vendors</option>
            {vendors.map((v) => (
              <option key={v.id || v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-xs py-1.5"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        ) : siteExpenses.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No site expenses logged"
            description="Track hotel construction, renovations, plumbing overhauls, and equipment capital expenditures."
            actionLabel="Add Site Expense"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense ID & Category</th>
                  <th className="py-3 px-4">Vendor / Contractor</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid / Balance</th>
                  <th className="py-3 px-4">Status & Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {siteExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-xs font-semibold text-slate-900">{exp.expense_id}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-md">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{exp.vendor || 'Direct / Self'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900 text-xs">{exp.description}</p>
                      {exp.remarks && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{exp.remarks}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 text-sm">{formatCurrency(exp.total_amount)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold text-emerald-600">Paid: {formatCurrency(exp.amount_paid)}</p>
                      {parseFloat(exp.balance) > 0 ? (
                        <p className="text-xs font-semibold text-rose-600">Due: {formatCurrency(exp.balance)}</p>
                      ) : (
                        <p className="text-[11px] text-slate-400">Settled</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <StatusBadge status={exp.payment_status} />
                        <p className="text-[11px] text-slate-500 font-medium">{exp.payment_mode}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Site Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Record Site Expense</span>
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSiteExpense} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vendor / Contractor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="vendor-list"
                      placeholder="e.g. Apex Electricals"
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                    <datalist id="vendor-list">
                      {vendors.map((v) => (
                        <option key={v.id || v.name} value={v.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field w-full text-xs"
                    >
                      <option value="Capital Expenditure">Capital Expenditure</option>
                      <option value="Renovation">Renovation</option>
                      <option value="Electrical Work">Electrical Work</option>
                      <option value="Plumbing Installation">Plumbing Installation</option>
                      <option value="HVAC / Air Conditioning">HVAC / Air Conditioning</option>
                      <option value="Furniture & Fixtures">Furniture & Fixtures</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      className="input-field w-full text-xs"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description of Work <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5th floor balcony waterproofing and tile relaying"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contract / Total Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0.00"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Disbursed Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500">Pending Payable to Vendor:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(calculatedBalance)}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / PO Number / Remarks</label>
                  <input
                    type="text"
                    placeholder="Invoice # or warranty notes"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-xs"
                  >
                    {submitting ? 'Recording...' : 'Save Site Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
