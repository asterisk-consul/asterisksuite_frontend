<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useStockStore } from '~/modulos/logistica/warehouses/stock/stock.store'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { useLocations } from '~/modulos/logistica/master-data/locations/composables/useLocations'
import { useExcelExport } from '~/composables/useExcelExport'
import { warehouseFormFields } from '~/modulos/logistica/warehouses/warehouse/warehouseFormFields'
import { movementColumns, MOVEMENT_TYPE_OPTIONS, DIRECTION_OPTIONS } from '~/modulos/logistica/warehouses/stock/movementColumns'
import ModalForm from '~/components/ModalForm.vue'
import TransferFromWarehouseModal from '~/modulos/logistica/warehouses/stock/components/TransferFromWarehouseModal.vue'
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const warehouseId = computed(() => route.params.id as string)

const depositosStore = useDepositosStore()
const stockStore = useStockStore()
const unitsStore = useUnitsStore()
const locationsStore = useLocationsStore()

const { current: warehouse, loading: warehouseLoading } = storeToRefs(depositosStore)
const { stock, movements, loading: stockLoading } = storeToRefs(stockStore)
const { items: units } = storeToRefs(unitsStore)
const { items: locations } = storeToRefs(locationsStore)

const { items: locationItems } = useLocations(locations)

// All warehouses for transfer
const { warehouses } = storeToRefs(depositosStore)

// Edit modal
const editModalOpen = ref(false)
const editRow = ref<any>(null)

// Transfer modal
const showTransferModal = ref(false)

// Movement history
const showMovements = ref(false)

const unitOptions = computed(() =>
  units.value
    .filter((u) => u.active)
    .map((u) => ({
      label: `${u.name} (${u.symbol})`,
      value: u.id
    }))
)

const fields = computed(() =>
  warehouseFormFields.map((field) => {
    if (field.name === 'locationId') {
      return { ...field, options: locationItems.value, disabled: locationItems.value.length === 0 }
    }
    if (field.name === 'unitId') {
      return { ...field, options: unitOptions.value, disabled: unitOptions.value.length === 0 }
    }
    return field
  })
)

function openEdit() {
  if (!warehouse.value) return
  editRow.value = {
    ...warehouse.value,
    locationId: warehouse.value.locationId ?? (warehouse.value as any).locations?.id ?? null,
    unitId: warehouse.value.unitId ?? (warehouse.value as any).units?.id ?? null
  }
  editModalOpen.value = true
}

async function handleEditSubmit(data: any) {
  await depositosStore.updateWarehouse(warehouseId.value, {
    name: data.name,
    code: data.code,
    locationId: data.locationId,
    unitId: data.unitId,
    active: data.active
  })
  await depositosStore.fetchById(warehouseId.value)
  editModalOpen.value = false
}

// Transfer handler
async function handleTransfer(data: { from_warehouse_id: string; to_warehouse_id: string; product_id: string; quantity: string }) {
  try {
    await stockStore.transferStock({
      product_id: data.product_id,
      from_warehouse_id: data.from_warehouse_id,
      to_warehouse_id: data.to_warehouse_id,
      quantity: data.quantity
    })
    showTransferModal.value = false
    toast.add({ title: 'Transferencia realizada', color: 'success' })
    await stockStore.fetchStock(warehouseId.value)
    if (showMovements.value) {
      await stockStore.fetchMovements(warehouseId.value)
    }
  } catch (err: any) {
    toast.add({
      title: 'Error en transferencia',
      color: 'error',
      description: err?.data?.message || err?.message || 'Error desconocido'
    })
  }
}

// Load movements
async function loadMovements() {
  showMovements.value = !showMovements.value
  if (showMovements.value) {
    await stockStore.fetchMovements(warehouseId.value)
  }
}

// Movements table filters
const movementFilterFields = [
  { id: 'products', label: 'Filtrar por producto...', icon: 'i-lucide-package', class: 'w-48' },
  { id: 'movement_type', label: 'Filtrar por tipo...', icon: 'i-lucide-tag', class: 'w-40' },
  { id: 'direction', label: 'Filtrar por dirección...', icon: 'i-lucide-arrow-right-left', class: 'w-40' }
]

// Export to Excel
const { exportToExcel } = useExcelExport()

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  'MANUAL': 'Manual',
  'TRANSFER': 'Transferencia',
  'PICKING': 'Picking',
  'REMOVAL': 'Baja',
  'DOCUMENT': 'Documento',
  'DELIVERY_NOTE': 'Remito'
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  'STOCK_TRANSFER': 'Transferencia entre depósitos',
  'PALLET_TRANSFER': 'Transferencia de pallet',
  'STOCK_REMOVAL': 'Baja de stock',
  'PICKING': 'Picking directo',
  'PICKING_ORDER': 'Orden de picking',
  'document': 'Documento ERP',
  'DELIVERY_NOTE': 'Remito de logística'
}

