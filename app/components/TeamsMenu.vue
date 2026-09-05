<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const router = useRouter()

const selectedCompany = computed(() => auth.selectedCompany)
const hasMultipleCompanies = computed(() => auth.companies.length > 1)

const loading = ref(false)
const loadingCompanyName = ref('')

function redirectToSubdomain(company: (typeof auth.companies)[number]) {
  loadingCompanyName.value = company.name
  loading.value = true

  auth.selectCompany(company)

  const config = useRuntimeConfig()
  const baseDomain = config.public.baseDomain
  if (baseDomain) {
    const { protocol, port, pathname } = window.location
    const portSuffix = port ? `:${port}` : ''
    window.location.href = `${protocol}//${company.subdomain}.${baseDomain}${portSuffix}${pathname}`
  } else {
    router.push(window.location.pathname)
  }
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
        :square="collapsed"
        class="data-[state=open]:bg-elevated"
        :class="[!collapsed && 'py-2']"
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
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{ trailingIcon: 'text-dimmed' }"
      @click="goToHome"
    />
  </template>
</template>
