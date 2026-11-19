<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompanyNavigation } from '~/composables/useCompanyNavigation'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const router = useRouter()
const { navigateToCompanyPath } = useCompanyNavigation()

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
  const navigated = await navigateToCompanyPath(company.id, nextPath)
  if (!navigated) loading.value = false
}

function getPathForCompanySwitch(path: string) {
  const cashBoxDetail = /^\/erp\/treasury\/cash-boxes\/([^/]+)(?:\/edit)?\/?$/.exec(path)
  if (cashBoxDetail?.[1] && !['create', 'new'].includes(cashBoxDetail[1])) return '/erp/treasury/cash-boxes'

  const bankAccountDetail = /^\/erp\/treasury\/bank-accounts\/([^/]+)(?:\/edit)?\/?$/.exec(path)
  if (bankAccountDetail?.[1] && !['create', 'new'].includes(bankAccountDetail[1])) return '/erp/treasury/bank-accounts'

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
        class="group/create w-full rounded-lg data-[state=open]:bg-elevated"
        :class="collapsed ? 'justify-center p-2' : 'justify-start gap-2 py-2'"
        :aria-label="collapsed ? `Cambiar empresa: ${selectedCompany?.name ?? ''}` : undefined"
        aria-keyshortcuts="Control+Shift+E"
        title="Cambiar empresa (Ctrl + Shift + E)"
      >
        <UIcon :name="selectedCompany?.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building'" class="size-4 shrink-0" />
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">{{ selectedCompany?.name }}</span>
        <span v-if="!collapsed" class="flex shrink-0 items-center gap-1.5 text-dimmed">
          <KeyboardShortcutHint :keys="['Ctrl', 'Shift', 'E']" size="2xs" reveal-on-hover />
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
