<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
})

const route = useRoute()
const { loading, findById } = useProducts()
const productId = route.params.id as string
const product = computed(() => findById(productId))

onMounted(async () => {
  if (!product.value) await findById(productId)
})

useHead({ title: computed(() => product.value?.name ?? 'BOM') })

watch(
  product,
  (value) => {
    if (!value) return
    route.meta.breadcrumb = [
      { label: 'Fabricación', to: '/fabricacion' },
      { label: 'BOM', to: '/bom' },
      { label: value.name, to: `/bom/${value.id}` }
    ]
  },
  { immediate: true }
)

const tabs = ref<TabsItem[]>([
  { label: 'General', value: 'general', slot: 'general' },
  { label: 'Ingeniería', value: 'ingenieria', slot: 'ingenieria' },
  { label: 'Costos', value: 'costos', slot: 'costos' }
])

const activeTab = ref('general')

const saving = ref(false)
async function handleSave() {
  saving.value = true
  try {
    // lógica de guardado
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- HEADER -->
    <AppPageHeader
      :title="product?.name ?? 'BOM'"
      :description="product?.sku ?? 'SKU'"
      show-module-toggle
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    >
      <template #right>
        <div class="flex items-center gap-2">
          <UButton label="Actualizar Costos" variant="soft" color="neutral" />

          <UButton label="Ver BOM" variant="soft" color="neutral" />

          <UButton label="Guardar" icon="i-lucide-save" :loading="saving" @click="handleSave" />
        </div>
      </template>
    </AppPageHeader>

    <!-- CONTENT -->
    <div class="flex flex-1 overflow-hidden">
      <!-- SIDEBAR -->
      <aside class="w-72 shrink-0 border-r border-default bg-default p-4 overflow-y-auto">
        <div class="space-y-5">
          <div class="aspect-square rounded-lg border border-default overflow-hidden bg-elevated">
            <img v-if="product?.image" :src="product.image" :alt="product.name" class="h-full w-full object-cover" />

            <div v-else class="h-full flex items-center justify-center">
              <UIcon name="i-lucide-package" class="size-12 text-muted" />
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">Etiquetas</span>

              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" />
            </div>

            <div class="flex flex-wrap gap-1">
              <UBadge v-for="tag in product?.product_tags ?? []" :key="tag" :label="tag" size="sm" />
            </div>
          </div>

          <USeparator />

          <div class="space-y-2 text-sm">
            <div>
              <span class="text-muted">SKU</span>
              <div class="font-medium">
                {{ product?.sku }}
              </div>
            </div>

            <div>
              <span class="text-muted">Tipo</span>
              <div class="font-medium">
                {{ product?.product_type }}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="flex-1 overflow-auto p-4">
        <div class="rounded-xl border border-default bg-default overflow-hidden">
          <!-- TABS -->
          <div class="border-b border-default px-4">
            <UTabs v-model="activeTab" :items="tabs" :content="false" variant="link" class="w-full" />
          </div>

          <!-- BODY -->
          <div class="p-6 min-h-[600px]">
            <template v-if="activeTab === 'general'">General</template>

            <template v-else-if="activeTab === 'ingenieria'">Ingeniería</template>

            <template v-else-if="activeTab === 'costos'">Costos</template>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
