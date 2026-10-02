import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Search, Filter, Calendar, 
  Clock, User, Eye, X, Activity, Database
} from 'lucide-react';
import { auditService } from '../services/auditService';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { formatDateTime } from '../utils/formatters';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (moduleFilter) params.module = moduleFilter;
      const res = await auditService.getAuditLogs(params);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter]);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.username?.toLowerCase().includes(q) ||
      l.user_email?.toLowerCase().includes(q) ||
      l.module?.toLowerCase().includes(q) ||
      l.record_id?.toLowerCase().includes(q)
    );
  });

  const getActionColor = (action = '') => {
    if (action.includes('CREATE') || action.includes('CHECK_IN') || action.includes('PAYMENT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('CANCEL') || action.includes('DELETE') || action.includes('CHECK_OUT')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('UPDATE') || action.includes('STATUS')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">System Audit & Compliance Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Immutable security event trails, financial modifications, and user logins</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <Database className="w-3.5 h-3.5" />
          <span>MongoDB Audit Collection</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, email, user, or record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="input-field text-xs py-1.5"
          >
            <option value="">All Functional Modules</option>
            <option value="auth">Authentication</option>
            <option value="rooms">Rooms</option>
            <option value="bookings">Bookings</option>
            <option value="payments">Payments</option>
            <option value="expenses">Daily Expenses</option>
            <option value="site_expenses">Site Expenses</option>
            <option value="staff">Staff & Attendance</option>
            <option value="payroll">Payroll</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} cols={5} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No audit events found"
            description="All system activities, logins, check-ins, checkouts, and financial transactions are recorded here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Event / Action</th>
                  <th className="py-3 px-4">Record Ref</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {log.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-xs">{log.username || 'System'}</p>
                          <p className="text-[10px] text-slate-400">{log.user_email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {log.record_id ? log.record_id.slice(-8) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Full Metadata"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Audit Event Metadata #{selectedLog.id?.slice(-8)}</span>
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Action:</span>
                    <span className="font-bold text-slate-900">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Module:</span>
                    <span className="font-semibold text-slate-900">{selectedLog.module}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Actor:</span>
                    <span className="font-semibold text-slate-900">{selectedLog.username} ({selectedLog.user_email})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Timestamp:</span>
                    <span className="font-mono text-slate-900">{formatDateTime(selectedLog.timestamp)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-700 mb-1">Payload / Changed Attributes:</h4>
                  <pre className="bg-slate-900 text-amber-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56">
                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
