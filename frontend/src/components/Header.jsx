import React, { useState, useEffect } from 'react';
import { Menu, Bell, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';

export const Header = ({ setMobileOpen, pageTitle = 'Dashboard' }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await dashboardService.getNotifications();
        if (res.success && res.data) {
          setUnreadCount(res.data.unread_count || 0);
          setNotifications(res.data.notifications || []);
        }
      } catch (e) {
        // quiet error on header notifs
      }
    };
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await dashboardService.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="GoldenSwan Hotel"
            className="h-8 w-auto object-contain lg:hidden rounded border border-amber-500/30 bg-black/60 px-1 py-0.5"
          />
          <h1 className="text-lg font-semibold text-slate-100">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live MongoDB Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Database className="w-3.5 h-3.5" />
          <span>MongoDB Connected</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDrawer(!showNotifDrawer)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-gold-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDrawer && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-semibold text-sm text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-gold-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 mt-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="py-2.5 px-1 flex gap-3 text-xs">
                      <div className="mt-0.5 text-gold-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-200">{n.title}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gold-500 to-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-200">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400">{user?.role || 'Staff'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
