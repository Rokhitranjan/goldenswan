import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  LogIn,
  LogOut as LogOutIcon,
  Users,
  CreditCard,
  Receipt,
  Building,
  Briefcase,
  UserCheck,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

export const Sidebar = ({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Rooms Overview', to: '/rooms', icon: BedDouble },
      ],
    },
    {
      title: 'Front Desk',
      roles: ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'],
      items: [
        { label: 'Bookings', to: '/bookings', icon: CalendarCheck },
        { label: 'Check-In', to: '/check-in', icon: LogIn },
        { label: 'Check-Out', to: '/check-out', icon: LogOutIcon },
        { label: 'Customers', to: '/customers', icon: Users },
        { label: 'Payments', to: '/payments', icon: CreditCard },
      ],
    },
    {
      title: 'Finance & Costs',
      roles: ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'ACCOUNTANT'],
      items: [
        { label: 'Daily Expenses', to: '/expenses', icon: Receipt },
        { label: 'Site Expenses', to: '/site-expenses', icon: Building },
        { label: 'Vendors', to: '/vendors', icon: Building },
      ],
    },
    {
      title: 'HR & Staff',
      roles: ['SUPER_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'MANAGER'],
      items: [
        { label: 'Staff Directory', to: '/staff', icon: Briefcase },
        { label: 'Daily Attendance', to: '/attendance', icon: UserCheck },
        { label: 'Payroll', to: '/payroll', icon: Wallet },
      ],
    },
    {
      title: 'Analytics & System',
      items: [
        { label: 'Reports & Export', to: '/reports', icon: BarChart3 },
        { label: 'Audit Logs', to: '/audit-logs', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'HOTEL_ADMIN'] },
        { label: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ];

  const userRole = user?.role || 'VIEWER';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0 overflow-hidden p-0.5">
              <img src={logoImg} alt="GoldenSwan Logo" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent font-serif">
                  GOLDENSWAN
                </span>
                <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
                  Hotel & Suites
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, gIdx) => {
            if (group.roles && !group.roles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
              return null;
            }

            return (
              <div key={gIdx}>
                {!isCollapsed && (
                  <h4 className="px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
                    {group.title}
                  </h4>
                )}
                <div className="space-y-1">
                  {group.items.map((item, iIdx) => {
                    if (item.roles && !item.roles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
                      return null;
                    }
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={iIdx}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-gold-500/20 to-amber-500/10 text-gold-400 border border-gold-500/30 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                          } ${isCollapsed ? 'justify-center' : ''}`
                        }
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User profile / Logout bottom card */}
        <div className="p-3 border-t border-slate-800/80">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-gold-400 shrink-0 text-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Staff'}</p>
                <p className="text-[11px] text-gold-400 truncate">{user?.role || 'Staff'}</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
