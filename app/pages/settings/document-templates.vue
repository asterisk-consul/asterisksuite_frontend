<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

type Category = 'QUOTE' | 'ORDER'
interface PrintTemplate {
  id: string
  name: string
  category: Category
  title: string
  is_default: boolean
  active: boolean
  config: Record<string, any>
}

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const templates = ref<PrintTemplate[]>([])
const selectedId = ref<string | null>(null)
const categoryOptions = [
  { label: 'Presupuesto / proforma', value: 'QUOTE' },
  { label: 'Orden de venta', value: 'ORDER' }
]
const blockLabels: Record<string, string> = {
  customer: 'Datos del cliente',
  items: 'Productos',
  specifications: 'Especificaciones',
  commercial_terms: 'Condiciones comerciales',
  totals: 'Totales y seña',
  signatures: 'Firmas',
  footer: 'Pie de página'
}

const emptyForm = () => ({
  name: 'Factura proforma',
  category: 'QUOTE' as Category,
  title: 'FACTURA PROFORMA',
  is_default: true,
  active: true,
  config: {
    blocks: ['customer', 'items', 'specifications', 'commercial_terms', 'totals', 'signatures', 'footer'],
    show_code: true,
    show_unit_price: true,
    show_taxes: false,
    show_signature: true,
    show_deposit: true,
    deposit_percentage: 50,
    deduct_deposit_from_total: false,
    specifications_title: 'Especificaciones de productos',
    specifications_text: '',
    transport_text: 'Transporte por cuenta del CLIENTE',
    currency_note: 'PRECIOS EXPRESADOS AL TIPO DE CAMBIO DEL DÍA DE EMISIÓN',
    footer_text: 'Documento no válido como factura'
  }
})
const form = reactive(emptyForm())

function reset() {
  selectedId.value = null
  Object.assign(form, emptyForm())
}

function edit(template: PrintTemplate) {
  selectedId.value = template.id
  Object.assign(form, {
    name: template.name,
    category: template.category,
    title: template.title,
    is_default: template.is_default,
    active: template.active,
    config: { ...emptyForm().config, ...template.config }
  })
}

function moveBlock(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.config.blocks.length) return
  const next = [...form.config.blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  form.config.blocks = next
}

