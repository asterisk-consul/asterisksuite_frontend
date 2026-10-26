<script setup lang="ts">
import { useWhatsAppReportsService } from '~/modulos/erp/whatsapp-reports/whatsapp-reports.service'
import type {
  WhatsAppGatewayStatus,
  WhatsAppGroupOption,
  WhatsAppReportCompanyOption,
  WhatsAppReportRun,
  WhatsAppReportSettings
} from '~/modulos/erp/whatsapp-reports/whatsapp-reports.types'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useAuthStore } from '~/modulos/auth/auth.store'

definePageMeta({ middleware: ['auth'] })

const service = useWhatsAppReportsService()
const toast = useToast()
const authStore = useAuthStore()
const { isOwnerOrAdmin } = useCompanyRole()
const loading = ref(true)
const saving = ref(false)
const loadingGroups = ref(false)
const testing = ref<'consolidated' | 'inventory' | 'consolidated-pdf' | 'inventory-pdf' | null>(null)
const gatewayStatus = ref<WhatsAppGatewayStatus | null>(null)
const companies = ref<WhatsAppReportCompanyOption[]>([])
const groups = ref<WhatsAppGroupOption[]>([])
const runs = ref<WhatsAppReportRun[]>([])
const pageError = ref('')
const form = reactive<WhatsAppReportSettings>({
  enabled: false,
  selected_company_ids: [],
  consolidated_enabled: true,
  consolidated_group_id: null,
  inventory_enabled: true,
  inventory_group_id: null
})
const currentCompanyId = computed(() => authStore.selectedCompany?.id ?? null)
const consolidatedGroupSelection = computed<string | undefined>({
  get: () => form.consolidated_group_id ?? undefined,
  set: value => { form.consolidated_group_id = value ?? null }
})
const inventoryGroupSelection = computed<string | undefined>({
  get: () => form.inventory_group_id ?? undefined,
  set: value => { form.inventory_group_id = value ?? null }
})

const groupOptions = computed(() => {
  const options = groups.value.map(group => ({ label: group.name, value: group.id }))
  for (const savedId of [form.consolidated_group_id, form.inventory_group_id]) {
    if (savedId && !options.some(option => option.value === savedId)) {
      options.push({ label: `${savedId} (no está en la lista actual)`, value: savedId })
    }
  }
  return options
})

const connectionLabel = computed(() => {
  if (!gatewayStatus.value?.configured) return 'Falta configurar el backend'
  return gatewayStatus.value.gatewayEnabled ? 'Integración activa' : 'Integración desactivada en .env'
})

function toggleCompany(companyId: string, checked: boolean) {
  if (!checked && companyId === currentCompanyId.value && form.selected_company_ids.length === 1) return
  if (checked && !form.selected_company_ids.includes(companyId) && form.selected_company_ids.length >= 20) {
    toast.add({ title: 'Límite de empresas alcanzado', description: 'Cada envío puede incluir hasta 20 empresas.', color: 'warning' })
    return
  }
  const ids = new Set(form.selected_company_ids)
  if (checked) ids.add(companyId)
  else ids.delete(companyId)
  form.selected_company_ids = [...ids]
}

function applySettings(settings: WhatsAppReportSettings) {
  form.enabled = settings.enabled
  form.selected_company_ids = [...settings.selected_company_ids]
  form.consolidated_enabled = settings.consolidated_enabled
  form.consolidated_group_id = settings.consolidated_group_id
  form.inventory_enabled = settings.inventory_enabled
  form.inventory_group_id = settings.inventory_group_id
}

