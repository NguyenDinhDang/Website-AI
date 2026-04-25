"""Auth request/response schemas"""

from pydantic import BaseModel, EmailStr, field_validator
import re


class RegisterRequest(BaseModel):
    email:     EmailStr
    username:  str
    password:  str
    full_name: str = ""

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]{3,30}$", v):
            raise ValueError("Username must be 3–30 alphanumeric chars or underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class UserResponse(BaseModel):
    id:        int
    email:     str
    username:  str
    full_name: str
    is_active: bool

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str
