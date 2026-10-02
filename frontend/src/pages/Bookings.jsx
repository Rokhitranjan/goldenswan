import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Search,
  Plus,
  Filter,
  Eye,
  LogIn,
  LogOut,
  XCircle,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

export const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingService.getBookings({
        search: search || undefined,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
      });
      if (res.success) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchBookings();
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, paymentFilter]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The room will be released.')) return;
    try {
      const res = await bookingService.cancelBooking(bookingId, 'Cancelled from front desk');
      if (res.success) {
        fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-gold-400" />
            <span>Reservations & Bookings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage hotel reservations, arrivals, departures, and balances
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings/new')}
          className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-slate-950 font-bold rounded-xl shadow-md shadow-gold-500/10 text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, customer name, phone, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold-500"
          >
            <option value="">All Statuses</option>
            <option value="RESERVED">Reserved</option>
            <option value="CHECKED_IN">Checked-In</option>
            <option value="CHECKED_OUT">Checked-Out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold-500"
          >
            <option value="">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partial</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings found"
          description="Create your first booking reservation or adjust search filters."
          actionLabel="Create Reservation"
          onAction={() => navigate('/bookings/new')}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Booking ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Stay Dates</th>
                  <th className="py-3.5 px-4">Financials</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {bookings.map((b) => {
                  const isReserved = b.booking_status === 'RESERVED';
                  const isCheckedIn = b.booking_status === 'CHECKED_IN';
                  const pendingBalance = Number(b.balance_amount) || 0;

                  return (
                    <tr key={b.id || b._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gold-400">
                        {b.booking_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{b.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{b.customer_phone}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        #{b.room_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-300">
                          {formatDate(b.check_in)} &rarr; {formatDate(b.check_out)}
                        </div>
                        <div className="text-[11px] text-slate-500">{b.nights} night(s) &bull; {b.guests} guest(s)</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{formatCurrency(b.total_amount)}</div>
                        <div className="text-[11px] flex items-center gap-1.5 mt-0.5">
                          {pendingBalance > 0 ? (
                            <span className="text-rose-400 font-medium">Bal: {formatCurrency(pendingBalance)}</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Fully Paid</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        <div><StatusBadge status={b.booking_status} size="sm" /></div>
                        <div><StatusBadge status={b.payment_status} size="sm" /></div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isReserved && (
                            <button
                              onClick={() => navigate('/check-in', { state: { booking: b } })}
                              className="px-2.5 py-1 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1"
                              title="Check In Guest"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Check In</span>
                            </button>
                          )}
                          {isCheckedIn && (
                            <button
                              onClick={() => navigate('/check-out', { state: { booking: b } })}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold rounded-lg text-xs flex items-center gap-1 border border-rose-500/20"
                              title="Check Out Guest"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Check Out</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                            title="View Booking Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isReserved && (
                            <button
                              onClick={() => handleCancelBooking(b.id || b._id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                              title="Cancel Reservation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono text-gold-400">
                  {selectedBooking.booking_id}
                </h3>
                <p className="text-xs text-slate-400">Room #{selectedBooking.room_number}</p>
              </div>
              <div className="flex gap-1.5">
                <StatusBadge status={selectedBooking.booking_status} />
                <StatusBadge status={selectedBooking.payment_status} />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <p className="font-bold text-slate-200">{selectedBooking.customer_name}</p>
                <p className="text-slate-400 mt-0.5">{selectedBooking.customer_phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-800/60">
                <div>
                  <span className="text-slate-400 block mb-0.5">Check-In Date</span>
                  <span className="font-semibold text-slate-200">{formatDate(selectedBooking.check_in)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Check-Out Date</span>
                  <span className="font-semibold text-slate-200">{formatDate(selectedBooking.check_out)}</span>
                </div>
              </div>

              <div className="space-y-1.5 py-2 border-b border-slate-800/60">
                <div className="flex justify-between text-slate-400">
                  <span>Room Rate ({selectedBooking.nights} nights)</span>
                  <span className="text-slate-200 font-medium">
                    {formatCurrency(Number(selectedBooking.room_rate) * selectedBooking.nights)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Additional Charges</span>
                  <span className="text-slate-200">{formatCurrency(selectedBooking.additional_charges || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount</span>
                  <span className="text-emerald-400">-{formatCurrency(selectedBooking.discount || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold pt-1 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-gold-400 text-sm">{formatCurrency(selectedBooking.total_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount Paid</span>
                  <span className="text-emerald-400">{formatCurrency(selectedBooking.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold">
                  <span>Pending Balance</span>
                  <span className="text-rose-400">{formatCurrency(selectedBooking.balance_amount)}</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">Guest Notes</span>
                  <p className="text-slate-300 italic">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
