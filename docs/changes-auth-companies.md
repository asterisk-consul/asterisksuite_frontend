# Documentación de Cambios - Auth + Companies

## Contexto

El backend agregó una tabla `company_users` y el endpoint `GET /auth/me` ahora retorna las empresas del usuario junto con sus datos. Esto requiere ajustes en el frontend para:
1. Recibir y almacenar las empresas del usuario
2. Adaptarse al nuevo formato de respuesta del backend (respuesta flat vs anidada)

---

## 1. `app/modulos/auth/auth.types.ts`

### ANTES
```ts
export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  active?: boolean
}

export interface ApiLoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
```

### AHORA
```ts
export interface CompanyMembership {
  id: string
  name: string
  subdomain: string
  schemaName: string
  role: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string | null   // ← ahora nullable (el backend retorna null en algunos casos)
  active?: boolean
}

export interface ApiLoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  companies?: CompanyMembership[]   // ← NUEVO: empresas del usuario
}

export interface ApiMeResponse extends AuthUser {   // ← NUEVO: tipo para /auth/me
  companies: CompanyMembership[]
}
```

**Cambios clave:**
- `CompanyMembership`: tipo nuevo para las empresas del usuario
- `AuthUser.role`: ahora `string | null` (el backend lo retorna nullable)
- `ApiLoginResponse.companies`: campo opcional agregado
- `ApiMeResponse`: nuevo tipo que extiende `AuthUser` con `companies` (respuesta flat del backend)

---

## 2. `app/modulos/auth/auth.service.ts`

### ANTES
```ts
import type {
  ApiLoginResponse,
  AuthUser,
  ApiRegisterDto,
  ApiChangePasswordDto,
  ApiMessageResponse
} from './auth.types'

export const authService = {
  // ... (mismos métodos)

  me() {
    return this.getFetch()<AuthUser>('/api/auth/me')
  }
}
```

### AHORA
```ts
import type {
  ApiLoginResponse,
  AuthUser,
  CompanyMembership,
  ApiMeResponse,
  ApiRegisterDto,
  ApiChangePasswordDto,
  ApiMessageResponse
} from './auth.types'

export const authService = {
  // ... (mismos métodos)

  me() {
    return this.getFetch()<ApiMeResponse>('/api/auth/me')
  }
}
```

**Cambios clave:**
- Importa `CompanyMembership` y `ApiMeResponse`
- `me()` ahora retorna `ApiMeResponse` en vez de `AuthUser`

---

## 3. `app/modulos/auth/auth.store.ts`

### ANTES
```ts
import { defineStore } from 'pinia'
import { authService } from './auth.service'
import type { AuthUser } from './auth.types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLogged = computed(() => !!user.value)

  async function login(email: string, password: string) {
    // ...
    const res = await authService.login(email, password)
    user.value = res.user
    // ...
  }

  async function register(data) {
    // ...
    const res = await authService.register(data)
    user.value = res.user
    // ...
  }

  async function fetchMe() {
    const me = await authService.me()
    user.value = me              // ← el backend retornaba AuthUser directamente
  }

  async function init() {
    if (initialized.value) return
    try {
      await fetchMe()
    } catch {
      try {
        await $fetch('/api/auth/refresh', { method: 'POST' })
        await fetchMe()
      } catch {
        user.value = null
      }
    }
    initialized.value = true
  }

  async function logout() {
    await authService.logout()
    user.value = null
  }

  return {
    user, loading, register, changePassword, initialized,
    isLogged, error, login, fetchMe, init, logout
  }
})
```

### AHORA
```ts
import { defineStore } from 'pinia'
import { authService } from './auth.service'
import type { AuthUser, CompanyMembership } from './auth.types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const companies = ref<CompanyMembership[]>([])          // ← NUEVO
  const selectedCompany = ref<CompanyMembership | null>(null) // ← NUEVO
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLogged = computed(() => !!user.value)

  async function login(email: string, password: string) {
    // ...
    const res = await authService.login(email, password)
    user.value = res.user
    companies.value = res.companies ?? []                  // ← NUEVO
    if (companies.value.length === 1) {                    // ← NUEVO
      selectedCompany.value = companies.value[0]           // ← NUEVO
    }                                                      // ← NUEVO
    // ...
  }

  async function register(data) {
    // ...
    const res = await authService.register(data)
    user.value = res.user
    companies.value = res.companies ?? []                  // ← NUEVO
    if (companies.value.length === 1) {                    // ← NUEVO
      selectedCompany.value = companies.value[0]           // ← NUEVO
    }                                                      // ← NUEVO
    // ...
  }

  async function fetchMe() {
    const me = await authService.me()
    // ← ANTES: user.value = me  (el backend retornaba AuthUser directamente)
    // ← AHORA: el backend retorna { id, name, email, role, companies } (flat)
    user.value = {                                         // ← CAMBIADO
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role ?? null
    }
    companies.value = me.companies ?? []                   // ← NUEVO
  }

  async function init() {
    if (initialized.value) return
    try {
      await fetchMe()
    } catch {
      try {
        await $fetch('/api/auth/refresh', { method: 'POST' })
        await fetchMe()
      } catch {
        user.value = null
        companies.value = []                               // ← NUEVO
      }
    }
    initialized.value = true
  }

  async function logout() {
    await authService.logout()
    user.value = null
    companies.value = []                                   // ← NUEVO
    selectedCompany.value = null                           // ← NUEVO
  }

  function selectCompany(company: CompanyMembership) {     // ← NUEVO
    selectedCompany.value = company
  }

  return {
    user, companies, selectedCompany,                      // ← NUEVO: companies, selectedCompany
    loading, register, changePassword, initialized,
    isLogged, error, login, fetchMe, init, logout,
    selectCompany                                          // ← NUEVO
  }
})
```

