import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, BedDouble, User, CreditCard, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { roomService } from '../services/roomService';
import { formatCurrency, formatDate } from '../utils/formatters';

export const CheckIn = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [reservedBookings, setReservedBookings] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Check-in mode: 'EXISTING_RESERVATION' or 'WALK_IN'
  const [mode, setMode] = useState('EXISTING_RESERVATION');

  // Existing booking checkin
  const [selectedBookingId, setSelectedBookingId] = useState(location.state?.booking?.id || location.state?.booking?._id || '');
  const [checkInPaymentAmount, setCheckInPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [refNumber, setRefNumber] = useState('');

  // Walk-in form states
  const [walkinRoomId, setWalkinRoomId] = useState('');
  const [walkinCustId, setWalkinCustId] = useState('');
  const [walkinCustName, setWalkinCustName] = useState('');
  const [walkinCustPhone, setWalkinCustPhone] = useState('');
  const [walkinNights, setWalkinNights] = useState(1);
  const [walkinGuests, setWalkinGuests] = useState(1);
  const [walkinPaid, setWalkinPaid] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [bookingsRes, roomsRes, custRes] = await Promise.all([
          bookingService.getBookings({ status: 'RESERVED' }),
          roomService.getRooms({ status: 'AVAILABLE' }),
          bookingService.getCustomers(),
        ]);
        if (bookingsRes.success) setReservedBookings(bookingsRes.data);
        if (roomsRes.success) setAvailableRooms(roomsRes.data);
        if (custRes.success) setCustomers(custRes.data);
      } catch (err) {
        console.error('Failed to load check-in candidates:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedBooking = reservedBookings.find(
    (b) => (b.id || b._id) === selectedBookingId
  );

  const handleExistingCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedBookingId) {
      setError('Please select an active reservation to check in.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await bookingService.checkIn({
        booking_id: selectedBookingId,
        amount: Number(checkInPaymentAmount || 0),
        payment_mode: paymentMode,
        reference_number: refNumber,
      });

      if (res.success) {
        setSuccessMsg(`Guest successfully checked into Room #${res.data.room_number}! Room is now OCCUPIED.`);
        setTimeout(() => navigate('/rooms'), 1800);
      } else {
        setError(res.message || 'Check-in failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Check-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWalkInCheckIn = async (e) => {
    e.preventDefault();
    setError('');

    if (!walkinRoomId) {
      setError('Please select an available room.');
      return;
    }
    if (!walkinCustId && (!walkinCustName || !walkinCustPhone)) {
      setError('Please provide guest name and contact number.');
      return;
    }

    setSubmitting(true);
    try {
      const room = availableRooms.find((r) => (r.id || r._id) === walkinRoomId);
      const today = new Date();
      const checkInDate = today.toISOString();
      const checkOutDate = new Date(today.getTime() + walkinNights * 24 * 60 * 60 * 1000).toISOString();

      const bookingPayload = {
        room_id: walkinRoomId,
        customer_id: walkinCustId || undefined,
        customer_name: walkinCustName,
        customer_phone: walkinCustPhone,
        check_in: checkInDate,
        check_out: checkOutDate,
        guests: Number(walkinGuests),
        room_rate: Number(room?.price || 3000),
        amount_paid: Number(walkinPaid || 0),
        payment_mode: paymentMode,
        payment_reference: refNumber,
        booking_status: 'CHECKED_IN',
        notes: 'Walk-in instant check-in',
      };

      const res = await bookingService.createBooking(bookingPayload);
      if (res.success) {
        setSuccessMsg(`Walk-in guest checked into Room #${res.data.room_number}! Room marked OCCUPIED.`);
        setTimeout(() => navigate('/rooms'), 1800);
      } else {
        setError(res.message || 'Walk-in check-in failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.room_id || 'Walk-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <LogIn className="w-6 h-6 text-gold-400" />
          <span>Guest Check-In Workflow</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete guest arrival, room key handover, advance deposit, and transition room to OCCUPIED
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => { setMode('EXISTING_RESERVATION'); setError(''); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mode === 'EXISTING_RESERVATION'
              ? 'bg-gold-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Reserved Booking Check-In ({reservedBookings.length})
        </button>
        <button
          type="button"
          onClick={() => { setMode('WALK_IN'); setError(''); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mode === 'WALK_IN'
              ? 'bg-gold-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Walk-In Direct Check-In ({availableRooms.length} Rooms Ready)
        </button>
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

      {mode === 'EXISTING_RESERVATION' ? (
        /* Existing Booking Check-In */
        <form onSubmit={handleExistingCheckIn} className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Select Pending Reservation</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Guest Reservation *</label>
              <select
                required
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              >
                <option value="">Choose Booking...</option>
                {reservedBookings.map((b) => (
                  <option key={b.id || b._id} value={b.id || b._id}>
                    {b.booking_id} &bull; Room #{b.room_number} &bull; {b.customer_name} ({b.nights} nights &bull; Total: {formatCurrency(b.total_amount)})
                  </option>
                ))}
              </select>
            </div>

            {selectedBooking && (
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Guest Name:</span>
                  <span className="font-semibold text-slate-200">{selectedBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Room:</span>
                  <span className="font-bold text-gold-400">Room #{selectedBooking.room_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled Check-Out:</span>
                  <span className="text-slate-200">{formatDate(selectedBooking.check_out)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Total Bill:</span>
                  <span className="text-slate-200 font-medium">{formatCurrency(selectedBooking.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Already Paid:</span>
                  <span className="text-emerald-400">{formatCurrency(selectedBooking.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-slate-200">Pending Balance:</span>
                  <span className="text-rose-400">{formatCurrency(selectedBooking.balance_amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment on Check-In */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Check-In Payment Collection</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount to Pay Now (₹)</label>
                <input
                  type="number"
                  min={0}
                  max={selectedBooking ? Number(selectedBooking.balance_amount) : undefined}
                  value={checkInPaymentAmount}
                  onChange={(e) => setCheckInPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction / Ref Number</label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. UPI/123456"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedBookingId}
              className="px-8 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-gold-500/20 disabled:opacity-50"
            >
              {submitting ? 'Checking In...' : 'Confirm Check-In & Mark Occupied'}
            </button>
          </div>
        </form>
      ) : (
        /* Walk-in Check-In */
        <form onSubmit={handleWalkInCheckIn} className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <BedDouble className="w-4 h-4" />
              <span>Select Available Room & Duration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Available Room *</label>
                <select
                  required
                  value={walkinRoomId}
                  onChange={(e) => setWalkinRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                >
                  <option value="">Select available room...</option>
                  {availableRooms.map((r) => (
                    <option key={r.id || r._id} value={r.id || r._id}>
                      Room #{r.room_number} (Floor {r.floor}) - {formatCurrency(r.price)}/night
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nights</label>
                <input
                  type="number"
                  min={1}
                  value={walkinNights}
                  onChange={(e) => setWalkinNights(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Guest Details</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Existing Customer (Optional)</label>
              <select
                value={walkinCustId}
                onChange={(e) => {
                  setWalkinCustId(e.target.value);
                  const c = customers.find((x) => (x.id || x._id) === e.target.value);
                  if (c) {
                    setWalkinCustName(c.name);
                    setWalkinCustPhone(c.phone);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              >
                <option value="">Or Enter New Guest Below...</option>
                {customers.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name} &bull; {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={walkinCustName}
                  onChange={(e) => setWalkinCustName(e.target.value)}
                  placeholder="Guest Name"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={walkinCustPhone}
                  onChange={(e) => setWalkinCustPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Initial Payment Collection</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={walkinPaid}
                  onChange={(e) => setWalkinPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
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
                </select>
              </div>
            </div>
          </div>

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
              disabled={submitting}
              className="px-8 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-gold-500/20 disabled:opacity-50"
            >
              {submitting ? 'Checking In...' : 'Confirm Walk-In & Mark Occupied'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
