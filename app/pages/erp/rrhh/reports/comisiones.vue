<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { useEmployeesStore } from '~/modulos/erp/employees/store/employees.store'

definePageMeta({ middleware: ['auth'] })

const hrStore = useHrStore()
const employeesStore = useEmployeesStore()
const toast = useToast()

const currentMonth = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
const selectedSellerId = ref<string>('')
const report = ref<any>(null)
const loading = ref(false)
const generating = ref(false)
const expandedSellers = ref<Set<string>>(new Set())

const employeeOptions = computed(() => {
  const employees = (employeesStore.items ?? []).filter((e: any) => e.is_active)
  return employees.map((e: any) => ({
    label: `${e.first_name} ${e.last_name}`,
    value: e.id,
  }))
})

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '-'
}

async function loadReport() {
  if (!currentMonth.value) return
  loading.value = true
  try {
    report.value = await hrStore.fetchCommissionsReport(
      currentMonth.value,
      selectedSellerId.value || undefined,
    )
  } catch (e: any) {
    toast.add({ title: 'Error al cargar reporte', color: 'error' })
  } finally {
    loading.value = false
  }
}

function toggleSeller(sellerId: string) {
  if (expandedSellers.value.has(sellerId)) {
    expandedSellers.value.delete(sellerId)
  } else {
    expandedSellers.value.add(sellerId)
  }
}

async function generateVale(sellerId: string, sellerName: string) {
  generating.value = true
  try {
    const vale = await hrStore.generateCommissionVale(sellerId, currentMonth.value)
    toast.add({
      title: `Vale EXTRAS #${vale.number} generado`,
      description: `${sellerName} — ${fmt(vale.amount)}`,
      color: 'success',
    })
    await loadReport()
  } catch (e: any) {
    toast.add({
      title: 'Error al generar vale',
      description: e?.data?.message || 'Error desconocido',
      color: 'error',
    })
  } finally {
    generating.value = false
  }
}

async function generateAllVales() {
  if (!report.value?.sellers?.length) return
  generating.value = true
  let created = 0
  let total = 0

  for (const seller of report.value.sellers) {
    try {
      const vale = await hrStore.generateCommissionVale(seller.seller_id, currentMonth.value)
      created++
      total += Number(vale.amount)
    } catch (e: any) {
      toast.add({
        title: `Error generando vale para ${seller.seller_name}`,
        description: e?.data?.message || 'Error',
        color: 'error',
      })
    }
  }

  generating.value = false

  if (created > 0) {
    toast.add({
      title: `${created} vale(s) generado(s)`,
      description: `Total comisiones: ${fmt(total)}`,
      color: 'success',
    })
    await loadReport()
  }
}

onMounted(async () => {
  if (!employeesStore.items?.length) {
    await employeesStore.fetchAll()
  }
  await loadReport()
})

watch([currentMonth, selectedSellerId], () => loadReport())
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Comisiones de Ventas" description="Reporte de comisiones por vendedor y generación de vales EXTRAS" />

    <!-- Filtros -->
    <div class="flex gap-4 flex-wrap items-end">
      <UFormField label="Mes" class="w-48">
        <UInput v-model="currentMonth" type="month" class="w-full" />
      </UFormField>
      <UFormField label="Vendedor" class="w-64">
        <USelectMenu
          v-model="selectedSellerId"
          :items="[{ label: 'Todos', value: undefined }, ...employeeOptions]"
          value-key="value"
          placeholder="Todos los vendedores"
          class="w-full"
        />
      </UFormField>
      <UButton
        label="Generar todos los vales"
        icon="i-lucide-receipt"
        color="primary"
        :loading="generating"
        :disabled="!report?.sellers?.length"
        @click="generateAllVales"
      />
    </div>

    <!-- Totales -->
    <div v-if="report" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UPageCard>
        <div class="text-center">
          <p class="text-sm text-muted">Total Ventas (subtotal)</p>
          <p class="text-2xl font-bold">{{ fmt(report.total_ventas) }}</p>
        </div>
      </UPageCard>
      <UPageCard>
        <div class="text-center">
          <p class="text-sm text-muted">Total Comisiones</p>
          <p class="text-2xl font-bold text-primary">{{ fmt(report.total_comisiones) }}</p>
        </div>
      </UPageCard>
      <UPageCard>
        <div class="text-center">
          <p class="text-sm text-muted">Órdenes de Venta</p>
          <p class="text-2xl font-bold">{{ report.cantidad_ov }}</p>
        </div>
      </UPageCard>
    </div>

    <!-- Tabla por vendedor -->
    <div v-if="report?.sellers?.length" class="space-y-4">
      <div
        v-for="seller in report.sellers"
        :key="seller.seller_id"
        class="border border-default rounded-lg overflow-hidden"
      >
        <!-- Header del vendedor -->
        <div
          class="flex items-center justify-between p-4 bg-default hover:bg-muted/50 cursor-pointer"
          @click="toggleSeller(seller.seller_id)"
        >
          <div class="flex items-center gap-4">
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 transition-transform"
              :class="{ 'rotate-90': expandedSellers.has(seller.seller_id) }"
            />
            <div>
              <p class="font-semibold">{{ seller.seller_name }}</p>
              <p class="text-sm text-muted">{{ seller.cantidad_ov }} OV — {{ fmt(seller.total_ventas) }} en ventas</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-lg font-bold text-primary">{{ fmt(seller.total_comisiones) }}</p>
              <p class="text-xs text-muted">Comisión</p>
            </div>
            <UButton
              label="Generar vale"
              icon="i-lucide-receipt"
              color="primary"
              variant="outline"
              size="sm"
              :loading="generating"
              @click.stop="generateVale(seller.seller_id, seller.seller_name)"
            />
          </div>
        </div>

        <!-- Detalle expandible -->
        <div v-if="expandedSellers.has(seller.seller_id)" class="border-t border-default">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30">
                <th class="text-left px-4 py-2 font-medium">OV #</th>
                <th class="text-left px-4 py-2 font-medium">Fecha</th>
                <th class="text-right px-4 py-2 font-medium">Subtotal</th>
                <th class="text-right px-4 py-2 font-medium">Comisión %</th>
                <th class="text-right px-4 py-2 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in seller.items" :key="item.document_id" class="border-t border-default">
                <td class="px-4 py-2 font-mono">OV-{{ String(item.ov_number).padStart(8, '0') }}</td>
                <td class="px-4 py-2">{{ fmtDate(item.date) }}</td>
                <td class="px-4 py-2 text-right">{{ fmt(item.subtotal) }}</td>
                <td class="px-4 py-2 text-right">{{ item.commission_rate }}%</td>
                <td class="px-4 py-2 text-right font-semibold">{{ fmt(item.commission_amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-muted/20 font-semibold">
                <td colspan="2" class="px-4 py-2">Total</td>
                <td class="px-4 py-2 text-right">{{ fmt(seller.total_ventas) }}</td>
                <td class="px-4 py-2 text-right"></td>
                <td class="px-4 py-2 text-right text-primary">{{ fmt(seller.total_comisiones) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- Sin datos -->
    <div v-else-if="!loading" class="text-center py-12 text-muted">
      No hay comisiones pendientes para el período seleccionado.
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-muted">
      Cargando reporte...
    </div>
  </UPage>
</template>
