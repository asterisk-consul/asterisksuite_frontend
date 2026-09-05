<script setup lang="ts">
const props = defineProps<{
  productId: string
  supplier?: any
  isEdit?: boolean
}>()

const emit = defineEmits<{
  submit: [data: any]
}>()

const open = defineModel<boolean>('open', { default: false })

const selectedSupplierId = ref('')
const purchasePrice = ref('')
const currencyId = ref('')
const leadTimeDays = ref<number | null>(null)
const minOrderQuantity = ref('')
const isPrimary = ref(false)

// Load suppliers and currencies
const suppliers = ref<any[]>([])
const currencies = ref<any[]>([])

onMounted(async () => {
  const [suppliersData, currenciesData] = await Promise.all([
    $fetch<any[]>('/api/logistica/master-data/business-parties'),
    $fetch<any[]>('/api/erp/currencies')
  ])
  suppliers.value = suppliersData.filter((s: any) => s.type === 'SUPPLIER')
  currencies.value = currenciesData
})

// Pre-fill form when editing
watchEffect(() => {
  if (props.supplier && props.isEdit) {
    selectedSupplierId.value = props.supplier.supplier_id || ''
    purchasePrice.value = props.supplier.purchase_price || ''
    currencyId.value = props.supplier.currency_id || ''
    leadTimeDays.value = props.supplier.lead_time_days || null
    minOrderQuantity.value = props.supplier.min_order_quantity || ''
    isPrimary.value = props.supplier.is_primary || false
  } else {
    selectedSupplierId.value = ''
    purchasePrice.value = ''
    currencyId.value = ''
    leadTimeDays.value = null
    minOrderQuantity.value = ''
    isPrimary.value = false
  }
})

const supplierOptions = computed(() =>
  suppliers.value.map((s: any) => ({
    label: `${s.name}${s.tax_id ? ` (${s.tax_id})` : ''}`,
    value: s.id
  }))
)

const currencyOptions = computed(() =>
  currencies.value.map((c: any) => ({
    label: `${c.code} - ${c.name}`,
    value: c.id
  }))
)

const isValid = computed(() =>
  selectedSupplierId.value && purchasePrice.value && currencyId.value
)

function handleSubmit() {
  if (!isValid.value) return

  emit('submit', {
    supplier_id: selectedSupplierId.value,
    purchase_price: purchasePrice.value,
    currency_id: currencyId.value,
    lead_time_days: leadTimeDays.value || undefined,
    min_order_quantity: minOrderQuantity.value || undefined,
    is_primary: isPrimary.value
  })
}
</script>

<template>
  <UModal v-model:open="open" :title="isEdit ? 'Editar proveedor' : 'Agregar proveedor'">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Proveedor" required>
          <USelect
            v-model="selectedSupplierId"
            :items="supplierOptions"
            placeholder="Seleccionar proveedor"
            searchable
            class="w-full"
            :disabled="isEdit"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Precio de compra" required>
            <UInput
              v-model="purchasePrice"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
            />
          </UFormField>

          <UFormField label="Moneda" required>
            <USelect
              v-model="currencyId"
              :items="currencyOptions"
              placeholder="Moneda"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Días de entrega">
            <UInput
              v-model="leadTimeDays"
              type="number"
              min="0"
              placeholder="Ej: 7"
            />
          </UFormField>

          <UFormField label="Cantidad mín. pedido">
            <UInput
              v-model="minOrderQuantity"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
            />
          </UFormField>
        </div>

        <USwitch v-model="isPrimary" label="Proveedor principal" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" @click="open = false">Cancelar</UButton>
        <UButton :disabled="!isValid" @click="handleSubmit">
          {{ isEdit ? 'Guardar' : 'Agregar' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
