<script setup lang="ts">
import { ref } from 'vue'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

import type { ProductVariant, CreateProductVariantInput } from '../types/product-variants.types'

import ProductVariantModal from './ProductVariantModal.vue'

// =========================
// PROPS
// =========================

const props = defineProps<{
  product?: Product | null
}>()

// =========================
// EMITS
// =========================

const emit = defineEmits<{
  create: [payload: CreateProductVariantInput]

  update: [id: string, payload: CreateProductVariantInput]
}>()

// =========================
// MODAL
// =========================

const open = ref(false)

const selected = ref<ProductVariant | null>(null)

const loading = ref(false)

// =========================
// CREATE
// =========================

const openCreate = () => {
  selected.value = null

  open.value = true
}

// =========================
// EDIT
// =========================

const openEdit = (variant: ProductVariant) => {
  selected.value = variant

  open.value = true
}

// =========================
// SUBMIT
// =========================

const onSubmit = async (payload: CreateProductVariantInput) => {
  try {
    loading.value = true

    if (selected.value) {
      await emit('update', selected.value.id, payload)
    } else {
      await emit('create', payload)
    }

    open.value = false
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

      <UButton icon="i-lucide-plus" @click="openCreate">Nueva variante</UButton>
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
