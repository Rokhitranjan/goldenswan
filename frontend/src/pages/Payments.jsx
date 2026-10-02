import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Search, Plus, Filter, Calendar, 
  Printer, CheckCircle2, ArrowUpRight, DollarSign, X, Receipt
} from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { bookingService } from '../services/bookingService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Record payment form state
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formData, setFormData] = useState({
    booking_id: '',
    amount: '',
    payment_mode: 'UPI',
    reference_number: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (paymentModeFilter) params.payment_mode = paymentModeFilter;
      const res = await paymentService.getPayments(params);
      if (res.success) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, paymentModeFilter]);

  const handleOpenRecordModal = async () => {
    setError('');
    setShowRecordModal(true);
    try {
      // Fetch bookings with pending payments
      const res = await bookingService.getBookings({ limit: 50 });
      if (res.success) {
        // filter or list bookings
        setBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const handleBookingSelect = (bookingId) => {
    const b = bookings.find((item) => item.id === bookingId || item.booking_id === bookingId);
    setSelectedBooking(b || null);
    setFormData((prev) => ({
      ...prev,
      booking_id: b ? b.id : bookingId,
      amount: b && b.amount_pending > 0 ? b.amount_pending : '',
    }));
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.booking_id) {
      setError('Please select a booking.');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }
    if (selectedBooking && amt > parseFloat(selectedBooking.amount_pending || 0)) {
      setError(`Payment cannot exceed pending amount of ${formatCurrency(selectedBooking.amount_pending)}.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await paymentService.recordPayment({
        booking_id: formData.booking_id,
        amount: amt,
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number,
        notes: formData.notes,
      });

      if (res.success) {
        setShowRecordModal(false);
        setFormData({
          booking_id: '',
          amount: '',
          payment_mode: 'UPI',
          reference_number: '',
          notes: '',
        });
        setSelectedBooking(null);
        fetchPayments();
      } else {
        setError(res.message || 'Payment recording failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // KPI calculations
  const totalAmount = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const upiTotal = payments.filter(p => p.payment_mode === 'UPI').reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const cashTotal = payments.filter(p => p.payment_mode === 'CASH').reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const cardTotal = payments.filter(p => ['CREDIT_CARD', 'DEBIT_CARD'].includes(p.payment_mode)).reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Payment Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Audit log of all collections, advances, and checkout settlements</p>
        </div>
        <button
          onClick={handleOpenRecordModal}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Collected</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{payments.length} transactions</span>
          </p>
        </div>
        <div className="card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">UPI / Online</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(upiTotal)}</p>
          <p className="text-xs text-slate-500 mt-1">Direct bank / QR settlements</p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Collected</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(cashTotal)}</p>
          <p className="text-xs text-slate-500 mt-1">Front desk cash drawer</p>
        </div>
        <div className="card p-5 border-l-4 border-l-purple-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Card Swipes (POS)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(cardTotal)}</p>
          <p className="text-xs text-slate-500 mt-1">Credit & Debit cards</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Payment ID, Guest, or Reference No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="input-field text-xs py-1.5"
          >
            <option value="">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="Payments captured at reservation, check-in, or settlement will appear here."
            actionLabel="Record Payment"
            onAction={handleOpenRecordModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Receipt / ID</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Guest Details</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Mode & Ref</th>
                  <th className="py-3 px-4">Received At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 text-xs">
                      {p.payment_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-medium text-slate-600">
                        {p.booking_reference || p.booking_id?.slice(-8)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">{p.customer_name || 'Guest'}</p>
                      <p className="text-xs text-slate-400">{p.customer_phone || ''}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-600 text-sm">
                        {formatCurrency(p.amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        <span>{p.payment_mode}</span>
                      </div>
                      {p.reference_number && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {p.reference_number}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {formatDateTime(p.payment_date || p.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        title="View Print Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white text-center relative">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex justify-center mb-3">
                  <img
                    src="/logo.png"
                    alt="GoldenSwan Hotel"
                    className="h-16 w-auto object-contain filter drop-shadow-md rounded-lg"
                  />
                </div>
                <h3 className="font-serif font-bold text-lg text-amber-400">GoldenSwan Hotel</h3>
                <p className="text-xs text-slate-400">Official Payment Receipt</p>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceipt.payment_id}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="text-slate-900">{formatDateTime(selectedReceipt.payment_date || selectedReceipt.created_at)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Guest Name:</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.customer_name || 'Guest'}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Booking Ref:</span>
                  <span className="font-mono text-slate-900">{selectedReceipt.booking_reference || selectedReceipt.booking_id}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.payment_mode}</span>
                </div>
                {selectedReceipt.reference_number && (
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-slate-500">Transaction Ref:</span>
                    <span className="font-mono text-slate-900">{selectedReceipt.reference_number}</span>
                  </div>
                )}
                <div className="bg-emerald-50 p-4 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Amount Received</span>
                  <span className="text-xl font-bold text-emerald-700">{formatCurrency(selectedReceipt.amount)}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showRecordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Record Payment</span>
                </h2>
                <button
                  onClick={() => setShowRecordModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Booking <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.booking_id}
                    onChange={(e) => handleBookingSelect(e.target.value)}
                    required
                    className="input-field w-full text-xs"
                  >
                    <option value="">-- Choose active reservation or guest --</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.booking_id} — {b.customer_name} (Room {b.room_number}) [Pending: {formatCurrency(b.amount_pending)}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBooking && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Guest:</span>
                      <span className="font-semibold text-slate-900">{selectedBooking.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Room Total:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(selectedBooking.grand_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Already Paid:</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(selectedBooking.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-amber-200">
                      <span className="font-bold text-amber-900">Outstanding Balance:</span>
                      <span className="font-bold text-amber-900">{formatCurrency(selectedBooking.amount_pending)}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      className="input-field w-full text-xs"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CASH">Cash</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="DEBIT_CARD">Debit Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-123456789 or POS Auth code"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Any notes regarding this payment..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-xs"
                  >
                    {submitting ? 'Recording...' : 'Record Payment'}
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
