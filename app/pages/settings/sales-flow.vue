<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

interface SalesFlowSettings {
  accounting_basis: 'INVOICE' | 'ORDER' | 'ORDER_THEN_INVOICE'
  payment_document_basis: 'INVOICE' | 'ORDER' | 'BOTH'
  require_payment_for_delivery: boolean
  delivery_payment_percentage: number
  require_invoice_for_delivery: boolean
  auto_create_delivery_note: boolean
  allow_partial_delivery: boolean
}

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const settings = ref<SalesFlowSettings>()

const accountingOptions = [
  { label: 'Factura', value: 'INVOICE', description: 'La deuda nace cuando se confirma la factura.' },
  { label: 'Orden de venta', value: 'ORDER', description: 'La deuda nace cuando se confirma la OV.' },
  { label: 'OV y luego factura', value: 'ORDER_THEN_INVOICE', description: 'La OV genera deuda provisoria y la factura la reemplaza sin duplicarla.' }
]
const paymentOptions = [
  { label: 'Factura', value: 'INVOICE' },
  { label: 'Orden de venta', value: 'ORDER' },
  { label: 'OV o factura', value: 'BOTH' }
]

async function load() {
  loading.value = true
  try {
    settings.value = await $fetch<SalesFlowSettings>('/api/backend/sales-flow/settings')
  } catch {
    toast.add({ title: 'No se pudo cargar la configuración', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!settings.value) return
  saving.value = true
  try {
    const payload: SalesFlowSettings = {
      accounting_basis: settings.value.accounting_basis,
      payment_document_basis: settings.value.payment_document_basis,
      require_payment_for_delivery: settings.value.require_payment_for_delivery,
      delivery_payment_percentage: Number(settings.value.delivery_payment_percentage),
      require_invoice_for_delivery: settings.value.require_invoice_for_delivery,
      auto_create_delivery_note: settings.value.auto_create_delivery_note,
      allow_partial_delivery: settings.value.allow_partial_delivery
    }
    settings.value = await $fetch<SalesFlowSettings>('/api/backend/sales-flow/settings', {
      method: 'PATCH', body: payload
    })
    toast.add({ title: 'Circuito de ventas guardado', description: 'Se aplicará a las nuevas órdenes de venta.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6 pb-24">
    <UPageHeader title="Circuito de ventas" description="Definí cuándo nace la deuda, dónde se registran los cobros y cuándo se habilita la entrega." />

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-history"
      title="Las reglas se copian en cada nueva OV"
      description="Cambiar esta configuración no recalcula documentos, pagos ni cuentas corrientes anteriores."
    />

    <div v-if="loading" class="py-16 text-center text-muted">Cargando configuraciónâ€¦</div>
    <template v-else-if="settings">
      <UPageCard title="Cuenta corriente y cobros" description="Al guardar, también se sincronizan los indicadores de las OV y facturas de venta.">
        <div class="grid gap-5 md:grid-cols-2">
          <UFormField label="La deuda se registra desde" help="En el modo combinado, la factura reemplaza el importe provisorio de la OV.">
            <USelect v-model="settings.accounting_basis" :items="accountingOptions" value-key="value" label-key="label" class="w-full" />
          </UFormField>
          <UFormField label="El cobro se puede aplicar a">
            <USelect v-model="settings.payment_document_basis" :items="paymentOptions" value-key="value" label-key="label" class="w-full" />
          </UFormField>
        </div>
        <UAlert
          class="mt-5"
          color="primary"
          variant="subtle"
          icon="i-lucide-info"
          title="Los tipos documentales se mantienen sincronizados"
          description="Factura activa solamente la factura; Orden de venta activa solamente la OV; las opciones combinadas activan ambos documentos. Los movimientos históricos no se recalculan."
        />
      </UPageCard>

      <UPageCard title="Condición para remitir" description="El remito se habilita con las condiciones que definas para la operación.">
        <div class="space-y-5">
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Exigir un porcentaje cobrado</p><p class="text-sm text-muted">Suma los cobros aplicados a la OV o a sus facturas sin duplicarlos.</p></div>
            <USwitch v-model="settings.require_payment_for_delivery" />
          </div>
          <UFormField v-if="settings.require_payment_for_delivery" label="Porcentaje mínimo cobrado">
            <UInput v-model.number="settings.delivery_payment_percentage" type="number" min="0" max="100" step="0.01" class="w-48"><template #trailing>%</template></UInput>
          </UFormField>
          <USeparator />
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Exigir factura</p><p class="text-sm text-muted">La entrega queda pendiente hasta que la OV tenga al menos una factura.</p></div>
            <USwitch v-model="settings.require_invoice_for_delivery" />
          </div>
          <USeparator />
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Crear remito automáticamente</p><p class="text-sm text-muted">Cuando se cumplen las condiciones, crea un borrador para el usuario de logística.</p></div>
            <USwitch v-model="settings.auto_create_delivery_note" />
          </div>
          <USeparator />
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Permitir entregas parciales</p><p class="text-sm text-muted">Habilita remitos por cantidades menores a las vendidas.</p></div>
            <USwitch v-model="settings.allow_partial_delivery" />
          </div>
        </div>
      </UPageCard>
    </template>

    <div class="sticky bottom-4 z-10 flex justify-end rounded-xl border border-default bg-default/95 p-3 shadow-lg backdrop-blur">
      <UButton label="Guardar configuración" icon="i-lucide-save" :loading="saving" :disabled="loading || !settings" @click="save" />
    </div>
  </div>
</template>
