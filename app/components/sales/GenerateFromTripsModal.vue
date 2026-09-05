<script setup lang="ts">
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useDocumentTypes } from '~/modulos/erp/documents/documents-types/composable/useDocumentTypes'

const emit = defineEmits<{
  saved: []
}>()

const store = useDocumentsSalesStore()
const { items: documentTypes, init: initDocTypes } = useDocumentTypes()

const open = defineModel<boolean>({ default: false })
const loading = ref(false)
const loadingTrips = ref(false)
const result = ref<{ results: { tripId: string; created: number; skipped: number }[] } | null>(null)

const selectedDocTypeId = ref<string>('')

const trips = ref<{
  id: string
  reference_number: string | null
  total_orders: number
  total_amount: number
}[]>([])

const selectedTripIds = ref<Set<string>>(new Set())

const saleDocTypes = computed(() =>
  (documentTypes.value ?? []).filter(
    (dt: any) => dt.direction === 1 && (dt.category === 'INVOICE' || dt.category === 'CREDIT_NOTE' || dt.category === 'DEBIT_NOTE')
  )
)

const allSelected = computed({
  get: () => trips.value.length > 0 && selectedTripIds.value.size === trips.value.length,
  set: (val: boolean) => {
    if (val) {
      selectedTripIds.value = new Set(trips.value.map((t) => t.id))
    } else {
      selectedTripIds.value = new Set()
    }
  }
})

function toggleTrip(id: string) {
  const s = new Set(selectedTripIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedTripIds.value = s
}

const selectedCount = computed(() => selectedTripIds.value.size)

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
}

async function loadTrips() {
  loadingTrips.value = true
  try {
    trips.value = await store.getCompletedTripsPending()
  } catch (e) {
    console.error(e)
  } finally {
    loadingTrips.value = false
  }
}

async function handleGenerate() {
  if (!selectedDocTypeId.value || selectedTripIds.value.size === 0) return

  loading.value = true
  result.value = null
  try {
    result.value = await store.generateFromTrips({
      tripIds: Array.from(selectedTripIds.value),
      documentTypeId: selectedDocTypeId.value
    })
    await loadTrips()
    emit('saved')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(open, (val) => {
  if (val) {
    result.value = null
    selectedTripIds.value = new Set()
    initDocTypes()
    loadTrips()
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
    <template #content>
      <div class="p-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold">Generar comprobantes desde viajes</h2>
          <p class="text-sm text-muted mt-1">
            Seleccioná los viajes y el tipo de documento a generar.
          </p>
        </div>

        <!-- Tipo de documento -->
        <div class="space-y-1">
          <label class="text-sm font-medium">Tipo de documento</label>
          <USelect
            v-model="selectedDocTypeId"
            :items="saleDocTypes.map((dt: any) => ({ label: `${dt.code} - ${dt.description}`, value: dt.id }))"
            placeholder="Seleccionar tipo..."
          />
        </div>

        <!-- Loading trips -->
        <div v-if="loadingTrips" class="flex items-center justify-center py-8">
          <ULoader />
        </div>

        <!-- No trips -->
        <div v-else-if="trips.length === 0" class="text-center py-8 text-muted text-sm">
          No hay viajes completados pendientes de facturación.
        </div>

        <!-- Trips table -->
        <div v-else class="space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <UCheckbox :model-value="allSelected" @update:model-value="(v: boolean) => allSelected = v" />
            <span class="font-medium">
              Seleccionar todos ({{ trips.length }})
            </span>
            <span v-if="selectedCount > 0" class="text-muted">
              — {{ selectedCount }} seleccionados
            </span>
          </div>

          <div class="max-h-[40vh] overflow-auto border border-default rounded-lg">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-default z-10">
                <tr class="border-b border-default">
                  <th class="w-10 py-2 px-3"></th>
                  <th class="text-left py-2 px-3 text-xs font-medium text-muted">Viaje</th>
                  <th class="text-right py-2 px-3 text-xs font-medium text-muted">Órdenes</th>
                  <th class="text-right py-2 px-3 text-xs font-medium text-muted">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="trip in trips"
                  :key="trip.id"
                  class="border-b border-default hover:bg-muted/30 cursor-pointer"
                  @click="toggleTrip(trip.id)"
                >
                  <td class="py-2 px-3">
                    <UCheckbox
                      :model-value="selectedTripIds.has(trip.id)"
                      @update:model-value="toggleTrip(trip.id)"
                      @click.stop
                    />
                  </td>
                  <td class="py-2 px-3 font-mono text-xs">
                    {{ trip.reference_number ?? trip.id.substring(0, 8) }}
                  </td>
                  <td class="py-2 px-3 text-right">{{ trip.total_orders }}</td>
                  <td class="py-2 px-3 text-right font-medium">{{ fmt(trip.total_amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Result -->
        <UAlert
          v-if="result"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle"
          :title="`Generados: ${result.results.reduce((a, r) => a + r.created, 0)} — Existentes: ${result.results.reduce((a, r) => a + r.skipped, 0)}`"
        />

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-2 border-t border-default">
          <UButton
            label="Cancelar"
            variant="ghost"
            color="neutral"
            @click="open = false"
          />
          <UButton
            label="Generar"
            icon="i-lucide-file-plus"
            :loading="loading"
            :disabled="!selectedDocTypeId || selectedCount === 0"
            @click="handleGenerate"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
