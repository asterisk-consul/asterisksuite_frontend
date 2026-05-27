<script setup lang="ts">
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import ProductForm from '~/modulos/logistica/master-data/product/components/ProductForm.vue'
import type {
  Product,
  CreateProductDto
} from '~/modulos/logistica/master-data/product/types/product.types'
import { createDefaultProductForm } from '~/modulos/logistica/master-data/product/utils/product-form.utils'

const productStore = useProductsStore()
const route = useRoute()
const id = route.params.id as string
const loading = ref(false)
const product = ref<Product | null>(null)
const form = ref<CreateProductDto>(createDefaultProductForm())

function mapProductToForm(product: Product): CreateProductDto {
  return {
    name: product.name,
    sku: product.sku ?? '',
    requires_refrigeration: product.requires_refrigeration ?? false,
    price_enabled: product.price_enabled,
    is_rate_type: product.is_rate_type,
    rate_id: product.rate_id ?? undefined,
    taxId: product.taxId ?? undefined,
    active: product.active ?? true,
    product_type: product.product_type,
    is_composed: product.is_composed,
    auto_calculate_cost: product.auto_calculate_cost,
    has_engineering: product.has_engineering,
    manages_stock: product.manages_stock,
    income_account_id: product.income_account_id ?? undefined,
    expense_account_id: product.expense_account_id ?? undefined,
    inventory_account_id: product.inventory_account_id ?? undefined,
    calculation_type: product.calculation_type ?? 'UNIT',
    cost_source: product.cost_source
  }
}

async function fetchProduct() {
  try {
    loading.value = true
    const response = await productStore.fetchOne(id)
    product.value = response
    form.value = mapProductToForm(response)
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  try {
    loading.value = true
    await productStore.update(id, form.value)
  } finally {
    loading.value = false
  }
}

console.log('Page edit Product', product)
console.log('Page edit  Form', form)

onMounted(fetchProduct)
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Editar producto" />
    </template>

    <!-- El body ya tiene overflow-y-auto, aquí vive el scroll -->
    <template #body>
      <UPageCard class="w-full lg:max-w-5xl mx-auto">
        <ProductForm
          v-model="form"
          :product="product"
          mode="edit"
          :loading="loading"
          @submit="handleSubmit"
        />
      </UPageCard>
    </template>
  </UDashboardPanel>
</template>
