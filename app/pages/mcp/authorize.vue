<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'

definePageMeta({ layout: 'public', auth: false })

interface AuthorizationRequest {
  id: string
  clientName: string
  scopes: string[]
  expiresAt: string
}

const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const request = ref<AuthorizationRequest | null>(null)
const selectedCompanyId = ref('')
const loading = ref(false)
const errorMessage = ref('')
const requestId = typeof route.query.request_id === 'string' ? route.query.request_id : ''

await auth.init()

if (!auth.isLogged) {
  const redirect = encodeURIComponent(route.fullPath)
  await navigateTo(`/login?redirect=${redirect}`)
} else if (!requestId) {
  errorMessage.value = 'La solicitud de conexión no contiene un identificador válido.'
} else {
  try {
    request.value = await $fetch<AuthorizationRequest>(`/api/mcp/authorization/request?request_id=${encodeURIComponent(requestId)}`)
    selectedCompanyId.value = auth.selectedCompany?.id || auth.companies[0]?.id || ''
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'La solicitud venció o ya fue utilizada.'
  }
}

const companies = computed(() => auth.companies.map((company) => ({ label: company.name, value: company.id })))
const scopeLabels: Record<string, string> = {
  'erp:read': 'Consultar datos según tus permisos de ERP.',
  'intake:files.read': 'Leer facturas que cargues en tus capturas de Asterisk Suite.',
  'purchases:drafts.write': 'Crear borradores de facturas de compra para que los revises.',
}
const requestedScopes = computed(() => request.value?.scopes.map((scope) => scopeLabels[scope] || `Permiso solicitado: ${scope}`) ?? [])

async function continueToClient(response: { redirect_url: string }) {
  await navigateTo(response.redirect_url, { external: true, replace: true })
}

async function approve() {
  if (!requestId || !selectedCompanyId.value) return
  loading.value = true
  try {
    const result = await $fetch<{ redirect_url: string }>(`/api/mcp/authorization/request/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      body: { company_id: selectedCompanyId.value }
    })
    await continueToClient(result)
  } catch (error: any) {
    toast.add({ title: 'No se pudo autorizar', description: error?.data?.message || error?.statusMessage || 'Intentá de nuevo.', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function deny() {
  if (!requestId) return navigateTo('/')
  loading.value = true
  try {
    const result = await $fetch<{ redirect_url: string }>(`/api/mcp/authorization/request/${encodeURIComponent(requestId)}/deny`, { method: 'POST' })
    await continueToClient(result)
  } catch (error: any) {
    toast.add({ title: 'No se pudo rechazar la conexión', description: error?.data?.message || error?.statusMessage || 'La solicitud pudo haber vencido.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
    <UCard class="w-full max-w-xl border border-default bg-default shadow-xl">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-primary/10 p-3 text-primary"><UIcon name="i-lucide-plug-zap" class="size-6" /></div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Conexión segura</p>
            <h1 class="text-xl font-semibold">Conectar con una IA</h1>
          </div>
        </div>
      </template>

      <div v-if="errorMessage" class="space-y-4">
        <UAlert color="error" icon="i-lucide-circle-alert" title="No se puede autorizar" :description="errorMessage" />
        <UButton label="Volver al inicio" to="/" color="neutral" variant="outline" />
      </div>

      <div v-else-if="request" class="space-y-6">
        <div>
          <p class="text-sm text-muted">La aplicación</p>
          <p class="mt-1 text-lg font-semibold">{{ request.clientName }}</p>
          <p class="mt-2 text-sm text-muted">solicita acceso a Asterisk Suite. Elegí a qué empresa darle acceso.</p>
        </div>

        <UFormField label="Empresa" description="La conexión queda limitada a una empresa. Para otra, autorizala por separado.">
          <USelect v-model="selectedCompanyId" :items="companies" value-key="value" class="w-full" :disabled="companies.length < 2" />
        </UFormField>

        <div class="rounded-lg border border-default bg-elevated/40 p-4">
          <p class="text-sm font-medium">Acceso solicitado</p>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
            <li v-for="scope in requestedScopes" :key="scope">{{ scope }}</li>
          </ul>
          <p class="mt-3 text-xs text-muted">La IA no puede confirmar documentos ni ejecutar pagos desde esta conexión. Podés revocarla en Configuración → Conexiones de IA.</p>
        </div>

        <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <UButton label="Rechazar" color="neutral" variant="outline" :loading="loading" @click="deny" />
          <UButton label="Autorizar conexión" icon="i-lucide-shield-check" :disabled="!selectedCompanyId" :loading="loading" @click="approve" />
        </div>
      </div>
    </UCard>
  </main>
</template>
