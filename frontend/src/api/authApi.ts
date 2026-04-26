import axios, { AxiosError } from 'axios'
import type { LoginRequest, RegisterRequest, TokenResponse, UserResponse } from '../types/auth'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Tự động gắn token vào mọi request
apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Helper: extract error message từ FastAPI response
function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.detail ?? 'Đã có lỗi xảy ra'
  }
  return 'Đã có lỗi xảy ra'
}

export const authApi = {
  async register(payload: RegisterRequest): Promise<UserResponse> {
    try {
      const response = await apiClient.post<UserResponse>('/auth/register', payload)
      return response.data
    } catch (error) {
      throw new Error(extractErrorMessage(error))
    }
  },

  async login(payload: LoginRequest): Promise<TokenResponse> {
    try {
      const response = await apiClient.post<TokenResponse>('/auth/login', payload)
      return response.data
    } catch (error) {
      throw new Error(extractErrorMessage(error))
    }
  },

  async getMe(): Promise<UserResponse> {
    try {
      const response = await apiClient.get<UserResponse>('/auth/me')
      return response.data
    } catch (error) {
      throw new Error(extractErrorMessage(error))
    }
  },
}

export { apiClient }