async function load() {
  loading.value = true
  try {
    templates.value = await $fetch('/api/backend/sales-flow/print-templates')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.name.trim() || !form.title.trim()) return
  saving.value = true
  try {
    const url = selectedId.value
      ? `/api/backend/sales-flow/print-templates/${selectedId.value}`
      : '/api/backend/sales-flow/print-templates'
    await $fetch(url, {
      method: selectedId.value ? 'PATCH' : 'POST',
      body: JSON.parse(JSON.stringify(form))
    })
    toast.add({ title: 'Plantilla guardada', description: 'Ya está disponible para imprimir documentos.', color: 'success' })
    await load()
    reset()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(template: PrintTemplate) {
  try {
    await $fetch(`/api/backend/sales-flow/print-templates/${template.id}`, { method: 'DELETE' })
    toast.add({ title: 'Plantilla eliminada', color: 'success' })
    if (selectedId.value === template.id) reset()
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo eliminar', description: error?.data?.message || error?.message, color: 'error' })
  }
}

onMounted(load)
</script>

<template>
  <UPage class="space-y-6 px-4 pb-10">
    <AppPageHeader title="Plantillas comerciales" description="Armá presupuestos, proformas y órdenes con la información que necesita cada empresa.">
      <template #actions><UButton label="Nueva plantilla" icon="i-lucide-plus" variant="outline" @click="reset" /></template>
    </AppPageHeader>

    <UAlert color="info" variant="subtle" icon="i-lucide-shield-check" title="Sólo documentos comerciales" description="Las facturas fiscales y los remitos conservan su formato controlado." />

    <div class="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(34rem,1fr)_minmax(25rem,0.8fr)]">
      <UCard class="min-w-0 lg:sticky lg:top-4">
        <template #header><div><p class="font-semibold">Plantillas guardadas</p><p class="text-xs text-muted">Cada empresa administra las suyas.</p></div></template>
        <div v-if="loading" class="space-y-2"><USkeleton v-for="n in 3" :key="n" class="h-14" /></div>
        <div v-else-if="!templates.length" class="py-8 text-center text-sm text-muted">Todavía no hay plantillas.</div>
        <div v-else class="space-y-2">
          <button v-for="template in templates" :key="template.id" type="button" class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-primary/5" :class="selectedId === template.id ? 'border-primary bg-primary/5' : 'border-default'" @click="edit(template)">
            <span><span class="block text-sm font-medium">{{ template.name }}</span><span class="text-xs text-muted">{{ template.category === 'QUOTE' ? 'Presupuesto' : 'Orden de venta' }}</span></span>
            <span class="flex items-center gap-1"><UBadge v-if="template.is_default" label="Predeterminada" size="xs" color="primary" variant="subtle" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" square @click.stop="remove(template)" /></span>
          </button>
        </div>
      </UCard>

      <div class="min-w-0 space-y-5">
        <UCard>
          <template #header><div><p class="font-semibold">{{ selectedId ? 'Editar plantilla' : 'Nueva plantilla' }}</p><p class="text-xs text-muted">Definí el contenido y el orden de lectura.</p></div></template>
          <div class="space-y-4">
            <div class="grid gap-4 xl:grid-cols-2">
              <UFormField label="Nombre interno" required><UInput v-model="form.name" class="w-full" placeholder="Ej: Proforma hotelería" /></UFormField>
              <UFormField label="Documento" required><USelect v-model="form.category" :items="categoryOptions" value-key="value" class="w-full" :disabled="!!selectedId" /></UFormField>
            </div>
            <UFormField label="Título visible" required><UInput v-model="form.title" class="w-full" placeholder="FACTURA PROFORMA" /></UFormField>
            <div class="grid gap-3 xl:grid-cols-2">
              <label class="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-default p-3"><span class="min-w-0"><span class="block text-sm font-medium">Predeterminada</span><span class="block text-xs text-muted">Se usa automáticamente al imprimir.</span></span><USwitch v-model="form.is_default" class="shrink-0" /></label>
              <label class="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-default p-3"><span class="min-w-0 text-sm font-medium">Plantilla activa</span><USwitch v-model="form.active" class="shrink-0" /></label>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header><div><p class="font-semibold">Bloques y contenido</p><p class="text-xs text-muted">Usá las flechas para ordenar el documento.</p></div></template>
          <div class="space-y-2">
            <div v-for="(block, index) in form.config.blocks" :key="block" class="flex items-center gap-3 rounded-lg border border-default p-3">
              <UIcon name="i-lucide-grip-vertical" class="size-4 text-muted" /><span class="min-w-0 flex-1 text-sm font-medium">{{ blockLabels[block] }}</span>
              <UButton icon="i-lucide-chevron-up" variant="ghost" color="neutral" size="xs" square :disabled="index === 0" @click="moveBlock(index, -1)" />
              <UButton icon="i-lucide-chevron-down" variant="ghost" color="neutral" size="xs" square :disabled="index === form.config.blocks.length - 1" @click="moveBlock(index, 1)" />
            </div>
          </div>
          <div class="mt-5 grid gap-3 xl:grid-cols-2">
            <label class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"><span class="min-w-0">Mostrar código</span><USwitch v-model="form.config.show_code" class="shrink-0" /></label>
            <label class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"><span class="min-w-0">Mostrar precio unitario</span><USwitch v-model="form.config.show_unit_price" class="shrink-0" /></label>
            <label class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"><span class="min-w-0">Desglosar impuestos</span><USwitch v-model="form.config.show_taxes" class="shrink-0" /></label>
            <label class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"><span class="min-w-0">Mostrar firmas</span><USwitch v-model="form.config.show_signature" class="shrink-0" /></label>
            <label class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"><span class="min-w-0">Calcular seña</span><USwitch v-model="form.config.show_deposit" class="shrink-0" /></label>
            <UFormField v-if="form.config.show_deposit" label="Seña (%)"><UInput v-model.number="form.config.deposit_percentage" type="number" min="0" max="100" /></UFormField>
            <label v-if="form.config.show_deposit" class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm xl:col-span-2">
              <span class="min-w-0"><span class="block font-medium">Mostrar saldo después de la seña</span><span class="block text-xs text-muted">El total original siempre permanece visible.</span></span>
              <USwitch v-model="form.config.deduct_deposit_from_total" class="shrink-0" />
            </label>
          </div>
          <div class="mt-5 space-y-4">
            <UFormField label="Título de especificaciones"><UInput v-model="form.config.specifications_title" class="w-full" /></UFormField>
            <UFormField label="Especificaciones predeterminadas"><UTextarea v-model="form.config.specifications_text" :rows="5" class="w-full" placeholder="Dimensiones, materiales, terminación..." /></UFormField>
            <UFormField label="Transporte"><UInput v-model="form.config.transport_text" class="w-full" /></UFormField>
            <UFormField label="Leyenda de moneda"><UTextarea v-model="form.config.currency_note" :rows="2" class="w-full" /></UFormField>
            <UFormField label="Pie de página"><UInput v-model="form.config.footer_text" class="w-full" /></UFormField>
          </div>
          <template #footer><div class="flex justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="ghost" @click="reset" /><UButton label="Guardar plantilla" icon="i-lucide-save" :loading="saving" @click="save" /></div></template>
        </UCard>
      </div>

      <UCard class="h-fit min-w-0 lg:col-start-2 2xl:col-start-3 2xl:row-start-1 2xl:sticky 2xl:top-4">
        <template #header><div><p class="font-semibold">Vista previa</p><p class="text-xs text-muted">Representación aproximada del PDF.</p></div></template>
        <div class="mx-auto aspect-[210/297] w-full max-w-[46rem] space-y-4 overflow-hidden border border-default bg-white p-5 text-zinc-900 shadow-sm 2xl:max-w-none">
          <div class="flex justify-between border-b pb-3"><div><p class="font-bold">Mi empresa</p><p class="text-[9px]">CUIT · Dirección · Teléfono</p></div><div class="text-right"><p class="text-sm font-bold">{{ form.title }}</p><p class="text-[9px]">Fecha · Número</p></div></div>
          <div v-for="block in form.config.blocks" :key="block" class="text-[9px]">
            <div v-if="block === 'customer'" class="rounded border p-2"><b>COMPRADOR</b><p>Cliente · CUIT · Referencia · Moneda</p></div>
            <div v-else-if="block === 'items'" class="rounded border"><div class="grid grid-cols-4 bg-zinc-900 p-1 text-white"><span>Cant.</span><span class="col-span-2">Descripción</span><span>Total</span></div><div class="grid grid-cols-4 p-1"><span>50</span><span class="col-span-2">Producto</span><span>$ 0,00</span></div></div>
            <div v-else-if="block === 'specifications'" class="whitespace-pre-line rounded border p-2"><b>{{ form.config.specifications_title }}</b><p>{{ form.config.specifications_text || 'Las especificaciones del producto se mostrarán aquí.' }}</p></div>
            <div v-else-if="block === 'commercial_terms'" class="rounded border p-2">{{ form.config.transport_text }}<p>{{ form.config.currency_note }}</p></div>
            <div v-else-if="block === 'totals'" class="ml-auto w-2/3 rounded border p-2"><p>SUBTOTAL <b class="float-right">$ 0,00</b></p><p v-if="form.config.show_deposit">SEÑA ({{ form.config.deposit_percentage }}%) <b class="float-right">$ 0,00</b></p><p>TOTAL <b class="float-right">$ 0,00</b></p><p v-if="form.config.show_deposit && form.config.deduct_deposit_from_total" class="mt-1 border-t pt-1">SALDO A PAGAR <b class="float-right">$ 0,00</b></p></div>
            <div v-else-if="block === 'signatures' && form.config.show_signature" class="grid grid-cols-2 gap-5 pt-5"><span class="border-t text-center">Firma vendedor</span><span class="border-t text-center">Firma cliente</span></div>
            <div v-else-if="block === 'footer'" class="text-center text-[8px] text-zinc-500">{{ form.config.footer_text }}</div>
          </div>
        </div>
      </UCard>
    </div>
  </UPage>
</template>
