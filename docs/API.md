# GoldenSwan Hotel Management Software — REST API Documentation

Base URL: `http://localhost:8000/api`

All endpoints return JSON responses with standard envelope:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```
Error format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": { "field": [ "Reason" ] }
}
```

---

## 1. Authentication & Profile

### `POST /api/auth/login/`
Authenticates user with username or email and returns JWT access and refresh tokens.
* **Auth**: Public
* **Request Body**:
```json
{
  "email": "admin@goldenswan.com",
  "password": "Admin@12345"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "6abcf65febef47d1ace494cc",
      "name": "GoldenSwan Admin",
      "email": "admin@goldenswan.com",
      "role": "SUPER_ADMIN"
    },
    "tokens": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "eyJhbGciOi...",
      "token_type": "Bearer",
      "expires_in": 86400
    }
  }
}
```

### `GET /api/auth/me/`
Returns currently authenticated user profile.
* **Auth**: Bearer JWT
* **Response (200 OK)**: User profile object.

### `POST /api/auth/change-password/`
Updates account password.
* **Auth**: Bearer JWT
* **Request Body**:
```json
{
  "old_password": "Admin@12345",
  "new_password": "NewSecretPassword123"
}
```

---

## 2. User & Role Management

### `GET /api/users/`
Lists system users.
* **Auth**: Bearer JWT (`SUPER_ADMIN`, `HOTEL_ADMIN`, `MANAGER`)

### `POST /api/users/`
Creates a new staff user with designated role.
* **Auth**: Bearer JWT (`SUPER_ADMIN`, `HOTEL_ADMIN`)
* **Roles**: `SUPER_ADMIN`, `HOTEL_ADMIN`, `MANAGER`, `RECEPTIONIST`, `ACCOUNTANT`, `HR_MANAGER`, `VIEWER`

---

## 3. Rooms & Room Types

### `GET /api/rooms/`
Lists rooms with optional filtering by `floor` and `status`.
* **Query Params**: `floor` (1, 2, 3), `status` (AVAILABLE, RESERVED, OCCUPIED, CLEANING, MAINTENANCE)

### `GET /api/rooms/status-counts/`
Returns live room inventory telemetry counts.
* **Response**:
```json
{
  "AVAILABLE": 24,
  "RESERVED": 3,
  "OCCUPIED": 1,
  "CLEANING": 1,
  "MAINTENANCE": 1,
  "total": 30
}
```

### `POST /api/rooms/`
Creates a new room.
* **Auth**: Bearer JWT (`CanManageRooms`)
* **Request Body**:
```json
{
  "room_number": "401",
  "floor": 4,
  "price": 3500.0,
  "capacity": 2,
  "status": "AVAILABLE",
  "description": "Executive suite with panoramic sea view.",
  "amenities": ["Wi-Fi", "Air Conditioning", "Balcony"]
}
```

### `PATCH /api/rooms/{id}/status/`
Updates room lifecycle state.
* **Statuses**: `AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`

---

## 4. Customer Directory

### `GET /api/customers/`
Retrieves customer records with optional search query.
* **Query Params**: `search` (name, phone, email, ID proof)

### `POST /api/customers/`
Registers a new customer.
* **Request Body**:
```json
{
  "name": "Rohan Sharma",
  "phone": "+91 9876543210",
  "email": "rohan@example.com",
  "id_proof_type": "AADHAAR",
  "id_proof_number": "1234-5678-9012",
  "nationality": "Indian",
  "address": "Bandra West, Mumbai, MH"
}
```

### `GET /api/customers/{id}/bookings/`
Returns the historical stays and reservations for the specified guest.

---

## 5. Bookings, Check-In & Check-Out

### `GET /api/bookings/`
Lists reservations and stays with pagination, date, and status filters.

