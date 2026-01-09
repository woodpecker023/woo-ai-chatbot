'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  googleAuth: (credential: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing token and user data
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        // Invalid user data, clear storage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login({ email, password })
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    setUser(response.user)
    router.push('/dashboard')
  }, [router])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await api.register({ email, password, name })
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    setUser(response.user)
    router.push('/dashboard')
  }, [router])

  const googleAuth = useCallback(async (credential: string) => {
    const response = await api.googleAuth(credential)
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    setUser(response.user)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, googleAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  return { user, isLoading, logout }
}
