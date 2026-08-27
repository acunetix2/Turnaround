from typing import List, Annotated
from fastapi import Depends, HTTPException, status
from app.db.models.user import UserRole, User
from app.deps import get_current_user


class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: Annotated[User, Depends(get_current_user)]) -> bool:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Role '{user.role.value}' lacks permission for this action. Allowed: {[r.value for r in self.allowed_roles]}",
                    }
                },
            )
        return True


def require_role(*roles: UserRole) -> RoleChecker:
    """Factory dependency for RBAC route protection."""
    return RoleChecker(list(roles))
