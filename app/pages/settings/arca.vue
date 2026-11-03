<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'
import { ArcaSettingsService, type ArcaSettings } from '~/modulos/erp/fiscal/services/arca-settings.service'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const authStore = useAuthStore()
const toast = useToast()
const companyId = computed(() => authStore.selectedCompany?.id ?? '')

const settings = ref<ArcaSettings | null>(null)
const issuerCuit = ref('')
const certificateFile = ref<File | null>(null)
const privateKeyFile = ref<File | null>(null)
const certificateInput = ref<HTMLInputElement | null>(null)
const privateKeyInput = ref<HTMLInputElement | null>(null)
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const simulating = ref(false)
const savingPoint = ref(false)
const selectedPointOfSale = ref<number | undefined>(undefined)

const canSaveCredentials = computed(() => Boolean(issuerCuit.value && certificateFile.value && privateKeyFile.value))
const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'

function errorMessage(error: any, fallback: string) {
  const message = error?.data?.message ?? error?.message
  return Array.isArray(message) ? message.join(' ') : message || fallback
}

function setCertificate(event: Event) {
  certificateFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function setPrivateKey(event: Event) {
  privateKeyFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function loadSettings() {
  if (!companyId.value) return
  loading.value = true
  try {
    settings.value = await ArcaSettingsService.get()
    issuerCuit.value = settings.value.issuer_cuit ?? ''
    selectedPointOfSale.value = settings.value.point_of_sale ?? undefined
  } catch (error) {
    toast.add({ title: 'No se pudo cargar ARCA', description: errorMessage(error, 'Revisá tu acceso a la empresa.'), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function saveCredentials() {
  if (!issuerCuit.value || !certificateFile.value || !privateKeyFile.value) return
  saving.value = true
  try {
    settings.value = await ArcaSettingsService.saveCredentials(
      issuerCuit.value.replace(/\D/g, ''), certificateFile.value, privateKeyFile.value
    )
    selectedPointOfSale.value = undefined
    certificateFile.value = null
    privateKeyFile.value = null
    if (certificateInput.value) certificateInput.value.value = ''
    if (privateKeyInput.value) privateKeyInput.value.value = ''
    toast.add({ title: 'Credenciales guardadas', description: 'Los archivos quedaron cifrados. Ahora podés probar el acceso a ARCA.', color: 'success' })
  } catch (error) {
    toast.add({ title: 'No se pudo guardar', description: errorMessage(error, 'Verificá el CUIT y los archivos seleccionados.'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    settings.value = await ArcaSettingsService.test()
    selectedPointOfSale.value = settings.value.point_of_sale ?? undefined
    toast.add({ title: 'Conexión de homologación aprobada', description: settings.value.last_test_message ?? '', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Falló la prueba de ARCA', description: errorMessage(error, 'Revisá el certificado, la autorización en WSASS y la conectividad.'), color: 'error' })
    await loadSettings()
  } finally {
    testing.value = false
  }
}

async function simulateConnection() {
  simulating.value = true
  try {
    settings.value = await ArcaSettingsService.simulateTest()
    selectedPointOfSale.value = undefined
    toast.add({ title: 'Simulación completada', description: 'No se usaron credenciales ni se contactó con ARCA.', color: 'warning' })
  } catch (error) {
    toast.add({ title: 'No se pudo iniciar la simulación', description: errorMessage(error, 'Revisá ARCA_HOMOLOGATION_MOCK_ENABLED en el backend.'), color: 'error' })
    await loadSettings()
  } finally {
    simulating.value = false
  }
}

async function savePointOfSale() {
  savingPoint.value = true
  try {
    settings.value = await ArcaSettingsService.selectPointOfSale(selectedPointOfSale.value ?? null)
    toast.add({ title: 'Punto de venta guardado', color: 'success' })
  } catch (error) {
    toast.add({ title: 'No se pudo guardar el punto de venta', description: errorMessage(error, 'Probá nuevamente la conexión con ARCA.'), color: 'error' })
  } finally {
    savingPoint.value = false
  }
}

watch(companyId, () => { void loadSettings() }, { immediate: true })
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
    <AppPageHeader title="Conexión con ARCA" description="Configurá y probá el acceso de esta empresa al entorno de homologación." />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-flask-conical"
      title="Entorno de pruebas"
      description="Esta configuración solo se conecta a homologación. No emite comprobantes válidos ni afecta la numeración de producción."
    />

    <UAlert
      v-if="settings?.simulation_enabled"
      color="warning"
      variant="subtle"
      icon="i-lucide-flask-conical"
      title="Simulación local disponible"
      description="Podés probar la pantalla con datos ficticios. La simulación no guarda credenciales ni se conecta con ARCA."
    />

    <div v-if="loading" class="py-10 text-center text-muted">Cargando configuración de ARCA…</div>

    <template v-else>
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold">Credenciales de homologación</h2>
              <p class="mt-1 text-sm text-muted">Subí el certificado y la clave privada que generaste en WSASS.</p>
            </div>
            <UBadge color="info" variant="subtle">Homologación</UBadge>
          </div>
        </template>

        <div class="flex flex-col gap-5">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-shield-alert"
            title="La clave privada se guarda cifrada"
            description="Solo OWNER o ADMIN pueden administrarla. No se vuelve a mostrar después de guardarla y nunca se envía al navegador desde el backend."
          />

          <UFormField label="CUIT emisor / CUIT representada" description="El CUIT de la empresa para la que ARCA debe autorizar el servicio." required>
            <UInput v-model="issuerCuit" inputmode="numeric" maxlength="13" placeholder="30123456789" class="w-full sm:max-w-sm" />
          </UFormField>

          <div class="grid gap-5 md:grid-cols-2">
            <UFormField label="Certificado X.509" description="Archivo PEM o CRT en formato PEM. Máximo 64 KB." required>
              <input ref="certificateInput" type="file" accept=".pem,.crt,.cer" class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-default" @change="setCertificate">
              <p v-if="certificateFile" class="mt-2 truncate text-xs text-muted">{{ certificateFile.name }}</p>
            </UFormField>
            <UFormField label="Clave privada" description="Archivo KEY o PEM sin contraseña. Máximo 64 KB." required>
              <input ref="privateKeyInput" type="file" accept=".key,.pem" class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-default" @change="setPrivateKey">
              <p v-if="privateKeyFile" class="mt-2 truncate text-xs text-muted">{{ privateKeyFile.name }}</p>
            </UFormField>
          </div>

          <div v-if="settings?.configured" class="rounded-lg border border-default bg-elevated/40 p-4 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <UIcon name="i-lucide-key-round" class="size-4 text-primary" />
              <span class="font-medium">Certificado configurado</span>
              <UBadge color="neutral" variant="subtle">{{ settings.issuer_cuit }}</UBadge>
            </div>
            <p class="mt-2 break-all text-muted">{{ settings.certificate_subject || 'Sujeto del certificado disponible' }}</p>
            <p class="mt-1 text-xs text-muted">Vence: {{ formatDate(settings.certificate_valid_to) }}</p>
          </div>

          <div class="flex flex-wrap justify-end gap-3">
            <UButton v-if="settings?.simulation_enabled" label="Simular con datos ficticios" icon="i-lucide-flask-conical" color="warning" variant="soft" :loading="simulating" :disabled="saving || testing" @click="simulateConnection" />
            <UButton label="Guardar credenciales" icon="i-lucide-lock-keyhole" :loading="saving" :disabled="!canSaveCredentials" @click="saveCredentials" />
            <UButton label="Probar conexión con ARCA" icon="i-lucide-plug-zap" color="neutral" variant="outline" :loading="testing" :disabled="!settings?.configured || saving" @click="testConnection" />
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Resultado y punto de venta</h2>
        </template>
        <div class="flex flex-col gap-4">
          <div v-if="settings?.last_test_status === 'READY'" class="flex items-start gap-3 rounded-lg border p-4" :class="settings.simulated ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5'">
            <UIcon :name="settings.simulated ? 'i-lucide-flask-conical' : 'i-lucide-circle-check'" class="mt-0.5 size-5" :class="settings.simulated ? 'text-warning' : 'text-success'" />
            <div>
              <p class="font-medium">{{ settings.simulated ? 'Resultado simulado' : 'Conexión comprobada' }}</p>
              <p class="text-sm text-muted">{{ settings.last_test_message }}</p>
              <p class="mt-1 text-xs text-muted">Última prueba: {{ formatDate(settings.last_tested_at) }}</p>
            </div>
          </div>
          <div v-else-if="settings?.last_test_status === 'ERROR'" class="flex items-start gap-3 rounded-lg border border-error/30 bg-error/5 p-4">
            <UIcon name="i-lucide-circle-x" class="mt-0.5 size-5 text-error" />
            <div>
              <p class="font-medium">No se pudo validar el acceso</p>
              <p class="text-sm text-muted">{{ settings.last_test_message }}</p>
              <p class="mt-1 text-xs text-muted">Última prueba: {{ formatDate(settings.last_tested_at) }}</p>
            </div>
          </div>
          <p v-else class="text-sm text-muted">Guardá las credenciales y probá la conexión para consultar los puntos de venta habilitados.</p>

          <div v-if="settings?.last_test_status === 'READY' && settings.simulated" class="flex flex-wrap gap-2">
            <span class="w-full text-sm text-muted">Puntos de venta de muestra:</span>
            <UBadge v-for="point in settings.points_of_sale" :key="point.number" color="warning" variant="subtle">{{ String(point.number).padStart(5, '0') }} · {{ point.emissionType }}</UBadge>
          </div>
          <div v-else-if="settings?.last_test_status === 'READY'" class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <UFormField label="Punto de venta de prueba" description="Se elige entre los puntos que devolvió ARCA." class="w-full sm:max-w-sm">
              <USelect
                v-model="selectedPointOfSale"
                :items="settings.points_of_sale.map(point => ({ label: `${String(point.number).padStart(5, '0')} · ${point.emissionType}`, value: point.number }))"
                value-key="value"
                placeholder="Seleccionar punto de venta"
                class="w-full"
              />
            </UFormField>
              <UButton label="Guardar punto de venta" icon="i-lucide-save" variant="outline" :loading="savingPoint" :disabled="selectedPointOfSale === settings.point_of_sale || selectedPointOfSale === undefined" @click="savePointOfSale" />
          </div>
          <p v-if="settings?.point_of_sale" class="text-sm text-muted">Punto de venta seleccionado: <strong>{{ String(settings.point_of_sale).padStart(5, '0') }}</strong></p>
        </div>
      </UCard>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="Todavía no se emiten facturas"
        description="Esta etapa guarda las credenciales, valida WSAA/WSFE y permite seleccionar un punto de venta. La emisión de comprobantes en homologación se habilitará después de verificar esta configuración."
      />
    </template>
  </div>
</template>
