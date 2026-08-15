<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'

definePageMeta({
  middleware: ['auth']
})

const auth = useAuthStore()
const companyStore = useCompaniesStore()
const router = useRouter()
const toast = useToast()

// ─── State ────────────────────────────────────────────────
const form = reactive({
  name: '',
  subdomain: '',
  taxId: '',
  vat_condition: '' as string,
  address: '',
  phone: '',
  email: ''
})

const vatConditionOptions = [
  { label: 'Responsable Inscripto', value: 'RESPONSABLE_INSCRIPTO' },
  { label: 'Monotributo', value: 'MONOTRIBUTO' },
  { label: 'Exento', value: 'EXENTO' }
]

const checkingSubdomain = ref(false)
const subdomainAvailable = ref<boolean | null>(null)
const subdomainMessage = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const saving = ref(false)
const created = ref<{ name: string; subdomain: string } | null>(null)
const errorMsg = ref('')

// ─── Subdomain validation (debounced) ─────────────────────
function onSubdomainInput() {
  form.subdomain = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50)
  subdomainAvailable.value = null
  subdomainMessage.value = ''

  if (debounceTimer) clearTimeout(debounceTimer)

  if (!form.subdomain || form.subdomain.length < 3) {
    subdomainAvailable.value = null
    subdomainMessage.value = form.subdomain.length > 0 ? 'Mínimo 3 caracteres' : ''
    return
  }

  checkingSubdomain.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const res = await $fetch<{ available: boolean; message?: string }>(`/api/companies/check-subdomain?subdomain=${form.subdomain}`)
      subdomainAvailable.value = res.available
      subdomainMessage.value = res.available ? '' : (res.message || 'Este subdomain ya está en uso')
    } catch {
      subdomainAvailable.value = null
      subdomainMessage.value = ''
    } finally {
      checkingSubdomain.value = false
    }
  }, 500)
}

const canSubmit = computed(() =>
  form.name.trim().length > 0 &&
  form.subdomain.length >= 3 &&
  subdomainAvailable.value === true &&
  !saving.value
)

// ─── Submit ───────────────────────────────────────────────
async function handleSubmit() {
  if (!canSubmit.value) return

  saving.value = true
  errorMsg.value = ''

  try {
    const payload = {
      name: form.name,
      subdomain: form.subdomain,
      ...(form.taxId && { taxId: form.taxId }),
      ...(form.vat_condition && { vat_condition: form.vat_condition }),
      ...(form.address && { address: form.address }),
      ...(form.phone && { phone: form.phone }),
      ...(form.email && { email: form.email })
    }

    const result = await companyStore.create(payload)

    created.value = { name: result.name, subdomain: result.subdomain }

    // Refresh auth to include the new company
    await auth.fetchMe()

    // Select the new company
    const newCompany = auth.companies.find(c => c.id === result.id)
    if (newCompany) {
      auth.selectCompany(newCompany)
    }
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || 'Error al crear empresa'
    errorMsg.value = Array.isArray(msg) ? msg[0] : String(msg)
    toast.add({
      title: 'Error al crear empresa',
      description: errorMsg.value,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- LOADING OVERLAY                                          -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <LoadingOverlay v-if="saving" :company-name="'Creando tu empresa...'" />

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SUCCESS STATE                                             -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div v-else-if="created" class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md text-center space-y-6">
      <div class="flex justify-center">
        <div class="rounded-full bg-success/10 p-4">
          <UIcon name="i-lucide-check-circle" class="size-12 text-success" />
        </div>
      </div>

      <div>
        <h1 class="text-2xl font-bold">¡Empresa creada!</h1>
        <p class="text-muted mt-2">{{ created.name }}</p>
      </div>

      <div class="p-4 rounded-lg bg-default border border-default">
        <p class="text-sm text-muted mb-2">Tu empresa está disponible en:</p>
        <a
          :href="`https://${created.subdomain}.asterisksuite.com`"
          target="_blank"
          class="text-lg font-semibold text-primary hover:underline"
        >
          {{ created.subdomain }}.asterisksuite.com
        </a>
      </div>

      <div class="flex flex-col gap-3">
        <UButton
          label="Ingresar a mi empresa"
          icon="i-lucide-arrow-right"
          color="primary"
          block
          size="lg"
          @click="router.push('/')"
        />
        <UButton
          label="Crear otra empresa"
          variant="ghost"
          block
          @click="created = null; form.name = ''; form.subdomain = ''; form.taxId = ''; form.vat_condition = ''; form.address = ''; form.phone = ''; form.email = ''"
        />
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- FORM STATE                                                -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div v-else class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Crear tu empresa</h1>
        <p class="text-muted text-sm mt-1">Configurá los datos básicos de tu empresa para comenzar.</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Nombre -->
        <div>
          <label class="text-sm font-medium mb-1 block">Nombre de la empresa *</label>
          <UInput
            v-model="form.name"
            placeholder="Ej: Mi Empresa SRL"
            :disabled="saving"
          />
        </div>

        <!-- Subdomain -->
        <div>
          <label class="text-sm font-medium mb-1 block">Subdomain *</label>
          <div class="relative">
            <UInput
              v-model="form.subdomain"
              placeholder="mi-empresa"
              :disabled="saving"
              @input="onSubdomainInput"
            />
            <div v-if="checkingSubdomain" class="absolute right-3 top-1/2 -translate-y-1/2">
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-muted" />
            </div>
            <div v-else-if="subdomainAvailable === true" class="absolute right-3 top-1/2 -translate-y-1/2">
              <UIcon name="i-lucide-check-circle" class="size-4 text-success" />
            </div>
            <div v-else-if="subdomainAvailable === false" class="absolute right-3 top-1/2 -translate-y-1/2">
              <UIcon name="i-lucide-x-circle" class="size-4 text-error" />
            </div>
          </div>
          <p v-if="subdomainMessage" class="text-sm mt-1" :class="subdomainAvailable === false ? 'text-error' : 'text-muted'">
            {{ subdomainMessage }}
          </p>
          <p v-else-if="form.subdomain && form.subdomain.length >= 3 && subdomainAvailable === true" class="text-sm text-success mt-1">
            {{ form.subdomain }}.asterisksuite.com
          </p>
        </div>

        <!-- Fiscal -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium mb-1 block">CUIT / Identificación</label>
            <UInput v-model="form.taxId" placeholder="20-12345678-9" :disabled="saving" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">Condición IVA</label>
            <USelect v-model="form.vat_condition" :items="vatConditionOptions" placeholder="Seleccionar..." :disabled="saving" />
          </div>
        </div>

        <!-- Dirección -->
        <div>
          <label class="text-sm font-medium mb-1 block">Dirección</label>
          <UInput v-model="form.address" placeholder="Av. Principal 1234" :disabled="saving" />
        </div>

        <!-- Contacto -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium mb-1 block">Teléfono</label>
            <UInput v-model="form.phone" placeholder="+54 11 1234-5678" :disabled="saving" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">Email</label>
            <UInput v-model="form.email" type="email" placeholder="empresa@ejemplo.com" :disabled="saving" />
          </div>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" class="p-3 rounded-lg bg-error/10 border border-error/20">
          <p class="text-sm text-error">{{ errorMsg }}</p>
        </div>

        <!-- Submit -->
        <div class="pt-4">
          <UButton
            type="submit"
            label="Crear empresa"
            color="primary"
            block
            size="lg"
            :loading="saving"
            :disabled="!canSubmit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
