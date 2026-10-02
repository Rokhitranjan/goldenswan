import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  BedDouble,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { roomService } from '../services/roomService';
import { formatCurrency } from '../utils/formatters';

export const NewBooking = () => {
  const navigate = useNavigate();

  // Rooms list
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Form states
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Customer selection or new
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState('');

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [guests, setGuests] = useState(1);

  // Financials
  const [roomRate, setRoomRate] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [roomsRes, custRes] = await Promise.all([
          roomService.getRooms({ active_only: true }),
          bookingService.getCustomers(),
        ]);
        if (roomsRes.success) setRooms(roomsRes.data);
        if (custRes.success) setCustomers(custRes.data);
      } catch (err) {
        console.error('Failed to load form prerequisites:', err);
      }
    };
    loadInitialData();
  }, []);

  const handleRoomChange = (rid) => {
    setSelectedRoomId(rid);
    const r = rooms.find((x) => (x.id || x._id) === rid);
    if (r) {
      setSelectedRoom(r);
      setRoomRate(Number(r.price) || 0);
    }
  };

  const handleCustomerSelect = (cid) => {
    setCustomerId(cid);
    if (!cid) return;
    const c = customers.find((x) => (x.id || x._id) === cid);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerEmail(c.email || '');
      setIdProofType(c.id_proof_type || 'Aadhaar');
      setIdProofNumber(c.id_proof_number || '');
    }
  };

  // Compute nights and totals
  const nights = Math.max(
    1,
    Math.round((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))
  );
  const totalAmount = Math.max(
    0,
    roomRate * nights + Number(additionalCharges || 0) - Number(discount || 0)
  );
  const balance = Math.max(0, totalAmount - Number(amountPaid || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedRoomId) {
      setError('Please select a room.');
      return;
    }
    if (!customerId && (!customerName || !customerPhone)) {
      setError('Please provide guest name and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        room_id: selectedRoomId,
        customer_id: customerId || undefined,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        id_proof_type: idProofType,
        id_proof_number: idProofNumber,
        check_in: `${checkInDate}T12:00:00Z`,
        check_out: `${checkOutDate}T11:00:00Z`,
        guests: Number(guests),
        room_rate: Number(roomRate),
        additional_charges: Number(additionalCharges),
        discount: Number(discount),
        amount_paid: Number(amountPaid),
        payment_mode: paymentMode,
        payment_reference: paymentRef,
        notes,
      };

      const res = await bookingService.createBooking(payload);
      if (res.success) {
        navigate('/bookings');
      } else {
        setError(res.message || 'Failed to create reservation.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.room_id || 'Failed to create reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/bookings')}
          className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-gold-400" />
            <span>New Guest Reservation</span>
          </h2>
          <p className="text-xs text-slate-400">Reserve rooms, record guest details, and capture advance payments</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Room Selection & Stay Dates */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 text-gold-400">
            <BedDouble className="w-4 h-4" />
            <span>1. Room & Stay Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Room *</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              >
                <option value="">Choose Available Room...</option>
                {rooms.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    Room #{r.room_number} (Floor {r.floor}) - {r.status} - {formatCurrency(r.price)}/night
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Guests</label>
              <input
                type="number"
                min={1}
                max={6}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Check-In Date *</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Check-Out Date *</label>
              <input
                type="date"
                required
                min={checkInDate}
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Guest Information */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 text-gold-400">
            <User className="w-4 h-4" />
            <span>2. Guest Profile</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Existing Guest</label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
            >
              <option value="">Or Enter New Guest Profile Below...</option>
              {customers.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name} &bull; {c.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Rahul Kumar"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ID Proof Type</label>
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ID Proof Number</label>
              <input
                type="text"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                placeholder="Aadhaar / Passport No."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Financials & Advance Payment */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 text-gold-400">
            <CreditCard className="w-4 h-4" />
            <span>3. Billing & Deposit</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nightly Rate (₹)</label>
              <input
                type="number"
                value={roomRate}
                onChange={(e) => setRoomRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Charges (₹)</label>
              <input
                type="number"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Discount (₹)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Bill Calculation Summary Box */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Duration:</span>
              <span className="font-semibold text-slate-200">{nights} night(s)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Room Total ({nights} &times; {formatCurrency(roomRate)}):</span>
              <span className="text-slate-200 font-medium">{formatCurrency(roomRate * nights)}</span>
            </div>
            <div className="flex justify-between text-slate-100 font-bold text-sm pt-2 border-t border-slate-800">
              <span>Grand Total Amount:</span>
              <span className="text-gold-400 text-base">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Advance Payment (₹)</label>
              <input
                type="number"
                max={totalAmount}
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CASH">Cash</option>
                <option value="NET_BANKING">Net Banking</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Remaining Balance</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-rose-400 font-bold text-sm">
                {formatCurrency(balance)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-gold-500/20 disabled:opacity-50"
          >
            {submitting ? 'Confirming Reservation...' : 'Confirm & Reserve Room'}
          </button>
        </div>
      </form>
    </div>
  );
};
