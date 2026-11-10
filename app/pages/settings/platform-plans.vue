<script setup lang="ts">
import type {
  PlatformAdministrator,
  PlatformAdministratorCandidate,
  PlatformCompanySubscription,
  PlatformPlan
} from '~/modulos/platform-modules/platform-plans.service'
import { usePlatformPlansService } from '~/modulos/platform-modules/platform-plans.service'
import { useCompaniesService } from '~/modulos/companies/service/company.service'
import { useAuthStore } from '~/modulos/auth/auth.store'

definePageMeta({ middleware: ['auth'] })

const auth = useAuthStore()
if (!['PLATFORM_OWNER', 'PLATFORM_ADMIN'].includes(auth.user?.role ?? '')) {
  throw createError({ statusCode: 403, statusMessage: 'Acceso exclusivo para administradores de la plataforma' })
}
const isPlatformOwner = computed(() => auth.user?.role === 'PLATFORM_OWNER')

const api = usePlatformPlansService()
const companiesApi = useCompaniesService()
const config = useRuntimeConfig()
const companyBaseDomain = String(config.public.baseDomain || 'asterisksuite.cloud')
const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const catalog = ref<Awaited<ReturnType<typeof api.catalog>>>([])
const plans = ref<PlatformPlan[]>([])
const companies = ref<PlatformCompanySubscription[]>([])
const administrators = ref<PlatformAdministrator[]>([])
const metrics = ref<{
  auditedViolations: number
  auditWindowDays: number
  violationsByModule: Record<string, number>
} | null>(null)
const selectedPlanId = ref<string | null>(null)
const selectedCompanyId = ref<string | undefined>()
const activeTab = ref<'plans' | 'companies' | 'administrators' | 'create'>('companies')
const enabledModules = ref<string[]>([])
const companyDrafts = reactive<Record<string, { planId: string; status: string }>>({})
const savingOverrides = reactive<Record<string, boolean>>({})
const newPlanOpen = ref(false)
const newPlan = reactive({ code: '', name: '', description: '' })
const creatingCompany = ref(false)
const checkingSubdomain = ref(false)
const subdomainAvailable = ref<boolean | null>(null)
const checkingOwner = ref(false)
const ownerAccount = ref<{ id: string; name: string; email: string } | null>(null)
const companyForm = reactive({
  name: '',
  subdomain: '',
  ownerEmail: '',
  planId: '',
  status: 'ACTIVE',
  trialEndsAt: '',
  taxId: '',
  vat_condition: '',
  address: '',
  phone: '',
  email: ''
})
const administratorDialogOpen = ref(false)
const administratorAccountEmail = ref('')
const administratorCandidate = ref<PlatformAdministratorCandidate | null>(null)
const administratorCompanyIds = ref<string[]>([])
const editingAdministratorId = ref<string | null>(null)
const findingAdministrator = ref(false)
const savingAdministrator = ref(false)
const administratorToRevoke = ref<PlatformAdministrator | null>(null)
const revokeAdministratorDialogOpen = ref(false)
const revokingAdministrator = ref(false)
const companyToDelete = ref<PlatformCompanySubscription | null>(null)
const deleteCompanyDialogOpen = ref(false)
const deletingCompany = ref(false)
const deleteSubdomainConfirmation = ref('')

const planOptions = computed(() =>
  plans.value.filter((plan) => plan.active).map((plan) => ({ label: plan.name, value: plan.id }))
)
const statusOptions = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'].map((value) => ({
  label: value,
  value
}))
const overrideOptions = [
  { label: 'Según el plan', value: 'PLAN' },
  { label: 'Habilitado', value: 'ENABLED' },
  { label: 'Solo lectura', value: 'READ_ONLY' },
  { label: 'Deshabilitado', value: 'DISABLED' }
]
const companyStatusOptions = [
  { label: 'Activa', value: 'ACTIVE' },
  { label: 'Prueba', value: 'TRIAL' },
  { label: 'Suspendida', value: 'SUSPENDED' }
]
const vatConditionOptions = [
  { label: 'Responsable Inscripto', value: 'RESPONSABLE_INSCRIPTO' },
  { label: 'Monotributo', value: 'MONOTRIBUTO' },
  { label: 'Exento', value: 'EXENTO' }
]
const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value) ?? null)
const selectedCompany = computed(
  () => companies.value.find((company) => company.id === selectedCompanyId.value) ?? null
)
const administratorCompanyOptions = computed(() =>
  companies.value.map((company) => ({
    label: `${company.name} · ${company.subdomain}`,
    value: company.id
  }))
)
const canCreateCompany = computed(() =>
  isPlatformOwner.value &&
  companyForm.name.trim().length > 1 &&
  subdomainAvailable.value === true &&
  !!ownerAccount.value &&
  ownerAccount.value.email.toLowerCase() === companyForm.ownerEmail.trim().toLowerCase() &&
  !!companyForm.planId &&
  (companyForm.status !== 'TRIAL' || !!companyForm.trialEndsAt) &&
  !creatingCompany.value
)
const canSaveAdministrator = computed(() =>
  isPlatformOwner.value &&
  !!administratorCandidate.value &&
  administratorCompanyIds.value.length > 0 &&
  !savingAdministrator.value
)
const canDeleteCompany = computed(() =>
  isPlatformOwner.value &&
  !!companyToDelete.value?.subdomain &&
  deleteSubdomainConfirmation.value.trim().toLowerCase() === companyToDelete.value.subdomain.toLowerCase() &&
  !deletingCompany.value
)

