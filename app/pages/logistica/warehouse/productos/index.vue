<script setup lang="ts">
definePageMeta({
  layout: 'logistica',
  middleware: ['auth']
})
import type { ButtonProps } from '@nuxt/ui'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { productColumns } from '~/modulos/logistica/master-data/product/columns'
import { productFormFields } from '~/modulos/logistica/master-data/product/productFormFields'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>
function toggleModuleSidebar() {
  moduleCollapsed.value = !moduleCollapsed.value
}

const store = useProductsStore()

const { items } = storeToRefs(store)
const open = ref(false)
const loading = ref(true)
const router = useRouter()

const openEdit = (row: any) => {
  router.push(`/logistica/warehouse/productos/${row.id}/edit`)
}

const columns = productColumns({
  onEdit: openEdit
})

onMounted(async () => {
  await store.fetchAll()
  loading.value = store.loading
})
const saveLocation = async (data: any) => {
  const payload = {
    name: data.name,
    requires_refrigeration: data.requires_refrigeration,
    sku: data.sku
  }
  console.log(payload)
  await store.create(payload)
  open.value = false
}

const openCreate = () => {
  open.value = true
}
const links: ButtonProps[] = [
  {
    label: 'Nueva Producto',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: openCreate
  }
]
</script>

<template>
  <UPage class="space-y-4">
    <div class="flex flex-col">
      <div>
        <UButton
          icon="i-lucide-layout-panel-left"
          variant="ghost"
          color="neutral"
          label="Menu"
          @click="toggleModuleSidebar"
        />
      </div>
      <UPageHeader
        title="Productos"
        description="Listado de Productos"
        :links="links"
        class="mb-4 w-full"
      />
    </div>
    <LogisticaTable :loading="loading" :data="items" :columns="columns" />
  </UPage>

  <ModalForm
    v-model:open="open"
    :fields="productFormFields"
    title="Nueva Locacion"
    @submit="saveLocation"
  />
</template>
