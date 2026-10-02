# GoldenSwan Hotel — MongoDB Database Architecture

## 1. Overview
GoldenSwan Hotel Management Software stores all business entities exclusively in MongoDB under the database `goldenswan_hotel`.
Data access is managed through **PyMongo** repositories with atomic operations, indexed queries, and aggregation pipelines.

Django's relational ORM is strictly isolated to a local minimal SQLite file for internal Django machinery, ensuring zero ORM impedance mismatches.

---

## 2. Collections & Document Schemas

### `users`
System accounts and role-based permissions.
```json
{
  "_id": ObjectId("..."),
  "name": "GoldenSwan Admin",
  "email": "admin@goldenswan.com",
  "password_hash": "pbkdf2_sha256$...",
  "role": "SUPER_ADMIN",
  "phone": "+91 9876543210",
  "permissions": ["all"],
  "active": true,
  "created_at": ISODate("2026-09-30T11:45:35.313Z"),
  "updated_at": ISODate("2026-09-30T11:45:35.313Z")
}
```

### `rooms`
Physical room inventory and telemetry state.
```json
{
  "_id": ObjectId("..."),
  "room_number": "101",
  "floor": 1,
  "room_type_id": ObjectId("..."),
  "price": 2200.0,
  "capacity": 1,
  "status": "AVAILABLE", // AVAILABLE | RESERVED | OCCUPIED | CLEANING | MAINTENANCE
  "description": "Ground floor room with garden access.",
  "amenities": ["Wi-Fi", "Air Conditioning", "Work Desk"],
  "active": true,
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

### `room_types`
Catalog of room categories and standard tariffs.
```json
{
  "_id": ObjectId("..."),
  "name": "Standard Deluxe",
  "description": "Spacious guest room with premium bedding and workstation",
  "base_price": 2800.0,
  "capacity": 2,
  "created_at": ISODate("...")
}
```

### `customers`
Guest profiles and verification details.
```json
{
  "_id": ObjectId("..."),
  "name": "Rohan Sharma",
  "phone": "+91 9876543210",
  "email": "rohan@example.com",
  "address": "Bandra West, Mumbai, MH",
  "id_proof_type": "AADHAAR",
  "id_proof_number": "1234-5678-9012",
  "nationality": "Indian",
  "notes": "Prefers quiet room away from elevator",
  "created_at": ISODate("...")
}
```

### `bookings`
Guest reservations, stay dates, and financial ledger.
```json
{
  "_id": ObjectId("..."),
  "booking_id": "GS-2026-000001",
  "customer_id": ObjectId("..."),
  "customer_name": "Rohan Sharma",
  "customer_phone": "+91 9876543210",
  "room_id": ObjectId("..."),
  "room_number": "101",
  "check_in": ISODate("2026-11-01T12:00:00Z"),
  "check_out": ISODate("2026-11-03T11:00:00Z"),
  "guests": 2,
  "room_rate": 2500.0,
  "nights": 2,
  "additional_charges": 0.0,
  "discount": 0.0,
  "tax_amount": 0.0,
  "total_amount": 5000.0,
  "amount_paid": 2500.0,
  "balance_amount": 2500.0,
  "payment_status": "PARTIALLY_PAID", // PAID | PARTIALLY_PAID | PENDING
  "booking_status": "RESERVED", // RESERVED | CHECKED_IN | CHECKED_OUT | CANCELLED | NO_SHOW
  "notes": "Advance via UPI",
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

### `payments`
Immutable receipt collection for transactions.
```json
{
  "_id": ObjectId("..."),
  "payment_id": "PAY-2026-000001",
  "booking_id": ObjectId("..."),
  "booking_reference": "GS-2026-000001",
  "customer_name": "Rohan Sharma",
  "customer_phone": "+91 9876543210",
  "amount": 2500.0,
  "payment_mode": "UPI", // UPI | CREDIT_CARD | DEBIT_CARD | CASH | BANK_TRANSFER | OTHER
  "reference_number": "UPI-987654321",
  "payment_date": ISODate("..."),
  "created_at": ISODate("...")
}
```

### `expenses`
Daily hotel operational overhead.
```json
{
  "_id": ObjectId("..."),
  "expense_id": "EXP-2026-000001",
  "date": "2026-09-30",
  "category": "Grocery",
  "description": "Vegetables, dairy, and bakery items for breakfast",
  "total_amount": 4850.0,
  "amount_paid": 4850.0,
  "balance": 0.0,
  "payment_status": "PAID",
  "payment_mode": "CASH",
  "remarks": "Bill #8812",
  "created_at": ISODate("...")
}
```

### `site_expenses`
Capital expenditures, contractors, and renovation bills.
```json
{
  "_id": ObjectId("..."),
  "expense_id": "SITE-2026-000001",
  "date": "2026-09-28",
  "category": "Capital Expenditure",
  "vendor": "Apex Electricals",
  "description": "Replacement of 3-phase commercial water pumps",
  "total_amount": 45000.0,
  "amount_paid": 30000.0,
  "balance": 15000.0,
  "payment_status": "PARTIALLY_PAID",
  "payment_mode": "BANK_TRANSFER",
  "remarks": "Balance due after installation testing",
  "created_at": ISODate("...")
}
```

### `vendors`
Suppliers, contractors, and merchants.
```json
{
  "_id": ObjectId("..."),
  "name": "Metro Food Services Pvt Ltd",
  "contact_person": "Sunil Sharma",
  "phone": "+91 9876543210",
  "email": "accounts@metrofood.com",
  "address": "Mapusa Wholesale Market, Goa",
  "gst_number": "30AAACM1234F1Z9",
  "notes": "15-day payment terms",
  "created_at": ISODate("...")
}
```

### `staff`
Hotel employee roster and base salaries.
```json
{
  "_id": ObjectId("..."),
  "staff_id": "EMP-001",
  "name": "Anand Prakash",
  "phone": "+91 9876543211",
  "email": "anand@goldenswan.com",
  "position": "Front Office Manager",
  "department": "Front Desk",
  "joining_date": "2024-03-01",
  "salary": 38000.0,
  "employment_status": "ACTIVE",
  "created_at": ISODate("...")
}
```

### `attendance`
Daily duty attendance clock-in records.
```json
{
  "_id": ObjectId("..."),
  "staff_id": ObjectId("..."),
  "date": "2026-09-30",
  "status": "PRESENT", // PRESENT | ABSENT | LEAVE | HALF_DAY
  "check_in_time": "09:00",
  "check_out_time": "18:00",
  "created_at": ISODate("...")
}
```

### `payroll`
Attendance-derived monthly compensation ledger.
```json
{
  "_id": ObjectId("..."),
  "staff_id": ObjectId("..."),
  "staff_name": "Anand Prakash",
  "staff_id_code": "EMP-001",
  "department": "Front Desk",
  "position": "Front Office Manager",
  "month": 9,
  "year": 2026,
  "base_salary": 38000.0,
  "present_days": 26,
  "absent_days": 0,
  "leave_days": 4,
  "half_days": 0,
  "overtime_hours": 8,
  "overtime_amount": 1900.0,
  "salary_deduction": 0.0,
  "bonus": 2000.0,
  "final_payable_salary": 41900.0,
  "payment_status": "PAID",
  "payment_date": ISODate("..."),
  "payment_mode": "BANK_TRANSFER",
  "created_at": ISODate("...")
}
```

### `audit_logs`
Security compliance log.
```json
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "username": "GoldenSwan Admin",
  "user_email": "admin@goldenswan.com",
  "action": "ROOM_CHECK_IN",
  "module": "bookings",
  "record_id": "GS-2026-000001",
  "details": { "room_number": "101", "guest": "Rohan Sharma" },
  "timestamp": ISODate("...")
}
```

---

## 3. Database Indexes

Created via `python manage.py setup_mongodb`:

| Collection | Key Fields | Type | Purpose |
|------------|------------|------|---------|
| `users` | `email` | Unique | Fast credential lookup & unique login |
| `rooms` | `room_number` | Unique | Room conflict prevention |
| `rooms` | `floor`, `status` | Compound | Fast floor & status filtering |
| `bookings` | `booking_id` | Unique | Public booking reference lookup |
| `bookings` | `room_id`, `check_in`, `check_out` | Compound | Double-booking prevention index |
| `customers` | `phone` | Non-unique | Quick guest identification at front desk |
| `payments` | `payment_id` | Unique | Receipt lookup |
| `payments` | `booking_id` | Non-unique | Fast payment ledger aggregation |
| `expenses` | `date`, `category` | Compound | Financial range and category summaries |
| `staff` | `staff_id` | Unique | Employee code indexing |
| `attendance` | `staff_id`, `date` | Unique Compound | Single attendance record per staff per day |
| `payroll` | `staff_id`, `year`, `month` | Unique Compound | Idempotent monthly payroll processing |
| `audit_logs` | `timestamp` | Descending | Reverse-chronological audit timeline |

---

## 4. Aggregation Pipelines

### Dashboard Financial Aggregation
Calculates live revenue, expenses, and occupancy:
```python
db.bookings.aggregate([
    {"$match": {"booking_status": {"$in": ["CHECKED_IN", "CHECKED_OUT", "RESERVED"]}}},
    {"$group": {"_id": None, "total_revenue": {"$sum": "$amount_paid"}}}
])
```

### Date Overlap Booking Conflict Query
```python
db.bookings.find_one({
    "room_id": ObjectId(room_id),
    "booking_status": {"$in": ["RESERVED", "CHECKED_IN"]},
    "$or": [
        {"check_in": {"$lt": check_out_dt, "$gte": check_in_dt}},
        {"check_out": {"$gt": check_in_dt, "$lte": check_out_dt}},
        {"check_in": {"$lte": check_in_dt}, "check_out": {"$gte": check_out_dt}}
    ]
})
```
