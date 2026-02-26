export interface AuthUser {
  id?: number
  username: string
  roles: string[]
}

export interface ApiLoginResponse {
  accessToken: string // ✅ camelCase
  refreshToken: string // ✅ camelCase
  user: AuthUser
}
