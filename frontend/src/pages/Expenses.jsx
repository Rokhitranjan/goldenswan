import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, Plus, Search, Filter, Calendar, 
  Trash2, AlertCircle, CheckCircle2, Clock, X, Tag
} from 'lucide-react';
import { expenseService } from '../services/expenseService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // New expense form
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    total_amount: '',
    amount_paid: '0',
    payment_mode: 'CASH',
    remarks: '',
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.payment_status = statusFilter;

      const [expRes, catRes] = await Promise.all([
        expenseService.getDailyExpenses(params),
        expenseService.getExpenseCategories(),
      ]);

      if (expRes.success) setExpenses(expRes.data);
      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !formData.category) {
          setFormData((prev) => ({ ...prev, category: catRes.data[0].name }));
        }
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter, statusFilter]);

  const handleTotalOrPaidChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      return updated;
    });
  };

  const calculatedBalance = Math.max(
    0,
    (parseFloat(formData.total_amount) || 0) - (parseFloat(formData.amount_paid) || 0)
  );

  const calculatedStatus = () => {
    const total = parseFloat(formData.total_amount) || 0;
    const paid = parseFloat(formData.amount_paid) || 0;
    if (paid >= total && total > 0) return 'PAID';
    if (paid > 0) return 'PARTIALLY_PAID';
    return 'UNPAID';
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');

    const total = parseFloat(formData.total_amount);
    const paid = parseFloat(formData.amount_paid) || 0;

    if (isNaN(total) || total <= 0) {
      setError('Please provide a valid total amount.');
      return;
    }
    if (paid > total) {
      setError('Amount paid cannot exceed total expense amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await expenseService.createDailyExpense({
        ...formData,
        total_amount: total,
        amount_paid: paid,
      });

      if (res.success) {
        setShowAddModal(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: categories[0]?.name || 'Daily Expense',
          description: '',
          total_amount: '',
          amount_paid: '0',
          payment_mode: 'CASH',
          remarks: '',
        });
        fetchExpenses();
      } else {
        setError(res.message || 'Failed to add expense.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await expenseService.createExpenseCategory({ name: newCategoryName.trim() });
      if (res.success) {
        setCategories((prev) => [...prev, res.data]);
        setFormData((prev) => ({ ...prev, category: res.data.name }));
        setNewCategoryName('');
        setShowCategoryModal(false);
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const res = await expenseService.deleteDailyExpense(id);
      if (res.success) {
        setExpenses((prev) => prev.filter((item) => item.id !== id));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // KPI Computations
  const totalAmount = expenses.reduce((acc, e) => acc + (parseFloat(e.total_amount) || 0), 0);
  const totalPaid = expenses.reduce((acc, e) => acc + (parseFloat(e.amount_paid) || 0), 0);
  const totalBalance = expenses.reduce((acc, e) => acc + (parseFloat(e.balance) || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAmount = expenses
    .filter((e) => e.date === todayStr)
    .reduce((acc, e) => acc + (parseFloat(e.total_amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Daily Hotel Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Track housekeeping, groceries, recurring maintenance, and utilities</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">{expenses.length} records in view</p>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Disbursed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cleared expenditures</span>
          </p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payables Pending</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Outstanding to vendors</span>
          </p>
        </div>
        <div className="card p-5 border-l-4 border-l-indigo-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Incurred</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(todayAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">{formatDate(todayStr)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field text-xs py-1.5"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
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

      {/* Expense Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={7} />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expense records found"
            description="Record maintenance, groceries, laundry, and daily overhead expenses here."
            actionLabel="Add Expense"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense ID & Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid / Balance</th>
                  <th className="py-3 px-4">Status & Mode</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-xs font-semibold text-slate-900">{exp.expense_id}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md">
                        {exp.category}
                      </span>
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
                        <p className="text-xs font-semibold text-rose-600">Bal: {formatCurrency(exp.balance)}</p>
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
                    <td className="py-3.5 px-4 text-right">
                      {deleteConfirmId === exp.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
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
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Record Daily Expense</span>
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expense Date <span className="text-red-500">*</span>
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
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      className="input-field w-full text-xs"
                    >
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh vegetables for breakfast buffet, plumbing washer replacement"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0.00"
                      value={formData.total_amount}
                      onChange={(e) => handleTotalOrPaidChange('total_amount', e.target.value)}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount_paid}
                      onChange={(e) => handleTotalOrPaidChange('amount_paid', e.target.value)}
                      className="input-field w-full text-xs"
                    />
                  </div>
                </div>

                {/* Real-time financial summary */}
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Calculated Balance: </span>
                    <span className="font-bold text-slate-900">{formatCurrency(calculatedBalance)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Status:</span>
                    <StatusBadge status={calculatedStatus()} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      className="input-field w-full text-xs"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="DEBIT_CARD">Debit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Bill No</label>
                    <input
                      type="text"
                      placeholder="Bill # or vendor note"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>
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
                    {submitting ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Expense Category</span>
                </h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laundry, Generator Diesel"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs"
                  >
                    Add Category
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