### `POST /api/bookings/`
Creates a room reservation or walk-in booking with overlap conflict detection.
* **Request Body**:
```json
{
  "room_id": "6abcf65febef47d1ace494d3",
  "customer_id": "6abcfad93e232a3c902992f8",
  "check_in": "2026-11-01T12:00:00Z",
  "check_out": "2026-11-03T11:00:00Z",
  "guests": 2,
  "room_rate": 2500.0,
  "amount_paid": 2500.0,
  "payment_mode": "UPI"
}
```

### `POST /api/check-in/`
Performs check-in workflow. Transitions room status from `RESERVED` or `AVAILABLE` to `OCCUPIED`.
* **Request Body**:
```json
{
  "booking_id": "6abcfb4c3e232a3c9029930b",
  "amount": 0.0
}
```

### `POST /api/check-out/`
Performs checkout workflow with billing settlement. Transitions room status from `OCCUPIED` to `CLEANING`.
* **Request Body**:
```json
{
  "booking_id": "6abcfb4c3e232a3c9029930b",
  "amount": 2500.0,
  "payment_mode": "CASH"
}
```

### `POST /api/bookings/{id}/cancel/`
Cancels booking and marks associated room as `AVAILABLE`.

---

## 6. Payments & Ledger

### `GET /api/payments/`
Lists all financial receipts and ledger collections.

### `POST /api/payments/`
Records payment toward booking and updates outstanding balance.
* **Validation**: Rejects payments exceeding outstanding balance.

---

## 7. Daily & Site Expenses

### `GET /api/expenses/`
Lists daily hotel overhead expenses.

### `POST /api/expenses/`
Records daily expense (grocery, maintenance, common). Automatically sets payment status (`PAID`, `PARTIALLY_PAID`, `UNPAID`) based on amount paid vs total.

### `GET /api/site-expenses/`
Lists contractor, renovation, and capital expenditures.

### `POST /api/site-expenses/`
Records capital expenditure with vendor reference.

### `GET /api/vendors/` & `POST /api/vendors/`
Vendor supplier registry with GSTIN and contact details.

---

## 8. Staff, Attendance & Payroll

### `GET /api/staff/` & `POST /api/staff/`
Employee roster with designation, base salary, and department.

### `GET /api/attendance/`
Returns attendance entries for specified date (`?date=YYYY-MM-DD`).

### `POST /api/attendance/`
Marks staff attendance (`PRESENT`, `ABSENT`, `LEAVE`, `HALF_DAY`).

### `POST /api/payroll/process/`
Server-side computation of pro-rated monthly compensation derived from attendance logs, overtime, deductions, and bonuses.
* **Restricted**: Prohibited for Receptionists (enforces 403 Forbidden).

### `POST /api/payroll/{id}/pay/`
Marks staff payroll voucher as paid with payment mode audit trail.

---

## 9. Executive Dashboard & Telemetry

### `GET /api/dashboard/overview/`
Consolidated operational and financial snapshot:
* Room telemetry (total, occupied, available, reserved, cleaning, maintenance)
* Occupancy percentage
* Today's check-ins and check-outs
* Revenue figures (today, this week, this month)
* Expense figures (today, this week, this month, pending)
* Staff attendance stats (total, present, absent, on leave)

### `GET /api/dashboard/revenue-trend/`
Daily revenue and expense trends for Recharts area/line charts.

### `GET /api/dashboard/recent-activity/`
Real-time activity audit feed (check-ins, payments, expenses).

---

## 10. Reports & Exports

### `GET /api/reports/summary/`
Multi-dimensional financial audit statement for specified `start_date` and `end_date`.

### `GET /api/reports/export/excel/?module={bookings|payments|expenses|site-expenses|staff}`
Generates formatted Excel workbook (`.xlsx`) via openpyxl.

### `GET /api/reports/export/pdf/?module={bookings|payments|expenses|site-expenses|staff}`
Generates formal printable PDF report (`.pdf`) via ReportLab.

---

## 11. Notifications & Audit Logs

### `GET /api/notifications/`
Unread alert notifications for operations.

### `POST /api/notifications/read-all/`
Marks all alerts as read.

### `GET /api/audit/`
Immutable system audit logs with actor metadata and timestamp.
