export interface Role {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  is_system?: boolean
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Permission {
  id: string
  code: string
  name: string
  description?: string
  module?: string
}

export interface CreateRoleDto {
  name: string
  code: string
  description?: string
  permissions?: string[]
}

export interface UpdateRoleDto {
  name?: string
  code?: string
  description?: string
  permissions?: string[]
}

export interface UpdateRolePermissionsDto {
  permissions: string[]
}

export interface UserRoleAssignment {
  userId: string
  roleIds: string[]
}

export interface EffectivePermissions {
  userId: string
  roles: string[]
  permissions: string[]
  overrides: [string, any][]
}
