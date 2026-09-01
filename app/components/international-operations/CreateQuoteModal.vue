<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useDocumentTypes } from '~/modulos/erp/documents/documents-types/composable/useDocumentTypes'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useProductsService } from '~/modulos/logistica/master-data/product/service/product.service'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

interface Props {
  open: boolean
  operationId: string
  operationCurrencyCode?: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'created', documentId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()
const partiesService = useBusinessPartiesService()
const productsService = useProductsService()
const docTypes = useDocumentTypes()
const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()

const loading = ref(false)
const partyItems = ref<Array<{ label: string; value: string }>>([])
const productItems = ref<Array<{ label: string; value: string }>>([])

const quoteTypes = computed(() =>
  docTypes.items.value.filter(dt => dt.direction === -1 && dt.category === 'QUOTE')
)
const quoteTypeItems = computed(() =>
  quoteTypes.value.map(dt => ({ label: `${dt.code} - ${dt.description}`, value: dt.id }))
)

const form = reactive({
  document_type_id: '',
  party_id: '',
  date: new Date().toISOString().split('T')[0],
  descrip: '',
  currency_code: 'USD'
})

const items = ref<Array<{ product_id: string; quantity: number; unit_price: number }>>([
  { product_id: '', quantity: 1, unit_price: 0 }
])

const total = computed(() =>
  items.value.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0)
)

const addItem = () => {
  items.value.push({ product_id: '', quantity: 1, unit_price: 0 })
}
const removeItem = (idx: number) => {
  if (items.value.length > 1) items.value.splice(idx, 1)
}

const selectedParty = computed({
  get: () => partyItems.value.find(o => o.value === form.party_id),
  set: (val: any) => { form.party_id = val?.value ?? '' }
})

const getProductItem = (product_id: string) => productItems.value.find(o => o.value === product_id)

onMounted(async () => {
  await Promise.all([
    docTypes.init(),
    initCurrencies(),
    partiesService.findAll().then((parties: any[]) => {
      partyItems.value = (parties ?? []).map((p: any) => ({ label: p.name, value: p.id }))
    }).catch(() => {}),
    productsService.findAll().then((products: any[]) => {
      productItems.value = (products ?? []).map((p: any) => ({
        label: p.sku ? `${p.sku} — ${p.name}` : p.name,
        value: p.id
      }))
    }).catch(() => {})
  ])
})

watch(() => props.open, (open) => {
  if (open) {
    form.currency_code = props.operationCurrencyCode ?? 'USD'
    if (quoteTypeItems.value.length === 1) {
      form.document_type_id = quoteTypeItems.value[0]!.value
    }
  }
})

const isValid = computed(() =>
  form.document_type_id && form.party_id && items.value.every(i => i.product_id && i.quantity > 0)
)

const handleSubmit = async () => {
  if (!isValid.value) return
  try {
    loading.value = true
    const created: any = await DocumentsPurchasesService.create({
      document_type_id: form.document_type_id,
      party_id: form.party_id,
      date: form.date,
      descrip: form.descrip || undefined,
      currency_code: form.currency_code,
      items: items.value.map(i => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        taxes: []
      }))
    })
    await $fetch(`/api/international-operations/${props.operationId}/quotes`, {
      method: 'POST',
      body: { document_id: created.id }
    })
    toast.add({ title: 'Presupuesto creado y asociado', color: 'success' })
    emit('created', created.id)
    emit('update:open', false)
  } catch (e: any) {
    toast.add({
      title: 'Error al crear presupuesto',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="props.open"
    title="Crear Presupuesto"
    description="Se crea un presupuesto de compra y se asocia a la operación"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Tipo de documento" required>
            <USelect
              v-model="form.document_type_id"
              :items="quoteTypeItems"
              placeholder="Seleccionar tipo..."
              class="w-full"
              :disabled="loading || quoteTypeItems.length === 1"
            />
          </UFormField>
          <UFormField label="Proveedor" required>
            <USelectMenu
              v-model="selectedParty"
              :items="partyItems"
              placeholder="Seleccionar proveedor..."
              searchable
              class="w-full"
              :disabled="loading"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <UFormField label="Fecha">
            <UInput v-model="form.date" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Moneda">
            <USelect v-model="form.currency_code" :items="currencyOptions" class="w-full" />
          </UFormField>
          <UFormField label="Referencia">
            <UInput v-model="form.descrip" placeholder="Ej: Cotización MSC" class="w-full" />
          </UFormField>
        </div>

        <div class="space-y-2">
          <p class="text-xs font-semibold text-muted uppercase tracking-wide">Ítems</p>
          <div
            v-for="(item, idx) in items"
            :key="idx"
            class="flex items-end gap-2"
          >
            <UFormField label="Producto" class="flex-1">
              <USelectMenu
                :model-value="getProductItem(item.product_id)"
                :items="productItems"
                placeholder="Seleccionar producto..."
                searchable
                class="w-full"
                :disabled="loading"
                @update:model-value="(v: any) => item.product_id = v?.value ?? ''"
              />
            </UFormField>
            <UFormField label="Cant." class="w-24">
              <UInput v-model.number="item.quantity" type="number" min="1" class="w-full" />
            </UFormField>
            <UFormField label="Precio" class="w-32">
              <UInput v-model.number="item.unit_price" type="number" step="0.01" min="0" class="w-full" />
            </UFormField>
            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              :disabled="items.length === 1"
              @click="removeItem(idx)"
            />
          </div>
          <UButton label="Agregar ítem" icon="i-lucide-plus" variant="outline" size="xs" @click="addItem" />
        </div>

        <div class="flex justify-end items-center gap-3 border-t border-default pt-3">
          <span class="text-sm text-muted">Total:</span>
          <span class="font-bold text-lg">{{ form.currency_code }} {{ total.toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton variant="ghost" @click="emit('update:open', false)" :disabled="loading">Cancelar</UButton>
      <UButton label="Crear y asociar" @click="handleSubmit" :disabled="loading || !isValid" :loading="loading" />
    </template>
  </UModal>
</template>
