import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const getPageTitle = (pathname) => {
    if (pathname.includes('/rooms')) return 'Rooms Management';
    if (pathname.includes('/bookings/new')) return 'New Reservation';
    if (pathname.includes('/bookings')) return 'Bookings & Reservations';
    if (pathname.includes('/check-in')) return 'Guest Check-In';
    if (pathname.includes('/check-out')) return 'Guest Check-Out & Settlement';
    if (pathname.includes('/customers')) return 'Customer Directory';
    if (pathname.includes('/payments')) return 'Payments & Ledger';
    if (pathname.includes('/expenses')) return 'Daily Operating Expenses';
    if (pathname.includes('/site-expenses')) return 'Site & Capital Expenses';
    if (pathname.includes('/vendors')) return 'Vendors & Suppliers';
    if (pathname.includes('/staff')) return 'Staff Directory';
    if (pathname.includes('/attendance')) return 'Daily Staff Attendance';
    if (pathname.includes('/payroll')) return 'Staff Payroll Management';
    if (pathname.includes('/reports')) return 'Financial Reports & Exports';
    if (pathname.includes('/audit-logs')) return 'Security Audit Trail';
    if (pathname.includes('/settings')) return 'Hotel Settings & Configurations';
    return 'Hotel Executive Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header setMobileOpen={setMobileOpen} pageTitle={getPageTitle(location.pathname)} />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
