<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useDispatchOrdersStore } from '~/modulos/logistica/documents/dispatch-orders/store/dispatch-orders.store'
import type { CreateDispatchOrderDto } from '~/modulos/logistica/documents/dispatch-orders/types/dispatch-orders.types'
import DispatchOrderForm from '~/modulos/logistica/documents/dispatch-orders/components/DispatchOrderForm.vue'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const store = useDispatchOrdersStore()

const id = route.params.id as string
const loading = ref(true)
const creatingRemito = ref(false)

const moduleCollapsed = inject('moduleSidebarCollapsed') as Ref<boolean>

const dispatchOrder = computed(() => store.currentDispatchOrder)

// LOAD
onMounted(async () => {
  try {
    await store.fetchOne(id)
  } finally {
    loading.value = false
  }
})

// SUBMIT (UPDATE)
const submit = async (dto: CreateDispatchOrderDto) => {
  await store.update(id, dto)
  router.push(`/logistica/viajes/dispatch-orders/`)
}

async function createRemito() {
  creatingRemito.value = true
  try {
    const remito = await $fetch<any>(`/api/erp/documents/sales/dispatch/${id}/create-remito`, { method: 'POST' })
    useToast().add({ title: 'Remito creado', description: 'Se copiaron el cliente y los productos del despacho.', color: 'success' })
    await router.push(`/erp/remitos/${remito.id}`)
  } catch (error: any) {
    useToast().add({ title: 'No se pudo crear el remito', description: error?.data?.message, color: 'error' })
  } finally {
    creatingRemito.value = false
  }
}
</script>

<template>
  <UPage v-if="!loading && dispatchOrder">
    <div class="flex flex-col">
      <UButton
        icon="i-lucide-layout-panel-left"
        variant="ghost"
        color="neutral"
        label="Menu"
        @click="moduleCollapsed = !moduleCollapsed"
      />

      <UPageHeader title="Editar Orden de Despacho">
        <template #links>
          <UButton label="Crear / abrir remito" icon="i-lucide-file-output" color="success" :loading="creatingRemito" @click="createRemito" />
        </template>
      </UPageHeader>
    </div>

    <DispatchOrderForm
      class="w-full"
      :dispatch_order="dispatchOrder ?? undefined"
      @submit="submit"
      @cancel="router.back()"
    />
  </UPage>

  <div v-else-if="loading" class="flex justify-center py-24">
    <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
  </div>
</template>
