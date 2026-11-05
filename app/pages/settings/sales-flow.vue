<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useSalesFlowService } from '~/modulos/erp/sales/services/sales-flow.service'
import type {
  SalesFlowCommissionAssignment,
  SalesFlowCommissionSeller
} from '~/modulos/erp/sales/services/sales-flow.service'
import { useUsersService } from '~/modulos/access-control/services/users.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

interface SalesFlowSettings {
  partner_share_basis: 'ORDER' | 'INVOICED'
  accounting_basis: 'INVOICE' | 'ORDER' | 'ORDER_THEN_INVOICE'
  payment_document_basis: 'INVOICE' | 'ORDER' | 'BOTH'
  require_payment_for_delivery: boolean
  delivery_payment_percentage: number
  require_invoice_for_delivery: boolean
  require_order_delivery_address: boolean
  warn_when_order_delivery_data_empty: boolean
  auto_create_delivery_note: boolean
  allow_partial_delivery: boolean
  reserve_stock_on_order_confirmation: boolean
  allow_partial_stock_reservation: boolean
  allow_backorder_without_stock: boolean
  prompt_order_assignee_on_confirmation: boolean
  require_order_assignee_on_confirmation: boolean
  default_order_assignee_id: string | null
  default_order_auditor_id: string | null
  recalculated_delivery_orders?: number
}

const toast = useToast()
const salesFlowService = useSalesFlowService()
const usersService = useUsersService()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canManageCommissions = computed(() => isOwnerOrAdmin.value || hasPermission('commissions.manage'))
const NO_ASSIGNEE = '__NO_ASSIGNEE__'
const NO_AUDITOR = '__NO_AUDITOR__'
const loading = ref(true)
const saving = ref(false)
const settings = ref<SalesFlowSettings>()
const commissionDefaults = ref<SalesFlowCommissionAssignment[]>([])
const commissionSellers = ref<SalesFlowCommissionSeller[]>([])
const savingCommissionDefaults = ref(false)
const savingPartnerShareBasis = ref(false)
const companyUsers = ref<Array<{ id: string, name: string, email: string }>>([])
const userOptions = computed(() => [
  { value: NO_ASSIGNEE, label: 'Sin responsable predeterminado', description: 'Se elegirá al confirmar cada OV.' },
  ...companyUsers.value.map(user => ({
    value: user.id,
    label: user.name || user.email,
    description: user.email
  }))
])
const auditorOptions = computed(() => [
  { value: NO_AUDITOR, label: 'Sin auditor predeterminado', description: 'Podés asignarlo en cada documento.' },
  ...companyUsers.value.map(user => ({
    value: user.id,
    label: user.name || user.email,
    description: user.email
  }))
])
const selectedAssigneeId = computed({
  get: () => settings.value?.default_order_assignee_id ?? NO_ASSIGNEE,
  set: (value: string) => {
    if (settings.value) settings.value.default_order_assignee_id = value === NO_ASSIGNEE ? null : value
  }
})
const selectedAuditorId = computed({
  get: () => settings.value?.default_order_auditor_id ?? NO_AUDITOR,
  set: (value: string) => {
    if (settings.value) settings.value.default_order_auditor_id = value === NO_AUDITOR ? null : value
  }
})

const accountingOptions = [
  { label: 'Factura', value: 'INVOICE', description: 'La deuda nace cuando se confirma la factura.' },
  { label: 'Orden de venta', value: 'ORDER', description: 'La deuda nace cuando se confirma la OV.' },
  { label: 'OV y luego factura', value: 'ORDER_THEN_INVOICE', description: 'La OV genera deuda provisoria y la factura la reemplaza sin duplicarla.' }
]
const partnerShareBasisOptions = [
  { label: 'Orden de Venta', value: 'ORDER', description: 'Se calcula sobre el subtotal sin IVA de la OV confirmada.' },
  { label: 'Facturación', value: 'INVOICED', description: 'Se calcula a medida que se facturan las OV, sobre el subtotal sin IVA.' }
]
const paymentOptions = [
  { label: 'Factura', value: 'INVOICE' },
  { label: 'Orden de venta', value: 'ORDER' },
  { label: 'OV o factura', value: 'BOTH' }
]
const deliveryAddressRequirementOptions = [
  { label: 'Opcional', value: false },
  { label: 'Obligatoria', value: true }
]

