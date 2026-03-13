import type { AuthUser } from '@/types/auth'

export const useAuthService = () => {
  const { $api } = useNuxtApp()

  const login = (email: string, password: string) =>
    $api<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })

  const me = () => $api<AuthUser>('/api/auth/me')

  const logout = () => $api('/api/auth/logout', { method: 'POST' })

  return { login, me, logout }
}
