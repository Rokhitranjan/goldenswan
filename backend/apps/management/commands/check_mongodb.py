"""
Management command to test MongoDB connectivity and ping.
Usage:
    python manage.py check_mongodb
"""

import sys
from django.core.management.base import BaseCommand
from config.mongodb import check_connection, MONGO_DB_NAME


class Command(BaseCommand):
    help = "Checks connection to MongoDB and performs ping test."

    def handle(self, *args, **options):
        self.stdout.write("Testing MongoDB connectivity...")
        success, message = check_connection()

        if success:
            self.stdout.write(self.style.SUCCESS("MongoDB connection successful."))
            self.stdout.write(self.style.SUCCESS(f"Database: {MONGO_DB_NAME}"))
            sys.exit(0)
        else:
            self.stderr.write(self.style.ERROR("MongoDB connection failed."))
            self.stderr.write(self.style.ERROR(f"Reason: {message}"))
            self.stderr.write(
                self.style.WARNING(
                    "Please verify that MongoDB server is running (e.g. run scripts/start_mongodb.ps1 or start Windows service)."
                )
            )
            sys.exit(1)