function hydrate() {
  for (const company of companies.value) {
    companyDrafts[company.id] = {
      planId: company.subscription?.plan_id ?? '',
      status: company.subscription?.status ?? 'ACTIVE'
    }
  }
  if (!selectedPlanId.value) selectedPlanId.value = plans.value[0]?.id ?? null
  if (!selectedCompanyId.value) selectedCompanyId.value = companies.value[0]?.id
  if (!companyForm.planId) companyForm.planId = planOptions.value[0]?.value ?? ''
}

watch(
  selectedPlan,
  (plan) => {
    enabledModules.value = plan?.modules.filter((item) => item.enabled).map((item) => item.module_code) ?? []
  },
  { immediate: true }
)

async function load() {
  loading.value = true
  try {
    const [nextCatalog, nextPlans, nextCompanies, nextMetrics, nextAdministrators] = await Promise.all([
      api.catalog(),
      api.plans(),
      api.companies(),
      isPlatformOwner.value ? api.metrics() : Promise.resolve(null),
      isPlatformOwner.value ? api.administrators() : Promise.resolve([])
    ])
    catalog.value = nextCatalog
    plans.value = nextPlans
    companies.value = nextCompanies
    metrics.value = nextMetrics
    administrators.value = nextAdministrators
    hydrate()
  } finally {
    loading.value = false
  }
}

async function savePlanModules() {
  if (!isPlatformOwner.value || !selectedPlan.value) return
  saving.value = true
  try {
    await api.setPlanModules(
      selectedPlan.value.id,
      catalog.value.map((module) => ({
        moduleCode: module.code,
        enabled: module.is_core || enabledModules.value.includes(module.code),
        limits: selectedPlan.value?.modules.find((item) => item.module_code === module.code)?.limits ?? {}
      }))
    )
    toast.add({ title: 'Plan actualizado', color: 'success' })
    plans.value = await api.plans()
  } finally {
    saving.value = false
  }
}

async function createPlan() {
  if (!isPlatformOwner.value) return
  saving.value = true
  try {
    const created = await api.createPlan(newPlan)
    newPlanOpen.value = false
    Object.assign(newPlan, { code: '', name: '', description: '' })
    plans.value = await api.plans()
    selectedPlanId.value = created.id
    toast.add({ title: 'Plan creado', color: 'success' })
  } finally {
    saving.value = false
  }
}

async function saveCompany(company: PlatformCompanySubscription) {
  const draft = companyDrafts[company.id]
  if (!draft?.planId) return
  await api.setSubscription(company.id, draft)
  companies.value = await api.companies()
  hydrate()
  toast.add({ title: `Plan actualizado para ${company.name}`, color: 'success' })
}

function askDeleteCompany(company: PlatformCompanySubscription) {
  if (!isPlatformOwner.value) return
  companyToDelete.value = company
  deleteSubdomainConfirmation.value = ''
  deleteCompanyDialogOpen.value = true
}

async function deleteCompany() {
  const company = companyToDelete.value
  if (!company || !canDeleteCompany.value) return

  deletingCompany.value = true
  try {
    await api.deleteCompany(company.id, deleteSubdomainConfirmation.value.trim())
    companies.value = companies.value.filter((item) => item.id !== company.id)
    delete companyDrafts[company.id]
    if (selectedCompanyId.value === company.id) selectedCompanyId.value = companies.value[0]?.id
    hydrate()

    const selection = auth.removeCompany(company.id)
    toast.add({
      title: 'Empresa eliminada',
      description: `Se eliminó ${company.name} y sus accesos. Las cuentas de usuario se conservaron.`,
      color: 'success'
    })
    deleteCompanyDialogOpen.value = false
    companyToDelete.value = null

    if (selection.selectedWasRemoved) {
      const currentHost = window.location.hostname.toLowerCase()
      const baseDomain = companyBaseDomain.replace(/^\.+|\.+$/g, '').toLowerCase()
      const deletedCompanyHost = `${company.subdomain}.${baseDomain}`
      const portSuffix = window.location.port ? `:${window.location.port}` : ''
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`

      if (currentHost === deletedCompanyHost && selection.nextCompany) {
        window.location.href = `${window.location.protocol}//${selection.nextCompany.subdomain}.${baseDomain}${portSuffix}${currentPath}`
      } else if (currentHost === deletedCompanyHost) {
        window.location.href = `${window.location.protocol}//admin.${baseDomain}${portSuffix}/settings/platform-plans`
      } else {
        window.location.reload()
      }
    }
  } catch (error: any) {
    toast.add({
      title: 'No se pudo completar la eliminación',
      description: error?.data?.message || error?.message || 'La empresa sigue disponible. Revisá el estado e intentá nuevamente.',
      color: 'error'
    })
  } finally {
    deletingCompany.value = false
  }
}

