"""
Django REST Framework API Views for GoldenSwan Hotel.
Implements endpoints connected through Services, Repositories, and PyMongo.
"""

from typing import Dict, Any
from datetime import datetime, timezone
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.database import check_connection
from core.repositories import (
    users_repo,
    rooms_repo,
    room_types_repo,
    customers_repo,
    bookings_repo,
    payments_repo,
    expenses_repo,
    expense_categories_repo,
    site_expenses_repo,
    vendors_repo,
    staff_repo,
    attendance_repo,
    payroll_repo,
    notifications_repo,
    audit_repo,
    dashboard_repo,
)
from core.services import (
    booking_service,
    payment_service,
    expense_service,
    payroll_service,
    report_service,
)
from core.authentication.jwt_auth import (
    hash_password,
    verify_password,
    generate_tokens,
)
from core.authentication.permissions import (
    IsAuthenticatedMongoUser,
    IsSuperAdmin,
    IsManagerOrAbove,
    CanManageFrontDesk,
    CanManageFinance,
    CanManageHR,
)
from core.serializers.mongodb import mongo_to_json, to_object_id
from apps.serializers import (
    LoginSerializer,
    ChangePasswordSerializer,
    UserCreateSerializer,
    RoomTypeSerializer,
    RoomSerializer,
    RoomStatusUpdateSerializer,
    CustomerSerializer,
    BookingCreateSerializer,
    CheckInSerializer,
    CheckOutSerializer,
    PaymentSerializer,
    ExpenseCategorySerializer,
    ExpenseSerializer,
    VendorSerializer,
    SiteExpenseSerializer,
    StaffSerializer,
    AttendanceSerializer,
    ProcessPayrollSerializer,
)


