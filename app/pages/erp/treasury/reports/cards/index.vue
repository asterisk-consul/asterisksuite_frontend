<script setup lang="ts">
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'
definePageMeta({ middleware: ['auth'] })
const service = useCreditCardsService()
const loading = ref(true)
const report = ref<any>(null)
const from = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
const to = ref(today())
const money = (value: any) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value || 0))
const load = async () => { loading.value = true; try { report.value = await service.report(from.value, to.value) } finally { loading.value = false } }
watch([from, to], load)
onMounted(load)
</script>
<template>
  <UPage class="space-y-5">
    <AppPageHeader title="Reporte de tarjetas" description="Cobros, consumos corporativos, comisiones y acreditaciones por período." />
    <UCard><div class="grid sm:grid-cols-2 gap-4 max-w-xl"><UFormField label="Desde"><DataPicker v-model="from" /></UFormField><UFormField label="Hasta"><DataPicker v-model="to" /></UFormField></div></UCard>
    <div v-if="loading" class="grid md:grid-cols-4 gap-4"><USkeleton v-for="n in 4" :key="n" class="h-28" /></div>
    <template v-else-if="report">
      <div class="grid md:grid-cols-4 gap-4"><UPageCard title="Cobros con tarjeta"><p class="text-2xl font-bold">{{ money(report.totals.collections) }}</p></UPageCard><UPageCard title="Consumos corporativos"><p class="text-2xl font-bold">{{ money(report.totals.purchases) }}</p></UPageCard><UPageCard title="Comisiones"><p class="text-2xl font-bold text-warning">{{ money(report.totals.commissions) }}</p></UPageCard><UPageCard title="Neto"><p class="text-2xl font-bold text-success">{{ money(report.totals.net) }}</p></UPageCard></div>
      <UCard><template #header><h3 class="font-semibold">Actividad por tarjeta o canal</h3></template><div class="divide-y divide-default"><div v-for="item in report.by_card" :key="item.id" class="grid grid-cols-4 gap-3 py-3"><strong>{{ item.name }}</strong><span>{{ item.type === 'COMPANY' ? 'Corporativa' : 'Cobros' }}</span><span>{{ item.operations }} operaciones</span><span class="text-right font-semibold">{{ money(item.amount) }}</span></div></div></UCard>
    </template>
  </UPage>
</template>
