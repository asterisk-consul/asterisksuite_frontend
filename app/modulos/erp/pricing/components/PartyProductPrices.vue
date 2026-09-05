<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

const props = defineProps<{ partyId: string }>()
const toast = useToast()
const productsStore = useProductsStore()
const { items: products } = storeToRefs(productsStore)
const { init: initCurrencies, activeCurrencies } = useCurrencies()

const prices = ref<any[]>([])
const history = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const form = reactive({
  product_id: '',
  operation_type: 'SALE' as 'SALE' | 'PURCHASE',
  currency_id: '',
  price: 0
})

const productOptions = computed(() => products.value
  .filter((product: any) => product.active !== false && !product.deleted_at)
  .map((product: any) => ({ label: product.sku ? `${product.name} · ${product.sku}` : product.name, value: product.id })))
const currencyOptions = computed(() => activeCurrencies.value.map(currency => ({
  label: `${currency.symbol} ${currency.code}`,
  value: currency.id
})))
const operationOptions = [
  { label: 'Venta / cliente', value: 'SALE' },
  { label: 'Compra / proveedor', value: 'PURCHASE' }
]

async function load() {
  loading.value = true
  try {
    [prices.value, history.value] = await Promise.all([
      $fetch<any[]>(`/api/erp/pricing/party-prices/party/${props.partyId}`),
      $fetch<any[]>(`/api/erp/pricing/party-prices/party/${props.partyId}/history`)
    ])
  } finally {
    loading.value = false
  }
}

function edit(price: any) {
  form.product_id = price.product_id
  form.operation_type = price.operation_type
  form.currency_id = price.currency_id
  form.price = Number(price.price)
}

async function save() {
  if (!form.product_id || !form.currency_id || form.price < 0) return
  saving.value = true
  try {
    await $fetch('/api/erp/pricing/party-prices', {
      method: 'POST',
      body: { ...form, party_id: props.partyId }
    })
    toast.add({ title: 'Precio guardado', description: 'Quedó vigente para esta parte interesada.', color: 'success' })
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(price: any) {
  await $fetch(`/api/erp/pricing/party-prices/${price.id}`, { method: 'DELETE' })
  toast.add({ title: 'Precio desactivado', color: 'success' })
  await load()
}

function money(value: unknown, code = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: code }).format(Number(value ?? 0))
}

onMounted(async () => {
  await Promise.all([productsStore.fetchAll(), initCurrencies()])
  form.currency_id = activeCurrencies.value.find(currency => currency.is_base)?.id ?? activeCurrencies.value[0]?.id ?? ''
  await load()
})
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="text-base font-semibold">Precios por cliente o proveedor</h2>
        <p class="mt-1 text-sm text-muted">El último precio confirmado también se actualiza automáticamente y conserva su historial.</p>
      </div>
    </template>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,2fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_auto]">
      <UFormField label="Producto o tarifa">
        <USelectMenu v-model="form.product_id" :items="productOptions" value-key="value" searchable class="w-full min-w-0" />
      </UFormField>
      <UFormField label="Operación">
        <USelect v-model="form.operation_type" :items="operationOptions" class="w-full min-w-0" />
      </UFormField>
      <UFormField label="Moneda">
        <USelect v-model="form.currency_id" :items="currencyOptions" class="w-full min-w-0" />
      </UFormField>
      <UFormField label="Precio">
        <UInput v-model.number="form.price" type="number" min="0" step="0.01" class="w-full" />
      </UFormField>
      <div class="flex items-end">
        <UButton label="Guardar precio" icon="i-lucide-save" :loading="saving" :disabled="!form.product_id || !form.currency_id" class="w-full justify-center" @click="save" />
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-lg border border-default">
      <table class="w-full min-w-[680px] text-sm">
        <thead class="bg-elevated text-left text-muted">
          <tr><th class="p-3">Producto</th><th class="p-3">Operación</th><th class="p-3 text-right">Precio vigente</th><th class="p-3">Desde</th><th class="p-3 text-right">Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-for="price in prices" :key="price.id" class="border-t border-default">
            <td class="p-3 font-medium">{{ price.products?.name }}</td>
            <td class="p-3">{{ price.operation_type === 'SALE' ? 'Venta' : 'Compra' }}</td>
            <td class="p-3 text-right tabular-nums">{{ money(price.price, price.currencies?.code) }}</td>
            <td class="p-3 text-muted">{{ new Date(price.effective_from).toLocaleDateString('es-AR') }}</td>
            <td class="p-3"><div class="flex justify-end gap-1"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Editar" @click="edit(price)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Desactivar" @click="remove(price)" /></div></td>
          </tr>
          <tr v-if="!loading && !prices.length"><td colspan="5" class="p-6 text-center text-muted">Todavía no hay precios específicos.</td></tr>
        </tbody>
      </table>
    </div>

    <details v-if="history.length" class="mt-5">
      <summary class="cursor-pointer text-sm font-medium">Ver historial de cambios ({{ history.length }})</summary>
      <div class="mt-3 max-h-64 space-y-2 overflow-y-auto">
        <div v-for="entry in history" :key="entry.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-elevated px-3 py-2 text-sm">
          <span>{{ entry.products?.name }} · {{ entry.operation_type === 'SALE' ? 'Venta' : 'Compra' }}</span>
          <span class="tabular-nums">{{ entry.previous_price == null ? 'Nuevo' : money(entry.previous_price, entry.currencies?.code) }} → <strong>{{ money(entry.new_price, entry.currencies?.code) }}</strong></span>
          <span class="text-muted">{{ new Date(entry.effective_at).toLocaleString('es-AR') }}</span>
        </div>
      </div>
    </details>
  </UCard>
</template>