async function loadGroups() {
  loadingGroups.value = true
  try {
    groups.value = await service.getGroups()
    toast.add({ title: 'Conexión correcta', description: `OpenWA devolvió ${groups.value.length} grupos.`, color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar los grupos', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    loadingGroups.value = false
  }
}

async function loadPage() {
  loading.value = true
  pageError.value = ''
  try {
    const [status, settings, availableCompanies, recentRuns] = await Promise.all([
      service.getStatus(),
      service.getSettings(),
      service.getCompanies(),
      service.getRuns()
    ])
    gatewayStatus.value = status
    companies.value = availableCompanies
    runs.value = recentRuns
    applySettings(settings)
    if (status.configured && status.gatewayEnabled) {
      try {
        groups.value = await service.getGroups()
      } catch {
        groups.value = []
      }
    }
  } catch (error: any) {
    pageError.value = error?.data?.message ?? error.message ?? 'No se pudo cargar la configuración.'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    const saved = await service.saveSettings({ ...form, selected_company_ids: [...form.selected_company_ids] })
    applySettings(saved)
    toast.add({ title: 'Configuración guardada', description: 'Los próximos envíos semanales usarán estos grupos.', color: 'success' })
    runs.value = await service.getRuns()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function sendTest(destination: 'consolidated' | 'inventory') {
  testing.value = destination
  try {
    await service.saveSettings({ ...form, selected_company_ids: [...form.selected_company_ids] })
    await service.sendTest(destination)
    toast.add({ title: 'Mensaje de prueba enviado', description: 'Revisá el grupo seleccionado en WhatsApp.', color: 'success' })
    runs.value = await service.getRuns()
  } catch (error: any) {
    toast.add({ title: 'No se pudo enviar la prueba', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    testing.value = null
  }
}

async function sendPdfTest(destination: 'consolidated' | 'inventory') {
  testing.value = `${destination}-pdf`
  try {
    await service.saveSettings({ ...form, selected_company_ids: [...form.selected_company_ids] })
    const result = await service.sendTest(destination, 'pdf')
    const period = result.period ? `${result.period.from} al ${result.period.to}` : 'última semana completa'
    const size = result.sizeBytes ? ` · ${(result.sizeBytes / 1024 / 1024).toFixed(2)} MiB` : ''
    toast.add({ title: 'PDF de prueba enviado', description: `${result.filename ?? 'Reporte PDF'}${size} · período ${period}. Revisá el grupo seleccionado en WhatsApp.`, color: 'success' })
    runs.value = await service.getRuns()
  } catch (error: any) {
    toast.add({ title: 'No se pudo enviar el PDF de prueba', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    testing.value = null
  }
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function runTypeLabel(type: string) {
  return type === 'inventory' ? 'Inventario' : 'Consolidado'
}

function runStatus(status: string) {
  const values: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'neutral' | 'info' }> = {
    SENT: { label: 'Enviado', color: 'success' },
    FAILED: { label: 'Falló', color: 'error' },
    PROCESSING: { label: 'En curso', color: 'info' },
    PENDING: { label: 'Pendiente', color: 'warning' }
  }
  return values[status] ?? { label: status, color: 'neutral' as const }
}

onMounted(loadPage)
</script>

<template>
  <UPage class="space-y-6 px-4 pb-10">
    <AppPageHeader title="Reportes por WhatsApp" description="Configurá los grupos y activá el envío semanal de reportes PDF para toda la empresa." />

    <UAlert v-if="pageError" color="error" variant="subtle" title="No se pudo cargar WhatsApp" :description="pageError" />
    <UAlert v-if="!isOwnerOrAdmin" color="warning" variant="subtle" title="Acceso de administración" description="Solo OWNER o ADMIN pueden configurar el envío empresarial por WhatsApp." />

    <template v-if="!loading">
      <UPageCard title="1. Conexión con OpenWA" description="La URL, API key y sesión se configuran solamente en el .env del backend; nunca se muestran en el navegador." variant="subtle">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success"><UIcon name="i-lucide-message-circle" class="size-5" /></div>
            <div>
              <p class="font-medium">{{ connectionLabel }}</p>
              <p class="text-sm text-muted">API key: {{ gatewayStatus?.apiKeyConfigured ? 'configurada' : 'pendiente' }} · Sesión: {{ gatewayStatus?.sessionConfigured ? 'configurada' : 'pendiente' }}</p>
            </div>
          </div>
          <UButton label="Probar conexión y cargar grupos" icon="i-lucide-refresh-cw" variant="outline" :loading="loadingGroups" :disabled="!isOwnerOrAdmin || !gatewayStatus?.configured || !gatewayStatus?.gatewayEnabled" @click="loadGroups" />
        </div>
        <UAlert v-if="!gatewayStatus?.configured" class="mt-4" color="info" variant="subtle" title="Completá el .env del backend" description="Definí OPENWA_BASE_URL, OPENWA_API_KEY y OPENWA_SESSION_ID. Luego reiniciá el backend." />
        <UAlert v-else-if="!gatewayStatus?.gatewayEnabled" class="mt-4" color="warning" variant="subtle" title="Integración desactivada" description="Para probarla localmente, establecé WHATSAPP_REPORTS_ENABLED=true en el .env del backend." />
      </UPageCard>

      <UPageCard title="2. Alcance del reporte" description="El consolidado y el informe de inventario incluirán las empresas seleccionadas, hasta 20." variant="subtle">
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <label v-for="company in companies" :key="company.id" class="flex cursor-pointer items-start gap-3 rounded-lg border border-default p-3 hover:bg-elevated">
            <input type="checkbox" class="mt-1 size-4 accent-primary" :checked="form.selected_company_ids.includes(company.id)" :disabled="!isOwnerOrAdmin || (company.id === currentCompanyId && form.selected_company_ids.length === 1) || (!form.selected_company_ids.includes(company.id) && form.selected_company_ids.length >= 20)" @change="toggleCompany(company.id, ($event.target as HTMLInputElement).checked)" />
            <span class="min-w-0"><span class="block font-medium">{{ company.name }}</span><span class="block text-xs text-muted">{{ company.subdomain || 'Sin subdominio' }}</span></span>
          </label>
        </div>
        <p class="mt-3 text-xs text-muted">Se usa el mismo alcance para ambos informes. La empresa actual debe permanecer seleccionada.</p>
      </UPageCard>

      <UAlert color="warning" variant="subtle" title="La prueba de PDF envía datos reales" description="Genera el informe de la última semana completa para las empresas seleccionadas y lo envía al grupo configurado. No activa el cron semanal." />

      <div class="grid gap-4 xl:grid-cols-2">
        <UPageCard title="3. Reporte consolidado" description="PDF semanal de la vista consolidada." variant="subtle">
          <div class="space-y-4">
            <label class="flex items-center gap-3 text-sm font-medium"><USwitch v-model="form.consolidated_enabled" :disabled="!isOwnerOrAdmin" />Incluir cada semana</label>
            <UFormField label="Grupo de WhatsApp" description="El número de OpenWA debe pertenecer a este grupo." required>
              <USelectMenu v-model="consolidatedGroupSelection" :items="groupOptions" value-key="value" searchable placeholder="Seleccionar grupo" class="w-full" :disabled="!isOwnerOrAdmin || !form.consolidated_enabled" />
            </UFormField>
            <UButton label="Guardar y enviar mensaje de prueba" icon="i-lucide-send" color="neutral" variant="outline" :loading="testing === 'consolidated'" :disabled="!isOwnerOrAdmin || testing !== null || !form.consolidated_group_id || !gatewayStatus?.gatewayEnabled" @click="sendTest('consolidated')" />
            <UButton label="Guardar y enviar PDF de prueba" icon="i-lucide-file-up" color="primary" variant="solid" :loading="testing === 'consolidated-pdf'" :disabled="!isOwnerOrAdmin || testing !== null || !form.consolidated_group_id || !gatewayStatus?.gatewayEnabled" @click="sendPdfTest('consolidated')" />
          </div>
        </UPageCard>

        <UPageCard title="4. Reporte de inventario" description="PDF semanal de inventario y logística." variant="subtle">
          <div class="space-y-4">
            <label class="flex items-center gap-3 text-sm font-medium"><USwitch v-model="form.inventory_enabled" :disabled="!isOwnerOrAdmin" />Incluir cada semana</label>
            <UFormField label="Grupo de WhatsApp" description="Puede ser un grupo diferente al del consolidado." required>
              <USelectMenu v-model="inventoryGroupSelection" :items="groupOptions" value-key="value" searchable placeholder="Seleccionar grupo" class="w-full" :disabled="!isOwnerOrAdmin || !form.inventory_enabled" />
            </UFormField>
            <UButton label="Guardar y enviar mensaje de prueba" icon="i-lucide-send" color="neutral" variant="outline" :loading="testing === 'inventory'" :disabled="!isOwnerOrAdmin || testing !== null || !form.inventory_group_id || !gatewayStatus?.gatewayEnabled" @click="sendTest('inventory')" />
            <UButton label="Guardar y enviar PDF de prueba" icon="i-lucide-file-up" color="primary" variant="solid" :loading="testing === 'inventory-pdf'" :disabled="!isOwnerOrAdmin || testing !== null || !form.inventory_group_id || !gatewayStatus?.gatewayEnabled" @click="sendPdfTest('inventory')" />
          </div>
        </UPageCard>
      </div>

      <UPageCard title="5. Envío automático" description="El cron semanal se configura por fuera de NestJS. Cada ejecución envía la última semana completa y termina." variant="subtle">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p class="font-medium">Activar reportes semanales por WhatsApp</p><p class="text-sm text-muted">El comando local y el trabajo de Dokploy procesan solo empresas con esta opción activa.</p></div>
          <USwitch v-model="form.enabled" :disabled="!isOwnerOrAdmin" aria-label="Activar reportes semanales por WhatsApp" />
        </div>
        <UAlert class="mt-4" color="info" variant="subtle" title="Zona horaria y período" description="Se envía la semana completa anterior (lunes a domingo), calculada con la zona horaria de Argentina." />
        <div class="mt-4 flex justify-end"><UButton label="Guardar configuración" icon="i-lucide-save" :loading="saving" :disabled="!isOwnerOrAdmin || loading" @click="saveSettings" /></div>
      </UPageCard>

      <UPageCard title="Historial de envíos" description="Últimas ejecuciones del cron para esta empresa." variant="subtle">
        <div v-if="runs.length" class="space-y-2">
          <div v-for="run in runs" :key="run.id" class="flex flex-col gap-2 rounded-lg border border-default p-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0"><p class="font-medium">{{ runTypeLabel(run.report_type) }} · {{ run.period_start.slice(0, 10) }} al {{ run.period_end.slice(0, 10) }}</p><p class="text-xs text-muted">{{ run.last_error || `Intentos: ${run.attempt_count} · ${formatDate(run.sent_at || run.created_at)}` }}</p></div>
            <UBadge :label="runStatus(run.status).label" :color="runStatus(run.status).color" variant="subtle" />
          </div>
        </div>
        <p v-else class="text-sm text-muted">Todavía no hay ejecuciones registradas.</p>
      </UPageCard>
    </template>
    <USkeleton v-else class="h-56" />
  </UPage>
</template>
