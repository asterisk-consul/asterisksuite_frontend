<script setup lang="ts">
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

const props = defineProps<{
  product?: Product | null
}>()

const router = useRouter()

const goToProduct = (id: string) => {
  router.push(`/productos/${id}/edit`)
}

// watch(
//   () => props.product,
//   (value) => {
//     console.log('ROOT CARD PRODUCT', value)
//   },
//   { immediate: true }
// )
</script>

<template>
  <UCard :ui="{ body: 'p-0 overflow-hidden' }">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-git-fork" class="text-primary-500 size-4" />
        <span
          class="font-semibold text-sm tracking-wide uppercase text-gray-500 dark:text-gray-400"
        >
          Productos relacionados
        </span>
      </div>
    </div>

    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <!-- Producto final (al que pertenece) -->
      <div v-if="product?.root_products?.length" class="p-4 space-y-2">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400"
          >
            <UIcon name="i-lucide-package-check" class="size-3.5" />
            Producto final
          </span>
          <div class="flex-1 h-px bg-amber-100 dark:bg-amber-900/40" />
          <UBadge
            :label="`${product.root_products.length}`"
            color="warning"
            variant="soft"
            size="xs"
          />
        </div>

        <div
          v-for="root in product.root_products"
          :key="root.id"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all cursor-pointer"
          @click="goToProduct(root.id)"
        >
          <div
            class="size-7 rounded-md bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-box"
              class="size-3.5 text-amber-600 dark:text-amber-400"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div
              class="font-medium text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors"
            >
              {{ root.name }}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {{ root.sku ?? '—' }}
            </div>
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          />
        </div>
      </div>

      <!-- Padres — child_components: yo soy el hijo, parent_product es el padre -->
      <div v-if="product?.child_components?.length" class="p-4 space-y-2">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400"
          >
            <UIcon name="i-lucide-arrow-up-to-line" class="size-3.5" />
            Padres
          </span>
          <div class="flex-1 h-px bg-blue-100 dark:bg-blue-900/40" />
          <UBadge
            :label="`${product.child_components.length}`"
            color="info"
            variant="soft"
            size="xs"
          />
        </div>

        <div
          v-for="comp in product.child_components"
          :key="comp.id"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
          @click="goToProduct(comp.parent_product_id)"
        >
          <div
            class="size-7 rounded-md bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-layers"
              class="size-3.5 text-blue-600 dark:text-blue-400"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div
              class="font-medium text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors"
            >
              {{ comp.parent_product?.name }}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {{ comp.parent_product?.sku ?? '—' }}
            </div>
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          />
        </div>
      </div>

      <!-- Hijos — parent_components: yo soy el padre, child_product es el hijo -->
      <div v-if="product?.parent_components?.length" class="p-4 space-y-2">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
          >
            <UIcon name="i-lucide-arrow-down-to-line" class="size-3.5" />
            Hijos
          </span>
          <div class="flex-1 h-px bg-emerald-100 dark:bg-emerald-900/40" />
          <UBadge
            :label="`${product.parent_components.length}`"
            color="success"
            variant="soft"
            size="xs"
          />
        </div>

        <div
          v-for="comp in product.parent_components"
          :key="comp.id"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all cursor-pointer"
          @click="goToProduct(comp.child_product_id)"
        >
          <div
            class="size-7 rounded-md bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-component"
              class="size-3.5 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div
              class="font-medium text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors"
            >
              {{ comp.child_product?.name }}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {{ comp.child_product?.sku ?? '—' }}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-gray-400 dark:text-gray-500">
              ×{{ comp.quantity }}
            </span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="
          !product?.root_products?.length &&
          !product?.parent_components?.length &&
          !product?.child_components?.length
        "
        class="p-6 flex flex-col items-center gap-2 text-center"
      >
        <UIcon
          name="i-lucide-unlink"
          class="size-8 text-gray-300 dark:text-gray-600"
        />
        <p class="text-sm text-gray-400 dark:text-gray-500">
          Sin productos relacionados
        </p>
      </div>
    </div>
  </UCard>
</template>
