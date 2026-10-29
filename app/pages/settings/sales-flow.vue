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
  reserve_stock_on_order_confirmation: boolean
  allow_partial_stock_reservation: boolean
  allow_backorder_without_stock: boolean
  prompt_order_assignee_on_confirmation: boolean
  require_order_assignee_on_confirmation: boolean
  default_order_assignee_id: string | null
  recalculated_delivery_orders?: number
}

const toast = useToast()
const NO_ASSIGNEE = '__NO_ASSIGNEE__'
const loading = ref(true)
const saving = ref(false)
const settings = ref<SalesFlowSettings>()
const companyUsers = ref<Array<{ id: string, name: string, email: string }>>([])
const userOptions = computed(() => [
  { value: NO_ASSIGNEE, label: 'Sin responsable predeterminado', description: 'Se elegirá al confirmar cada OV.' },
  ...companyUsers.value.map(user => ({
    value: user.id,
    label: user.name || user.email,
    description: user.email
  }))
])

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
    const [flowSettings, users] = await Promise.all([
      $fetch<SalesFlowSettings>('/api/backend/sales-flow/settings'),
      $fetch<Array<{ id: string, name: string, email: string }>>('/api/access-control/users/all')
    ])
    settings.value = {
      ...flowSettings,
      prompt_order_assignee_on_confirmation: flowSettings.prompt_order_assignee_on_confirmation ?? true,
      require_order_assignee_on_confirmation: flowSettings.require_order_assignee_on_confirmation ?? false,
      default_order_assignee_id: flowSettings.default_order_assignee_id || NO_ASSIGNEE
    }
    companyUsers.value = users
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
      allow_partial_delivery: settings.value.allow_partial_delivery,
      reserve_stock_on_order_confirmation: settings.value.reserve_stock_on_order_confirmation,
      allow_partial_stock_reservation: settings.value.allow_partial_stock_reservation,
      allow_backorder_without_stock: settings.value.allow_backorder_without_stock,
      prompt_order_assignee_on_confirmation: settings.value.prompt_order_assignee_on_confirmation,
      require_order_assignee_on_confirmation: settings.value.require_order_assignee_on_confirmation,
      default_order_assignee_id: settings.value.default_order_assignee_id === NO_ASSIGNEE
        ? null
        : settings.value.default_order_assignee_id || null
    }
    settings.value = await $fetch<SalesFlowSettings>('/api/backend/sales-flow/settings', {
      method: 'PATCH', body: payload
    })
    const recalculated = Number(settings.value.recalculated_delivery_orders ?? 0)
    toast.add({
      title: 'Circuito de ventas guardado',
      description: recalculated
        ? `Se recalculó la condición de entrega en ${recalculated} orden(es) sin remito.`
        : 'Se verificaron las condiciones de entrega de las órdenes sin remito.',
      color: 'success'
    })
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
      title="Las condiciones de entrega se recalculan al guardar"
      description="Se reevalúa el pago o la factura exigidos en órdenes que todavía no tienen remito. Los remitos existentes, pagos y cuentas corrientes no se modifican."
    />

    <div v-if="loading" class="py-16 text-center text-muted">Cargando configuración…</div>
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

      <UPageCard title="Reserva de stock" description="Definí cuándo la mercadería queda comprometida para una venta sin descontarla físicamente.">
        <div class="space-y-5">
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Reservar al confirmar la OV</p><p class="text-sm text-muted">El stock continúa en el depósito, pero deja de estar disponible para otras ventas.</p></div>
            <USwitch v-model="settings.reserve_stock_on_order_confirmation" />
          </div>
          <template v-if="settings.reserve_stock_on_order_confirmation">
            <USeparator />
            <div class="flex items-start justify-between gap-6">
              <div><p class="font-medium">Permitir reserva parcial</p><p class="text-sm text-muted">Reserva la cantidad disponible y permite continuar la OV con el faltante pendiente de abastecimiento.</p></div>
              <USwitch v-model="settings.allow_partial_stock_reservation" />
            </div>
            <USeparator />
            <div class="flex items-start justify-between gap-6">
              <div><p class="font-medium">Confirmar aunque falte stock</p><p class="text-sm text-muted">La OV puede continuar y la parte faltante queda como pendiente, sin crear stock ficticio.</p></div>
              <USwitch v-model="settings.allow_backorder_without_stock" />
            </div>
          </template>
          <UAlert color="neutral" variant="subtle" icon="i-lucide-warehouse" title="El remito realiza la salida física" description="Al confirmarlo, consume la reserva de su OV y descuenta el stock del depósito en una sola operación." />
        </div>
      </UPageCard>

      <UPageCard title="Responsable de la Orden de Venta" description="Evitá que una OV confirmada quede sin una persona encargada de continuarla.">
        <div class="space-y-5">
          <UFormField label="Responsable sugerido" help="Se preseleccionará al confirmar una OV que todavía no tenga responsable.">
            <USelectMenu
              v-model="settings.default_order_assignee_id"
              :items="userOptions"
              value-key="value"
              label-key="label"
              placeholder="Sin responsable predeterminado"
              searchable
              class="w-full"
            />
          </UFormField>
          <USeparator />
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Preguntar al confirmar</p><p class="text-sm text-muted">Si la OV no está asignada, muestra el selector y advierte que nadie recibirá la tarea.</p></div>
            <USwitch v-model="settings.prompt_order_assignee_on_confirmation" />
          </div>
          <USeparator />
          <div class="flex items-start justify-between gap-6">
            <div><p class="font-medium">Exigir responsable</p><p class="text-sm text-muted">Impide confirmar una OV sin seleccionar a una persona responsable.</p></div>
            <USwitch v-model="settings.require_order_assignee_on_confirmation" />
          </div>
          <UAlert color="primary" variant="subtle" icon="i-lucide-user-check" title="El vendedor y el responsable son datos diferentes" description="El vendedor conserva la relación comercial; el responsable recibe la OV para continuar su preparación o seguimiento." />
        </div>
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
