export type CompanyRole = 'OWNER' | 'ADMIN' | 'USER'

export interface CompanyMembership {
  id: string
  name: string
  subdomain: string
  schemaName: string
  role: CompanyRole
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string | null
  active?: boolean
}

export interface ApiLoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  companies?: CompanyMembership[]
}

export interface ApiMeResponse extends AuthUser {
  companies: CompanyMembership[]
}

export interface ApiRegisterDto {
  name: string
  email: string
  password: string
  role?: string
}

export interface ApiChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export interface ApiMessageResponse {
  message: string
}
