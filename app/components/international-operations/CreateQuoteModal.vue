<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useDocumentTypes } from '~/modulos/erp/documents/documents-types/composable/useDocumentTypes'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
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
const productsStore = useProductsStore()
const docTypes = useDocumentTypes()
const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()
const { items: products, loading: productLoading } = storeToRefs(productsStore)
const { items: productOptions } = useProducts('PURCHASE')

const loading = ref(false)
const partyItems = ref<Array<{ label: string; value: string }>>([])
const selectedProduct = ref<any>(undefined)

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

const items = ref<Array<{ product_id: string; product_name: string; quantity: number; unit_price: number }>>([])

const total = computed(() =>
  items.value.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0)
)

const addItem = () => {
  const product = selectedProduct.value
  if (!product?.value) return
  if (items.value.some(item => item.product_id === product.value)) {
    toast.add({ title: 'El producto ya está incluido', color: 'warning' })
    return
  }
  items.value.push({
    product_id: product.value,
    product_name: product.label,
    quantity: 1,
    unit_price: Number(product.price ?? 0)
  })
  selectedProduct.value = undefined
}
const removeItem = (idx: number) => {
  items.value.splice(idx, 1)
}

const selectedParty = computed({
  get: () => partyItems.value.find(o => o.value === form.party_id),
  set: (val: any) => { form.party_id = val?.value ?? '' }
})

onMounted(async () => {
  await Promise.all([
    docTypes.init(),
    initCurrencies(),
    partiesService.findAll().then((parties: any[]) => {
      partyItems.value = (parties ?? []).map((p: any) => ({ label: p.name, value: p.id }))
    }).catch(() => {}),
    products.value.length > 0 ? Promise.resolve() : productsStore.fetchAll()
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
    await $fetch(`/api/backend/${props.operationId}/quotes`, {
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
    title="Crear presupuesto"
    description="Registrá la propuesta del proveedor y comparala dentro de esta operación."
    :ui="{ content: 'w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[92vh]', body: 'overflow-y-auto' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-5">
        <section class="rounded-xl border border-default bg-muted/20 p-4 sm:p-5">
          <div class="mb-4 flex items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon name="i-lucide-building-2" class="size-5" />
            </div>
            <div>
              <h3 class="font-semibold">Proveedor y comprobante</h3>
              <p class="text-sm text-muted">Identificá quién cotiza y los datos generales de su propuesta.</p>
            </div>
          </div>

          <div class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Proveedor" required class="min-w-0 md:col-span-2">
              <USelectMenu
                v-model="selectedParty"
                :items="partyItems"
                placeholder="Buscar y seleccionar proveedor..."
                searchable
                class="w-full min-w-0"
                :disabled="loading"
              />
            </UFormField>

            <UFormField label="Tipo de documento" required class="min-w-0">
              <USelect
                v-model="form.document_type_id"
                :items="quoteTypeItems"
                placeholder="Seleccionar tipo..."
                class="w-full min-w-0"
                :disabled="loading || quoteTypeItems.length === 1"
              />
            </UFormField>

            <UFormField label="Referencia" hint="Opcional" class="min-w-0">
              <UInput v-model="form.descrip" placeholder="Ej: Cotización MSC 2026" class="w-full min-w-0" />
            </UFormField>

            <UFormField label="Fecha" class="min-w-0">
              <UInput v-model="form.date" type="date" class="w-full min-w-0" />
            </UFormField>

            <UFormField label="Moneda" class="min-w-0">
              <USelect
                v-model="form.currency_code"
                :items="currencyOptions"
                placeholder="Seleccionar moneda..."
                class="w-full min-w-0"
              />
            </UFormField>
          </div>
        </section>

        <section class="rounded-xl border border-default bg-default p-4 sm:p-5">
          <div class="mb-4 flex items-start gap-3">
            <div class="flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-package-open" class="size-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold">Productos cotizados</h3>
                  <UBadge :label="String(items.length)" color="neutral" variant="subtle" size="sm" />
                </div>
                <p class="text-sm text-muted">Cargá cantidades y precios informados por este proveedor.</p>
              </div>
            </div>
          </div>

          <div class="mb-4 rounded-lg bg-muted/30 p-3">
            <UFormField label="Agregar producto" description="El catálogo completo queda disponible para buscar por código o nombre.">
              <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
                <USelectMenu
                  v-model="selectedProduct"
                  :items="productOptions"
                  placeholder="Buscar producto por código o nombre..."
                  searchable
                  size="lg"
                  class="min-w-0 flex-1"
                  :loading="productLoading"
                  :disabled="loading"
                />
                <UButton
                  label="Agregar"
                  icon="i-lucide-plus"
                  size="lg"
                  class="justify-center sm:shrink-0"
                  :disabled="loading || !selectedProduct"
                  @click="addItem"
                />
              </div>
            </UFormField>
          </div>

          <div class="space-y-3">
            <div v-if="items.length === 0" class="rounded-lg border border-dashed border-default px-4 py-8 text-center">
              <UIcon name="i-lucide-package-search" class="mx-auto mb-2 size-8 text-muted" />
              <p class="text-sm font-medium">Todavía no agregaste productos</p>
              <p class="mt-1 text-xs text-muted">Buscá un producto arriba para incorporarlo al presupuesto.</p>
            </div>
            <div
              v-for="(item, idx) in items"
              :key="idx"
              class="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-default p-3 sm:grid-cols-12 sm:items-end"
            >
              <div class="min-w-0 sm:col-span-6">
                <p class="mb-1 text-xs font-medium text-muted">Producto {{ idx + 1 }}</p>
                <p class="truncate text-sm font-semibold" :title="item.product_name">{{ item.product_name }}</p>
              </div>

              <UFormField label="Cantidad" required class="min-w-0 sm:col-span-2">
                <UInput v-model.number="item.quantity" type="number" min="1" class="w-full min-w-0" />
              </UFormField>

              <UFormField :label="`Precio unitario (${form.currency_code})`" class="min-w-0 sm:col-span-3">
                <UInput
                  v-model.number="item.unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  class="w-full min-w-0"
                />
              </UFormField>

              <div class="flex justify-end sm:col-span-1 sm:justify-center">
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  aria-label="Quitar producto"
                  :disabled="loading"
                  @click="removeItem(idx)"
                />
              </div>
            </div>
          </div>

          <div class="mt-5 flex flex-col gap-1 border-t border-default pt-4 text-right sm:items-end">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Total del presupuesto</span>
            <span class="text-2xl font-bold tabular-nums">
              {{ form.currency_code }} {{ total.toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
            </span>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          label="Cancelar"
          variant="ghost"
          class="justify-center"
          :disabled="loading"
          @click="emit('update:open', false)"
        />
        <UButton
          label="Crear y asociar presupuesto"
          icon="i-lucide-check"
          class="justify-center"
          :disabled="loading || !isValid"
          :loading="loading"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
