<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'

definePageMeta({
  layout: 'public',
  auth: false
})

const auth = useAuthStore()
const router = useRouter()

const companies = computed(() => auth.companies)

const loading = ref(false)
const loadingCompanyName = ref('')

if (!auth.isLogged) {
  navigateTo('/login')
}

if (auth.companies.length <= 1 || auth.selectedCompany) {
  navigateTo('/')
}

function selectCompany(company: (typeof auth.companies)[number]) {
  loadingCompanyName.value = company.name
  loading.value = true

  auth.selectCompany(company)

  const config = useRuntimeConfig()
  const baseDomain = config.public.baseDomain
  if (baseDomain) {
    const { protocol, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    window.location.href = `${protocol}//${company.subdomain}.${baseDomain}${portSuffix}`
  } else {
    router.push('/')
  }
}
</script>

<template>
  <LoadingOverlay v-if="loading" :company-name="loadingCompanyName" />

  <div class="flex flex-col items-center justify-center mx-auto h-screen px-4">
    <UPageCard class="w-full max-w-lg">
      <div class="text-center mb-6">
        <h1 class="text-xl font-bold">Seleccioná tu empresa</h1>
        <p class="text-muted text-sm mt-1">Tenés acceso a múltiples empresas. Elegí con cuál querés trabajar.</p>
      </div>

      <div class="flex flex-col gap-3">
        <button
          v-for="company in companies"
          :key="company.id"
          class="flex items-center gap-3 p-4 rounded-lg border border-default hover:bg-elevated transition-colors cursor-pointer text-left"
          @click="selectCompany(company)"
        >
          <UIcon
            :name="company.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building'"
            class="size-6 text-muted shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ company.name }}</p>
            <p class="text-xs text-muted truncate">{{ company.subdomain }}</p>
          </div>
          <UBadge size="xs" variant="soft" color="neutral">{{ company.role }}</UBadge>
        </button>
      </div>
    </UPageCard>
  </div>
</template>
