import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authService } from '../services/auth.service'
import { setAuthToken } from '../lib/api.client'
import type { User } from '../data/types'

/**
 * Auth context type
 */
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, remember?: boolean, reactivate?: boolean) => Promise<{ requires2FA: boolean }>
  verify2FA: (code: string, email: string) => Promise<void>
  authenticateWithTokens: (user: User, accessToken: string, refreshToken: string) => void
  register: (data: any) => Promise<{ requires2FA: boolean }>
  logout: (revokeServerSession?: boolean) => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode
}

function readStoredUser(): User | null {
  const storedUser = localStorage.getItem('user')
  if (!storedUser) return null

  try {
    const user = JSON.parse(storedUser) as Partial<User>
    if (
      (typeof user.id === 'number' || typeof user.id === 'string')
      && typeof user.name === 'string'
      && typeof user.email === 'string'
      && ['resident', 'staff', 'admin'].includes(user.role ?? '')
    ) {
      return user as User
    }
  } catch (error) {
    console.error('Failed to read the saved user session:', error)
  }

  localStorage.removeItem('user')
  return null
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        localStorage.removeItem('user')
        localStorage.removeItem('refresh_token')
        setIsLoading(false)
        return
      }
      const cachedUser = readStoredUser()

      try {
        const response = await authService.me()
        if (response.success && response.data) {
          setUser(response.data)
          localStorage.setItem('user', JSON.stringify(response.data))
        } else {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          localStorage.removeItem('refresh_token')
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to verify authentication:', error)

        // A temporary server/network failure should not discard a valid saved session.
        if (!localStorage.getItem('auth_token')) {
          setUser(null)
        } else {
          setUser(cachedUser)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for logout events from API client
    const handleLogout = () => {
      setUser(null)
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  /**
   * Login user
   */
  const login = async (email: string, password: string, remember = false, reactivate = false) => {
  try {
    const response = await authService.login({
      email,
      password,
      remember,
      reactivate,
    })

    const result = response.data as any

    if (!response.success) {
      throw new Error(response.message || result?.message || 'Login failed')
    }

    if (!result?.user || !result?.tokens?.access_token) {
      throw new Error('The server returned an unexpected login response. Please try again.')
    }

    // Save access token
    setAuthToken(result.tokens.access_token)

    // Save refresh token
    if (result.tokens.refresh_token) {
      localStorage.setItem('refresh_token', result.tokens.refresh_token)
    }

    // Save user information
    setUser(result.user)
    localStorage.setItem('user', JSON.stringify(result.user))

    return { requires2FA: false }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

  /**
   * Verify 2FA code
   */
  const verify2FA = async (code: string, email: string) => {
    try {
      const response = await authService.verify2FA({ code, email })
      
      if (response.success && response.data.token && response.data.user) {
        setAuthToken(response.data.token)
        if ((response.data as any).refresh_token) {
          localStorage.setItem('refresh_token', (response.data as any).refresh_token)
        }
        setUser(response.data.user)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      } else {
        throw new Error(response.message || '2FA verification failed')
      }
    } catch (error) {
      console.error('2FA verification error:', error)
      throw error
    }
  }

  const authenticateWithTokens = (authenticatedUser: User, accessToken: string, refreshToken: string) => {
    setAuthToken(accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    setUser(authenticatedUser)
    localStorage.setItem('user', JSON.stringify(authenticatedUser))
  }

  /**
   * Register new user
   */
  const register = async (data: any) => {
    try {
      const response = await authService.register(data)
      if (!response.success) throw new Error(response.message || 'Registration failed')
      return { requires2FA: false }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Logout user
   */
  const logout = async (revokeServerSession = true) => {
    try {
      if (revokeServerSession) await authService.logout()
    } catch (error) {
      if (revokeServerSession) {
        console.error('Logout error:', error)
      }
    } finally {
      setAuthToken(null)
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('refresh_token')
    }
  }

  /**
   * Update user data
   */
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    verify2FA,
    authenticateWithTokens,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