const commissionSellerOptions = computed(() => commissionSellers.value.map(seller => ({
  label: `${seller.name} · ${seller.seller_type === 'PARTNER' ? 'Socio' : 'Empleado'}`,
  value: `${seller.seller_type}:${seller.id}`
})))

function commissionSellerIdentity(assignment: SalesFlowCommissionAssignment) {
  return `${assignment.seller_type}:${assignment.seller_id}`
}

function availableCommissionSellers(index: number) {
  const used = new Set(commissionDefaults.value
    .filter((_, rowIndex) => rowIndex !== index)
    .map(commissionSellerIdentity))
  const current = commissionDefaults.value[index]
  return commissionSellerOptions.value.filter(option =>
    !used.has(option.value) || option.value === (current ? commissionSellerIdentity(current) : '')
  )
}

function addCommissionSeller() {
  const used = new Set(commissionDefaults.value.map(commissionSellerIdentity))
  const seller = commissionSellers.value.find(item => !used.has(`${item.seller_type}:${item.id}`))
  if (!seller) {
    toast.add({ title: 'No quedan vendedores disponibles', color: 'warning' })
    return
  }
  commissionDefaults.value.push({
    seller_type: seller.seller_type,
    seller_id: seller.id,
    participation_rate: 100,
    commission_rate: seller.default_commission_rate,
    commission_base: seller.commission_base ?? 'INVOICED'
  })
}

function removeCommissionSeller(index: number) {
  commissionDefaults.value.splice(index, 1)
}

function clearCommissionSellers() {
  commissionDefaults.value = []
}

function selectCommissionSeller(assignment: SalesFlowCommissionAssignment, value: string) {
  const [sellerType, sellerId] = value.split(':', 2)
  const seller = commissionSellers.value.find(item => item.seller_type === sellerType && item.id === sellerId)
  assignment.seller_type = seller?.seller_type ?? 'EMPLOYEE'
  assignment.seller_id = seller?.id ?? ''
  if (seller) {
    assignment.commission_rate = seller.default_commission_rate
    assignment.commission_base = seller.commission_base
  }
}