function overrideState(moduleCode: string) {
  return selectedCompany.value?.moduleOverrides.find((item) => item.module_code === moduleCode)?.state ?? 'PLAN'
}

function moduleIncludedInPlan(moduleCode: string) {
  const planId = selectedCompany.value?.subscription?.plan_id
  return plans.value.find((plan) => plan.id === planId)?.modules.some(
    (item) => item.module_code === moduleCode && item.enabled
  ) ?? false
}

function moduleAccessSummary(moduleCode: string) {
  const override = overrideState(moduleCode)
  if (override === 'ENABLED') return 'Excepción: habilitado para esta empresa'
  if (override === 'READ_ONLY') return 'Excepción: solo lectura'
  if (override === 'DISABLED') return 'Excepción: deshabilitado para esta empresa'
  if (!selectedCompany.value?.subscription) return 'Sin plan asignado'
  return moduleIncludedInPlan(moduleCode) ? 'Incluido en el plan' : 'No incluido en el plan'
}

function updateCompanyDraft(companyId: string, field: 'planId' | 'status', value: string) {
  const draft = companyDrafts[companyId]
  if (draft) draft[field] = value
}

function openNewPlan() {
  if (!isPlatformOwner.value) return
  newPlanOpen.value = true
}
function closeNewPlan() {
  newPlanOpen.value = false
}
function setActiveTab(tab: 'plans' | 'companies' | 'administrators' | 'create') {
  if (!isPlatformOwner.value && tab !== 'companies') return
  activeTab.value = tab
}
function openCompanyCreate() {
  if (!isPlatformOwner.value) return
  activeTab.value = 'create'
}
function openAdministratorCreate() {
  if (!isPlatformOwner.value) return
  editingAdministratorId.value = null
  administratorAccountEmail.value = ''
  administratorCandidate.value = null
  administratorCompanyIds.value = []
  administratorDialogOpen.value = true
}
function editAdministrator(administrator: PlatformAdministrator) {
  if (!isPlatformOwner.value) return
  editingAdministratorId.value = administrator.id
  administratorAccountEmail.value = administrator.email
  administratorCandidate.value = {
    id: administrator.id,
    name: administrator.name,
    email: administrator.email,
    alreadyPlatformAdmin: true
  }
  administratorCompanyIds.value = administrator.companies.map((company) => company.id)
  administratorDialogOpen.value = true
}
async function findAdministratorAccount() {
  if (!isPlatformOwner.value || !administratorAccountEmail.value.trim()) return
  findingAdministrator.value = true
  administratorCandidate.value = null
  try {
    const candidate = await api.findAdministratorAccount(administratorAccountEmail.value.trim())
    administratorCandidate.value = candidate
    editingAdministratorId.value = candidate.alreadyPlatformAdmin ? candidate.id : null
    administratorCompanyIds.value = candidate.alreadyPlatformAdmin
      ? administrators.value.find((item) => item.id === candidate.id)?.companies.map((company) => company.id) ?? []
      : []
    toast.add({
      title: candidate.alreadyPlatformAdmin ? 'Administrador encontrado' : 'Cuenta encontrada',
      description: `${candidate.name} · ${candidate.email}`,
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo validar la cuenta',
      description: error?.data?.message || error?.message || 'Verificá el email e intentá nuevamente.',
      color: 'error'
    })
  } finally {
    findingAdministrator.value = false
  }
}
async function saveAdministrator() {
  if (!isPlatformOwner.value || !administratorCandidate.value || administratorCompanyIds.value.length === 0) return
  savingAdministrator.value = true
  try {
    const wasAlreadyAdmin = administratorCandidate.value.alreadyPlatformAdmin
    await api.setAdministratorScopes(administratorCandidate.value.id, administratorCompanyIds.value)
    administrators.value = await api.administrators()
    administratorDialogOpen.value = false
    toast.add({
      title: wasAlreadyAdmin ? 'Alcance actualizado' : 'Administrador de plataforma asignado',
      description: wasAlreadyAdmin
        ? 'Los cambios de empresas ya están activos.'
        : 'El nuevo rol estará disponible para la persona cuando vuelva a iniciar sesión.',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo guardar el administrador',
      description: error?.data?.message || error?.message || 'Intentá nuevamente.',
      color: 'error'
    })
  } finally {
    savingAdministrator.value = false
  }
}
function askRevokeAdministrator(administrator: PlatformAdministrator) {
  if (!isPlatformOwner.value) return
  administratorToRevoke.value = administrator
  revokeAdministratorDialogOpen.value = true
}
function closeAdministratorDialog() {
  administratorDialogOpen.value = false
}
function closeRevokeAdministratorDialog() {
  revokeAdministratorDialogOpen.value = false
}
async function revokeAdministrator() {
  if (!isPlatformOwner.value || !administratorToRevoke.value) return
  revokingAdministrator.value = true
  try {
    await api.revokeAdministrator(administratorToRevoke.value.id)
    administrators.value = await api.administrators()
    toast.add({
      title: 'Acceso revocado',
      description: `Se quitó el rol de plataforma a ${administratorToRevoke.value.name} y se restauró su rol anterior.`,
      color: 'success'
    })
    revokeAdministratorDialogOpen.value = false
    administratorToRevoke.value = null
  } catch (error: any) {
    toast.add({
      title: 'No se pudo revocar el acceso',
      description: error?.data?.message || error?.message || 'Intentá nuevamente.',
      color: 'error'
    })
  } finally {
    revokingAdministrator.value = false
  }
}
function normalizeSubdomain() {
  companyForm.subdomain = companyForm.subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 50)
}
async function checkCompanySubdomain() {
  normalizeSubdomain()
  if (companyForm.subdomain.length < 3) {
    toast.add({ title: 'Subdominio inválido', description: 'Usá al menos 3 caracteres.', color: 'warning' })
    return
  }
  checkingSubdomain.value = true
  try {
    const result = await companiesApi.checkSubdomain(companyForm.subdomain)
    subdomainAvailable.value = result.available
    toast.add({
      title: result.available ? 'Subdominio disponible' : 'Subdominio ocupado',
      description: result.message,
      color: result.available ? 'success' : 'warning'
    })
  } catch (error: any) {
    subdomainAvailable.value = null
    toast.add({ title: 'No se pudo verificar el subdominio', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    checkingSubdomain.value = false
  }
}
async function verifyOwnerAccount() {
  if (!isPlatformOwner.value) return
  const email = companyForm.ownerEmail.trim().toLowerCase()
  if (!email) return
  checkingOwner.value = true
  ownerAccount.value = null
  try {
    ownerAccount.value = await api.findOwnerAccount(email)
    toast.add({ title: 'Titular verificado', description: `${ownerAccount.value.name} · ${ownerAccount.value.email}`, color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'No se encontró una cuenta activa',
      description: error?.data?.message || 'La persona debe registrarse primero en Asterisk Suite.',
      color: 'warning'
    })
  } finally {
    checkingOwner.value = false
  }
}
async function createCompany() {
  if (!isPlatformOwner.value || !canCreateCompany.value || !ownerAccount.value) return
  creatingCompany.value = true
  try {
    const result = await api.createCompany({
      name: companyForm.name.trim(),
      subdomain: companyForm.subdomain,
      ownerEmail: ownerAccount.value.email,
      planId: companyForm.planId,
      status: companyForm.status,
      ...(companyForm.status === 'TRIAL' ? { trialEndsAt: companyForm.trialEndsAt } : {}),
      ...(companyForm.taxId.trim() ? { taxId: companyForm.taxId.trim() } : {}),
      ...(companyForm.vat_condition ? { vat_condition: companyForm.vat_condition } : {}),
      ...(companyForm.address.trim() ? { address: companyForm.address.trim() } : {}),
      ...(companyForm.phone.trim() ? { phone: companyForm.phone.trim() } : {}),
      ...(companyForm.email.trim() ? { email: companyForm.email.trim() } : {})
    })
    let companyListRefreshed = true
    try {
      companies.value = await api.companies()
      hydrate()
    } catch {
      companyListRefreshed = false
      companies.value.unshift({
        ...result.company,
        subscription: {
          id: '',
          status: companyForm.status,
          plan_id: result.plan.id,
          plan: result.plan
        },
        moduleOverrides: []
      })
      hydrate()
    }
    selectedCompanyId.value = result.company.id
    activeTab.value = 'companies'
    toast.add({
      title: 'Empresa creada',
      description: `${result.company.name} ya está asociada a ${result.owner.name} y al plan ${result.plan.name}.${companyListRefreshed ? '' : ' La lista no se pudo actualizar; la empresa quedó cargada en esta pantalla.'}`,
      color: 'success'
    })
    Object.assign(companyForm, {
      name: '', subdomain: '', ownerEmail: '', planId: planOptions.value[0]?.value ?? '', status: 'ACTIVE',
      trialEndsAt: '', taxId: '', vat_condition: '', address: '', phone: '', email: ''
    })
    ownerAccount.value = null
    subdomainAvailable.value = null
  } catch (error: any) {
    toast.add({
      title: 'No se pudo completar el alta',
      description: error?.data?.message || error?.message || 'Revisá los datos e intentá nuevamente.',
      color: 'error'
    })
  } finally {
    creatingCompany.value = false
  }
}
function togglePlanModule(moduleCode: string, enabled: boolean) {
  enabledModules.value = enabled
    ? [...new Set([...enabledModules.value, moduleCode])]
    : enabledModules.value.filter((code) => code !== moduleCode)
}

watch(() => companyForm.ownerEmail, () => { ownerAccount.value = null })
watch(() => companyForm.subdomain, () => { subdomainAvailable.value = null })

async function changeOverride(moduleCode: string, state: string) {
  const company = selectedCompany.value
  if (!company) return
  const key = `${company.id}:${moduleCode}`
  savingOverrides[key] = true
  try {
    if (state === 'PLAN') await api.removeOverride(company.id, moduleCode)
    else await api.setOverride(company.id, moduleCode, { state })
    companies.value = await api.companies()
    hydrate()
    toast.add({ title: `Acceso actualizado: ${company.name}`, color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo actualizar el módulo',
      description: error?.data?.message || error?.message || 'Intentá nuevamente.',
      color: 'error'
    })
  } finally {
    delete savingOverrides[key]
  }
}

onMounted(load)
</script>

<template>
  <UPage class="space-y-6 px-4 pb-10">
    <AppPageHeader
      title="Planes y módulos"
      description="Elegí el plan de cada empresa y administrá sus módulos habilitados."
    >
      <template #actions>
        <div v-if="isPlatformOwner" class="flex flex-wrap gap-2">
          <UButton label="Alta de empresa" icon="i-lucide-building-2" variant="outline" @click="openCompanyCreate" />
          <UButton label="Nuevo plan" icon="i-lucide-plus" @click="openNewPlan" />
        </div>
      </template>
    </AppPageHeader>

    <UAlert
      icon="i-lucide-shield-check"
      color="info"
      title="Administración por empresa"
      :description="isPlatformOwner
        ? 'Podés gestionar todas las empresas, configurar planes globales y dar de alta empresas.'
        : 'Solo podés gestionar las empresas asociadas a tu usuario. El propietario de la plataforma administra los planes globales y las altas.'"
    />
    <div v-if="metrics" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <p class="text-sm text-muted">Empresas administradas</p>
        <p class="mt-1 text-2xl font-semibold">{{ companies.length }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Planes configurados</p>
        <p class="mt-1 text-2xl font-semibold">{{ plans.length }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Alertas de auditoría ({{ metrics.auditWindowDays }} días)</p>
        <p class="mt-1 text-2xl font-semibold">{{ metrics.auditedViolations }}</p>
      </UCard>
    </div>
    <div v-if="loading" class="grid gap-4 lg:grid-cols-2">
      <USkeleton class="h-96" />
      <USkeleton class="h-96" />
    </div>
    <div v-else class="space-y-4">
      <div class="flex gap-2 border-b border-default pb-3">
        <UButton v-if="isPlatformOwner" label="Planes" :variant="activeTab === 'plans' ? 'soft' : 'ghost'" @click="setActiveTab('plans')" />
        <UButton
          label="Empresas y módulos"
          :variant="activeTab === 'companies' ? 'soft' : 'ghost'"
          @click="setActiveTab('companies')"
        />
        <UButton
          v-if="isPlatformOwner"
          label="Administradores"
          icon="i-lucide-shield-user"
          :variant="activeTab === 'administrators' ? 'soft' : 'ghost'"
          @click="setActiveTab('administrators')"
        />
        <UButton
          v-if="isPlatformOwner"
          label="Alta de empresa"
          icon="i-lucide-building-2"
          :variant="activeTab === 'create' ? 'soft' : 'ghost'"
          @click="openCompanyCreate"
        />
      </div>
      <div v-if="isPlatformOwner && activeTab === 'plans'">
        <div class="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <UCard>
            <div class="space-y-2">
              <button
                v-for="plan in plans"
                :key="plan.id"
                class="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-elevated"
                :class="selectedPlanId === plan.id ? 'bg-elevated ring-1 ring-primary' : ''"
                @click="selectedPlanId = plan.id"
              >
                <span>
                  <span class="block font-medium">{{ plan.name }}</span>
                  <span class="text-xs text-muted">{{ plan._count?.subscriptions ?? 0 }} empresas</span>
                </span>
                <UBadge v-if="plan.is_legacy" label="Histórico" color="neutral" />
              </button>
            </div>
          </UCard>
          <UCard v-if="selectedPlan">
            <template #header>
              <div>
                <h2 class="font-semibold">Módulos de {{ selectedPlan.name }}</h2>
                <p class="text-sm text-muted">Los módulos esenciales permanecen siempre activos.</p>
              </div>
            </template>
            <div class="grid gap-3 md:grid-cols-2">
              <label
                v-for="module in catalog"
                :key="module.code"
                class="flex items-center justify-between gap-3 rounded-lg border border-default p-3"
              >
                <span>
                  <span class="block font-medium">{{ module.name }}</span>
                  <span class="text-xs text-muted">{{ module.description }}</span>
                </span>
                <USwitch
                  :model-value="module.is_core || enabledModules.includes(module.code)"
                  :disabled="module.is_core"
                  @update:model-value="(value) => togglePlanModule(module.code, Boolean(value))"
                />
              </label>
            </div>
            <template #footer>
              <div class="flex justify-end">
                <UButton label="Guardar módulos" :loading="saving" @click="savePlanModules" />
              </div>
            </template>
          </UCard>
        </div>
      </div>
      <div v-else-if="activeTab === 'companies' || !isPlatformOwner">
        <div class="mt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-semibold">Módulos de la empresa</h2>
                  <p class="text-sm text-muted">Activá, limitá a solo lectura o deshabilitá módulos sin cambiar el plan compartido.</p>
                </div>
                <USelect
                  v-model="selectedCompanyId"
                  :items="companies.map((company) => ({ label: `${company.name} · ${company.subdomain}`, value: company.id }))"
                  value-key="value"
                  class="w-full sm:w-80"
                />
              </div>
            </template>
            <div v-if="selectedCompany" class="mb-4 flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ selectedCompany.name }}</span>
              <UBadge :label="selectedCompany.subscription?.plan.name ?? 'Sin plan asignado'" color="neutral" variant="subtle" />
              <UBadge :label="selectedCompany.subscription?.status ?? 'Sin suscripción'" color="info" variant="subtle" />
            </div>
            <div v-if="selectedCompany" class="grid gap-3 md:grid-cols-2">
              <div
                v-for="module in catalog.filter((item) => !item.is_core)"
                :key="module.code"
                class="flex flex-col justify-between gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ module.name }}</span>
                    <UBadge
                      :label="overrideState(module.code) === 'PLAN' ? (moduleIncludedInPlan(module.code) ? 'Por plan' : 'Fuera del plan') : 'Excepción'"
                      :color="overrideState(module.code) === 'PLAN' ? (moduleIncludedInPlan(module.code) ? 'success' : 'neutral') : 'warning'"
                      variant="subtle"
                    />
                  </div>
                  <p class="mt-1 text-sm text-muted">{{ module.description || moduleAccessSummary(module.code) }}</p>
                  <p class="mt-1 text-xs text-muted">{{ moduleAccessSummary(module.code) }}</p>
                </div>
                <USelect
                  :model-value="overrideState(module.code)"
                  :items="overrideOptions"
                  value-key="value"
                  :disabled="savingOverrides[`${selectedCompany.id}:${module.code}`]"
                  class="w-full shrink-0 sm:w-44"
                  aria-label="Acceso al módulo"
                  @update:model-value="(value) => changeOverride(module.code, String(value))"
                />
              </div>
            </div>
            <div v-else class="py-8 text-center text-sm text-muted">
              No hay empresas para configurar.
            </div>
          </UCard>

          <UCard>
            <div class="space-y-3">
              <div
                v-for="company in companies"
                :key="company.id"
                class="grid items-end gap-3 rounded-lg border border-default p-3 lg:grid-cols-[1fr_260px_190px_auto]"
              >
                <div>
                  <p class="font-medium">{{ company.name }}</p>
                  <p class="text-xs text-muted">{{ company.subdomain }}</p>
                </div>
                <UFormField label="Plan">
                  <USelect
                    :model-value="companyDrafts[company.id]?.planId"
                    :items="planOptions"
                    value-key="value"
                    class="w-full"
                    @update:model-value="(value) => updateCompanyDraft(company.id, 'planId', String(value))"
                  />
                </UFormField>
                <UFormField label="Estado">
                  <USelect
                    :model-value="companyDrafts[company.id]?.status"
                    :items="statusOptions"
                    value-key="value"
                    class="w-full"
                    @update:model-value="(value) => updateCompanyDraft(company.id, 'status', String(value))"
                  />
                </UFormField>
                <div class="flex flex-wrap justify-end gap-2">
                  <UButton label="Guardar" variant="outline" @click="saveCompany(company)" />
                  <UButton
                    v-if="isPlatformOwner"
                    label="Eliminar"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="outline"
                    @click="askDeleteCompany(company)"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
      <div v-else-if="isPlatformOwner && activeTab === 'administrators'" class="mt-4 space-y-4">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold">Administradores de plataforma</h2>
                <p class="text-sm text-muted">Asigná cuentas existentes y limitá qué empresas puede gestionar cada persona.</p>
              </div>
              <UButton label="Agregar administrador" icon="i-lucide-user-plus" @click="openAdministratorCreate" />
            </div>
          </template>
          <UAlert
            class="mb-4"
            icon="i-lucide-shield-check"
            color="info"
            title="El alcance es independiente del ERP"
            description="Asignar empresas permite gestionar sus planes y módulos. No agrega a la persona como usuario de esas empresas ni le da acceso a sus datos del ERP."
          />
          <div v-if="administrators.length" class="grid gap-3 lg:grid-cols-2">
            <div
              v-for="administrator in administrators"
              :key="administrator.id"
              class="rounded-xl border border-default p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate font-semibold">{{ administrator.name }}</h3>
                  <p class="truncate text-sm text-muted">{{ administrator.email }}</p>
                </div>
                <UBadge :label="`${administrator.companies.length} empresas`" color="info" variant="subtle" />
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <UBadge
                  v-for="company in administrator.companies"
                  :key="company.id"
                  :label="company.name"
                  color="neutral"
                  variant="subtle"
                />
              </div>
              <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-default pt-3">
                <UButton label="Editar alcance" icon="i-lucide-pencil" variant="outline" size="sm" @click="editAdministrator(administrator)" />
                <UButton label="Revocar" icon="i-lucide-user-round-x" color="error" variant="ghost" size="sm" @click="askRevokeAdministrator(administrator)" />
              </div>
            </div>
          </div>
          <div v-else class="rounded-lg border border-dashed border-default px-4 py-10 text-center">
            <UIcon name="i-lucide-users-round" class="mx-auto size-8 text-muted" />
            <p class="mt-2 font-medium">Todavía no hay administradores asignados</p>
            <p class="mt-1 text-sm text-muted">Agregá una cuenta existente y elegí las empresas que podrá gestionar.</p>
          </div>
        </UCard>
      </div>
      <div v-else-if="isPlatformOwner && activeTab === 'create'" class="mt-4 max-w-5xl">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold">Alta manual de empresa</h2>
              <p class="text-sm text-muted">Provisioná la empresa, asociá a su titular y elegí el plan inicial.</p>
            </div>
          </template>
          <UAlert
            class="mb-5"
            icon="i-lucide-info"
            color="info"
            title="Cuenta titular requerida"
            description="La persona debe tener una cuenta registrada en Asterisk Suite. La cuenta que indiques quedará como OWNER; tu cuenta de plataforma no se agrega automáticamente como usuario tenant."
          />
          <form class="space-y-5" @submit.prevent="createCompany">
            <div class="grid gap-4 md:grid-cols-2">
              <UFormField label="Nombre de la empresa" required>
                <UInput v-model="companyForm.name" class="w-full" placeholder="Ej.: Empresa SRL" />
              </UFormField>
              <UFormField
                label="Subdominio"
                required
                :hint="companyForm.subdomain ? `${companyForm.subdomain}.${companyBaseDomain}` : 'Identifica el acceso de la empresa'"
              >
                <div class="flex gap-2">
                  <UInput v-model="companyForm.subdomain" class="min-w-0 flex-1" placeholder="empresa" @blur="normalizeSubdomain" />
                  <UButton type="button" label="Verificar" variant="outline" :loading="checkingSubdomain" @click="checkCompanySubdomain" />
                </div>
                <p v-if="subdomainAvailable === true" class="mt-1 text-xs text-success">Disponible</p>
                <p v-else-if="subdomainAvailable === false" class="mt-1 text-xs text-error">Ya está en uso</p>
              </UFormField>
              <UFormField label="Email de la cuenta titular" required hint="Debe ser el email con el que ya se registró en la plataforma.">
                <div class="flex gap-2">
                  <UInput v-model="companyForm.ownerEmail" type="email" class="min-w-0 flex-1" placeholder="titular@empresa.com" />
                  <UButton type="button" label="Validar" variant="outline" :loading="checkingOwner" :disabled="!companyForm.ownerEmail" @click="verifyOwnerAccount" />
                </div>
                <p v-if="ownerAccount" class="mt-1 text-xs text-success">{{ ownerAccount.name }} · cuenta activa</p>
              </UFormField>
              <UFormField label="Plan inicial" required>
                <USelect v-model="companyForm.planId" :items="planOptions" value-key="value" class="w-full" placeholder="Elegí un plan" />
              </UFormField>
              <UFormField label="Estado de la cuenta">
                <USelect v-model="companyForm.status" :items="companyStatusOptions" value-key="value" class="w-full" />
              </UFormField>
              <UFormField v-if="companyForm.status === 'TRIAL'" label="Fin del período de prueba" required>
                <UInput v-model="companyForm.trialEndsAt" type="date" class="w-full" />
              </UFormField>
              <UFormField label="CUIT / identificación">
                <UInput v-model="companyForm.taxId" class="w-full" />
              </UFormField>
              <UFormField label="Condición frente al IVA">
                <USelect v-model="companyForm.vat_condition" :items="vatConditionOptions" value-key="value" class="w-full" placeholder="Seleccionar" />
              </UFormField>
              <UFormField label="Email de contacto"><UInput v-model="companyForm.email" type="email" class="w-full" /></UFormField>
              <UFormField label="Teléfono"><UInput v-model="companyForm.phone" class="w-full" /></UFormField>
              <UFormField label="Dirección" class="md:col-span-2"><UInput v-model="companyForm.address" class="w-full" /></UFormField>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
              <p class="text-sm text-muted">La empresa se crea con los módulos esenciales y el plan elegido. Luego podés ajustar módulos desde “Empresas y módulos”.</p>
              <div class="flex gap-2">
                <UButton label="Volver a empresas" variant="ghost" @click="setActiveTab('companies')" />
                <UButton type="submit" label="Crear empresa" icon="i-lucide-building-2" :loading="creatingCompany" :disabled="!canCreateCompany" />
              </div>
            </div>
          </form>
        </UCard>
      </div>
    </div>

    <UModal v-if="isPlatformOwner" v-model:open="newPlanOpen" title="Nuevo plan">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Código">
            <UInput v-model="newPlan.code" placeholder="PROFESSIONAL" class="w-full" />
          </UFormField>
          <UFormField label="Nombre"><UInput v-model="newPlan.name" class="w-full" /></UFormField>
          <UFormField label="Descripción"><UTextarea v-model="newPlan.description" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="closeNewPlan" />
          <UButton label="Crear" :disabled="!newPlan.code || !newPlan.name" :loading="saving" @click="createPlan" />
        </div>
      </template>
    </UModal>

    <UModal
      v-if="isPlatformOwner"
      v-model:open="administratorDialogOpen"
      :title="editingAdministratorId ? 'Editar administrador' : 'Asignar administrador de plataforma'"
      :description="editingAdministratorId ? 'Actualizá las empresas que puede gestionar.' : 'Buscá una cuenta ya registrada en Asterisk Suite.'"
    >
      <template #body>
        <div class="space-y-5">
          <div class="flex gap-2">
            <UInput
              v-model="administratorAccountEmail"
              type="email"
              class="min-w-0 flex-1"
              placeholder="persona@empresa.com"
              :disabled="!!administratorCandidate"
              @keyup.enter="findAdministratorAccount"
            />
            <UButton
              v-if="!administratorCandidate"
              label="Buscar cuenta"
              variant="outline"
              :loading="findingAdministrator"
              :disabled="!administratorAccountEmail.trim()"
              @click="findAdministratorAccount"
            />
            <UButton
              v-else
              label="Cambiar cuenta"
              variant="ghost"
              @click="administratorCandidate = null; editingAdministratorId = null; administratorCompanyIds = []"
            />
          </div>
          <UAlert
            v-if="administratorCandidate"
            icon="i-lucide-circle-check"
            color="success"
            :title="administratorCandidate.name"
            :description="`${administratorCandidate.email}${administratorCandidate.alreadyPlatformAdmin ? ' · ya es administrador' : ' · cuenta existente'}`"
          />
          <UFormField
            v-if="administratorCandidate"
            label="Empresas que podrá gestionar"
            description="La asignación no le da acceso al ERP de esas empresas."
            required
          >
            <USelectMenu
              v-model="administratorCompanyIds"
              :items="administratorCompanyOptions"
              value-key="value"
              multiple
              searchable
              class="w-full"
              placeholder="Seleccioná una o más empresas"
            />
          </UFormField>
          <p v-if="administratorCandidate" class="text-xs text-muted">
            Para quitar todos los accesos y el rol de administrador, usá «Revocar» en la lista.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="closeAdministratorDialog" />
          <UButton
            label="Guardar alcance"
            icon="i-lucide-shield-check"
            :loading="savingAdministrator"
            :disabled="!canSaveAdministrator"
            @click="saveAdministrator"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-if="isPlatformOwner"
      v-model:open="revokeAdministratorDialogOpen"
      title="Revocar administrador"
      description="Se restaurará el rol que tenía antes de recibir permisos de plataforma."
    >
      <template #body>
        <p>
          ¿Querés revocar el acceso de <strong>{{ administratorToRevoke?.name }}</strong> a la administración de plataforma?
          Sus usuarios y roles dentro de cada empresa no se modifican.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="closeRevokeAdministratorDialog" />
          <UButton label="Revocar acceso" color="error" :loading="revokingAdministrator" @click="revokeAdministrator" />
        </div>
      </template>
    </UModal>

    <UModal
      v-if="isPlatformOwner"
      v-model:open="deleteCompanyDialogOpen"
      title="Eliminar empresa definitivamente"
      description="Esta acción elimina los datos y no se puede deshacer."
    >
      <template #body>
        <div v-if="companyToDelete" class="space-y-4">
          <UAlert
            icon="i-lucide-triangle-alert"
            color="error"
            title="Se eliminará la base de datos de la empresa"
            :description="`Se borrarán todos los datos de ${companyToDelete.name}, la suscripción y las relaciones con sus usuarios. Las cuentas globales de esas personas se conservarán y podrán seguir usando otras empresas.`"
          />
          <UFormField
            label="Escribí el subdominio para confirmar"
            :description="`Ingresá exactamente ${companyToDelete.subdomain}`"
            required
          >
            <UInput
              v-model="deleteSubdomainConfirmation"
              class="w-full"
              :placeholder="companyToDelete.subdomain"
              autocomplete="off"
              @keyup.enter="deleteCompany"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" :disabled="deletingCompany" @click="deleteCompanyDialogOpen = false" />
          <UButton
            label="Eliminar definitivamente"
            icon="i-lucide-trash-2"
            color="error"
            :loading="deletingCompany"
            :disabled="!canDeleteCompany"
            @click="deleteCompany"
          />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
