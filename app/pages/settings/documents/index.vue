<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const activeSection = ref('general')
const sections = [
  { label: 'General', value: 'general', icon: 'i-lucide-settings-2' },
  { label: 'Ventas', value: 'sales', icon: 'i-lucide-shopping-cart' },
  { label: 'Compras', value: 'purchases', icon: 'i-lucide-shopping-bag' },
  { label: 'Entregas', value: 'delivery', icon: 'i-lucide-truck' },
  { label: 'Fiscal', value: 'fiscal', icon: 'i-lucide-badge-check' }
]

const cards = [
  { section: 'general', step: 1, label: 'Tipos de documento', description: 'Definí qué documentos existen y cómo afectan impuestos, stock, pagos y cuentas corrientes.', icon: 'i-lucide-file-cog', to: '/erp/settings/document-types', advanced: true },
  { section: 'general', step: 2, label: 'Puntos de venta y series', description: 'Asigná a cada documento una numeración independiente.', icon: 'i-lucide-hash', to: '/erp/settings/document-sequences', advanced: true },
  { section: 'sales', step: 1, label: 'Tipos documentales de venta', description: 'Presupuestos, órdenes, facturas, notas y recibos.', icon: 'i-lucide-receipt', to: '/erp/settings/document-types' },
  { section: 'sales', step: 2, label: 'Circuito de ventas', description: 'Elegí qué documento genera deuda, admite cobros y habilita la entrega.', icon: 'i-lucide-git-branch', to: '/settings/sales-flow' },
  { section: 'sales', step: 3, label: 'Series de venta', description: 'Configurá un contador por comprobante y punto de venta.', icon: 'i-lucide-list-ordered', to: '/erp/settings/document-sequences' },
  { section: 'purchases', step: 1, label: 'Tipos documentales de compra', description: 'Órdenes, remitos, facturas y notas de proveedores.', icon: 'i-lucide-files', to: '/erp/settings/document-types' },
  { section: 'purchases', step: 2, label: 'Series de compra', description: 'Organizá la numeración interna sin mezclar tipos documentales.', icon: 'i-lucide-list-ordered', to: '/erp/settings/document-sequences' },
  { section: 'delivery', step: 1, label: 'Remitos', description: 'Revisá stock, depósito y comportamiento de los remitos de venta y compra.', icon: 'i-lucide-truck', to: '/erp/settings/document-types' },
  { section: 'delivery', step: 2, label: 'Condiciones de entrega', description: 'Definí pago mínimo, facturación previa y creación automática.', icon: 'i-lucide-shield-check', to: '/settings/sales-flow' },
  { section: 'delivery', step: 3, label: 'Serie del remito', description: 'Asigná punto de venta y contador exclusivo.', icon: 'i-lucide-hash', to: '/erp/settings/document-sequences' },
  { section: 'fiscal', step: 1, label: 'Perfil fiscal', description: 'Completá la condición fiscal e inscripciones de la empresa.', icon: 'i-lucide-landmark', to: '/settings/fiscal-config' },
  { section: 'fiscal', step: 2, label: 'Impuestos y reglas', description: 'Configurá IVA, percepciones y retenciones.', icon: 'i-lucide-percent', to: '/settings/fiscal-rules' },
  { section: 'fiscal', step: 3, label: 'Autorizaciones fiscales', description: 'Registrá CAI, vigencias y rangos para las series correspondientes.', icon: 'i-lucide-badge-check', to: '/settings/fiscal-authorizations' }
]

const visibleCards = computed(() => cards.filter(card => card.section === activeSection.value))
</script>

<template>
  <UPage class="space-y-6 px-4 pb-10">
    <AppPageHeader title="Configuración de documentos" description="Prepará ventas, compras y entregas en el orden correcto.">
      <template #actions><UButton label="Toda la configuración" icon="i-lucide-settings" to="/settings" variant="outline" /></template>
    </AppPageHeader>

    <UAlert color="info" variant="subtle" icon="i-lucide-info" title="Las rutas actuales siguen funcionando" description="Este centro organiza las configuraciones existentes y te guía por sus dependencias." />

    <div class="overflow-x-auto rounded-xl border border-default bg-default px-4 pt-2"><UTabs v-model="activeSection" :items="sections" :content="false" variant="link" class="min-w-max" /></div>

    <div class="grid gap-4 lg:grid-cols-3">
      <NuxtLink v-for="card in visibleCards" :key="`${card.section}-${card.step}`" :to="card.to" class="group relative rounded-xl border border-default bg-default p-5 transition hover:border-primary/50 hover:bg-primary/5">
        <div class="flex items-start justify-between gap-3"><div class="flex items-center gap-3"><span class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{{ card.step }}</span><div class="rounded-lg bg-muted p-2 group-hover:text-primary"><UIcon :name="card.icon" class="size-5" /></div></div><UIcon name="i-lucide-arrow-up-right" class="size-4 text-muted group-hover:text-primary" /></div>
        <div class="mt-4 flex items-center gap-2"><h2 class="font-semibold">{{ card.label }}</h2><UBadge v-if="card.advanced" label="Avanzado" color="neutral" variant="subtle" size="xs" /></div>
        <p class="mt-1 text-sm text-muted">{{ card.description }}</p>
      </NuxtLink>
    </div>

    <UCard><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-medium">¿No sabés dónde está una opción?</p><p class="text-sm text-muted">Usá el buscador del Centro de configuración para encontrarla por su nombre o función.</p></div><UButton label="Buscar configuración" icon="i-lucide-search" to="/settings" /></div></UCard>
  </UPage>
</template>
