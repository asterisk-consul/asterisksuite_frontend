import type {
  ApiLoginResponse,
  AuthUser,
  ApiRegisterDto,
  ApiChangePasswordDto,
  ApiMessageResponse
} from './auth.types'

export const authService = {
  getFetch() {
    return useRequestFetch()
  },

  async login(email: string, password: string) {
    console.log('[AUTH-SERVICE] login attempt for:', email)
    try {
      const result = await this.getFetch()<ApiLoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      console.log('[AUTH-SERVICE] login OK, user:', result.user?.email)
      return result
    } catch (e: any) {
      console.error('[AUTH-SERVICE] login FAILED:', e?.status, e?.statusMessage, e?.data?.message)
      throw e
    }
  },

  register(data: ApiRegisterDto) {
    return this.getFetch()<ApiLoginResponse>('/api/auth/register', {
      method: 'POST',
      body: data
    })
  },

  refresh(refreshToken: string) {
    return this.getFetch()<ApiLoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken }
    })
  },

  logout() {
    return this.getFetch()('/api/auth/logout', {
      method: 'POST'
    })
  },

  logoutAll() {
    return this.getFetch()<ApiMessageResponse>('/api/auth/logout-all', {
      method: 'POST'
    })
  },

  changePassword(data: ApiChangePasswordDto) {
    return this.getFetch()<ApiMessageResponse>('/api/auth/change-password', {
      method: 'POST',
      body: data
    })
  },

  me() {
    return this.getFetch()<AuthUser>('/api/auth/me')
  }
}
