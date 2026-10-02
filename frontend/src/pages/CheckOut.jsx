import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, BedDouble, User, CreditCard, CheckCircle2, AlertCircle, Sparkles, Receipt } from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { formatCurrency, formatDate } from '../utils/formatters';

export const CheckOut = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(
    location.state?.booking?.id || location.state?.booking?._id || ''
  );

  const [settlementAmount, setSettlementAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [refNumber, setRefNumber] = useState('');
  const [allowUnsettled, setAllowUnsettled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadOccupied = async () => {
      try {
        setLoading(true);
        const res = await bookingService.getBookings({ status: 'CHECKED_IN' });
        if (res.success) {
          setActiveBookings(res.data);
        }
      } catch (err) {
        console.error('Failed to load checked-in guests:', err);
      } finally {
        setLoading(false);
      }
    };
    loadOccupied();
  }, []);

  const selectedBooking = activeBookings.find(
    (b) => (b.id || b._id) === selectedBookingId
  );

  useEffect(() => {
    if (selectedBooking) {
      setSettlementAmount(String(Number(selectedBooking.balance_amount) || ''));
    }
  }, [selectedBookingId]);

  const handleCheckOut = async (e) => {
    e.preventDefault();
    if (!selectedBookingId) {
      setError('Please select an active guest to check out.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await bookingService.checkOut({
        booking_id: selectedBookingId,
        amount: Number(settlementAmount || 0),
        payment_mode: paymentMode,
        reference_number: refNumber,
        allow_unsettled_balance: allowUnsettled,
      });

      if (res.success) {
        setSuccessMsg(
          `Guest checkout complete! Room #${res.data.room_number} is now in CLEANING status.`
        );
        setTimeout(() => navigate('/rooms'), 1800);
      } else {
        setError(res.message || 'Checkout failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingBal = selectedBooking ? Number(selectedBooking.balance_amount) : 0;
  const payNow = Number(settlementAmount || 0);
  const remainingAfterPayment = Math.max(0, pendingBal - payNow);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <LogOut className="w-6 h-6 text-rose-400" />
          <span>Guest Check-Out & Settlement</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Finalize stay folio, collect pending balance, mark booking CHECKED_OUT, and transition room to CLEANING
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleCheckOut} className="space-y-6">
        {/* Step 1: Select Active Occupant */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
            <BedDouble className="w-4 h-4" />
            <span>1. Select Occupied Room / Guest</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Checked-In Guest *</label>
            <select
              required
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
            >
              <option value="">Select Occupant...</option>
              {activeBookings.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  Room #{b.room_number} &bull; {b.customer_name} &bull; {b.booking_id} (Bal: {formatCurrency(b.balance_amount)})
                </option>
              ))}
            </select>
          </div>

          {selectedBooking && (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div>
                  <span className="font-bold text-slate-200 text-sm">{selectedBooking.customer_name}</span>
                  <span className="text-slate-400 block">{selectedBooking.customer_phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gold-400">Room #{selectedBooking.room_number}</span>
                  <span className="text-[11px] text-slate-400 block font-mono">{selectedBooking.booking_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>Stay: {formatDate(selectedBooking.check_in)} &rarr; Today</div>
                <div className="text-right">{selectedBooking.nights} night(s) booked</div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Grand Total Bill:</span>
                  <span className="text-slate-200 font-semibold">{formatCurrency(selectedBooking.total_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Paid so far:</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(selectedBooking.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-200 pt-1 border-t border-slate-800">
                  <span>Pending Balance:</span>
                  <span className={pendingBal > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {formatCurrency(pendingBal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Final Settlement Collection */}
        {selectedBooking && pendingBal > 0 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>2. Final Bill Settlement</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Settlement Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  max={pendingBal}
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. TXN/998811"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {remainingAfterPayment > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                <span>Remaining unsettled balance will be {formatCurrency(remainingAfterPayment)}.</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowUnsettled}
                    onChange={(e) => setAllowUnsettled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-gold-500 focus:ring-gold-500"
                  />
                  <span>Authorize Checkout with Balance</span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/rooms')}
            className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedBookingId}
            className="px-8 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-500/20 disabled:opacity-50"
          >
            {submitting ? 'Checking Out...' : 'Complete Checkout & Mark Room for Cleaning'}
          </button>
        </div>
      </form>
    </div>
  );
};
