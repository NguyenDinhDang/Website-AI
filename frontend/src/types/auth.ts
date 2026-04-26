export interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  email: string
  username: string
  full_name: string
  is_active: boolean
}

// Lỗi trả về từ FastAPI
export interface ApiError {
  detail: string
}