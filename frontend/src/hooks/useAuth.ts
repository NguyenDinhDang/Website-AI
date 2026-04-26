import { useState } from 'react'
import { authApi } from '../api/authApi'
import type { UserResponse } from '../types/auth'

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function saveTokensToStorage(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  function clearTokensFromStorage() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async function login(email: string, password: string): Promise<boolean> {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const tokenResponse = await authApi.login({ email, password })
      saveTokensToStorage(tokenResponse.access_token, tokenResponse.refresh_token)
      const userProfile = await authApi.getMe()
      setCurrentUser(userProfile)
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Đăng nhập thất bại')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function register(
    email: string,
    username: string,
    password: string,
    fullName?: string
  ): Promise<boolean> {
    setIsLoading(true)
    setErrorMessage('')
    try {
      await authApi.register({ email, username, password, full_name: fullName })
      // Tự động login sau khi đăng ký thành công
      return await login(email, password)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Đăng ký thất bại')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    clearTokensFromStorage()
    setCurrentUser(null)
  }

  return {
    currentUser,
    isLoading,
    errorMessage,
    login,
    register,
    logout,
  }
}