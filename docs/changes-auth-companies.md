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

## 8. `app/components/TeamsMenu.vue`

### ANTES (hardcodeado)
```vue
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ collapsed?: boolean }>()

const teams = [
  {
    label: 'Don Andres',
    avatar: { src: '/img/donandres.webp', alt: 'Don Andres' },
    to: '/'
  },
  {
    label: 'Flowid',
    avatar: { src: '/img/LogoFlows.png', alt: 'flows' },
    url: 'https://flowsma.com/donandres/#/workspace'
  }
]

const selectedTeam = useState('selectedTeam', () => teams[0])

const items = computed<DropdownMenuItem[][]>(() => [
  teams.map((team) => ({
    ...team,
    onSelect() {
      selectedTeam.value = team
    }
  }))
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }">
    <UButton
      v-bind="{
        ...selectedTeam,
        label: collapsed ? undefined : selectedTeam?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>
```

### AHORA (usa auth store + lógica condicional)
```vue
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const router = useRouter()

const selectedCompany = computed(() => auth.selectedCompany)
const hasMultipleCompanies = computed(() => auth.companies.length > 1)

const items = computed<DropdownMenuItem[]>(() =>
  auth.companies.map((company) => ({
    label: company.name,
    icon: company.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
    description: company.subdomain,
    onSelect() {
      auth.selectCompany(company)
      router.push('/')
    }
  }))
)

function goToHome() {
  router.push('/')
}
</script>

<template>
  <!-- 1 empresa → botón directo, click = ir al inicio -->
  <template v-if="hasMultipleCompanies">
    <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }">
      <UButton
        v-bind="{
          icon: selectedCompany?.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
          label: collapsed ? undefined : selectedCompany?.name,
          trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
        }"
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="data-[state=open]:bg-elevated"
        :class="[!collapsed && 'py-2']"
        :ui="{ trailingIcon: 'text-dimmed' }"
      />
    </UDropdownMenu>
  </template>

  <!-- 1 empresa → botón directo, click = ir al inicio -->
  <template v-else>
    <UButton
      v-bind="{
        icon: selectedCompany?.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
        label: collapsed ? undefined : selectedCompany?.name
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{ trailingIcon: 'text-dimmed' }"
      @click="goToHome"
    />
  </template>
</template>
```

**Cambios clave:**
- Eliminó array hardcodeado `teams` → ahora usa `auth.companies` del store
- Eliminó `useState('selectedTeam')` → ahora usa `auth.selectedCompany`
- Íconos dinámicos: corona si es OWNER, edificio si es USER/ADMIN
- **1 empresa**: botón simple → click navega a `/` (sin dropdown)
- **Múltiples empresas**: dropdown para seleccionar + click también navega a `/`
- Al seleccionar empresa → `auth.selectCompany()` setea cookie `selected_tenant` + `router.push('/')`

---

## 9. `server/utils/tenant.ts`

### ANTES
```ts
import type { H3Event } from 'h3'
import { getRequestHost } from 'h3'

export function getTenant(event: H3Event): string {
  const host = getRequestHost(event)

  if (!host) {
    return 'dev'
  }

  const hostname = host.split(':')[0] ?? ''

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    return 'dev'
  }

  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '')
  }

  const [subdomain] = hostname.split('.')

  return subdomain ?? 'dev'
}
```

### AHORA
```ts
import type { H3Event } from 'h3'
import { getRequestHost, getCookie } from 'h3'

export function getTenant(event: H3Event): string {
  const cookieTenant = getCookie(event, 'selected_tenant')
  if (cookieTenant) {
    return cookieTenant
  }

  const host = getRequestHost(event)

  if (!host) {
    return 'dev'
  }

  const hostname = host.split(':')[0] ?? ''

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    return 'dev'
  }

  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '')
  }

  const [subdomain] = hostname.split('.')

  return subdomain ?? 'dev'
}
```

**Cambios clave:**
- Primero busca cookie `selected_tenant` → si existe, la usa como tenant
- Si no existe, usa la lógica anterior (host → subdomain → dev)

---

## Flujo de selección de empresa

```
1. Usuario hace click en TeamsMenu → selecciona "Empresa B"
   ↓
2. auth.selectCompany(company) se ejecuta
   ↓
3. selectedCompany.value = company         (Pinia store)
4. localStorage.selectedCompanyId = id     (persistencia client-side)
5. cookie selected_tenant = "empresab"     (persistencia server-side)
   ↓
6. Siguiente request → apiProxy lee cookie selected_tenant = "empresab"
   ↓
7. getTenant() retorna "empresab" en vez de "dev"
   ↓
8. Backend recibe header x-tenant: empresab → usa schema de Empresa B
```

---

## 10. `app/pages/select-company.vue` (NUEVO)

