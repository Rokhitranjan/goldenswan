"""
URL Configuration for GoldenSwan Hotel.
Exposes RESTful APIs for React frontend.
"""

from django.urls import path
from apps.views import (
    HealthCheckView,
    LoginView,
    CurrentUserView,
    ChangePasswordView,
    UsersView,
    UserDetailView,
    RoomTypesView,
    RoomsView,
    RoomDetailView,
    RoomStatusUpdateView,
    RoomStatusCountsView,
    CustomersView,
    CustomerDetailView,
    CustomerBookingsView,
    BookingsView,
    BookingDetailView,
    BookingCancelView,
    CheckInView,
    CheckOutView,
    PaymentsView,
    BookingPaymentsView,
    ExpenseCategoriesView,
    ExpensesView,
    ExpenseDetailView,
    ExpenseCategorySummaryView,
    VendorsView,
    SiteExpensesView,
    SiteExpenseStatsView,
    StaffView,
    AttendanceView,
    AttendanceStatsView,
    PayrollView,
    ProcessPayrollView,
    MarkPayrollPaidView,
    DashboardOverviewView,
    DashboardRevenueTrendView,
    DashboardRecentActivityView,
    ReportsSummaryView,
    ReportExcelExportView,
    ReportPdfExportView,
    NotificationsView,
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    AuditLogsView,
)

urlpatterns = [
    # Health check
    path("api/health/", HealthCheckView.as_view(), name="health_check"),
    # Authentication
    path("api/auth/login/", LoginView.as_view(), name="auth_login"),
    path("api/auth/me/", CurrentUserView.as_view(), name="auth_me"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="auth_change_password"),
    # Users
    path("api/users/", UsersView.as_view(), name="users_list_create"),
    path("api/users/<str:user_id>/", UserDetailView.as_view(), name="user_detail"),
    # Rooms & Room Types
    path("api/room-types/", RoomTypesView.as_view(), name="room_types"),
    path("api/rooms/", RoomsView.as_view(), name="rooms_list_create"),
    path("api/rooms/status-counts/", RoomStatusCountsView.as_view(), name="room_status_counts"),
    path("api/rooms/<str:room_id>/", RoomDetailView.as_view(), name="room_detail"),
    path("api/rooms/<str:room_id>/status/", RoomStatusUpdateView.as_view(), name="room_status_update"),
    # Customers
    path("api/customers/", CustomersView.as_view(), name="customers_list_create"),
    path("api/customers/<str:customer_id>/", CustomerDetailView.as_view(), name="customer_detail"),
    path("api/customers/<str:customer_id>/bookings/", CustomerBookingsView.as_view(), name="customer_bookings"),
    # Bookings, Check-In, Check-Out
    path("api/bookings/", BookingsView.as_view(), name="bookings_list_create"),
    path("api/bookings/<str:booking_id>/", BookingDetailView.as_view(), name="booking_detail"),
    path("api/bookings/<str:booking_id>/cancel/", BookingCancelView.as_view(), name="booking_cancel"),
    path("api/check-in/", CheckInView.as_view(), name="check_in"),
    path("api/check-out/", CheckOutView.as_view(), name="check_out"),
    # Payments
    path("api/payments/", PaymentsView.as_view(), name="payments_list_create"),
    path("api/payments/by-booking/<str:booking_id>/", BookingPaymentsView.as_view(), name="booking_payments"),
    # Expenses & Categories
    path("api/expense-categories/", ExpenseCategoriesView.as_view(), name="expense_categories"),
    path("api/expenses/", ExpensesView.as_view(), name="expenses_list_create"),
    path("api/expenses/categories-summary/", ExpenseCategorySummaryView.as_view(), name="expenses_category_summary"),
    path("api/expenses/<str:expense_id>/", ExpenseDetailView.as_view(), name="expense_detail"),
    # Site Expenses & Vendors
    path("api/vendors/", VendorsView.as_view(), name="vendors_list_create"),
    path("api/site-expenses/", SiteExpensesView.as_view(), name="site_expenses_list_create"),
    path("api/site-expenses/stats/", SiteExpenseStatsView.as_view(), name="site_expenses_stats"),
    # Staff, Attendance, Payroll
    path("api/staff/", StaffView.as_view(), name="staff_list_create"),
    path("api/attendance/", AttendanceView.as_view(), name="attendance_list_create"),
    path("api/attendance/stats/", AttendanceStatsView.as_view(), name="attendance_stats"),
    path("api/payroll/", PayrollView.as_view(), name="payroll_list"),
    path("api/payroll/process/", ProcessPayrollView.as_view(), name="payroll_process"),
    path("api/payroll/<str:payroll_id>/pay/", MarkPayrollPaidView.as_view(), name="payroll_pay"),
    # Dashboard
    path("api/dashboard/overview/", DashboardOverviewView.as_view(), name="dashboard_overview"),
    path("api/dashboard/revenue-trend/", DashboardRevenueTrendView.as_view(), name="dashboard_revenue_trend"),
    path("api/dashboard/recent-activity/", DashboardRecentActivityView.as_view(), name="dashboard_recent_activity"),
    # Reports
    path("api/reports/summary/", ReportsSummaryView.as_view(), name="reports_summary"),
    path("api/reports/export/excel/", ReportExcelExportView.as_view(), name="reports_export_excel"),
    path("api/reports/export/pdf/", ReportPdfExportView.as_view(), name="reports_export_pdf"),
    # Notifications & Audit
    path("api/notifications/", NotificationsView.as_view(), name="notifications_list"),
    path("api/notifications/read-all/", MarkAllNotificationsReadView.as_view(), name="notifications_read_all"),
    path("api/notifications/<str:notif_id>/read/", MarkNotificationReadView.as_view(), name="notification_mark_read"),
    path("api/audit/", AuditLogsView.as_view(), name="audit_logs"),
]

# SPA Frontend fallback for non-API routes
from django.conf import settings
from django.http import HttpResponse, FileResponse
from django.urls import re_path

def spa_view(request, path=""):
    dist_dir = getattr(settings, "FRONTEND_DIST_DIR", None)
    if dist_dir and dist_dir.exists():
        target_path = dist_dir / path.lstrip("/")
        if path and target_path.is_file():
            return FileResponse(open(target_path, "rb"))
        index_file = dist_dir / "index.html"
        if index_file.is_file():
            return FileResponse(open(index_file, "rb"), content_type="text/html")
    return HttpResponse(
        "<h1>GoldenSwan Hotel Management API</h1><p>Status: Ready. Run 'npm run build' in frontend directory to serve UI.</p>",
        content_type="text/html",
        status=200,
    )

urlpatterns += [
    re_path(r"^(?P<path>.*)$", spa_view, name="spa_catchall"),
]

