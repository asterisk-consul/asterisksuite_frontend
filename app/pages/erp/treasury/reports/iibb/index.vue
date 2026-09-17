<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const today = new Date()
const dateFrom = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)
const dateTo = ref(today.toISOString().slice(0, 10))
const { data, status, refresh } = await useFetch<any>('/api/backend/fiscal/iibb-register', {
  query: computed(() => ({ date_from: dateFrom.value, date_to: dateTo.value }))
})

const columns = [
  { accessorKey: 'date', header: 'Fecha' },
  { accessorKey: 'document', header: 'Comprobante' },
  { accessorKey: 'party', header: 'Cliente / proveedor' },
  { accessorKey: 'jurisdiction', header: 'JurisdicciÃ³n' },
  { accessorKey: 'tax', header: 'Impuesto' },
  { accessorKey: 'taxable_base', header: 'Base' },
  { accessorKey: 'tax_amount', header: 'Importe' },
  { accessorKey: 'origin', header: 'Origen' }
]
const rows = computed(() => (data.value?.items ?? []).map((row: any) => ({
  date: new Date(row.documents.date).toLocaleDateString('es-AR'),
  document: `${row.documents.document_types.code} ${row.documents.number}`,
  party: row.documents.business_parties?.name ?? 'â€”',
  jurisdiction: row.jurisdiction?.name ?? 'Sin jurisdicciÃ³n',
  tax: row.taxes.name,
  taxable_base: Number(row.taxable_base).toLocaleString('es-AR', { style: 'currency', currency: row.documents.currency_code ?? 'ARS' }),
  tax_amount: Number(row.tax_amount).toLocaleString('es-AR', { style: 'currency', currency: row.documents.currency_code ?? 'ARS' }),
  origin: row.is_manual ? 'Manual' : 'AutomÃ¡tico'
})))
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Registro de IIBB" description="Percepciones de Ingresos Brutos separadas del Libro IVA" />
    <UCard>
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Desde"><UInput v-model="dateFrom" type="date" /></UFormField>
        <UFormField label="Hasta"><UInput v-model="dateTo" type="date" /></UFormField>
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" :loading="status === 'pending'" @click="refresh()" />
        <div class="ml-auto text-right">
          <p class="text-xs text-muted">{{ data?.count ?? 0 }} movimientos</p>
          <p v-for="(amount, currency) in data?.totals_by_currency ?? {}" :key="currency" class="text-lg font-semibold">
            {{ Number(amount).toLocaleString('es-AR', { style: 'currency', currency: String(currency) }) }}
          </p>
        </div>
      </div>
    </UCard>
    <UCard>
      <UTable :data="rows" :columns="columns" :loading="status === 'pending'" />
    </UCard>
  </UPage>
</template>
