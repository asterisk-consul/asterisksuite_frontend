<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()

const selectedCompany = computed(() => auth.selectedCompany)
const hasMultipleCompanies = computed(() => auth.companies.length > 1)

const loading = ref(false)
const loadingCompanyName = ref('')
const companyMenuOpen = ref(false)

function isEditingText(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'))
}

function isInsideDialog(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('[role="dialog"], [aria-modal="true"]'))
}

function handleCompanyShortcut(event: KeyboardEvent) {
  if (
    event.defaultPrevented
    || event.isComposing
    || event.repeat
    || !event.ctrlKey
    || !event.shiftKey
    || event.altKey
    || event.metaKey
    || event.key.toLowerCase() !== 'e'
    || !hasMultipleCompanies.value
    || loading.value
    || isEditingText(event.target)
    || isInsideDialog(event.target)
  ) return

  event.preventDefault()
  event.stopPropagation()
  companyMenuOpen.value = !companyMenuOpen.value
}

onMounted(() => window.addEventListener('keydown', handleCompanyShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleCompanyShortcut))

async function redirectToSubdomain(company: (typeof auth.companies)[number]) {
  if (loading.value) return
  loadingCompanyName.value = company.name
  loading.value = true

  const currentPath = window.location.pathname
  const nextPath = getPathForCompanySwitch(currentPath)
  auth.selectCompany(company)
  // Esperar a que useCookie persista el tenant antes de navegar. Si la primera
  // petición llega al nuevo host con la cookie anterior, el backend rechaza
  // el acceso y la pantalla de comprobantes queda en 401.
  await nextTick()

  const config = useRuntimeConfig()
  const baseDomain = config.public.baseDomain
  if (baseDomain) {
    const { protocol, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    window.location.href = `${protocol}//${company.subdomain}.${baseDomain}${portSuffix}${nextPath}`
  } else {
    // En desarrollo puede no haber subdominios; recargar limpia los stores
    // del tenant previo y vuelve a pedir los datos con la cookie actualizada.
    window.location.href = nextPath
  }
}

function getPathForCompanySwitch(path: string) {
  const cashBoxDetail = /^\/erp\/treasury\/cash-boxes\/([^/]+)(?:\/edit)?\/?$/.exec(path)
  if (cashBoxDetail && !['create', 'new'].includes(cashBoxDetail[1])) return '/erp/treasury/cash-boxes'

  const bankAccountDetail = /^\/erp\/treasury\/bank-accounts\/([^/]+)(?:\/edit)?\/?$/.exec(path)
  if (bankAccountDetail && !['create', 'new'].includes(bankAccountDetail[1])) return '/erp/treasury/bank-accounts'

  return path
}

const items = computed<DropdownMenuItem[]>(() =>
  auth.companies.map((company) => ({
    label: company.name,
    icon: company.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
    description: company.subdomain,
    onSelect() {
      redirectToSubdomain(company)
    }
  }))
)

function goToHome() {
  router.push('/')
}
</script>

<template>
  <LoadingOverlay v-if="loading" :company-name="loadingCompanyName" />

  <template v-if="hasMultipleCompanies">
    <UDropdownMenu v-model:open="companyMenuOpen" :items="items" :content="{ align: 'center', collisionPadding: 12 }">
      <UButton
        color="neutral"
        variant="ghost"
        class="w-full rounded-lg data-[state=open]:bg-elevated"
        :class="collapsed ? 'justify-center p-2' : 'justify-start gap-2 py-2'"
        :aria-label="collapsed ? `Cambiar empresa: ${selectedCompany?.name ?? ''}` : undefined"
        aria-keyshortcuts="Control+Shift+E"
        :title="collapsed ? `Cambiar empresa (Ctrl + Shift + E)` : undefined"
      >
        <UIcon :name="selectedCompany?.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building'" class="size-4 shrink-0" />
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">{{ selectedCompany?.name }}</span>
        <span v-if="!collapsed" class="flex shrink-0 items-center gap-1.5 text-dimmed">
          <KeyboardShortcutHint :keys="['Ctrl', 'Shift', 'E']" size="2xs" />
          <UIcon name="i-lucide-chevrons-up-down" class="size-4" />
        </span>
      </UButton>
    </UDropdownMenu>
  </template>

  <template v-else>
    <UButton
      v-bind="{
        icon: selectedCompany?.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
        label: collapsed ? undefined : selectedCompany?.name
      }"
      color="neutral"
      variant="ghost"
      class="w-full rounded-lg data-[state=open]:bg-elevated"
      :class="collapsed ? 'justify-center' : 'justify-start py-2'"
      :ui="{ trailingIcon: 'text-dimmed' }"
      @click="goToHome"
    />
  </template>
</template>
