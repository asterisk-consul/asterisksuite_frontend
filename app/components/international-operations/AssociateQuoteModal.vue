<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

interface Props {
  open: boolean
  operationId: string
  excludeDocumentIds?: string[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'associated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const selectedDocument = ref<{ label: string; value: string } | undefined>(undefined)
const selectedDocumentId = computed(() => selectedDocument.value?.value ?? null)

const documents = ref<Array<{
  id: string
  number: number
  date: string
  total: number
  currency_code?: string
  party_name?: string
  document_type_code?: string
  description?: string
}>>([])

const fetchDocuments = async () => {
  loading.value = true
  try {
    const fetched: any[] = await (DocumentsPurchasesService.getAll as any)({
      category: 'QUOTE',
      direction: -1
    })
    documents.value = (fetched ?? []).map((d: any) => ({
      id: d.id,
      number: d.number,
      date: d.date,
      total: Number(d.total),
      currency_code: d.currency_code,
      party_name: d.business_parties?.name,
      document_type_code: d.document_types?.code,
      description: d.descrip
    })).filter(d => !props.excludeDocumentIds?.includes(d.id))
  } catch (err) {
    console.error('Error fetching quotes:', err)
  } finally {
    loading.value = false
  }
}

const documentOptions = computed(() => documents.value.map(d => ({
  label: `${d.document_type_code || 'PRE'} Nº ${String(d.number).padStart(8, '0')} — ${d.party_name || '—'} — ${new Date(d.date).toLocaleDateString('es-AR')} — ${d.currency_code} ${d.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
  value: d.id
})))

watch(() => props.open, (open) => {
  if (open) {
    selectedDocument.value = undefined
    fetchDocuments()
  }
})

const handleAssociate = async () => {
  if (!selectedDocumentId.value) return
  try {
    loading.value = true
    await $fetch(`/api/international-operations/${props.operationId}/quotes`, {
      method: 'POST',
      body: { document_id: selectedDocumentId.value }
    })
    emit('associated')
    emit('update:open', false)
  } catch (err) {
    console.error('Error associating quote:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="props.open"
    title="Asociar Presupuesto"
    description="Buscá un presupuesto de compra existente (categoría Presupuesto)"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Presupuesto de compra" name="document_id" required>
          <USelectMenu
            v-model="selectedDocument"
            :items="documentOptions"
            placeholder="Buscar y seleccionar presupuesto..."
            searchable
            clear
            class="w-full"
            :disabled="loading"
          />
        </UFormField>

        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          class="text-xs"
          title="Sin impacto en totales"
          description="Los presupuestos asociados no se suman a los totales de la operación. Sirven para comparar y decidir."
        />

        <div v-if="loading" class="text-center py-4">
          <USkeleton class="h-8 w-48 mx-auto" />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton variant="ghost" @click="emit('update:open', false)" :disabled="loading">Cancelar</UButton>
      <UButton @click="handleAssociate" :disabled="loading || !selectedDocumentId">Asociar</UButton>
    </template>
  </UModal>
</template>
