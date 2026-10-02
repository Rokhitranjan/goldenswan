import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, Building, Shield, 
  Users, Tag, Check, Save, Plus, X, Lock, Key
} from 'lucide-react';
import { userService } from '../services/userService';
import { roomService } from '../services/roomService';
import { expenseService } from '../services/expenseService';
import { authService } from '../services/authService';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency } from '../utils/formatters';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('hotel');
  const [users, setUsers] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Hotel Info State
  const [hotelInfo, setHotelInfo] = useState({
    name: 'GoldenSwan Hotel',
    tagline: 'Luxury Boutique Stays & Hospitality',
    address: 'GoldenSwan Boulevard, Calangute Beach Road, Goa, India',
    phone: '+91 832 245 8899',
    email: 'contact@goldenswan.com',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
    checkin_time: '12:00 PM',
    checkout_time: '11:00 AM',
    gstin: '30AAACG1234F1Z5',
  });

  // User creation modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST',
  });
  const [userError, setUserError] = useState('');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [uRes, rtRes, catRes] = await Promise.all([
        userService.getUsers(),
        roomService.getRoomTypes(),
        expenseService.getExpenseCategories(),
      ]);
      if (uRes.success) setUsers(uRes.data);
      if (rtRes.success) setRoomTypes(rtRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHotelInfo = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError('');
    try {
      const res = await userService.createUser(newUser);
      if (res.success) {
        setShowUserModal(false);
        setNewUser({ username: '', email: '', password: '', role: 'RECEPTIONIST' });
        fetchInitialData();
      } else {
        setUserError(res.message || 'Failed to create user');
      }
    } catch (err) {
      setUserError(err.response?.data?.message || 'Error creating user');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    try {
      const res = await authService.changePassword(oldPassword, newPassword);
      if (res.success) {
        setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
        setOldPassword('');
        setNewPassword('');
      } else {
        setPwdMsg({ type: 'error', text: res.message || 'Failed to update password.' });
      }
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.message || 'Error changing password.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">System Settings & Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Manage property profile, roles, tax policies, and authentication credentials</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        {[
          { id: 'hotel', label: 'Hotel Profile', icon: Building },
          { id: 'users', label: 'Users & Roles', icon: Users },
          { id: 'room-types', label: 'Room Types', icon: Tag },
          { id: 'security', label: 'Security & Password', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Hotel Profile */}
      {activeTab === 'hotel' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
          {/* Official Property Crest Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 text-white mb-6 shadow-lg">
            <div className="w-24 h-16 rounded-xl bg-black/80 border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="GoldenSwan Crest" className="max-h-full max-w-full object-contain filter drop-shadow" />
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">Property Insignia</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">Active Crest</span>
              </div>
              <h3 className="font-serif font-bold text-base text-amber-200">GoldenSwan Hotel — Twin Swans Emblem</h3>
              <p className="text-xs text-slate-400 mt-0.5">Synchronized across system navigation, client receipts, payslips, login portal, and financial audits.</p>
            </div>
          </div>

          <form onSubmit={handleSaveHotelInfo} className="space-y-6 max-w-3xl">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Hotel configuration saved successfully.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hotel Property Name</label>
                <input
                  type="text"
                  value={hotelInfo.name}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, name: e.target.value })}
                  className="input-field w-full text-xs font-serif font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={hotelInfo.tagline}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, tagline: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Property Address</label>
                <input
                  type="text"
                  value={hotelInfo.address}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, address: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={hotelInfo.phone}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, phone: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={hotelInfo.email}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, email: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={hotelInfo.gstin}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, gstin: e.target.value })}
                  className="input-field w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Currency</label>
                <input
                  type="text"
                  disabled
                  value={hotelInfo.currency}
                  className="input-field w-full text-xs bg-slate-50 cursor-not-allowed font-medium text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Check-In Time</label>
                <input
                  type="text"
                  value={hotelInfo.checkin_time}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, checkin_time: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Check-Out Time</label>
                <input
                  type="text"
                  value={hotelInfo.checkout_time}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, checkout_time: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" className="btn-primary text-xs flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                <span>Save Property Settings</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Tab 2: Users & Roles */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">System User Accounts</h3>
            <button
              onClick={() => setShowUserModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff User</span>
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-xs">{u.username}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Room Types */}
      {activeTab === 'room-types' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomTypes.map((rt) => (
              <div key={rt.id} className="card p-5 space-y-2 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{rt.name}</h4>
                  <span className="font-bold text-amber-700 text-sm">{formatCurrency(rt.base_price)} / night</span>
                </div>
                <p className="text-xs text-slate-500">{rt.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>Standard Capacity: <strong>{rt.capacity} Guests</strong></span>
                  <span>{rt.amenities?.length || 0} Amenities</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab 4: Security */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 max-w-lg">
          <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Update Account Password</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">Enhance security by using a strong alphanumeric passphrase</p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwdMsg.text && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                pwdMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {pwdMsg.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" className="btn-primary text-xs">
                Update Password
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Create System User</span>
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                {userError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                    {userError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. frontdesk2"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@goldenswan.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role & Permissions</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="HOTEL_ADMIN">Hotel Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="HR_MANAGER">HR / Staff Manager</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-xs">
                    Create User
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
