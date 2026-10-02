# GoldenSwan Hotel Management Software

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.2-green.svg)](https://djangoproject.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-PyMongo-brightgreen.svg)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com)

A production-grade, full-stack **Hotel Management Software** built specifically for **GoldenSwan Hotel**.

---

## 1. Architectural Highlights

```
React.js (Vite + Tailwind CSS + Framer Motion + Recharts)
   │
   ▼ HTTP / JWT Bearer
Django REST Framework (Validation, RBAC, Authentication, Audit)
   │
   ▼ Service Layer
Domain Services (Booking, Payment, Expense, Payroll, Reports)
   │
   ▼ Repository Layer
PyMongo Data Access Layer (Atomic queries, Aggregations, Indexes)
   │
   ▼
MongoDB (Database: goldenswan_hotel)
```

* **No Pseudo-ORM Hack**: Django ORM is decoupled from MongoDB. Data access strictly uses native **PyMongo** through repository and service layers.
* **Minimal Relational Isolation**: Django's internal state uses a minimal local SQLite database, eliminating compatibility regressions.
* **Financial Integrity**: Balances and settlements calculated with Decimal precision (`total = amount_paid + balance_amount`), preventing floating-point rounding errors.
* **Double-Booking Prevention**: Mathematical date-overlap query prevents duplicate reservations on overlapping date ranges.
* **True File Exports**: Real Excel workbooks generated via `openpyxl` and genuine vector PDFs via `reportlab`.

---

## 2. Technology Stack

* **Backend**: Python 3.11+, Django 5.2, Django REST Framework 3.18, PyMongo 4.18, PyJWT 2.15, openpyxl, reportlab, django-cors-headers.
* **Database**: MongoDB 7.0+ / 8.0+ / 9.0+ (`goldenswan_hotel`).
* **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons, Axios.

---

## 3. Pre-Configured Development Credentials

Seed data includes accounts for all hotel roles (all passwords configured with secure PBKDF2 hashing):

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| **Super Admin** | `admin@goldenswan.com` | `Admin@12345` | Complete system control |
| **Receptionist** | `reception@goldenswan.com` | `Reception@12345` | Front desk, rooms, check-in/out, guests |
| **Accountant** | `accounts@goldenswan.com` | `Accounts@12345` | Payments, expenses, payroll, reports |
| **Hotel Manager** | `manager@goldenswan.com` | `Manager@12345` | Operations, staff, bookings, analytics |

---

## 4. Quick Start & Installation

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* MongoDB Server (local daemon or MongoDB Atlas connection URI)

### Step 1: Clone and Configure Environment

#### Backend Environment (`backend/.env`):
```env
DEBUG=True
SECRET_KEY=goldenswan-secret-production-key-2026-secure-random
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MONGO_URI=mongodb://127.0.0.1:27017/
MONGO_DB_NAME=goldenswan_hotel
JWT_ACCESS_TOKEN_LIFETIME=86400
JWT_REFRESH_TOKEN_LIFETIME=604800
```

#### Frontend Environment (`frontend/.env`):
```env
VITE_API_URL=http://localhost:8000/api
```

### Step 2: Set Up Backend

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py check_mongodb
python manage.py setup_mongodb
python manage.py seed_data
```

### Step 3: Set Up Frontend

```bash
cd ../frontend
npm install
npm run build
```

---

## 5. Running the Application

### 1. Start MongoDB (if running locally)
```powershell
# Windows PowerShell helper script:
.\scripts\start_mongodb.ps1
# Or standard daemon:
mongod --dbpath "./mongodb_data" --bind_ip 127.0.0.1 --port 27017
```

### 2. Start Django Backend
```bash
cd backend
.venv\Scripts\activate
python manage.py runserver 127.0.0.1:8000
```

### 3. Start React Frontend
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://localhost:5173` in your browser.

---

## 6. Testing & Validation

### Run Django Automated Unit Tests
```bash
python backend/manage.py test tests
```
*Expected output: `Ran 6 tests in 0.286s OK`*

### Run Critical Business Lifecycle Suite
```bash
python backend/tests/test_lifecycle.py
```
Validates the 9 critical business rules from Section 78:
* Room available $\rightarrow$ booking $\rightarrow$ room becomes `RESERVED`
* Reserved booking $\rightarrow$ check-in $\rightarrow$ room becomes `OCCUPIED`
* Checkout $\rightarrow$ room becomes `CLEANING`
* Cleaning completed $\rightarrow$ room becomes `AVAILABLE`
* Financial formula: ₹10,000 total + ₹5,000 paid $\rightarrow$ balance ₹5,000 $\rightarrow$ `PARTIALLY_PAID`
* Financial formula: ₹10,000 total + ₹10,000 paid $\rightarrow$ balance ₹0 $\rightarrow$ `PAID`
* Financial formula: ₹10,000 total + ₹0 paid $\rightarrow$ balance ₹10,000 $\rightarrow$ `PENDING`
* Double-booking on occupied room $\rightarrow$ Rejected
* Overpayment greater than pending total $\rightarrow$ Rejected
* Receptionist role accessing payroll modification $\rightarrow$ 403 Forbidden

---

## 7. Implemented Modules

1. **Main Executive Dashboard**: KPI cards, occupancy meter, revenue vs expense area chart, room donut, live audit activity feed.
2. **Room Management**: 30 seeded rooms, floor filters (Floor 1, 2, 3), status pills, room status modifier modal, create room modal.
3. **Guest Directory (Customers)**: Guest records, Aadhaar/Passport identification, stay history drawer.
4. **Reservations & Bookings**: Booking table, check-in and checkout triggers, calendar conflict detection, cancellation.
5. **Dedicated Check-In**: Multi-step flow, advance deposit recording, immediate status update to `OCCUPIED`.
6. **Dedicated Check-Out**: Billing breakdown, stay charges, balance settlement, immediate status update to `CLEANING`.
7. **Payment Ledger**: Receipt collection, POS / UPI / Cash tracking, printable official receipt modal.
8. **Daily Operating Expenses**: Groceries, housekeeping, maintenance, custom categories, real-time balance computation.
9. **Site & Capital Outlay**: Contractor bills, renovations, HVAC repairs, vendor payment tracking.
10. **Vendor Registry**: Supplier contacts, GSTIN numbers, credit terms.
11. **Staff Directory**: Employee records, designations, departments, base salary contracts.
12. **Daily Attendance Roster**: One-click status buttons (`Present`, `Absent`, `Leave`, `Half Day`), clock-in/out hours.
13. **Payroll Engine**: Server-calculated compensation based on attendance logs, overtime, deductions, bonus, printable payslips.
14. **Executive Reports**: Multi-period summary statements, Recharts comparison, Excel (`.xlsx`) and PDF downloads.
15. **System Audit Logs**: Immutable record of all logins, reservations, check-ins, checkouts, and payments.
16. **Settings & Hotel Profile**: Property branding, GSTIN, standard check-in/out hours, room types, system user creation, password changes.

---

## 8. Production Deployment Guide (Ubuntu / Linux VPS)

### Architecture
* **Nginx**: Reverse proxy serving static frontend build (`/`) and proxying `/api/` to Gunicorn.
* **Gunicorn**: WSGI HTTP server running Django.
* **MongoDB**: Protected local instance or MongoDB Atlas.
* **Systemd**: Process supervision for Gunicorn and MongoDB.

### Example Nginx Configuration (`/etc/nginx/sites-available/goldenswan`):
```nginx
server {
    listen 80;
    server_name your-hotel-domain.com;

    # Frontend SPA
    location / {
        root /var/www/goldenswan/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Production Build Command
```bash
cd frontend
npm run build
# Dist output generated at frontend/dist
```

### Production Gunicorn Launch
```bash
cd backend
gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 4 --timeout 60
```

---

## 9. Documentation Directory

* [API Reference](docs/API.md) — Comprehensive documentation of all 52+ REST endpoints.
* [Database Guide](docs/DATABASE.md) — Schemas, indexes, document structures, and aggregation queries.
* [User Guide](docs/USER_GUIDE.md) — Operational manual and Standard Operating Procedures.
