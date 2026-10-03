"""Supabase client + bearer-token auth for the write path. Server-side only."""

import logging
import os
from typing import Annotated, NamedTuple

from fastapi import Depends, Header, HTTPException
from supabase_auth.errors import AuthApiError

from src.api.schemas import UserRole
from supabase import Client, create_client

logger = logging.getLogger(__name__)

ROLES = {r.value for r in UserRole}


class Actor(NamedTuple):
    id: str
    role: UserRole


def supabase_client() -> Client:
    """Fresh service-role client per request, so a login session never leaks into DB calls."""
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(503, "Write path offline")
    return create_client(url, key)


def role_of(app_metadata: dict | None) -> UserRole:
    role = (app_metadata or {}).get("role")
    if role not in ROLES:
        raise HTTPException(403, "Account has no WhyQuiet role")
    return UserRole(role)


def current_user(
    sb: Annotated[Client, Depends(supabase_client)],
    authorization: Annotated[str | None, Header()] = None,
) -> Actor:
    """Extract and authenticate the user from the Authorization bearer token header."""
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "Missing bearer token")
    try:
        resp = sb.auth.get_user(token)
    except AuthApiError as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    except Exception as exc:
        logger.warning("Token verification failed: %s", exc)
        raise HTTPException(401, "Invalid or expired token") from exc
    if not resp or not resp.user:
        raise HTTPException(401, "Invalid or expired token")
    return Actor(id=resp.user.id, role=role_of(resp.user.app_metadata))
