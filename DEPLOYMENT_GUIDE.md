# GoldenSwan Hotel — 24/7 Free Cloud Deployment Guide
**Zero Localhost Dependency • 100% Free Tier • Render.com + MongoDB Atlas**

This guide shows you how to host GoldenSwan on free, production-grade cloud servers so you can access it anytime from your phone, laptop, or tablet **without keeping your local computer turned on**.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │                 USER DEVICE                  │
                      │     (iPhone, Android Phone, Laptop, Tablet)  │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTPS
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │              RENDER.COM (FREE)               │
                      │       https://goldenswan.onrender.com        │
                      │                                              │
                      │  ┌────────────────────┐ ┌──────────────────┐ │
                      │  │ React 19 Frontend  │ │ Django REST API  │ │
                      │  │  (Vite + Tailwind) │ │   (Gunicorn +    │ │
                      │  │   SPA Interface    │ │   WhiteNoise)    │ │
                      │  └────────────────────┘ └────────┬─────────┘ │
                      └──────────────────────────────────┼───────────┘
                                                         │ TLS SRV
                                                         ▼
                      ┌──────────────────────────────────────────────┐
                      │          MONGODB ATLAS CLOUD (FREE)          │
                      │         Database: goldenswan_hotel           │
                      │        (Users, Rooms, Bookings, Audit)       │
                      └──────────────────────────────────────────────┘
```

---

## Step 1: Create Free MongoDB Atlas Cloud Database (3 Minutes)

1. Go to **[mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)** and sign up for a free account.
2. Under "Deploy a database", choose **M0 (FREE Shared Cluster)** — Free forever, $0/month.
3. Choose your closest cloud provider region (e.g. AWS / GCP in Mumbai, Singapore, or Frankfurt).
4. **Database Access (Create Admin User)**:
   - Username: `goldenswan_admin`
   - Password: Choose a secure password (e.g. `GoldenSwan@2026!`). Save this password.
5. **Network Access (IP Whitelist)**:
   - Click **Add IP Address** $\rightarrow$ select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *(This allows your Render cloud service to securely connect over TLS).*
6. **Get Connection String**:
   - Go to your Cluster $\rightarrow$ Click **Connect** $\rightarrow$ Select **Drivers (Python)**.
   - Copy the connection URI. It will look like:
     ```
     mongodb+srv://goldenswan_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
   - Replace `<password>` with your actual password.

---

## Step 2: Seed Cloud Database Automatically (1 Command)

From your Windows laptop, run our sync script to test the cloud connection, create all database indexes, and seed default hotel staff accounts:

```powershell
cd C:\Users\rokhi\Downloads\goldenswan
.venv\Scripts\python.exe scripts\sync_to_atlas.py "YOUR_MONGODB_ATLAS_CONNECTION_STRING"
```

Once you see `[SUCCESS] SuperAdmin and default staff accounts seeded on Atlas`, your cloud database is 100% ready!

---

## Step 3: Push Repository to GitHub

1. Open **[github.com/new](https://github.com/new)** and create a new repository (name it `goldenswan`, can be Private or Public).
2. Push your project from your laptop:

```powershell
cd C:\Users\rokhi\Downloads\goldenswan
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/goldenswan.git
git push -u origin main
```

---

## Step 4: Deploy on Render.com (100% Free Forever)

1. Sign up / Log in to **[render.com](https://render.com)** using your GitHub account.
2. Click the blue **New +** button in the top right $\rightarrow$ Select **Blueprint** (or **Web Service**).
   - If using **Blueprint**: Select your `goldenswan` repository. Render automatically detects [`render.yaml`](file:///C:/Users/rokhi/Downloads/goldenswan/render.yaml) and configures everything.
   - If using **Web Service** manually:
     - **Name**: `goldenswan-hotel`
     - **Region**: Singapore, Frankfurt, or Oregon
     - **Branch**: `main`
     - **Runtime**: `Python`
     - **Build Command**: `./build.sh`
     - **Start Command**: `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
     - **Plan**: `Free`
3. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `MONGO_URI` | `mongodb+srv://goldenswan_admin:YourPassword@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority` |
   | `MONGO_DB_NAME` | `goldenswan_hotel` |
   | `DJANGO_DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `*` |
   | `PYTHON_VERSION` | `3.11.9` |
   | `NODE_VERSION` | `20.11.0` |
   | `HOTEL_TIMEZONE` | `Asia/Kolkata` |
   | `DJANGO_SECRET_KEY` | *(Click "Generate" or type a random string)* |
4. Click **Apply** or **Create Web Service**.

---

## Step 5: Access Your Hotel Software Anytime, Anywhere

Within 2 to 3 minutes, Render will build the frontend, configure Django, and output your live production URL:

👉 **`https://goldenswan-hotel.onrender.com`**

You can now:
- Shut down your laptop completely.
- Bookmark the link on your Android phone or iPhone.
- Log in with the pre-configured credentials:
  - **Email**: `admin@goldenswan.com`
  - **Password**: `Admin@12345`
- Manage rooms, check in guests, record payments, and view real-time analytics 24 hours a day, 7 days a week, from any device in the world.
