from fastapi import Request
from slowapi import Limiter
from jose import jwt, JWTError
from app.config import settings


def get_user_or_ip(request: Request) -> str:
    """Rate-limit by authenticated user ID when possible, otherwise by IP address."""
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except JWTError:
            pass
    return f"ip:{request.client.host}"


limiter = Limiter(key_func=get_user_or_ip, default_limits=["60/minute"])