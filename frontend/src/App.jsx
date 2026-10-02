import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Rooms } from './pages/Rooms';
import { Bookings } from './pages/Bookings';
import { NewBooking } from './pages/NewBooking';
import { CheckIn } from './pages/CheckIn';
import { CheckOut } from './pages/CheckOut';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import SiteExpenses from './pages/SiteExpenses';
import Vendors from './pages/Vendors';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

// 404 Fallback
const NotFound = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif text-2xl font-bold mb-4">
      404
    </div>
    <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Page Not Found</h1>
    <p className="text-sm text-slate-400 mt-2 max-w-sm">
      The requested management terminal route does not exist or has been relocated.
    </p>
    <a
      href="/dashboard"
      className="mt-6 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl text-xs transition-colors"
    >
      Return to Dashboard
    </a>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Layout and Subroutes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/new" element={<NewBooking />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="check-out" element={<CheckOut />} />
            <Route path="customers" element={<Customers />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="site-expenses" element={<SiteExpenses />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="staff" element={<Staff />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
