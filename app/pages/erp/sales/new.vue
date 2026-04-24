<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  ssr: false
})

import { DocumentsSalesService } from '~/modulos/erp/sales/sales.service'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/business-parties.service'
import type {
  SalesDocumentItem,
  SalesTax,
  SalesDocumentTax
} from '~/modulos/erp/sales/types/sales.types'

const router = useRouter()
const toast = useToast()

// ✅ instanciar servicio
const salesService = useSalesService()

// ── Clientes ──────────────────────────────────────────────────────
const { data: parties } = useBusinessPartiesService.findAll()
console.log(parties)
// debug
watch(partiesError, (e) => {
  if (e) console.error('ERROR PARTIES:', e)
})

const partyOptions = computed(() =>
  (parties.value ?? []).map((p: any) => ({
    label: p.name,
    value: p.id
  }))
)

// ── Productos ─────────────────────────────────────────────────────
// ✔ Productos
const { data: products } = await useAsyncData('products-list', () =>
  $fetch('/api/master-data/products')
)

// debug
watch(productsError, (e) => {
  if (e) console.error('ERROR PRODUCTS:', e)
})

const productOptions = computed(() =>
  (products.value ?? []).map((p: any) => ({
    label: p.name,
    value: p.id,
    price: p.price ?? 0,
    tax: p.tax ?? null
  }))
)

// ── Form ──────────────────────────────────────────────────────────
const form = reactive({
  document_type_id: '84052621-1431-425b-a301-ce6429fafb6a',
  party_id: '',
  date: new Date().toISOString().slice(0, 10),
  descrip: '',
  ref: ''
})

const selectedParty = ref<{ label: string; value: string } | null>(null)

watch(selectedParty, (v) => {
  form.party_id = v?.value ?? ''
})

// ── Items ─────────────────────────────────────────────────────────
interface LineItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  price: number
  tax_rate: number
  tax_id: string
  tax_amount: number
}

const items = ref<LineItem[]>([])
const selectedProduct = ref<any>(null)

function addItem() {
  if (!selectedProduct.value) return

  const prod = productOptions.value.find(
    (p) => p.value === selectedProduct.value?.value
  )
  if (!prod) return

  items.value.push({
    product_id: prod.value,
    product_name: prod.label,
    quantity: 1,
    unit_price: prod.price,
    price: prod.price,
    tax_rate: prod.tax?.rate ?? 21,
    tax_id: prod.tax?.id ?? '',
    tax_amount: parseFloat(
      (prod.price * ((prod.tax?.rate ?? 21) / 100)).toFixed(2)
    )
  })

  selectedProduct.value = null
}

function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

function updateItemQty(idx: number, qty: number) {
  const item = items.value[idx]
  if (!item) return

  item.quantity = qty
  item.price = parseFloat((item.unit_price * qty).toFixed(2))
  item.tax_amount = parseFloat((item.price * (item.tax_rate / 100)).toFixed(2))
}

// ── Totales ───────────────────────────────────────────────────────
const subtotal = computed(() =>
  items.value.reduce((acc, i) => acc + i.price, 0)
)

const totalTaxes = computed(() =>
  items.value.reduce((acc, i) => acc + i.tax_amount, 0)
)

const total = computed(() => subtotal.value + totalTaxes.value)

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(n ?? 0)
}

// ── Submit ────────────────────────────────────────────────────────
const saving = ref(false)

async function submit() {
  if (!form.party_id) {
    toast.add({ title: 'Seleccioná un cliente', color: 'warning' })
    return
  }

  if (!items.value.length) {
    toast.add({ title: 'Agregá al menos un ítem', color: 'warning' })
    return
  }

  const taxesMap = new Map<
    string,
    {
      tax_id: string
      tax_rate: number
      taxable_base: number
      tax_amount: number
    }
  >()

  for (const item of items.value) {
    if (!item.tax_id) continue

    const existing = taxesMap.get(item.tax_id)

    if (existing) {
      existing.taxable_base += item.price
      existing.tax_amount += item.tax_amount
    } else {
      taxesMap.set(item.tax_id, {
        tax_id: item.tax_id,
        tax_rate: item.tax_rate,
        taxable_base: item.price,
        tax_amount: item.tax_amount
      })
    }
  }

  const payload = {
    document_type_id: form.document_type_id,
    party_id: form.party_id,
    date: form.date,
    descrip: form.descrip || undefined,
    ref: form.ref || undefined,
    subtotal: subtotal.value,
    exempt_amount: 0,
    total_taxes: totalTaxes.value,
    total: total.value,
    items: items.value.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      price: i.price,
      taxes: i.tax_id
        ? [
            {
              tax_id: i.tax_id,
              tax_rate: i.tax_rate,
              tax_amount: i.tax_amount
            }
          ]
        : []
    })),
    taxes: Array.from(taxesMap.values())
  }

  try {
    saving.value = true

    const created = await salesService.create(payload)

    toast.add({ title: 'Factura creada', color: 'success' })

    router.push(`/erp/sales/${created.id}`)
  } catch (e: any) {
    console.error('ERROR CREATE:', e)

    toast.add({
      title: 'Error al crear factura',
      description: e?.data?.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Nueva Factura de Venta">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            @click="router.push('/erp/sales')"
          />
        </template>
        <template #right>
          <UButton icon="i-heroicons-check" :loading="saving" @click="submit">
            Guardar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-5 max-w-4xl mx-auto">
        <!-- ERROR DEBUG -->
        <UAlert
          v-if="partiesError || productsError"
          color="error"
          title="Error cargando datos"
        />

        <!-- DATOS -->
        <div class="bg-white rounded-xl border p-5 space-y-4">
          <span class="text-sm font-semibold">Datos generales</span>

          <USelectMenu
            v-model="selectedParty"
            :options="partyOptions"
            placeholder="Cliente"
            searchable
          />

          <UInput v-model="form.date" type="date" />
        </div>

        <!-- ITEMS -->
        <div class="bg-white rounded-xl border p-5 space-y-4">
          <USelectMenu
            v-model="selectedProduct"
            :options="productOptions"
            placeholder="Producto"
            searchable
          />

          <UButton @click="addItem">Agregar</UButton>

          <div v-if="!items.length" class="text-gray-400">Sin items</div>

          <div v-for="(item, i) in items" :key="i">
            {{ item.product_name }} - {{ fmt(item.price) }}
          </div>
        </div>

        <!-- TOTAL -->
        <div v-if="items.length">Total: {{ fmt(total) }}</div>
      </div>
    </template>
  </UDashboardPanel>
</template>
