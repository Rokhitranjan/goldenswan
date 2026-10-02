import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarCheck, Calendar, Clock, Check, X, 
  AlertCircle, Users, CheckCircle2, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';
import { staffService } from '../services/staffService';
import StatusBadge from '../components/StatusBadge';
import { SkeletonTable } from '../components/Skeleton';
import { formatDate } from '../utils/formatters';

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffList, setStaffList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [stats, setStats] = useState({ total_staff: 0, present: 0, absent: 0, leave: 0, half_day: 0 });
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  const fetchAttendanceData = async (date) => {
    try {
      setLoading(true);
      const [staffRes, attRes, statRes] = await Promise.all([
        staffService.getStaff({ status: 'ACTIVE' }),
        staffService.getAttendance(date),
        staffService.getAttendanceStats(date),
      ]);

      if (staffRes.success) setStaffList(staffRes.data);
      if (attRes.success) {
        // Map by staff_id for quick lookup
        const attMap = {};
        attRes.data.forEach((rec) => {
          attMap[rec.staff_id] = rec;
        });
        setAttendanceRecords(attMap);
      }
      if (statRes.success) setStats(statRes.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  const handleMark = async (staffMember, status) => {
    try {
      setMarkingId(staffMember.id);
      const res = await staffService.markAttendance({
        staff_id: staffMember.id,
        date: selectedDate,
        status: status,
        check_in_time: status === 'PRESENT' || status === 'HALF_DAY' ? '09:00' : '',
        check_out_time: status === 'PRESENT' ? '18:00' : (status === 'HALF_DAY' ? '14:00' : ''),
      });

      if (res.success) {
        setAttendanceRecords((prev) => ({
          ...prev,
          [staffMember.id]: res.data,
        }));
        // Refresh stats
        const statRes = await staffService.getAttendanceStats(selectedDate);
        if (statRes.success) setStats(statRes.data);
      }
    } catch (err) {
      console.error('Failed to mark attendance:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Daily Attendance Roster</h1>
          <p className="text-sm text-slate-500 mt-1">Track staff duty hours, leaves, and biometric punch-ins for payroll calculation</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white card p-1.5 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 border-l-4 border-l-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Roster</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.total_staff}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <p className="text-[10px] uppercase font-bold text-emerald-600">Present</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.present}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-rose-500">
          <p className="text-[10px] uppercase font-bold text-rose-600">Absent</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{stats.absent}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-blue-500">
          <p className="text-[10px] uppercase font-bold text-blue-600">On Leave</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{stats.leave}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-500 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold text-amber-600">Half Day</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.half_day}</p>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Roster for {formatDate(selectedDate)}
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {Object.keys(attendanceRecords).length} of {staffList.length} marked
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={5} />
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active staff members found in directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Staff ID & Dept</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Hours / Duty Time</th>
                  <th className="py-3 px-4 text-right">Quick Mark Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {staffList.map((st) => {
                  const record = attendanceRecords[st.id];
                  const currentStatus = record ? record.status : 'NOT_MARKED';
                  const isMarking = markingId === st.id;

                  return (
                    <tr key={st.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs">
                            {st.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">{st.name}</p>
                            <p className="text-[11px] text-slate-400">{st.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-600 block">{st.staff_id}</span>
                        <span className="text-[10px] text-slate-500">{st.department}</span>
                      </td>
                      <td className="py-3 px-4">
                        {currentStatus === 'NOT_MARKED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400">
                            Unrecorded
                          </span>
                        ) : (
                          <StatusBadge status={currentStatus} />
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {record && record.check_in_time ? (
                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{record.check_in_time} - {record.check_out_time || 'In Duty'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            disabled={isMarking}
                            onClick={() => handleMark(st, 'PRESENT')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            disabled={isMarking}
                            onClick={() => handleMark(st, 'HALF_DAY')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentStatus === 'HALF_DAY'
                                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            Half Day
                          </button>
                          <button
                            disabled={isMarking}
                            onClick={() => handleMark(st, 'LEAVE')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentStatus === 'LEAVE'
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            Leave
                          </button>
                          <button
                            disabled={isMarking}
                            onClick={() => handleMark(st, 'ABSENT')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
