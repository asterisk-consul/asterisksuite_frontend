<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const router = useRouter()

const selectedCompany = computed(() => auth.selectedCompany)
const hasMultipleCompanies = computed(() => auth.companies.length > 1)

const items = computed<DropdownMenuItem[]>(() =>
  auth.companies.map((company) => ({
    label: company.name,
    icon: company.role === 'OWNER' ? 'i-lucide-crown' : 'i-lucide-building',
    description: company.subdomain,
    onSelect() {
      auth.selectCompany(company)
      router.push('/')
    }
  }))
)

function goToHome() {
  router.push('/')
}
</script>

<template>
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
        block
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
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{ trailingIcon: 'text-dimmed' }"
      @click="goToHome"
    />
  </template>
</template>
