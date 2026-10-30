<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

interface ConnectedApp {
  id: string
  clientName: string
  company: { id: string; name: string; subdomain: string | null } | null
  scopes: string[]
  createdAt: string
  revokedAt: string | null
}

const toast = useToast()
const connections = ref<ConnectedApp[]>([])
const loading = ref(true)
const revokingId = ref<string | null>(null)
const descriptions: Record<string, string> = {
  'erp:read': 'Consulta datos que también podés consultar con tus permisos en Asterisk Suite.',
  'intake:files.read': 'Puede leer archivos adjuntos a capturas propias o asignadas.',
  'purchases:drafts.write': 'Puede crear borradores de facturas de compra. No puede confirmarlos ni pagar.',
}

async function loadConnections() {
  loading.value = true
  try {
    connections.value = await $fetch<ConnectedApp[]>('/api/mcp/connections')
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar las conexiones', description: error?.data?.message || error?.statusMessage || 'Reintentá más tarde.', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function revoke(connection: ConnectedApp) {
  revokingId.value = connection.id
  try {
    await $fetch(`/api/mcp/connections/${encodeURIComponent(connection.id)}`, { method: 'DELETE' })
    connection.revokedAt = new Date().toISOString()
    toast.add({ title: 'Conexión revocada', description: `${connection.clientName} ya no puede acceder a esta empresa.`, color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo revocar', description: error?.data?.message || error?.statusMessage || 'Reintentá más tarde.', color: 'error' })
  } finally {
    revokingId.value = null
  }
}

onMounted(loadConnections)
</script>

<template>
  <UPage class="space-y-6 px-4 pb-10">
    <AppPageHeader title="Conexiones de IA" description="Revisá qué aplicaciones externas tienen acceso y a qué empresa las autorizaste." />

    <UAlert color="info" icon="i-lucide-shield-check" title="Acceso por empresa y por permiso" description="Cada conexión queda limitada a una sola empresa. Además, Asterisk Suite revisa tus permisos en cada consulta. Revocar una conexión invalida sus tokens." />

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div><h2 class="font-semibold">Aplicaciones autorizadas</h2><p class="text-sm text-muted">Las conexiones revocadas quedan en el historial.</p></div>
        <UButton icon="i-lucide-refresh-cw" label="Actualizar" color="neutral" variant="outline" :loading="loading" @click="loadConnections" />
      </div>

      <div v-if="loading" class="grid gap-3 md:grid-cols-2"><USkeleton v-for="i in 2" :key="i" class="h-36 rounded-xl" /></div>
      <UCard v-else-if="!connections.length" class="border border-dashed border-default text-center">
        <UIcon name="i-lucide-plug" class="mx-auto mb-2 size-8 text-muted" />
        <p class="font-medium">Todavía no autorizaste aplicaciones de IA</p>
        <p class="mt-1 text-sm text-muted">Al conectar una IA compatible, vas a ver acá el nombre y la empresa autorizada.</p>
      </UCard>

      <div v-else class="flex flex-col gap-3">
        <UCard v-for="connection in connections" :key="connection.id" class="border border-default">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold">{{ connection.clientName }}</h3>
                <UBadge :label="connection.revokedAt ? 'Revocada' : 'Activa'" :color="connection.revokedAt ? 'neutral' : 'success'" variant="subtle" />
              </div>
              <p class="text-sm text-muted">Empresa: <span class="font-medium text-default">{{ connection.company?.name || 'Empresa eliminada' }}</span></p>
              <p class="text-xs text-muted">Autorizada el {{ new Date(connection.createdAt).toLocaleString('es-AR') }}</p>
              <ul class="space-y-1 text-xs text-muted">
                <li v-for="scope in connection.scopes" :key="scope">• {{ descriptions[scope] || scope }}</li>
              </ul>
              <p v-if="connection.revokedAt" class="text-xs text-muted">Revocada el {{ new Date(connection.revokedAt).toLocaleString('es-AR') }}</p>
            </div>
            <UButton v-if="!connection.revokedAt" label="Revocar" icon="i-lucide-unplug" color="error" variant="soft" :loading="revokingId === connection.id" @click="revoke(connection)" />
          </div>
        </UCard>
      </div>
    </section>
  </UPage>
</template>
