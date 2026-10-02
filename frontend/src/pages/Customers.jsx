import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Plus, Phone, Mail, MapPin, 
  CreditCard, Calendar, Eye, Edit2, X, Check, History, BedDouble
} from 'lucide-react';
import { customerService } from '../services/customerService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    id_proof_type: 'AADHAAR',
    id_proof_number: '',
    nationality: 'Indian',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = async (searchTerm = '') => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers({ search: searchTerm });
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenDetails = async (cust) => {
    setSelectedCustomer(cust);
    setLoadingBookings(true);
    try {
      const res = await customerService.getCustomerBookings(cust.id);
      if (res.success) {
        setCustomerBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer bookings:', err);
      setCustomerBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      setError('Full name and phone number are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await customerService.createCustomer(formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          full_name: '',
          phone: '',
          email: '',
          address: '',
          id_proof_type: 'AADHAAR',
          id_proof_number: '',
          nationality: 'Indian',
          notes: '',
        });
        fetchCustomers(search);
      } else {
        setError(res.message || 'Failed to save customer');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Guest Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage guest records, verification ID details, and booking histories</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Guest</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Registered Guests</p>
            <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Verified IDs</p>
            <p className="text-2xl font-bold text-slate-900">
              {customers.filter(c => c.id_proof_number).length}
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Nationalities</p>
            <p className="text-2xl font-bold text-slate-900">
              {new Set(customers.map(c => c.nationality || 'Indian')).size}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guests by name, phone number, email, or ID proof..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={5} />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No guests found"
            description={search ? `No guests matching "${search}"` : "You haven't added any guests to the directory yet."}
            actionLabel="Add Guest"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Guest Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">ID Verification</th>
                  <th className="py-3 px-4">Nationality / Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm">
                          {cust.full_name?.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{cust.full_name}</p>
                          <p className="text-xs text-slate-400">Added {formatDate(cust.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                        {cust.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {cust.id_proof_type ? (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-700">{cust.id_proof_type}:</span>{' '}
                          <span className="font-mono text-slate-600">{cust.id_proof_number || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not provided</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-slate-700">{cust.nationality || 'Indian'}</p>
                      {cust.address && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{cust.address}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(cust)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        title="View Stay History"
                      >
                        <History className="w-4 h-4" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guest Details & Booking History Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                    {selectedCustomer.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedCustomer.full_name}</h2>
                    <p className="text-xs text-slate-300">Guest ID: {selectedCustomer.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Contact & ID Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Phone Number</span>
                    <span className="font-semibold text-slate-800">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Email</span>
                    <span className="font-semibold text-slate-800">{selectedCustomer.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Nationality</span>
                    <span className="font-semibold text-slate-800">{selectedCustomer.nationality || 'Indian'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">ID Proof</span>
                    <span className="font-semibold text-slate-800">
                      {selectedCustomer.id_proof_type ? `${selectedCustomer.id_proof_type} (${selectedCustomer.id_proof_number || ''})` : '—'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block mb-1">Address</span>
                    <span className="font-semibold text-slate-800">{selectedCustomer.address || '—'}</span>
                  </div>
                </div>

                {/* Stays & Booking History */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-amber-600" />
                    <span>Booking & Stay History ({customerBookings.length})</span>
                  </h3>

                  {loadingBookings ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading booking records...</div>
                  ) : customerBookings.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                      No stays recorded for this guest yet.
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Booking ID</th>
                            <th className="py-2.5 px-3">Room</th>
                            <th className="py-2.5 px-3">Dates</th>
                            <th className="py-2.5 px-3">Total Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{b.booking_id}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700">Room {b.room_number}</td>
                              <td className="py-2.5 px-3 text-slate-500">{formatDate(b.check_in_date)} to {formatDate(b.check_out_date)}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{formatCurrency(b.grand_total)}</td>
                              <td className="py-2.5 px-3">
                                <StatusBadge status={b.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end rounded-b-2xl">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Guest Modal */}
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
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Register New Guest</span>
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="ramesh@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ID Proof Type</label>
                    <select
                      value={formData.id_proof_type}
                      onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                      className="input-field w-full text-xs"
                    >
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="PAN_CARD">PAN Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ID Proof Number</label>
                    <input
                      type="text"
                      placeholder="XXXX-XXXX-XXXX"
                      value={formData.id_proof_number}
                      onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="input-field w-full text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                    <textarea
                      rows={2}
                      placeholder="House No, Street, City, State, PIN"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    {submitting ? 'Saving Guest...' : 'Save Guest Details'}
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
