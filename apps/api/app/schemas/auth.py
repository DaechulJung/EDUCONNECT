"""auth request and response models."""

from pydantic import BaseModel, Field

from app.core.vocab import Role


class LoginRequest(BaseModel):
    login_id: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)


class Me(BaseModel):
    account_id: str
    login_id: str
    role: Role
    institution_id: str | None
