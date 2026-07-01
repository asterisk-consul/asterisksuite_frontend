export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
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
  description?: string
  permissions?: string[]
}

export interface UpdateRoleDto {
  name?: string
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