```vue
<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'

definePageMeta({
  layout: 'public',
  auth: false
})

const auth = useAuthStore()
const router = useRouter()

const companies = computed(() => auth.companies)

if (!auth.isLogged) {
  navigateTo('/login')
}

if (auth.companies.length <= 1 || auth.selectedCompany) {
  navigateTo('/')
}

function selectCompany(company: (typeof auth.companies)[number]) {
  auth.selectCompany(company)
  router.push('/')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center mx-auto h-screen px-4">
    <UPageCard class="w-full max-w-lg">
      <div class="text-center mb-6">
        <h1 class="text-xl font-bold">Seleccioná tu empresa</h1>
        <p class="text-muted text-sm mt-1">
          Tenés acceso a múltiples empresas. Elegí con cuál querés trabajar.
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <button
          v-for="company in companies"
          :key="company.id"
          class="flex items-center gap-3 p-4 rounded-lg border border-default
                 hover:bg-elevated transition-colors cursor-pointer text-left"
          @click="selectCompany(company)"
        >
          <UIcon
            :name="company.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building'"
            class="size-6 text-muted shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ company.name }}</p>
            <p class="text-xs text-muted truncate">{{ company.subdomain }}</p>
          </div>
          <UBadge size="xs" variant="soft" color="neutral">{{ company.role }}</UBadge>
        </button>
      </div>
    </UPageCard>
  </div>
</template>
```

**Funcionamiento:**
- Guardas: si no está logueado → `/login`, si tiene ≤1 empresa o ya seleccionó → `/`
- Muestra tarjetas con nombre, subdomain y rol de cada empresa
- Click en empresa → `auth.selectCompany()` + navigate a `/`

---

## 11. `app/middleware/auth.ts`

### ANTES
```ts
import { useAuthStore } from '~/modulos/auth/auth.store'
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.init()

  if (!auth.isLogged) {
    return navigateTo('/login')
  }
})
```

### AHORA
```ts
import { useAuthStore } from '~/modulos/auth/auth.store'
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.init()

  if (!auth.isLogged) {
    return navigateTo('/login')
  }

  if (auth.needsCompanySelection) {
    return navigateTo('/select-company')
  }
})
```

**Cambios clave:**
- Si el usuario está logueado pero tiene múltiples empresas y ninguna seleccionada → redirect a `/select-company`

---

## 12. `app/pages/login/index.vue`

### ANTES
```ts
await navigateTo('/')
```

### AHORA
```ts
if (auth.needsCompanySelection) {
  await navigateTo('/select-company')
} else {
  await navigateTo('/')
}
```

---

## 13. `app/pages/register/index.vue`

### ANTES
```ts
await navigateTo('/')
```

### AHORA
```ts
if (auth.needsCompanySelection) {
  await navigateTo('/select-company')
} else {
  await navigateTo('/')
}
```

---

## 14. `app/modulos/auth/auth.store.ts` (nuevos computed)

### ANTES
```ts
const isLogged = computed(() => !!user.value)
```

### AHORA
```ts
const isLogged = computed(() => !!user.value)
const hasMultipleCompanies = computed(() => companies.value.length > 1)
const needsCompanySelection = computed(() =>
  isLogged.value && hasMultipleCompanies.value && !selectedCompany.value
)
```

**Exportados:** `isLogged`, `hasMultipleCompanies`, `needsCompanySelection`

---

## Flujo completo post-login

```
LOGIN EXITOSO
    │
    ├── 1 empresa → auto-select → navigateTo('/')
    │
    └── Múltiples empresas → navigateTo('/select-company')
                                    │
                                    ├── Click en empresa → selectCompany() → navigateTo('/')
                                    │
                                    └── Si accede a ruta protegida sin seleccionar
                                        → middleware redirige a /select-company

PAGE RELOAD (middleware auth)
    │
    ├── No logueado → /login
    │
    ├── Logueado + ≤1 empresa → pasa normal
    │
    ├── Logueado + múltiples empresas + selectedCompany en localStorage → pasa normal
    │
    └── Logueado + múltiples empresas + NO selectedCompany → /select-company
```

---

## Errores encontrados y resueltos

1. **Backend: columna `users.role` no existe** → Ejecutar `npx prisma db push` en el backend
2. **Frontend: `/auth/me` retornaba undefined** → El store esperaba `me.user` pero el backend retorna flat; se ajustó `fetchMe()` para construir el user desde los campos planos
3. **Frontend: `me.user` era undefined** → `isLogged = false` → redirect a `/login` → página index nunca se mostraba
4. **TeamsMenu hardcodeado** → Reemplazado por datos reales del auth store + persistencia con cookie `selected_tenant`
5. **TeamsMenu: 1 empresa muestra dropdown innecesario** → Ahora si solo hay 1 empresa, muestra botón simple que navega a `/`
6. **Multi-empresa: no había selección post-login** → Nueva página `/select-company` + redirect automático desde login/register/middleware