function exportMovementsToExcel() {
  exportToExcel({
    filename: `movimientos-${warehouse.value?.name || 'deposito'}-${new Date().toISOString().slice(0, 10)}`,
    sheetName: 'Movimientos',
    columns: [
      { key: 'created_at', label: 'Fecha', width: 20, format: (v: any) => v ? new Date(v).toLocaleString('es-AR') : '' },
      { key: 'product_name', label: 'Producto', width: 30, format: (_: any, row: any) => row.products?.name || '' },
      { key: 'product_sku', label: 'SKU', width: 15, format: (_: any, row: any) => row.products?.sku || '' },
      { key: 'direction', label: 'Dirección', width: 12, format: (v: any) => v === 'IN' ? 'Entrada' : 'Salida' },
      { key: 'movement_type', label: 'Tipo', width: 15, format: (v: any) => MOVEMENT_TYPE_LABELS[v] || v },
      { key: 'quantity', label: 'Cantidad', width: 12, format: (v: any, row: any) => `${row.direction === 'IN' ? '+' : '-'}${parseFloat(v).toFixed(2)}` },
      { key: 'balance_before', label: 'Saldo', width: 12, format: (v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : '' },
      { key: 'reference_type', label: 'Referencia', width: 25, format: (v: any) => v ? (REFERENCE_TYPE_LABELS[v] || v) : '' },
      { key: 'linked_warehouse_name', label: 'Depósito vinculado', width: 25, format: (v: any, row: any) => v ? `${row.direction === 'OUT' ? '→' : '←'} ${v}` : '' },
      { key: 'created_by_name', label: 'Usuario', width: 20, format: (v: any) => v || '' }
    ],
    data: movements.value.map((m) => ({
      ...m,
      product_name: (m as any).products?.name || '',
      product_sku: (m as any).products?.sku || ''
    }))
  })
}

// Print movements
function printMovements() {
  const warehouseName = warehouse.value?.name || 'Depósito'

  const rows = movements.value.map((m) => {
    const qty = parseFloat(m.quantity)
    const prefix = m.direction === 'IN' ? '+' : '-'
    const qtyColor = m.direction === 'IN' ? '#16a34a' : '#dc2626'
    const balance = m.balance_before !== null && m.balance_before !== undefined ? Number(m.balance_before).toFixed(2) : '—'
    const refLabel = m.reference_type ? (REFERENCE_TYPE_LABELS[m.reference_type] || m.reference_type) : '—'
    const userName = (m as any).created_by_name || ''
    const date = new Date(m.created_at).toLocaleString('es-AR')
    const productName = (m as any).products?.name || m.product_id
    const typeLabel = MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type
    const linkedName = (m as any).linked_warehouse_name
    const linkedLabel = linkedName ? `${m.direction === 'OUT' ? '→' : '←'} ${linkedName}` : '—'

    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${date}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:500">${productName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:${qtyColor};font-weight:600">${prefix}${qty.toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:500">${balance}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${typeLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${refLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${linkedLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${userName}</td>
      </tr>
    `
  }).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Movimientos - ${warehouseName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 2px solid #d1d5db; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>Movimientos de stock — ${warehouseName}</h1>
      <div class="subtitle">${movements.value.length} movimientos • ${new Date().toLocaleString('es-AR')}</div>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Saldo</th>
            <th>Tipo</th>
            <th>Referencia</th>
            <th>Depósito vinculado</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }
}

// Stock summary
const totalStock = computed(() =>
  stock.value.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
)

const totalReserved = computed(() =>
  stock.value.reduce((sum, item) => sum + parseFloat(item.reserved_quantity), 0)
)

const totalAvailable = computed(() => totalStock.value - totalReserved.value)

const unitSymbol = computed(() => warehouse.value?.units?.symbol ?? '')

onMounted(async () => {
  await Promise.all([
    depositosStore.fetchById(warehouseId.value),
    depositosStore.fetchAll(),
    stockStore.fetchStock(warehouseId.value),
    unitsStore.fetchAll(),
    locationsStore.fetchAll()
  ])
})

const links = ref<ButtonProps[]>([
  {
    label: 'Transferir',
    icon: 'i-lucide-arrow-right-left',
    onClick: () => { showTransferModal.value = true },
    color: 'primary',
    variant: 'outline'
  },
  {
    label: 'Editar',
    icon: 'i-heroicons-pencil',
    onClick: openEdit,
    color: 'neutral',
    variant: 'outline'
  }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/productos/warehouses"
          size="sm"
        />
        <div v-if="warehouse">
          <h1 class="text-xl font-bold">{{ warehouse.name }}</h1>
          <p class="text-sm text-muted">
            {{ warehouse.code || 'Sin código' }}
            <span v-if="(warehouse as any).units"> · {{ (warehouse as any).units.symbol }}</span>
            <span v-if="(warehouse as any).locations">
              · {{ (warehouse as any).locations.address || '' }} {{ (warehouse as any).locations.city || '' }}
            </span>
          </p>
        </div>
        <div v-else-if="warehouseLoading">
          <USkeleton class="h-6 w-48" />
        </div>
      </div>

      <div v-if="warehouse">
        <UPageHeader
          :title="''"
          :links="links"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="stockLoading" class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
      </div>
      <USkeleton class="h-64" />
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-3 gap-4">
        <UCard>
          <div class="text-sm text-muted">Stock Total</div>
          <div class="text-2xl font-bold">
            {{ totalStock.toFixed(2) }}
            <span v-if="unitSymbol" class="text-sm font-normal text-muted">{{ unitSymbol }}</span>
          </div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Reservado</div>
          <div class="text-2xl font-bold text-amber-600">
            {{ totalReserved.toFixed(2) }}
            <span v-if="unitSymbol" class="text-sm font-normal text-muted">{{ unitSymbol }}</span>
          </div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Disponible</div>
          <div class="text-2xl font-bold text-green-600">
            {{ totalAvailable.toFixed(2) }}
            <span v-if="unitSymbol" class="text-sm font-normal text-muted">{{ unitSymbol }}</span>
          </div>
        </UCard>
      </div>

      <!-- Stock Table -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Productos en este depósito</h3>
            <span class="text-sm text-muted">{{ stock.length }} producto{{ stock.length !== 1 ? 's' : '' }}</span>
          </div>
        </template>

        <div v-if="stock.length === 0" class="text-center py-8 text-muted">
          <p>Este depósito no tiene stock registrado.</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="item in stock"
            :key="item.id"
            class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          >
            <div class="flex-1">
              <NuxtLink
                :to="`/productos/${item.products.id}`"
                class="font-medium hover:text-primary hover:underline"
              >
                {{ item.products.name }}
              </NuxtLink>
              <span v-if="item.products.sku" class="text-sm text-muted ml-2">
                ({{ item.products.sku }})
              </span>
            </div>

            <div class="flex items-center gap-6">
              <div class="text-right min-w-[80px]">
                <div class="text-xs text-muted">Stock</div>
                <div class="font-semibold">{{ parseFloat(item.quantity).toFixed(2) }}</div>
              </div>
              <div class="text-right min-w-[80px]">
                <div class="text-xs text-muted">Reservado</div>
                <div class="font-semibold text-amber-600">{{ parseFloat(item.reserved_quantity).toFixed(2) }}</div>
              </div>
              <div class="text-right min-w-[80px]">
                <div class="text-xs text-muted">Disponible</div>
                <div class="font-semibold text-green-600">
                  {{ (parseFloat(item.quantity) - parseFloat(item.reserved_quantity)).toFixed(2) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Movements History -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                class="text-sm font-semibold hover:text-primary flex items-center gap-2"
                @click="loadMovements"
              >
                <UIcon :name="showMovements ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
                Historial de movimientos
              </button>
              <span class="text-sm text-muted">({{ movements.length }})</span>
            </div>
            <div v-if="showMovements && movements.length > 0" class="flex items-center gap-2">
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-file-spreadsheet"
                label="Excel"
                @click="exportMovementsToExcel"
              />
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-printer"
                label="Imprimir"
                @click="printMovements"
              />
            </div>
          </div>
        </template>

        <div v-if="showMovements">
          <div v-if="movements.length === 0" class="text-center py-4 text-muted">
            No hay movimientos registrados.
          </div>

          <LogisticaTable
            v-else
            :data="movements"
            :columns="movementColumns"
            :filter-fields="movementFilterFields"
          />
        </div>
      </UCard>
    </template>

    <!-- Edit Modal -->
    <ModalForm
      v-model:open="editModalOpen"
      :fields="fields"
      title="Editar Depósito"
      :initial-values="editRow"
      @submit="handleEditSubmit"
    />

    <!-- Transfer Modal -->
    <TransferFromWarehouseModal
      v-model:open="showTransferModal"
      :warehouse-id="warehouseId"
      :warehouse-name="warehouse?.name || ''"
      :warehouse-symbol="(warehouse as any)?.units?.symbol"
      :stock="stock"
      :warehouses="warehouses"
      @submit="handleTransfer"
    />
  </div>
</template>
