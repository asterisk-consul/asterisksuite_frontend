<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()

const selectedCompany = computed(() => auth.selectedCompany)
const hasMultipleCompanies = computed(() => auth.companies.length > 1)

const loading = ref(false)
const loadingCompanyName = ref('')

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
    <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }">
      <UButton
        v-bind="{
          icon: selectedCompany?.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
          label: collapsed ? undefined : selectedCompany?.name,
          trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
        }"
        color="neutral"
        variant="ghost"
        class="w-full rounded-lg data-[state=open]:bg-elevated"
        :class="collapsed ? 'justify-center' : 'justify-start py-2'"
        :ui="{ trailingIcon: 'text-dimmed' }"
      />
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
