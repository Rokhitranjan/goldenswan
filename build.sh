#!/usr/bin/env bash
# Render Build Script for GoldenSwan Hotel Management Software
# Exit immediately if a command returns a non-zero status
set -o errexit

echo "=========================================="
echo "  GoldenSwan Hotel Production Build"
echo "=========================================="

echo ">>> 1. Building React 19 Frontend..."
cd frontend
npm install --include=dev
npm run build
cd ..

echo ">>> 2. Installing Python Backend Dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt

echo ">>> 3. Running Django Migrations..."
python manage.py migrate --noinput

echo ">>> 4. Collecting Static Files..."
python manage.py collectstatic --noinput

echo "=========================================="
echo "  Build Completed Successfully!"
echo "=========================================="