async function load() {
  loading.value = true
  try {
    const [flowSettings, users, commissionSettings] = await Promise.all([
      salesFlowService.getSettings(),
      usersService.findAll(),
      canManageCommissions.value ? salesFlowService.getCommissionSettings() : Promise.resolve(null)
    ])
    settings.value = {
      ...flowSettings,
      partner_share_basis: flowSettings.partner_share_basis ?? 'ORDER',
      require_order_delivery_address: flowSettings.require_order_delivery_address ?? false,
      warn_when_order_delivery_data_empty: flowSettings.warn_when_order_delivery_data_empty ?? true,
      prompt_order_assignee_on_confirmation: flowSettings.prompt_order_assignee_on_confirmation ?? true,
      require_order_assignee_on_confirmation: flowSettings.require_order_assignee_on_confirmation ?? false,
      default_order_assignee_id: flowSettings.default_order_assignee_id || NO_ASSIGNEE,
      default_order_auditor_id: flowSettings.default_order_auditor_id || NO_AUDITOR
    }
    companyUsers.value = users
    commissionDefaults.value = commissionSettings?.assignments.map(item => ({
      ...item,
      participation_rate: Number(item.participation_rate),
      commission_rate: Number(item.commission_rate)
    })) ?? []
    commissionSellers.value = commissionSettings?.sellers ?? []
  } catch {
    toast.add({ title: 'No se pudo cargar la configuración', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function saveCommissionDefaults() {
  if (commissionDefaults.value.some(item => !item.seller_id)) {
    toast.add({ title: 'Seleccioná todos los vendedores', color: 'warning' })
    return
  }
  if (new Set(commissionDefaults.value.map(commissionSellerIdentity)).size !== commissionDefaults.value.length) {
    toast.add({ title: 'Un vendedor no puede repetirse', color: 'warning' })
    return
  }
  if (commissionDefaults.value.some(item =>
    !Number.isFinite(Number(item.participation_rate))
    || !Number.isFinite(Number(item.commission_rate))
    || Number(item.participation_rate) < 0.01
    || Number(item.participation_rate) > 100
    || Number(item.commission_rate) < 0
    || Number(item.commission_rate) > 100
  )) {
    toast.add({ title: 'La participación debe ser mayor que 0% y hasta 100%; la comisión puede ser de 0% a 100%', color: 'warning' })
    return
  }
  savingCommissionDefaults.value = true
  try {
    const saved = await salesFlowService.updateCommissionSettings(commissionDefaults.value)
    commissionDefaults.value = saved.assignments.map(item => ({
      ...item,
      participation_rate: Number(item.participation_rate),
      commission_rate: Number(item.commission_rate)
    }))
    commissionSellers.value = saved.sellers
    toast.add({
      title: 'Vendedores predeterminados guardados',
      description: 'Se aplicarán a las nuevas órdenes de venta. Las órdenes existentes no se modifican.',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' })
  } finally {
    savingCommissionDefaults.value = false
  }
}

async function savePartnerShareBasis() {
  if (!settings.value) return
  savingPartnerShareBasis.value = true
  try {
    settings.value = await salesFlowService.updatePartnerShareBasis(settings.value.partner_share_basis)
    toast.add({ title: 'Base de participación guardada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' })
  } finally {
    savingPartnerShareBasis.value = false
  }
}

async function save() {
  if (!settings.value) return
  saving.value = true
  try {
    const payload: Partial<SalesFlowSettings> = {
      accounting_basis: settings.value.accounting_basis,
      payment_document_basis: settings.value.payment_document_basis,
      require_payment_for_delivery: settings.value.require_payment_for_delivery,
      delivery_payment_percentage: Number(settings.value.delivery_payment_percentage),
      require_invoice_for_delivery: settings.value.require_invoice_for_delivery,
      require_order_delivery_address: settings.value.require_order_delivery_address,
      warn_when_order_delivery_data_empty: settings.value.warn_when_order_delivery_data_empty,
      auto_create_delivery_note: settings.value.auto_create_delivery_note,
      allow_partial_delivery: settings.value.allow_partial_delivery,
      reserve_stock_on_order_confirmation: settings.value.reserve_stock_on_order_confirmation,
      allow_partial_stock_reservation: settings.value.allow_partial_stock_reservation,
      allow_backorder_without_stock: settings.value.allow_backorder_without_stock,
      prompt_order_assignee_on_confirmation: settings.value.prompt_order_assignee_on_confirmation,
      require_order_assignee_on_confirmation: settings.value.require_order_assignee_on_confirmation,
      default_order_assignee_id: settings.value.default_order_assignee_id === NO_ASSIGNEE
        ? null
        : settings.value.default_order_assignee_id || null,
      default_order_auditor_id: settings.value.default_order_auditor_id === NO_AUDITOR
        ? null
        : settings.value.default_order_auditor_id || null
    }
    settings.value = await salesFlowService.updateSettings(payload)
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
              v-model="selectedAssigneeId"
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

      <UPageCard title="Auditor de seguimiento" description="Una persona puede recibir avisos y consultar el historial de cambios de cada documento de la cadena de ventas.">
        <div class="space-y-4">
          <UFormField label="Auditor sugerido para nuevas OV" help="Se asigna al crear una OV y se conserva al generar remitos o facturas derivadas. También podés cambiarlo desde cada documento.">
            <USelectMenu
              v-model="selectedAuditorId"
              :items="auditorOptions"
              value-key="value"
              label-key="label"
              placeholder="Sin auditor predeterminado"
              searchable
              class="w-full"
            />
          </UFormField>
          <UAlert color="info" variant="subtle" icon="i-lucide-eye" title="Seguimiento de estados" description="El auditor recibe una notificación dentro de la app cuando cambia el estado. El historial queda guardado en cada documento aunque se elimine la notificación." />
        </div>
      </UPageCard>

      <UPageCard
        v-if="canManageCommissions"
        title="Vendedores predeterminados de comisión"
        description="Se precargan en las nuevas órdenes. Cada vendedor tiene su porcentaje de participación y comisión independiente."
      >
        <div class="space-y-5">
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-hand-coins"
            title="La asignación no liquida la comisión"
            description="Cada participación se calcula sobre la venta y no se reparte entre los vendedores: podés asignar 100% a cada uno. Aparecerán en RRHH → Reportes → Comisiones sin crear ni confirmar un Vale. Este cambio no modifica órdenes existentes."
          />
          <div v-if="!commissionSellers.length" class="rounded-lg border border-dashed border-default p-4 text-sm text-muted">
            Para configurar vendedores, habilitá empleados como vendedores o cargá socios activos vinculados a una contraparte.
          </div>
          <div v-for="(assignment, index) in commissionDefaults" :key="index" class="grid items-end gap-3 rounded-lg border border-default p-3 md:grid-cols-[2fr_1fr_1fr_1.4fr_auto]">
            <UFormField label="Vendedor">
              <USelectMenu
                :model-value="commissionSellerIdentity(assignment)"
                :items="availableCommissionSellers(index)"
                value-key="value"
                searchable
                class="w-full"
                @update:model-value="selectCommissionSeller(assignment, $event)"
              />
            </UFormField>
            <UFormField label="Participación %">
              <UInput v-model.number="assignment.participation_rate" type="number" min="0.01" max="100" step="0.01" />
            </UFormField>
            <UFormField label="Comisión %">
              <UInput v-model.number="assignment.commission_rate" type="number" min="0" max="100" step="0.01" />
            </UFormField>
            <UFormField label="Se devenga al">
              <USelectMenu
                v-model="assignment.commission_base"
                :items="[
                  { label: 'Facturar', value: 'INVOICED' },
                  { label: 'Cobrar', value: 'PAID' }
                ]"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              @click="removeCommissionSeller(index)"
            />
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-2">
              <UButton label="Agregar vendedor" icon="i-lucide-plus" variant="soft" :disabled="commissionDefaults.length >= commissionSellers.length" @click="addCommissionSeller" />
              <UButton v-if="commissionDefaults.length" label="Quitar todos" icon="i-lucide-x" color="neutral" variant="ghost" @click="clearCommissionSellers" />
            </div>
          </div>
          <div class="flex justify-end border-t border-default pt-4">
            <UButton
              label="Guardar vendedores predeterminados"
              icon="i-lucide-save"
              :loading="savingCommissionDefaults"
              :disabled="loading"
              @click="saveCommissionDefaults"
            />
          </div>
        </div>
      </UPageCard>

      <UPageCard
        v-if="canManageCommissions"
        title="Participación societaria en ventas"
        description="Define cuándo se devenga el porcentaje de participación configurado en la ficha de cada socio."
      >
        <div class="space-y-4">
          <UFormField label="Calcular participación sobre" help="El porcentaje se guarda por OV y no se modifica si luego cambia la ficha del socio.">
            <USelectMenu
              v-model="settings.partner_share_basis"
              :items="partnerShareBasisOptions"
              value-key="value"
              label-key="label"
              class="w-full sm:w-96"
            />
          </UFormField>
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-hand-coins"
            title="Se liquida en RRHH"
            description="La participación se calcula sobre el subtotal sin IVA. Queda pendiente en el reporte de comisiones y puede liquidarse junto con la comisión de vendedor; el detalle conserva cada concepto y no afecta los aportes del socio."
          />
          <div class="flex justify-end border-t border-default pt-4">
            <UButton
              label="Guardar base de participación"
              icon="i-lucide-save"
              :loading="savingPartnerShareBasis"
              :disabled="loading"
              @click="savePartnerShareBasis"
            />
          </div>
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
          <UFormField
            label="Dirección de entrega en la OV"
            help="Si es obligatoria, se valida al crear, editar y confirmar la OV. Los demás datos de entrega siguen siendo opcionales."
          >
            <USelect
              v-model="settings.require_order_delivery_address"
              :items="deliveryAddressRequirementOptions"
              value-key="value"
              label-key="label"
              class="w-full sm:w-64"
            />
          </UFormField>
          <div v-if="!settings.require_order_delivery_address" class="flex items-start justify-between gap-6">
            <div>
              <p class="font-medium">Avisar si la información de entrega está vacía</p>
              <p class="text-sm text-muted">Si no se completó ningún dato, pide confirmación al guardar y antes de confirmar la OV. En ambos casos se puede continuar después de aceptar el aviso.</p>
            </div>
            <USwitch v-model="settings.warn_when_order_delivery_data_empty" />
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
