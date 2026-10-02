"""
JWT Authentication and Password Hashing for GoldenSwan Hotel.
Uses PyJWT and Django's secure password hashers.
Does not depend on Django ORM User models.
"""

from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone, timedelta
import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from core.repositories.users_repository import users_repo
from core.serializers.mongodb import mongo_to_json


class MongoUser:
    """
    Lightweight wrapper around MongoDB user document to provide
    standard Django DRF request.user attributes.
    """

    def __init__(self, data: Dict[str, Any]):
        self._data = mongo_to_json(data)
        self.id = self._data.get("id") or str(self._data.get("_id"))
        self.email = self._data.get("email", "")
        self.name = self._data.get("name", "")
        self.role = self._data.get("role", "VIEWER")
        self.permissions = self._data.get("permissions", [])
        self.is_active = self._data.get("active", True)
        self.is_authenticated = True

    def __getitem__(self, key):
        return self._data.get(key)

    def get(self, key, default=None):
        return self._data.get(key, default)

    def to_dict(self):
        return self._data


def hash_password(raw_password: str) -> str:
    """Securely hash password using PBKDF2 with SHA256."""
    return make_password(raw_password)


def verify_password(raw_password: str, hashed_password: str) -> bool:
    """Verify raw password against stored hash."""
    return check_password(raw_password, hashed_password)


def generate_tokens(user_doc: Dict[str, Any]) -> Dict[str, str]:
    """
    Generates JWT access and refresh tokens.
    Payload contains only essential, non-sensitive claims: sub, role, name, email.
    """
    user_id = str(user_doc.get("_id") or user_doc.get("id"))
    role = user_doc.get("role", "VIEWER")
    name = user_doc.get("name", "")
    email = user_doc.get("email", "")

    now = datetime.now(timezone.utc)
    access_exp = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES)
    refresh_exp = now + timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS)

    access_payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(access_exp.timestamp()),
    }

    refresh_payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(refresh_exp.timestamp()),
    }

    access_token = jwt.encode(access_payload, settings.JWT_SECRET_KEY, algorithm="HS256")
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET_KEY, algorithm="HS256")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES * 60,
    }


class JWTAuthentication(BaseAuthentication):
    """
    DRF Authentication class that validates Authorization: Bearer <token>
    and attaches MongoUser to request.user.
    """

    def authenticate(self, request) -> Optional[Tuple[MongoUser, str]]:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None

        token = parts[1]
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Authentication token has expired. Please log in again.")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid authentication token.")

        if payload.get("type") != "access":
            raise AuthenticationFailed("Token is not an access token.")

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationFailed("Malformed authentication token.")

        user_doc = users_repo.get_by_id(user_id)
        if not user_doc and payload.get("email"):
            user_doc = users_repo.get_by_email(payload.get("email"))
        if not user_doc:
            raise AuthenticationFailed("User not found or account removed.")

        if not user_doc.get("active", True):
            raise AuthenticationFailed("User account is inactive.")

        return (MongoUser(user_doc), token)
