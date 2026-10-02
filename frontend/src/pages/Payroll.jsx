import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, Calendar, CheckCircle2, Clock, 
  Printer, ArrowUpRight, DollarSign, X, FileText, Check, AlertCircle
} from 'lucide-react';
import { payrollService } from '../services/payrollService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Payroll() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activePayrollToPay, setActivePayrollToPay] = useState(null);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [paying, setPaying] = useState(false);

  const fetchPayroll = async (y, m) => {
    try {
      setLoading(true);
      const res = await payrollService.getPayroll(y, m);
      if (res.success) {
        setPayrollRecords(res.data);
      }
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll(year, month);
  }, [year, month]);

  const handleProcessPayroll = async () => {
    try {
      setProcessing(true);
      const res = await payrollService.processPayroll({ year, month });
      if (res.success) {
        setPayrollRecords(res.data);
      }
    } catch (err) {
      console.error('Failed to process payroll:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaySalary = async () => {
    if (!activePayrollToPay) return;
    try {
      setPaying(true);
      const res = await payrollService.markPaid(activePayrollToPay.id, paymentMode);
      if (res.success) {
        setShowPayModal(false);
        setActivePayrollToPay(null);
        fetchPayroll(year, month);
      }
    } catch (err) {
      console.error('Failed to pay salary:', err);
    } finally {
      setPaying(false);
    }
  };

  const monthsList = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const totalPayrollPayable = payrollRecords.reduce((acc, p) => acc + (parseFloat(p.final_payable_salary) || 0), 0);
  const totalPaid = payrollRecords.filter(p => p.payment_status === 'PAID').reduce((acc, p) => acc + (parseFloat(p.final_payable_salary) || 0), 0);
  const totalPending = totalPayrollPayable - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Staff Payroll & Compensation</h1>
          <p className="text-sm text-slate-500 mt-1">Automated salary computations derived from monthly attendance, leaves, and overtime</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white card p-1 shadow-sm">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="text-xs font-semibold py-1 px-2 border-none bg-transparent focus:outline-none"
            >
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="text-xs font-semibold py-1 px-2 border-none bg-transparent focus:outline-none"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
          <button
            disabled={processing}
            onClick={handleProcessPayroll}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{processing ? 'Calculating...' : 'Run Payroll Calculation'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-slate-900">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Month Commitment</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPayrollPayable)}</p>
          <p className="text-xs text-slate-500 mt-1">{payrollRecords.length} staff processed</p>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disbursed Salaries</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bank transfers cleared</span>
          </p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Salary Dues</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Unpaid employee vouchers</span>
          </p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={7} />
          </div>
        ) : payrollRecords.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title={`No payroll calculated for ${monthsList.find(m => m.value === month)?.name} ${year}`}
            description="Click 'Run Payroll Calculation' above to compute pro-rated salaries from attendance logs."
            actionLabel="Compute Payroll"
            onAction={handleProcessPayroll}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Attendance (P/A/L/H)</th>
                  <th className="py-3 px-4">Overtime / Bonus</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payrollRecords.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 text-xs">{p.staff_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.staff_id_code} • {p.department}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {formatCurrency(p.base_salary)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <span className="font-semibold text-emerald-600">{p.present_days}P</span> /{' '}
                      <span className="font-semibold text-rose-600">{p.absent_days}A</span> /{' '}
                      <span className="font-semibold text-blue-600">{p.leave_days}L</span> /{' '}
                      <span className="font-semibold text-amber-600">{p.half_days}H</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="text-emerald-600 font-medium">+{formatCurrency((parseFloat(p.overtime_amount) || 0) + (parseFloat(p.bonus) || 0))}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="text-rose-600 font-medium">-{formatCurrency(p.salary_deduction)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 text-sm">{formatCurrency(p.final_payable_salary)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.payment_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPayslip(p)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-xs font-semibold inline-flex items-center gap-1"
                          title="View Payslip"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Payslip</span>
                        </button>
                        {p.payment_status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setActivePayrollToPay(p);
                              setShowPayModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      <AnimatePresence>
        {selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white relative text-center">
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex justify-center mb-3">
                  <img
                    src="/logo.png"
                    alt="GoldenSwan Hotel"
                    className="h-16 w-auto object-contain filter drop-shadow-md rounded-lg"
                  />
                </div>
                <h3 className="font-serif font-bold text-lg text-amber-400">GoldenSwan Hotel</h3>
                <p className="text-xs text-slate-400">Salary Voucher / Payslip</p>
                <p className="text-[11px] text-amber-300 font-semibold mt-1">
                  {monthsList.find(m => m.value === selectedPayslip.month)?.name} {selectedPayslip.year}
                </p>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Employee:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedPayslip.staff_name}</span>
                    <span className="text-slate-500 block text-[11px]">{selectedPayslip.position}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Staff Code:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPayslip.staff_id_code}</span>
                    <span className="text-slate-500 block text-[11px]">{selectedPayslip.department}</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Base Salary</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(selectedPayslip.base_salary)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Present Days Allowance ({selectedPayslip.present_days} days)</span>
                    <span className="text-slate-900 font-medium">Included</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Overtime Earnings</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(selectedPayslip.overtime_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Incentive / Bonus</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(selectedPayslip.bonus)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Attendance Deductions ({selectedPayslip.absent_days} absent)</span>
                    <span className="font-semibold text-rose-600">-{formatCurrency(selectedPayslip.salary_deduction)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between border-t border-slate-200">
                  <span className="font-bold text-slate-900 text-sm">Net Payable Salary</span>
                  <span className="text-xl font-bold text-slate-900">{formatCurrency(selectedPayslip.final_payable_salary)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2">
                  <span>Status: <strong>{selectedPayslip.payment_status}</strong></span>
                  {selectedPayslip.payment_date && <span>Paid on: {formatDate(selectedPayslip.payment_date)}</span>}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Payslip</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Salary Modal */}
      <AnimatePresence>
        {showPayModal && activePayrollToPay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs">Confirm Salary Disbursement</h3>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-slate-600">
                  Disburse net salary of{' '}
                  <strong className="text-slate-900">{formatCurrency(activePayrollToPay.final_payable_salary)}</strong> to{' '}
                  <strong className="text-slate-900">{activePayrollToPay.staff_name}</strong>?
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={paying}
                    onClick={handlePaySalary}
                    className="btn-primary text-xs"
                  >
                    {paying ? 'Processing...' : 'Confirm Disbursement'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
