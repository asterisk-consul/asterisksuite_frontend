<script setup lang="ts">
import * as XLSX from 'xlsx'

interface ImportColumn {
  key: string
  label: string
  required?: boolean
  type?: 'string' | 'number' | 'date' | 'boolean'
}

interface ImportResult {
  success: boolean
  total: number
  saved: number
  failed: number
  errors: { row: number; message: string }[]
}

interface Props {
  title?: string
  description?: string
  columns: ImportColumn[]
  endpoint: string
  templateColumns?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Importar datos',
  description: 'Seleccioná un archivo Excel para importar',
  templateColumns: () => []
})

const emit = defineEmits<{
  success: [result: ImportResult]
  error: [message: string]
}>()

const toast = useToast()
const open = defineModel<boolean>('open', { default: false })

const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const previewData = ref<any[]>([])
const importing = ref(false)
const importResult = ref<ImportResult | null>(null)
const step = ref<'upload' | 'preview' | 'result'>('upload')

// Reset when modal closes
watch(open, (val) => {
  if (!val) {
    reset()
  }
})

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  selectedFile.value = file
  importResult.value = null

  // Read and preview
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)

      // Map headers to our column keys
      previewData.value = jsonData.slice(0, 5).map((row: any) => {
        const mapped: any = {}
        for (const col of props.columns) {
          // Try to find the column by label or key
          mapped[col.key] = row[col.label] ?? row[col.key] ?? ''
        }
        return mapped
      })

      step.value = 'preview'
    } catch (err) {
      toast.add({ title: 'Error al leer el archivo', color: 'error' })
    }
  }
  reader.readAsArrayBuffer(file)
}

const handleImport = async () => {
  if (!selectedFile.value) return

  console.log('[ExcelImport] Starting import...')
  console.log('[ExcelImport] Endpoint:', props.endpoint)
  console.log('[ExcelImport] File:', selectedFile.value.name, selectedFile.value.size, 'bytes')

  importing.value = true
  step.value = 'result'

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    console.log('[ExcelImport] Sending request...')
    const result = await $fetch<ImportResult>(props.endpoint, {
      method: 'POST',
      body: formData
    })

    console.log('[ExcelImport] Result:', result)
    importResult.value = result
    emit('success', result)

    if (result.failed > 0) {
      toast.add({
        title: `Importación completada con errores`,
        description: `${result.saved} guardados, ${result.failed} fallidos`,
        color: 'warning'
      })
    } else {
      toast.add({
        title: `Importación exitosa`,
        description: `${result.saved} registros importados`,
        color: 'success'
      })
      // Auto-close and reset after successful import
      setTimeout(() => {
        reset()
        open.value = false
      }, 1500)
    }
  } catch (err: any) {
    console.error('[ExcelImport] Error:', err)
    console.error('[ExcelImport] Error data:', err?.data)
    console.error('[ExcelImport] Error message:', err?.message)
    const message = err?.data?.message || err?.message || 'Error al importar'
    importResult.value = {
      success: false,
      total: 0,
      saved: 0,
      failed: 0,
      errors: [{ row: 0, message }]
    }
    emit('error', message)
    toast.add({ title: 'Error al importar', description: message, color: 'error' })
  } finally {
    importing.value = false
  }
}

const downloadTemplate = () => {
  const headers = props.columns.map(col => col.label)
  const exampleRow = props.columns.map(col => {
    if (col.type === 'number') return 0
    if (col.type === 'date') return 'DD/MM/AAAA'
    if (col.type === 'boolean') return 'VERDADERO/FALSO'
    return ''
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  ws['!cols'] = props.columns.map(col => ({ wch: col.label.length + 5 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, `plantilla_${props.title.replace(/\s+/g, '_').toLowerCase()}.xlsx`)
}

const reset = () => {
  selectedFile.value = null
  previewData.value = []
  importResult.value = null
  step.value = 'upload'
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="{ width: 'max-w-2xl' }">
    <template #body>
      <!-- STEP 1: UPLOAD -->
      <div v-if="step === 'upload'" class="space-y-4">
        <p class="text-sm text-muted">{{ description }}</p>

        <div
          class="border-2 border-dashed border-default rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="handleFileSelect"
          />
          <UIcon name="i-lucide-upload" class="size-10 mx-auto mb-3 text-muted" />
          <p class="text-sm font-medium">Click para seleccionar archivo</p>
          <p class="text-xs text-muted mt-1">Formatos: .xlsx, .xls, .csv</p>
        </div>

        <div class="flex justify-between items-center">
          <UButton
            label="Descargar plantilla"
            variant="ghost"
            size="sm"
            icon="i-lucide-download"
            @click="downloadTemplate"
          />
          <p v-if="selectedFile" class="text-xs text-muted">
            Archivo: {{ selectedFile.name }}
          </p>
        </div>
      </div>

      <!-- STEP 2: PREVIEW -->
      <div v-if="step === 'preview'" class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">
            Vista previa ({{ previewData.length }} filas de muestra)
          </p>
          <UButton label="Cambiar archivo" variant="ghost" size="xs" @click="step = 'upload'" />
        </div>

        <div class="overflow-x-auto border border-default rounded-lg">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-muted/50">
                <th
                  v-for="col in columns"
                  :key="col.key"
                  class="px-3 py-2 text-left font-medium text-muted"
                >
                  {{ col.label }}
                  <span v-if="col.required" class="text-error">*</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewData" :key="idx" class="border-t border-default">
                <td
                  v-for="col in columns"
                  :key="col.key"
                  class="px-3 py-2"
                >
                  {{ row[col.key] || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-2">
          <UButton label="Volver" variant="ghost" @click="step = 'upload'" />
          <UButton
            label="Importar"
            color="primary"
            :loading="importing"
            @click="handleImport"
          />
        </div>
      </div>

      <!-- STEP 3: RESULT -->
      <div v-if="step === 'result'" class="space-y-4">
        <div v-if="importResult" class="space-y-3">
          <div class="flex items-center gap-3 p-4 rounded-lg" :class="importResult.success ? 'bg-success/10' : 'bg-warning/10'">
            <UIcon
              :name="importResult.success ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
              class="size-6"
              :class="importResult.success ? 'text-success' : 'text-warning'"
            />
            <div>
              <p class="font-medium">
                {{ importResult.success ? 'Importación exitosa' : 'Importación con errores' }}
              </p>
              <p class="text-sm text-muted">
                {{ importResult.saved }} guardados, {{ importResult.failed }} fallidos
              </p>
            </div>
          </div>

          <div v-if="importResult.errors && importResult.errors.length > 0" class="space-y-2">
            <p class="text-sm font-medium text-error">Errores:</p>
            <div class="max-h-48 overflow-y-auto space-y-1">
              <div
                v-for="(err, idx) in importResult.errors.slice(0, 20)"
                :key="idx"
                class="text-xs p-2 bg-error/5 rounded border border-error/20"
              >
                <span class="font-medium">Fila {{ err.row }}:</span> {{ err.message }}
              </div>
              <p v-if="importResult.errors && importResult.errors.length > 20" class="text-xs text-muted">
                ... y {{ (importResult.errors?.length || 0) - 20 }} errores más
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton label="Cerrar" @click="reset(); open = false" />
        </div>
      </div>
    </template>
  </UModal>
</template>