# ---------------------------------------------------------
# Health Check (Prompt 16)
# ---------------------------------------------------------
class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mongo_ok, msg = check_connection()
        if mongo_ok:
            return Response(
                {
                    "status": "ok",
                    "django": "ok",
                    "mongodb": "ok",
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "status": "error",
                    "django": "ok",
                    "mongodb": "unavailable",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


# ---------------------------------------------------------
# Authentication Views (Prompt 18, 19)
# ---------------------------------------------------------
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]

        user = users_repo.get_by_email(email)
        if not user or not verify_password(password, user.get("password_hash", "")):
            return Response(
                {"success": False, "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.get("active", True):
            return Response(
                {"success": False, "message": "Account has been deactivated. Please contact administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = generate_tokens(user)
        user_json = mongo_to_json(user)
        user_json.pop("password_hash", None)

        # Log login
        audit_repo.log_event(
            action="USER_LOGIN",
            module="AUTH",
            user=user_json,
            record_id=user_json.get("id"),
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    "user": user_json,
                    "tokens": tokens,
                },
            }
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        user_doc = users_repo.get_by_id(request.user.id)
        if not user_doc:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        user_json = mongo_to_json(user_doc)
        user_json.pop("password_hash", None)
        return Response({"success": True, "data": user_json})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_doc = users_repo.get_by_id(request.user.id)
        if not verify_password(serializer.validated_data["old_password"], user_doc.get("password_hash", "")):
            return Response({"success": False, "message": "Current password does not match."}, status=status.HTTP_400_BAD_REQUEST)

        new_hash = hash_password(serializer.validated_data["new_password"])
        users_repo.update_user(request.user.id, {"password_hash": new_hash})

        return Response({"success": True, "message": "Password changed successfully."})


# ---------------------------------------------------------
# Users Administration
# ---------------------------------------------------------
class UsersView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        users = users_repo.list_users()
        res = []
        for u in users:
            uj = mongo_to_json(u)
            uj.pop("password_hash", None)
            res.append(uj)
        return Response({"success": True, "data": res})

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        existing = users_repo.get_by_email(data["email"])
        if existing:
            return Response({"success": False, "message": "User with this email already exists."}, status=status.HTTP_409_CONFLICT)

        data["password_hash"] = hash_password(data.pop("password"))
        uid = users_repo.create_user(data)
        created = mongo_to_json(users_repo.get_by_id(uid))
        created.pop("password_hash", None)
        return Response({"success": True, "message": "User created.", "data": created}, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, user_id):
        user = users_repo.get_by_id(user_id)
        if not user:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        update_data = {}
        for field in ["name", "phone", "role", "active"]:
            if field in request.data:
                update_data[field] = request.data[field]

        if "password" in request.data and request.data["password"]:
            update_data["password_hash"] = hash_password(request.data["password"])

        users_repo.update_user(user_id, update_data)
        updated = mongo_to_json(users_repo.get_by_id(user_id))
        updated.pop("password_hash", None)
        return Response({"success": True, "data": updated})


# ---------------------------------------------------------
# Room Types & Rooms (Prompt 6, 48)
# ---------------------------------------------------------
class RoomTypesView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        types = room_types_repo.list_active()
        return Response({"success": True, "data": mongo_to_json(types)})

    def post(self, request):
        serializer = RoomTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tid = room_types_repo.create_room_type(serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(room_types_repo.get_by_id(tid))}, status=status.HTTP_201_CREATED)


class RoomsView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        room_status = request.query_params.get("status")
        floor = request.query_params.get("floor")
        type_id = request.query_params.get("room_type_id")
        rooms = rooms_repo.list_rooms(status=room_status, floor=floor, room_type_id=type_id)
        return Response({"success": True, "data": mongo_to_json(rooms)})

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        existing = rooms_repo.get_by_room_number(data["room_number"])
        if existing:
            return Response(
                {"success": False, "message": f"Room {data['room_number']} already exists."},
                status=status.HTTP_409_CONFLICT,
            )

        rid = rooms_repo.create_room(data)
        return Response({"success": True, "data": mongo_to_json(rooms_repo.get_by_id(rid))}, status=status.HTTP_201_CREATED)


class RoomDetailView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request, room_id):
        room = rooms_repo.get_by_id(room_id)
        if not room:
            return Response({"success": False, "message": "Room not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "data": mongo_to_json(room)})

    def patch(self, request, room_id):
        room = rooms_repo.get_by_id(room_id)
        if not room:
            return Response({"success": False, "message": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoomSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        rooms_repo.update_by_id(room_id, data)
        return Response({"success": True, "data": mongo_to_json(rooms_repo.get_by_id(room_id))})

    def delete(self, request, room_id):
        room = rooms_repo.get_by_id(room_id)
        if not room:
            return Response({"success": False, "message": "Room not found."}, status=status.HTTP_404_NOT_FOUND)
        rooms_repo.update_by_id(room_id, {"active": False, "updated_at": datetime.now(timezone.utc)})
        return Response({"success": True, "message": "Room deactivated successfully."})


class RoomStatusUpdateView(APIView):
    permission_classes = [CanManageFrontDesk]

    def patch(self, request, room_id):
        serializer = RoomStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        room = rooms_repo.get_by_id(room_id)
        if not room:
            return Response({"success": False, "message": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        rooms_repo.update_status(room_id, new_status)
        audit_repo.log_event(
            action="UPDATE_ROOM_STATUS",
            module="ROOMS",
            user=request.user.to_dict() if request.user else None,
            record_id=str(room_id),
            metadata={"room_number": room.get("room_number"), "from": room.get("status"), "to": new_status},
        )

        return Response({"success": True, "message": f"Room status updated to {new_status}.", "data": mongo_to_json(rooms_repo.get_by_id(room_id))})


class RoomStatusCountsView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        counts = rooms_repo.get_counts_by_status()
        return Response({"success": True, "data": counts})


# ---------------------------------------------------------
# Customers (Prompt 7)
# ---------------------------------------------------------
class CustomersView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request):
        q = request.query_params.get("search", "")
        customers = customers_repo.search_customers(q)
        return Response({"success": True, "data": mongo_to_json(customers)})

    def post(self, request):
        serializer = CustomerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cid = customers_repo.create_customer(serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(customers_repo.get_by_id(cid))}, status=status.HTTP_201_CREATED)


class CustomerDetailView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request, customer_id):
        customer = customers_repo.get_by_id(customer_id)
        if not customer:
            return Response({"success": False, "message": "Customer not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "data": mongo_to_json(customer)})

    def patch(self, request, customer_id):
        serializer = CustomerSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        customers_repo.update_by_id(customer_id, serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(customers_repo.get_by_id(customer_id))})


class CustomerBookingsView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request, customer_id):
        oid = to_object_id(customer_id)
        bookings = bookings_repo.find({"customer_id": oid}, sort=[("check_in", -1)])
        return Response({"success": True, "data": mongo_to_json(bookings)})


# ---------------------------------------------------------
# Bookings, Check-In, Check-Out (Prompt 8, 9, 10, 22)
# ---------------------------------------------------------
class BookingsView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request):
        b_status = request.query_params.get("status")
        p_status = request.query_params.get("payment_status")
        search = request.query_params.get("search")
        bookings = bookings_repo.list_bookings(status=b_status, payment_status=p_status, search_query=search)
        return Response({"success": True, "data": mongo_to_json(bookings)})

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = booking_service.create_booking(serializer.validated_data, user=request.user)
        return Response({"success": True, "message": "Booking created successfully.", "data": created}, status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request, booking_id):
        b = bookings_repo.get_by_id(booking_id)
        if not b:
            return Response({"success": False, "message": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        payments = payments_repo.get_by_booking(booking_id)
        res = mongo_to_json(b)
        res["payments"] = mongo_to_json(payments)
        return Response({"success": True, "data": res})


class BookingCancelView(APIView):
    permission_classes = [CanManageFrontDesk]

    def post(self, request, booking_id):
        b = bookings_repo.get_by_id(booking_id)
        if not b:
            return Response({"success": False, "message": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        # Release room if reserved
        if b.get("booking_status") in ["RESERVED", "CHECKED_IN"]:
            rooms_repo.update_status(b["room_id"], "AVAILABLE")

        bookings_repo.update_by_id(booking_id, {
            "booking_status": "CANCELLED",
            "cancellation_reason": request.data.get("reason", "Cancelled by guest"),
            "updated_at": datetime.now(timezone.utc),
        })

        audit_repo.log_event(
            action="CANCEL_BOOKING",
            module="BOOKINGS",
            user=request.user.to_dict() if request.user else None,
            record_id=str(booking_id),
            metadata={"booking_id": b.get("booking_id")},
        )

        return Response({"success": True, "message": "Booking cancelled successfully."})


class CheckInView(APIView):
    permission_classes = [CanManageFrontDesk]

    def post(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = booking_service.check_in(
            booking_id=data["booking_id"],
            payment_data={
                "amount": data.get("amount", 0),
                "payment_mode": data.get("payment_mode", "CASH"),
                "reference_number": data.get("reference_number", ""),
            },
            user=request.user,
        )
        return Response({"success": True, "message": "Check-in completed successfully.", "data": result})


class CheckOutView(APIView):
    permission_classes = [CanManageFrontDesk]

    def post(self, request):
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = booking_service.check_out(
            booking_id=data["booking_id"],
            payment_data={
                "amount": data.get("amount", 0),
                "payment_mode": data.get("payment_mode", "CASH"),
                "reference_number": data.get("reference_number", ""),
                "allow_unsettled_balance": data.get("allow_unsettled_balance", False),
            },
            user=request.user,
        )
        return Response({"success": True, "message": "Check-out completed successfully.", "data": result})


# ---------------------------------------------------------
# Payments (Prompt 11)
# ---------------------------------------------------------
class PaymentsView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request):
        payments = payments_repo.find({}, sort=[("payment_date", -1)], limit=100)
        return Response({"success": True, "data": mongo_to_json(payments)})

    def post(self, request):
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = payment_service.record_booking_payment(serializer.validated_data, user=request.user)
        return Response({"success": True, "message": "Payment recorded successfully.", "data": result}, status=status.HTTP_201_CREATED)


class BookingPaymentsView(APIView):
    permission_classes = [CanManageFrontDesk]

    def get(self, request, booking_id):
        payments = payments_repo.get_by_booking(booking_id)
        return Response({"success": True, "data": mongo_to_json(payments)})


# ---------------------------------------------------------
# Expenses (Prompt 12, 13)
# ---------------------------------------------------------
class ExpenseCategoriesView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        cats = expense_categories_repo.list_active()
        return Response({"success": True, "data": mongo_to_json(cats)})

    def post(self, request):
        serializer = ExpenseCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cid = expense_categories_repo.create_category(serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(expense_categories_repo.get_by_id(cid))}, status=status.HTTP_201_CREATED)


class ExpensesView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        cat_id = request.query_params.get("category_id")
        p_status = request.query_params.get("payment_status")
        expenses = expenses_repo.list_expenses(category_id=cat_id, payment_status=p_status)
        return Response({"success": True, "data": mongo_to_json(expenses)})

    def post(self, request):
        serializer = ExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = expense_service.create_daily_expense(serializer.validated_data, user=request.user)
        return Response({"success": True, "message": "Expense recorded.", "data": result}, status=status.HTTP_201_CREATED)


class ExpenseDetailView(APIView):
    permission_classes = [CanManageFinance]

    def delete(self, request, expense_id):
        exp = expenses_repo.get_by_id(expense_id)
        if not exp:
            return Response({"success": False, "message": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)
        expenses_repo.delete_by_id(expense_id)
        return Response({"success": True, "message": "Expense deleted."})


class ExpenseCategorySummaryView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        breakdown = expenses_repo.get_category_breakdown()
        return Response({"success": True, "data": breakdown})


# ---------------------------------------------------------
# Vendors & Site Expenses (Prompt 13)
# ---------------------------------------------------------
class VendorsView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        vendors = vendors_repo.list_vendors()
        return Response({"success": True, "data": mongo_to_json(vendors)})

    def post(self, request):
        serializer = VendorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vid = vendors_repo.create_vendor(serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(vendors_repo.get_by_id(vid))}, status=status.HTTP_201_CREATED)


class SiteExpensesView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        v_id = request.query_params.get("vendor_id")
        p_status = request.query_params.get("payment_status")
        expenses = site_expenses_repo.list_site_expenses(vendor_id=v_id, payment_status=p_status)
        return Response({"success": True, "data": mongo_to_json(expenses)})

    def post(self, request):
        serializer = SiteExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = expense_service.create_site_expense(serializer.validated_data, user=request.user)
        return Response({"success": True, "message": "Site expense recorded.", "data": result}, status=status.HTTP_201_CREATED)


class SiteExpenseStatsView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        stats = site_expenses_repo.get_stats()
        return Response({"success": True, "data": stats})


# ---------------------------------------------------------
# Staff, Attendance, Payroll (Prompt 14, 15, 16)
# ---------------------------------------------------------
class StaffView(APIView):
    permission_classes = [CanManageHR]

    def get(self, request):
        dept = request.query_params.get("department")
        search = request.query_params.get("search")
        staff = staff_repo.list_staff(department=dept, search_query=search)
        return Response({"success": True, "data": mongo_to_json(staff)})

    def post(self, request):
        serializer = StaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sid = staff_repo.create_staff(serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(staff_repo.get_by_id(sid))}, status=status.HTTP_201_CREATED)


class AttendanceView(APIView):
    permission_classes = [CanManageHR]

    def get(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        records = attendance_repo.find({"date": date_str})
        return Response({"success": True, "data": mongo_to_json(records)})

    def post(self, request):
        serializer = AttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aid = attendance_repo.mark_attendance(serializer.validated_data)
        return Response({"success": True, "data": mongo_to_json(attendance_repo.get_by_id(aid))}, status=status.HTTP_200_OK)


class AttendanceStatsView(APIView):
    permission_classes = [CanManageHR]

    def get(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        stats_data = attendance_repo.get_today_stats(date_str)
        return Response({"success": True, "data": stats_data})


class PayrollView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        records = payroll_repo.list_payroll(year=year, month=month)
        return Response({"success": True, "data": mongo_to_json(records)})


class ProcessPayrollView(APIView):
    permission_classes = [CanManageFinance]

    def post(self, request):
        serializer = ProcessPayrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = payroll_service.process_staff_payroll(
            staff_id=data["staff_id"],
            year=data["year"],
            month=data["month"],
            overtime_hours=data.get("overtime_hours", 0.0),
            bonus=data.get("bonus", 0.0),
            other_adjustment=data.get("other_adjustment", 0.0),
            remarks=data.get("remarks", ""),
            user=request.user,
        )
        return Response({"success": True, "message": "Payroll processed successfully.", "data": result})


class MarkPayrollPaidView(APIView):
    permission_classes = [CanManageFinance]

    def post(self, request, payroll_id):
        mode = request.data.get("payment_mode", "BANK_TRANSFER")
        result = payroll_service.mark_payroll_paid(payroll_id, payment_mode=mode, user=request.user)
        return Response({"success": True, "message": "Payroll marked as paid.", "data": result})


# ---------------------------------------------------------
# Main Dashboard (Prompt 17, 18, 19, 42)
# ---------------------------------------------------------
class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        overview = dashboard_repo.get_overview_data()
        return Response({"success": True, "data": overview})


class DashboardRevenueTrendView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        trend = dashboard_repo.get_revenue_trend(days=14)
        return Response({"success": True, "data": trend})


class DashboardRecentActivityView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        logs = audit_repo.list_logs(limit=15)
        return Response({"success": True, "data": mongo_to_json(logs)})


# ---------------------------------------------------------
# Reports & Exports (Prompt 30, 31, 32)
# ---------------------------------------------------------
class ReportsSummaryView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        summary = report_service.get_financial_summary()
        return Response({"success": True, "data": summary})


class ReportExcelExportView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        module = request.query_params.get("module", "bookings").lower()
        excel_stream = report_service.export_excel(module)
        response = HttpResponse(
            excel_stream.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="goldenswan_{module}_report.xlsx"'
        return response


class ReportPdfExportView(APIView):
    permission_classes = [CanManageFinance]

    def get(self, request):
        module = request.query_params.get("module", "bookings").lower()
        pdf_stream = report_service.export_pdf(module)
        response = HttpResponse(pdf_stream.read(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="goldenswan_{module}_report.pdf"'
        return response


# ---------------------------------------------------------
# Notifications & Audit Logs (Prompt 37, 38)
# ---------------------------------------------------------
class NotificationsView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def get(self, request):
        unread_only = request.query_params.get("unread") == "true"
        notifs = notifications_repo.list_notifications(unread_only=unread_only)
        unread_count = notifications_repo.count({"is_read": False})
        return Response({"success": True, "data": {"notifications": mongo_to_json(notifs), "unread_count": unread_count}})


class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def post(self, request):
        modified = notifications_repo.mark_all_as_read()
        return Response({"success": True, "message": f"{modified} notifications marked as read."})


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticatedMongoUser]

    def patch(self, request, notif_id):
        notifications_repo.mark_as_read(notif_id)
        return Response({"success": True, "message": "Notification marked as read."})


class AuditLogsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        module = request.query_params.get("module")
        logs = audit_repo.list_logs(module=module, limit=100)
        return Response({"success": True, "data": mongo_to_json(logs)})
