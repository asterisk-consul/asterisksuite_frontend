<script setup lang="ts">
import { useDataImportService } from '~/modulos/data-import/data-import.service'
import { useDataTransferPermissions } from '~/modulos/access-control/composables/useDataTransferPermissions'

const dataImportService = useDataImportService()
const activeKey = ref<string | null>(null)
const { canImport } = useDataTransferPermissions()

const allImporters = [
  {
    key: 'compras',
    title: 'Importar Compras',
    description: 'Importar facturas de compra desde archivo Excel o CSV',
    icon: 'i-lucide-file-plus',
    heading: 'Importar Facturas de compra',
    handler: dataImportService.importCompras,
    permission: 'purchases.documents.import'
  },
  {
    key: 'Ventas',
    title: 'Importar Ventas',
    description: 'Importar facturas de compra desde archivo Excel o CSV',
    icon: 'i-lucide-file-plus',
    heading: 'Importar Facturas de ventas',
    handler: dataImportService.importVentas,
    permission: 'sales.documents.import'
  },
  {
    key: 'nc',
    title: 'Importar Notas de Crédito',
    description: 'Importar notas de crédito de proveedores',
    icon: 'i-lucide-rotate-ccw',
    heading: 'Importar Notas de Crédito',
    handler: dataImportService.importNotaCredito,
    permission: 'purchases.documents.import'
  },
  {
    key: 'nd',
    title: 'Importar Notas de Débito',
    description: 'Importar notas de débito de proveedores',
    icon: 'i-lucide-rotate-cw',
    heading: 'Importar Notas de Débito',
    handler: dataImportService.importNotaDebito,
    permission: 'purchases.documents.import'
  }
]
const importers = computed(() => allImporters.filter(item => canImport(item.permission)))
const states = reactive<
  Record<
    string,
    {
      file: File | null
      loading: boolean
      result: any
      error: string | null
    }
  >
>(
  Object.fromEntries(
    allImporters.map((i) => [
      i.key,
      { file: null, loading: false, result: null, error: null }
    ])
  )
)

function select(key: string) {
  activeKey.value = activeKey.value === key ? null : key
}

async function upload(importer: (typeof allImporters)[number]) {
  const s = states[importer.key]
  if (!s?.file) return

  s.loading = true
  s.error = null
  s.result = null

  try {
    const response = await importer.handler(s.file) // 👈 llama al handler correcto
    s.result = response.data
  } catch (err: any) {
    s.error = err?.data?.message || err?.message || 'Error al importar'
  } finally {
    s.loading = false
  }
}

function stateFor(key: string) {
  // The state map is built from this same static importer list.
  return states[key]!
}

const active = computed(
  () => importers.value.find((i) => i.key === activeKey.value) ?? null
)
</script>

<template>
  <div class="max-w-5xl mx-auto py-10">
    <h1 class="text-2xl font-bold mb-6">Importadores de Datos</h1>

    <UPageGrid class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard
        v-for="item in importers"
        :key="item.key"
        class="hover:shadow-lg cursor-pointer transition"
        :class="{ 'ring-2 ring-primary': activeKey === item.key }"
        @click="select(item.key)"
      >
        <div class="flex flex-col items-center text-center gap-3 p-4">
          <UIcon :name="item.icon" class="text-4xl text-primary" />
          <h2 class="text-lg font-semibold">{{ item.title }}</h2>
          <p class="text-sm text-gray-500">{{ item.description }}</p>
        </div>
      </UCard>
    </UPageGrid>

    <!-- Panel del importador activo -->
    <div v-if="active" class="mt-8 max-w-xl">
      <h2 class="text-xl font-semibold mb-4">{{ active.heading }}</h2>

      <UFileUpload
        v-model="stateFor(active.key).file"
        color="neutral"
        highlight
        label="Arrastra tu archivo aquí"
        description=".xlsx, .csv, .json"
        accept=".xlsx,.csv,.json"
        class="w-96 min-h-48 hover:bg-gray-800 hover:cursor-pointer"
      />

      <p v-if="stateFor(active.key).file" class="mt-2 text-sm font-medium">
        ✓ {{ stateFor(active.key).file?.name }} ({{
          ((stateFor(active.key).file?.size ?? 0) / 1024).toFixed(2)
        }}
        KB)
      </p>

      <UButton
        :disabled="!stateFor(active.key).file || stateFor(active.key).loading"
        class="mt-4"
        @click="upload(active)"
      >
        {{ stateFor(active.key).loading ? 'Importando...' : 'Importar' }}
      </UButton>

      <!-- Resultado exitoso -->
      <div v-if="stateFor(active.key).result" class="mt-4">
        <div class="p-4 bg-green-50 border border-green-200 rounded">
          <h3 class="font-bold text-green-800">✓ Importación completada</h3>
          <p class="text-sm text-green-700">
            Total: {{ stateFor(active.key).result.total }} | Exitosos:
            {{ stateFor(active.key).result.processed }} | Fallidos:
            {{ stateFor(active.key).result.failed }}
          </p>
        </div>

        <div
          v-if="stateFor(active.key).result.errors?.length > 0"
          class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded"
        >
          <h4 class="font-bold text-yellow-800 mb-2">
            ⚠ Registros con errores:
          </h4>
          <div
            v-for="err in stateFor(active.key).result.errors"
            :key="err.row"
            class="text-sm mb-2"
          >
            <span class="font-semibold">Fila {{ err.row }}:</span>
            <ul class="ml-4 list-disc text-yellow-700">
              <li v-for="msg in err.errors" :key="msg">{{ msg }}</li>
            </ul>
          </div>
        </div>

        <details v-if="stateFor(active.key).result.data?.length > 0" class="mt-4">
          <summary class="cursor-pointer font-semibold">
            Ver datos importados ({{ stateFor(active.key).result.data.length }})
          </summary>
          <pre class="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">{{
            JSON.stringify(stateFor(active.key).result.data, null, 2)
          }}</pre>
        </details>
      </div>

      <!-- Error general -->
      <div
        v-if="stateFor(active.key).error"
        class="mt-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded"
      >
        {{ stateFor(active.key).error }}
      </div>
    </div>
  </div>
</template>
