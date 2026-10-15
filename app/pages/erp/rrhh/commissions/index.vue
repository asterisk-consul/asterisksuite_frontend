<script setup lang="ts">
import { HrService } from '~/modulos/erp/hr/services/hr.service'
import type {
  CommissionAssignment,
  CommissionableDocument,
  CommissionSeller
} from '~/modulos/erp/hr/services/hr.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({ middleware: ['auth'] })
const toast = useToast()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canManage = computed(() => isOwnerOrAdmin.value || hasPermission('commissions.manage'))
const canSettle = computed(() => isOwnerOrAdmin.value || hasPermission('commissions.settle'))
const month = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
const tab = ref<'documents' | 'settlements'>('documents')
const documents = ref<CommissionableDocument[]>([])
const sellers = ref<CommissionSeller[]>([])
const report = ref<any>(null)
const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const modalOpen = ref(false)
const selected = ref<CommissionableDocument | null>(null)
const rows = ref<CommissionAssignment[]>([])

const sellerOptions = computed(() => sellers.value.map((item) => ({ label: item.name, value: item.id })))
const participation = computed(() => rows.value.reduce((sum, item) => sum + Number(item.participation_rate || 0), 0))
const pending = computed(() => documents.value.filter((item) => !item.assignments.length).length)
const money = (value: number, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0))
const date = (value: string) => (value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR') : '-')

async function load() {
  loading.value = true
  try {
    const [docs, availableSellers, commissions] = await Promise.all([
      HrService.getCommissionableDocuments(month.value),
      sellers.value.length ? sellers.value : HrService.getCommissionSellers(),
      HrService.getCommissionsReport(month.value)
    ])
    documents.value = docs
    sellers.value = availableSellers
    report.value = commissions
  } catch (error: any) {
    toast.add({
      title: 'No se pudieron cargar las comisiones',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function defaults(seller?: CommissionSeller): CommissionAssignment {
  return {
    seller_id: seller?.id ?? '',
    participation_rate: rows.value.length ? 0 : 100,
    commission_rate: Number(seller?.default_commission_rate ?? 0),
    commission_base: seller?.commission_base ?? 'INVOICED'
  }
}

function openAssignments(document: CommissionableDocument) {
  selected.value = document
  rows.value = document.assignments.length
    ? document.assignments.map((item) => ({ ...item }))
    : [defaults(sellers.value[0])]
  modalOpen.value = true
}

function addSeller() {
  const used = new Set(rows.value.map((item) => item.seller_id))
  const seller = sellers.value.find((item) => !used.has(item.id))
  if (!seller) return toast.add({ title: 'No quedan vendedores disponibles', color: 'warning' })
  rows.value.push(defaults(seller))
}

function applySellerDefaults(row: CommissionAssignment) {
  const seller = sellers.value.find((item) => item.id === row.seller_id)
  if (!seller) return
  row.commission_rate = Number(seller.default_commission_rate ?? 0)
  row.commission_base = seller.commission_base ?? 'INVOICED'
}

async function save() {
  if (!selected.value) return
  if (rows.value.some((item) => !item.seller_id))
    return toast.add({ title: 'Seleccioná todos los vendedores', color: 'warning' })
  if (new Set(rows.value.map((item) => item.seller_id)).size !== rows.value.length)
    return toast.add({ title: 'Un vendedor no puede repetirse', color: 'warning' })
  if (Math.abs(participation.value - 100) > 0.01)
    return toast.add({ title: 'La participación debe sumar 100%', color: 'warning' })
  saving.value = true
  try {
    await HrService.saveCommissionAssignments(selected.value.document_id, rows.value)
    toast.add({ title: 'Asignación guardada', color: 'success' })
    modalOpen.value = false
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function generate(seller: any) {
  generating.value = true
  try {
    const vale = await HrService.generateCommissionVale(seller.seller_id, month.value)
    toast.add({
      title: `Vale EXTRAS #${vale.number} generado`,
      description: `${seller.seller_name} · ${money(vale.amount)}`,
      color: 'success'
    })
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo generar el vale', description: error?.data?.message, color: 'error' })
  } finally {
    generating.value = false
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Comisiones de ventas"
      description="Asigná vendedores desde RRHH y liquidá según la facturación o los cobros reales."
    />

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Período" class="w-48"><UInput v-model="month" type="month" class="w-full" /></UFormField>
        <div class="flex rounded-lg bg-elevated p-1">
          <UButton
            label="Documentos"
            icon="i-lucide-files"
            :variant="tab === 'documents' ? 'solid' : 'ghost'"
            @click="tab = 'documents'"
          />
          <UButton
            label="Devengadas y liquidación"
            icon="i-lucide-hand-coins"
            :variant="tab === 'settlements' ? 'solid' : 'ghost'"
            @click="tab = 'settlements'"
          />
        </div>
      </div>
      <UBadge v-if="pending" color="warning" variant="subtle">{{ pending }} documento(s) sin vendedores</UBadge>
    </div>

    <template v-if="tab === 'documents'">
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="La OV ya no define comisiones"
        description="Elegí aquí los vendedores, su participación y la tasa. La regla inicial por facturación o cobro se toma del empleado."
      />
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[960px] text-sm">
            <thead class="border-b border-default bg-elevated/50 text-left text-muted">
              <tr>
                <th class="p-3">Documento</th>
                <th class="p-3">Fecha</th>
                <th class="p-3">Cliente</th>
                <th class="p-3 text-right">Total</th>
                <th class="p-3">Cobrado</th>
                <th class="p-3">Vendedores</th>
                <th class="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="document in documents" :key="document.document_id" class="border-b border-default/60">
                <td class="p-3">
                  <p class="font-medium">{{ document.document_type }} #{{ document.number }}</p>
                  <p class="text-xs text-muted">Orden de venta</p>
                </td>
                <td class="p-3">{{ date(document.date) }}</td>
                <td class="p-3 font-medium">{{ document.customer }}</td>
                <td class="p-3 text-right">{{ money(document.total, document.currency_code) }}</td>
                <td class="p-3">
                  <div class="w-36 space-y-1">
                    <div class="flex justify-between text-xs">
                      <span>{{ document.paid_percentage.toFixed(0) }}%</span>
                      <span class="text-muted">{{ money(document.paid_amount, document.currency_code) }}</span>
                    </div>
                    <div class="h-1.5 overflow-hidden rounded-full bg-elevated">
                      <div class="h-full bg-success" :style="{ width: `${document.paid_percentage}%` }" />
                    </div>
                  </div>
                </td>
                <td class="p-3">
                  <div v-if="document.assignments.length" class="flex flex-wrap gap-1">
                    <UBadge
                      v-for="assignment in document.assignments"
                      :key="assignment.seller_id"
                      color="neutral"
                      variant="subtle"
                    >
                      {{ assignment.seller_name }} · {{ assignment.participation_rate }}%
                    </UBadge>
                  </div>
                  <UBadge v-else color="warning" variant="subtle">Sin asignar</UBadge>
                </td>
                <td class="p-3 text-right">
                  <UButton
                    v-if="canManage"
                    :label="document.assignments.length ? 'Editar' : 'Asignar'"
                    :icon="document.assignments.length ? 'i-lucide-pencil' : 'i-lucide-user-plus'"
                    size="sm"
                    variant="soft"
                    @click="openAssignments(document)"
                  />
                  <span v-else class="text-xs text-muted">Solo lectura</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="loading" class="p-10 text-center text-muted">Cargando documentos…</div>
        <div v-else-if="!documents.length" class="p-10 text-center text-muted">
          No hay órdenes de venta en este período.
        </div>
      </UCard>
    </template>

    <template v-else>
      <div v-if="report" class="grid gap-4 md:grid-cols-3">
        <UPageCard>
          <p class="text-sm text-muted">Base comisionable</p>
          <p class="text-2xl font-bold">{{ money(report.total_ventas) }}</p>
        </UPageCard>
        <UPageCard>
          <p class="text-sm text-muted">Comisión disponible</p>
          <p class="text-2xl font-bold text-primary">{{ money(report.total_comisiones) }}</p>
        </UPageCard>
        <UPageCard>
          <p class="text-sm text-muted">Documentos</p>
          <p class="text-2xl font-bold">{{ report.cantidad_ov }}</p>
        </UPageCard>
      </div>
      <UCard v-for="seller in report?.sellers ?? []" :key="seller.seller_id">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="font-semibold">{{ seller.seller_name }}</p>
            <p class="text-sm text-muted">
              {{ seller.cantidad_ov }} documento(s) · base {{ money(seller.total_ventas) }}
            </p>
          </div>
          <div class="flex items-center gap-4">
            <strong class="text-xl text-primary">{{ money(seller.total_comisiones) }}</strong>
            <UButton
              v-if="canSettle"
              label="Generar vale"
              icon="i-lucide-receipt"
              variant="outline"
              :loading="generating"
              @click="generate(seller)"
            />
          </div>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="border-b border-default text-left text-muted">
              <tr>
                <th class="py-2">OV</th>
                <th>Fecha</th>
                <th class="text-right">Participación</th>
                <th class="text-right">Base alcanzada</th>
                <th class="text-right">Regla</th>
                <th class="text-right">Comisión</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in seller.items"
                :key="`${item.document_id}-${seller.seller_id}`"
                class="border-b border-default/50"
              >
                <td class="py-2">#{{ item.ov_number }}</td>
                <td>{{ date(item.date) }}</td>
                <td class="text-right">{{ item.participation_rate }}%</td>
                <td class="text-right">{{ money(item.subtotal) }}</td>
                <td class="text-right">
                  {{ item.commission_rate }}% · {{ item.commission_base === 'PAID' ? 'Cobrado' : 'Facturado' }}
                </td>
                <td class="text-right font-semibold">{{ money(item.commission_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
      <div v-if="!loading && !report?.sellers?.length" class="py-12 text-center text-muted">
        No hay comisiones devengadas pendientes.
      </div>
    </template>

    <UModal v-model:open="modalOpen" :ui="{ content: 'sm:max-w-5xl' }">
      <template #content>
        <div class="space-y-5 p-6">
          <div>
            <h2 class="text-lg font-semibold">Asignar vendedores</h2>
            <p class="text-sm text-muted">
              {{ selected?.document_type }} #{{ selected?.number }} · {{ selected?.customer }}
            </p>
          </div>
          <div class="space-y-3">
            <div
              v-for="(row, index) in rows"
              :key="index"
              class="grid items-end gap-3 rounded-lg border border-default p-3 md:grid-cols-[2fr_1fr_1fr_1.4fr_auto]"
            >
              <UFormField label="Vendedor">
                <USelectMenu
                  v-model="row.seller_id"
                  :items="sellerOptions"
                  value-key="value"
                  searchable
                  class="w-full"
                  @update:model-value="applySellerDefaults(row)"
                />
              </UFormField>
              <UFormField label="Participación %">
                <UInput v-model.number="row.participation_rate" type="number" min="0.01" max="100" step="0.01" />
              </UFormField>
              <UFormField label="Comisión %">
                <UInput v-model.number="row.commission_rate" type="number" min="0" max="100" step="0.01" />
              </UFormField>
              <UFormField label="Se devenga al">
                <USelectMenu
                  v-model="row.commission_base"
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
                :disabled="rows.length === 1"
                @click="rows.splice(index, 1)"
              />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <UButton label="Agregar vendedor" icon="i-lucide-plus" variant="soft" @click="addSeller" />
            <UBadge :color="Math.abs(participation - 100) <= 0.01 ? 'success' : 'warning'" variant="subtle">
              Participación: {{ participation.toFixed(2) }}%
            </UBadge>
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="Cancelar" color="neutral" variant="ghost" @click="modalOpen = false" />
            <UButton
              label="Guardar asignación"
              icon="i-lucide-save"
              :loading="saving"
              :disabled="Math.abs(participation - 100) > 0.01"
              @click="save"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
