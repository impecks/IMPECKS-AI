'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { CognitoAuthService } from '@/lib/aws'

interface User {
  userId: string
  email: string
  name?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('idToken')
    if (token) {
      // In a real app, you'd verify the token with Cognito
      const userData = localStorage.getItem('userData')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const result = await CognitoAuthService.signIn(email, password)
      
      if (result.success && result.tokens) {
        // Store tokens
        localStorage.setItem('idToken', result.tokens.idToken || '')
        localStorage.setItem('accessToken', result.tokens.accessToken || '')
        localStorage.setItem('refreshToken', result.tokens.refreshToken || '')

        // Get user info and store it
        const userData = {
          userId: email,
          email,
          name: email.split('@')[0]
        }
        localStorage.setItem('userData', JSON.stringify(userData))
        setUser(userData)

        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const result = await CognitoAuthService.signUp(email, password, name)
      
      if (result.success) {
        // Auto-login after successful signup
        return await login(email, password)
      } else {
        return { success: false, error: result.error }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    // Clear local storage
    localStorage.removeItem('idToken')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userData')
    
    // Clear user state
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signUp
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}