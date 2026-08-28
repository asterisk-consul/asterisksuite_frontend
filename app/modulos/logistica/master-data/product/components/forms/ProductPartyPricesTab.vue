<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

const props = defineProps<{ productId: string }>()
const toast = useToast()
const partiesStore = useBusinessPartiesStore()
const { items: parties } = storeToRefs(partiesStore)
const { init: initCurrencies, activeCurrencies } = useCurrencies()
const prices = ref<any[]>([])
const history = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const formPanel = ref<HTMLElement | null>(null)
const form = reactive({
  operation_type: 'SALE' as 'SALE' | 'PURCHASE',
  party_id: '',
  currency_id: '',
  price: 0
})

const operationOptions = [
  { label: 'Cliente (venta)', value: 'SALE' },
  { label: 'Proveedor (compra)', value: 'PURCHASE' }
]
const eligibleParties = computed(() => parties.value.filter(party =>
  party.active !== false && party.type === (form.operation_type === 'SALE' ? 'CUSTOMER' : 'SUPPLIER')
))
const partyOptions = computed(() => eligibleParties.value.map(party => ({
  label: party.tax_id ? `${party.name} · ${party.tax_id}` : party.name,
  value: party.id
})))
const currencyOptions = computed(() => activeCurrencies.value.map(currency => ({
  label: `${currency.symbol} ${currency.code}`,
  value: currency.id
})))

watch(() => form.operation_type, (value, previous) => {
  if (value !== previous) form.party_id = ''
})

async function load() {
  loading.value = true
  try {
    [prices.value, history.value] = await Promise.all([
      $fetch<any[]>(`/api/erp/pricing/party-prices/product/${props.productId}`),
      $fetch<any[]>(`/api/erp/pricing/party-prices/product/${props.productId}/history`)
    ])
  } finally {
    loading.value = false
  }
}

async function edit(item: any) {
  editingId.value = item.id
  form.operation_type = item.operation_type
  // El watcher del tipo de operación se ejecuta en el siguiente tick.
  // Cargamos la parte interesada después para que no sea limpiada.
  await nextTick()
  form.party_id = item.party_id
  form.currency_id = item.currency_id
  form.price = Number(item.price)
  await nextTick()
  formPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function cancelEdit() {
  editingId.value = null
  form.party_id = ''
  form.price = 0
}

async function save() {
  if (!form.party_id || !form.currency_id) return
  saving.value = true
  try {
    await $fetch('/api/erp/pricing/party-prices', {
      method: 'POST',
      body: { ...form, product_id: props.productId }
    })
    toast.add({ title: 'Relación guardada', description: 'El precio quedó asignado a la parte interesada.', color: 'success' })
    editingId.value = null
    form.party_id = ''
    form.price = 0
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(item: any) {
  await $fetch(`/api/erp/pricing/party-prices/${item.id}`, { method: 'DELETE' })
  toast.add({ title: 'Relación desactivada', color: 'success' })
  await load()
}

function money(value: unknown, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value ?? 0))
}

onMounted(async () => {
  await Promise.all([partiesStore.fetchAll(), initCurrencies()])
  form.currency_id = activeCurrencies.value.find(currency => currency.is_base)?.id ?? activeCurrencies.value[0]?.id ?? ''
  await load()
})
</script>

<template>
  <div class="space-y-5 p-1">
    <div>
      <h3 class="text-sm font-semibold">Clientes y proveedores</h3>
      <p class="mt-1 text-sm text-muted">Asigná esta tarifa a una parte interesada y definí su precio. Si no tiene una asignación, se utiliza el precio general.</p>
    </div>

    <div ref="formPanel" class="rounded-lg border p-4 transition-colors" :class="editingId ? 'border-primary bg-primary/5' : 'border-default'">
      <div v-if="editingId" class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm font-medium text-primary"><UIcon name="i-lucide-pencil" /> Editando precio acordado</div>
        <UButton type="button" label="Cancelar" color="neutral" variant="ghost" size="xs" @click="cancelEdit" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(15rem,2fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_auto]">
      <UFormField label="Tipo de relación">
        <USelect v-model="form.operation_type" :items="operationOptions" class="w-full min-w-0" />
      </UFormField>
      <UFormField :label="form.operation_type === 'SALE' ? 'Cliente' : 'Proveedor'">
        <USelectMenu v-model="form.party_id" :items="partyOptions" value-key="value" searchable class="w-full min-w-0" />
      </UFormField>
      <UFormField label="Moneda">
        <USelect v-model="form.currency_id" :items="currencyOptions" class="w-full min-w-0" />
      </UFormField>
      <UFormField label="Precio acordado">
        <UInput v-model.number="form.price" type="number" min="0" step="0.01" class="w-full" />
      </UFormField>
      <div class="flex items-end">
        <UButton type="button" :label="editingId ? 'Guardar cambios' : 'Asignar'" :icon="editingId ? 'i-lucide-save' : 'i-lucide-link'" :loading="saving" :disabled="!form.party_id || !form.currency_id" class="w-full justify-center" @click="save" />
      </div>
      </div>
    </div>

    <div class="overflow-x-auto rounded-lg border border-default">
      <table class="w-full min-w-[680px] text-sm">
        <thead class="bg-elevated text-left text-muted"><tr><th class="p-3">Cliente / proveedor</th><th class="p-3">Uso</th><th class="p-3 text-right">Precio</th><th class="p-3">Vigente desde</th><th class="p-3 text-right">Acciones</th></tr></thead>
        <tbody>
          <tr v-for="item in prices" :key="item.id" class="border-t border-default" :class="editingId === item.id ? 'bg-primary/5' : ''">
            <td class="p-3 font-medium">{{ item.business_parties?.name }}</td>
            <td class="p-3"><UBadge :color="item.operation_type === 'SALE' ? 'primary' : 'info'" variant="subtle">{{ item.operation_type === 'SALE' ? 'Venta' : 'Compra' }}</UBadge></td>
            <td class="p-3 text-right tabular-nums">{{ money(item.price, item.currencies?.code) }}</td>
            <td class="p-3 text-muted">{{ new Date(item.effective_from).toLocaleDateString('es-AR') }}</td>
            <td class="p-3"><div class="flex justify-end gap-1"><UButton type="button" icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Editar" @click="edit(item)" /><UButton type="button" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Desactivar" @click="remove(item)" /></div></td>
          </tr>
          <tr v-if="!loading && !prices.length"><td colspan="5" class="p-7 text-center text-muted">Esta tarifa todavía no tiene clientes ni proveedores asignados. Se usará su precio general.</td></tr>
        </tbody>
      </table>
    </div>

    <details v-if="history.length">
      <summary class="cursor-pointer text-sm font-medium">Historial de precios ({{ history.length }})</summary>
      <div class="mt-3 max-h-60 space-y-2 overflow-y-auto">
        <div v-for="entry in history" :key="entry.id" class="flex flex-wrap justify-between gap-2 rounded-md bg-elevated px-3 py-2 text-sm">
          <span>{{ entry.business_parties?.name }} · {{ entry.operation_type === 'SALE' ? 'Venta' : 'Compra' }}</span>
          <span>{{ entry.previous_price == null ? 'Nuevo' : money(entry.previous_price, entry.currencies?.code) }} → <strong>{{ money(entry.new_price, entry.currencies?.code) }}</strong></span>
          <span class="text-muted">{{ new Date(entry.effective_at).toLocaleString('es-AR') }}</span>
        </div>
      </div>
    </details>
  </div>
</template>