**Cambios clave:**
- `companies`: ref nuevo para almacenar las empresas del usuario
- `selectedCompany`: ref nuevo para la empresa seleccionada
- `selectCompany()`: función nueva para cambiar de empresa
- `fetchMe()`: ahora construye `user` desde campos planos del backend (`me.id`, `me.name`, etc.)
- `login()` y `register()`: ahora guardan `companies` y auto-seleccionan si hay solo una
- `logout()`: ahora limpia `companies` y `selectedCompany`

---

## 4. `server/api/auth/login.post.ts`

### ANTES
```ts
return { user: api.user }
```

### AHORA
```ts
return { user: api.user, companies: api.companies }
```

**Cambios clave:**
- Ahora retorna `companies` del backend al cliente

---

## 5. `server/api/auth/refresh.post.ts`

### ANTES
```ts
return {
  ok: true,
  user: api.user,
  accessToken: api.accessToken,
  refreshToken: api.refreshToken
}
```

### AHORA
```ts
return {
  ok: true,
  user: api.user,
  companies: (api as any).companies,      // ← NUEVO
  accessToken: api.accessToken,
  refreshToken: api.refreshToken
}
```

**Cambios clave:**
- Ahora retorna `companies` del backend al cliente

---

## 6. `server/api/auth/me.get.ts`

### ANTES
```ts
import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  return await apiProxy(event, '/auth/me', {
    method: 'GET'
  })
})
```

### AHORA
```ts
import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  console.log('================ ME START ================')
  console.log('[ME] cookies:', JSON.stringify({
    api_refresh: getCookie(event, 'api_refresh')?.slice(0, 20),
    api_access: getCookie(event, 'api_access')?.slice(0, 20)
  }))

  try {
    const result = await apiProxy(event, '/auth/me', {
      method: 'GET'
    })
    console.log('[ME] success:', JSON.stringify(result))
    return result
  } catch (err: any) {
    console.log('[ME] FAILED:', err?.statusCode, err?.message)
    console.log('[ME] error data:', JSON.stringify(err?.data))
    throw err
  }
})
```

**Cambios clave:**
- Logging de debug para troubleshooting (cookies, resultado, errores)

---

## 7. `server/utils/api-proxy.ts`

### ANTES
```ts
const doFetch = async (token?: string) => {
  return await $fetch(`${config.apiBase}${path}`, {
    method,
    body: options.body,
    query: options.query,
    headers: {
      ...(token && {
        Authorization: `Bearer ${token}`
      }),
      'x-tenant': tenant
    }
  })
}

if (accessToken) {
  try {
    const res = await doFetch(accessToken)
    return res
  } catch (err: any) {
    if (err?.response?.status !== 401) {
      throw err
    }
    tokenCache.delete(refreshToken)
  }
}
```

### AHORA
```ts
const doFetch = async (token?: string) => {
  const url = `${config.apiBase}${path}`
  console.log('[FETCH] →', method, url)
  console.log('[FETCH] x-tenant:', tenant)
  console.log('[FETCH] token:', token?.slice(0, 20))

  return await $fetch(url, {
    method,
    body: options.body,
    query: options.query,
    headers: {
      ...(token && {
        Authorization: `Bearer ${token}`
      }),
      'x-tenant': tenant
    }
  })
}

if (accessToken) {
  try {
    const res = await doFetch(accessToken)
    return res
  } catch (err: any) {
    console.log('[FETCH] error status:', err?.response?.status)
    console.log('[FETCH] error data:', JSON.stringify(err?.data || err?.response?._data))
    console.log('[FETCH] error message:', err?.message)

    if (err?.response?.status !== 401) {
      throw err
    }
    tokenCache.delete(refreshToken)
  }
}
```

**Cambios clave:**
- Logging de debug: URL, tenant, token, errores detallados del backend

---

## Resumen de la estructura de datos

### Backend → Frontend: Login/Register
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "role": "PLATFORM_OWNER" },
  "companies": [
    { "id": "...", "name": "Empresa Dev", "subdomain": "dev", "schemaName": "dev_db", "role": "OWNER" }
  ],
  "accessToken": "eyJ...",
  "refreshToken": "fea2b1f..."
}
```

### Backend → Frontend: /auth/me
```json
{
  "id": "...",
  "name": "Usuario Dev",
  "email": "usuariodev@test.com",
  "companies": [
    { "id": "...", "name": "Empresa Dev", "subdomain": "dev", "schemaName": "dev_db", "role": "OWNER" }
  ]
}
```

> **Nota importante:** El endpoint `/auth/me` retorna los campos del usuario **al nivel raíz** (flat), no anidados dentro de `{ user: {...} }`. Por eso `fetchMe()` construye el objeto `user` manualmente desde `me.id`, `me.name`, etc.

---

## Errores encontrados y resueltos

1. **Backend: columna `users.role` no existe** → Ejecutar `npx prisma db push` en el backend
2. **Frontend: `/auth/me` retornaba undefined** → El store esperaba `me.user` pero el backend retorna flat; se ajustó `fetchMe()` para construir el user desde los campos planos
3. **Frontend: `me.user` era undefined** → `isLogged = false` → redirect a `/login` → página index nunca se mostraba
