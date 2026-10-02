# GoldenSwan Hotel — User & Operational Guide

Welcome to the **GoldenSwan Hotel Management Software** operational guide. This document provides step-by-step Standard Operating Procedures (SOP) for hotel administrative, front desk, and accounting personnel.

---

## 1. System Access & User Roles

Access the terminal via modern web browser at `http://localhost:5173`.

### Pre-Configured Role Matrix

| Role | Permitted Operations | Restricted Modules |
|------|----------------------|-------------------|
| **Super Admin** | Full access to all modules, settings, users, and audit logs | None |
| **Hotel Admin** | Operations, front desk, expenses, payroll, reports, room settings | System root configuration |
| **Manager** | Front desk, rooms, daily expenses, staff roster, reports | User account creation |
| **Receptionist** | Room telemetry, reservations, guest check-in, checkout, payments | Payroll, system users, audit logs |
| **Accountant** | Payments ledger, daily expenses, site expenses, payroll, financial exports | Room physical status changes |
| **HR Manager** | Staff directory, daily attendance tracking, payroll processing | Room status, reservations |
| **Viewer** | Read-only inspection across authorized reports | Any write or modify operation |

---

## 2. Daily Front Desk Operations

### 2.1 Viewing Room Inventory (Room Grid)
1. In the sidebar, select **Rooms Overview**.
2. Top counters summarize real-time telemetry:
   * **Green**: `AVAILABLE`
   * **Blue**: `RESERVED`
   * **Orange/Red**: `OCCUPIED`
   * **Yellow**: `CLEANING`
   * **Gray**: `MAINTENANCE`
3. Click any room card to view guest details, nightly tariff, amenities, or update status (e.g. from `CLEANING` to `AVAILABLE` once housekeeping inspects).

### 2.2 Making a Reservation
1. Navigate to **Bookings** and click **New Reservation** (or press the quick-action button on Dashboard).
2. Choose guest from directory or fill in new guest contact details.
3. Select desired room number. The system automatically inspects room calendars to prevent overlapping dates.
4. Input check-in and check-out dates, guest count, and optional advance payment.
5. Click **Create Reservation**. The room automatically transitions to `RESERVED`.

### 2.3 Guest Check-In Workflow
1. When guest arrives, click **Check-In** in the sidebar.
2. Select the existing reservation from the list or enter a walk-in guest.
3. Verify guest identity (Aadhaar, Passport, DL).
4. Record any additional advance payment or deposit received.
5. Click **Confirm Check-In**.
   * Room status immediately becomes `OCCUPIED`.
   * Booking status transitions to `CHECKED_IN`.
   * An audit log entry is recorded with timestamp and operator name.

### 2.4 Guest Check-Out & Bill Settlement
1. In the sidebar, click **Check-Out**.
2. Select the departing guest or room number.
3. The system generates an itemized bill:
   * Room nights charge
   * Additional charges & discounts
   * Less amount already paid
   * Outstanding balance
4. If a balance remains, collect final payment via Cash, UPI, or Card.
5. Click **Confirm Settlement & Check-Out**.
   * Booking transitions to `CHECKED_OUT`.
   * Room automatically transitions to `CLEANING` for housekeeping.
   * Payment receipt is generated with printable voucher.

---

## 3. Financial & Expense Management

### 3.1 Recording Daily Hotel Expenses
1. In the sidebar under **Finance & Costs**, click **Daily Expenses**.
2. Click **Add Expense**.
3. Select category (e.g., Grocery, Daily Maintenance, Common Expense).
4. Enter description, total bill amount, amount paid from cash drawer or UPI, and vendor bill reference.
5. The system computes remaining payable and assigns status (`PAID` or `PARTIALLY_PAID`).

### 3.2 Site & Capital Expenditures
1. Navigate to **Site Expenses**.
2. Log renovation contracts, HVAC replacements, and civil repairs linked to registered suppliers.

### 3.3 Payments Ledger
1. Click **Payments** to view all transaction receipts.
2. Filter by date, payment mode (UPI, Cash, POS Card).
3. Click **Receipt** to open the branded print-ready receipt modal and print via browser.

---

## 4. Staff & Human Resources

### 4.1 Daily Attendance
1. Click **Daily Attendance** in the sidebar.
2. Choose date (defaults to current date).
3. For each on-duty staff member, select status with one click:
   * `Present` (Emerald)
   * `Half Day` (Amber)
   * `Leave` (Blue)
   * `Absent` (Rose)
4. Attendance logs are saved instantly to MongoDB and inform monthly payroll calculations.

### 4.2 Monthly Payroll Processing
1. Navigate to **Payroll**.
2. Select Month and Year.
3. Click **Run Payroll Calculation**.
4. The system calculates:
   $$\text{Final Payable} = \text{Base Salary} - \text{Absence Deductions} + \text{Overtime} + \text{Bonus}$$
5. Click **Payslip** on any staff row to review or print official compensation voucher.
6. Once disbursed via bank transfer, click **Pay** to record transaction.

---

## 5. Reports & Data Exports

1. In the sidebar, click **Reports & Export**.
2. Choose date range (e.g. Current Month).
3. Click **Export Excel (.xlsx)** to download clean spreadsheets with formatted currencies, dates, and column headers.
4. Click **Export PDF** to generate print-ready executive summaries with hotel header and totals.
5. Click **Print View** for browser-based direct printing.
