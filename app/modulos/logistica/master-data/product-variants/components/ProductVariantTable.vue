<script setup lang="ts">
import { ref } from 'vue'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'
import type { ProductVariant, CreateProductVariantInput } from '../types/product-variants.types'

import ProductVariantModal from './ProductVariantModal.vue'

import { useProductVariants } from '~/modulos/logistica/master-data/product-variants/composable/useVariants'

const { create, update } = useProductVariants()

const props = defineProps<{
  product?: Product | null
}>()

const emit = defineEmits<{
  created: [variant: ProductVariant] // 👈 nuevo
  updated: [variant: ProductVariant] // 👈 nuevo
}>()

const open = ref(false)
const selected = ref<ProductVariant | null>(null)
const loading = ref(false)
const toast = useToast()

const openCreate = () => {
  selected.value = null
  open.value = true
}

const openEdit = (variant: ProductVariant) => {
  selected.value = variant
  open.value = true
}

const onSubmit = async (payload: CreateProductVariantInput) => {
  try {
    loading.value = true

    if (selected.value) {
      const updated = await update(selected.value.id, payload)
      emit('updated', updated) // 👈
      toast.add({ title: 'Variante actualizada', color: 'success' })
    } else {
      const created = await create(payload)
      emit('created', created) // 👈
      toast.add({ title: 'Variante creada', color: 'success' })
    }

    open.value = false
  } catch (err: any) {
    let message = 'Error desconocido'

    if (typeof err === 'object' && err !== null && 'data' in err) {
      const data = (err as any).data
      message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || message
    }

    toast.add({
      title: 'Error al guardar variante',
      color: 'error',
      description: message,
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- HEADER -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Variantes</h3>
        <p class="text-sm text-gray-500">Configuración de variantes del producto</p>
      </div>

      <div class="flex items-center gap-2">
        <!-- HELP POPUP -->
        <UPopover mode="hover" :open-delay="300" :close-delay="300">
          <UButton icon="i-lucide-help-circle" color="neutral" variant="ghost" size="sm" />

          <template #content>
            <div class="p-3 max-w-xs space-y-2 text-sm">
              <p class="font-medium">¿Qué es una variante?</p>

              <p class="text-gray-600">
                Una variante representa una versión específica del producto con atributos propios como SKU, peso,
                dimensiones o densidad.
              </p>

              <p class="text-gray-600">
                Se utiliza cuando un mismo producto tiene diferentes configuraciones físicas o técnicas.
              </p>
            </div>
          </template>
        </UPopover>

        <!-- CREATE BUTTON -->
        <UButton icon="i-lucide-plus" @click="openCreate">Nueva variante</UButton>
      </div>
    </div>

    <!-- EMPTY -->

    <UEmpty
      v-if="!product?.product_variants?.length"
      icon="i-lucide-box"
      title="No hay variantes"
      description="Este producto todavía no tiene variantes configuradas."
      :actions="[
        {
          icon: 'i-lucide-plus',
          label: 'Crear variante',
          onClick: openCreate
        }
      ]"
    />

    <!-- TABLE -->
    <UCard v-else :ui="{ body: 'p-0' }">
      <UTable
        :data="product?.product_variants"
        :columns="[
          {
            accessorKey: 'name',
            header: 'Nombre'
          },
          {
            accessorKey: 'sku',
            header: 'SKU'
          },
          {
            accessorKey: 'thickness_mm',
            header: 'Espesor'
          },
          {
            accessorKey: 'weight_per_m2_kg',
            header: 'Peso por m2'
          },
          {
            accessorKey: 'weight_per_meter_kg',
            header: 'Peso por metro'
          },
          {
            accessorKey: 'density_kg_m3',
            header: 'Densidad'
          },
          {
            accessorKey: 'weight_kg',
            header: 'Peso'
          },
          {
            id: 'actions',
            header: ''
          }
        ]"
      >
        <template #thickness_mm-cell="{ row }">
          {{ row.original.thickness_mm || '-' }}
        </template>

        <template #weight_kg-cell="{ row }">
          {{ row.original.weight_kg || '-' }}
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="openEdit(row.original)" />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- MODAL -->
    <ProductVariantModal
      v-if="product"
      v-model:open="open"
      :product-id="product.id"
      :variant="selected"
      :loading="loading"
      @submit="onSubmit"
    />
  </div>
</template>
