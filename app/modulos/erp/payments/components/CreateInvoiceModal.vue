<script setup lang="ts">
import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

const props = defineProps<{
  moduleCode: 'SALES' | 'PURCHASES'
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const saving = ref(false)
const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)
const confirmAutomatically = ref(true)
const alertDismissed = ref(false)

const title = computed(() =>
  props.moduleCode === 'SALES' ? 'Nueva Factura de Venta' : 'Nueva Factura de Compra'
)

const service = computed(() =>
  props.moduleCode === 'SALES' ? DocumentsSalesService : DocumentsPurchasesService
)

const alertTitle = computed(() =>
  confirmAutomatically.value
    ? 'La factura se creará y confirmará automáticamente'
    : 'La factura se creará como borrador'
)

const alertDescription = computed(() =>
  confirmAutomatically.value
    ? 'Una vez confirmada, no podrá ser editada. Aparecerá en documentos pendientes de pago.'
    : 'Podés confirmarla después desde la vista del documento.'
)

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    const created = await service.value.create(payload)
    if (confirmAutomatically.value) {
      await service.value.confirm(created.id)
      toast.add({ title: 'Factura creada y confirmada', color: 'success' })
    } else {
      toast.add({ title: 'Factura creada como borrador', color: 'success' })
    }
    open.value = false
    emit('success')
  } catch (e: any) {
    const msg = e?.data?.data?.message || e?.data?.message || e?.message || 'Error desconocido'
    toast.add({
      title: 'Error al crear factura',
      description: Array.isArray(msg) ? msg[0] : msg,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <UAlert
        v-if="!alertDismissed"
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="alertTitle"
        :description="alertDescription"
        close
        class="mb-4"
        @update:open="alertDismissed = true"
      />

      <div class="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
        <USwitch
          v-model="confirmAutomatically"
          label="Confirmar automáticamente"
          description="Si está activado, la factura se confirmará al crearla."
        />
      </div>

      <FacturaForm
        ref="formRef"
        :loading="saving"
        :module-code="moduleCode"
        category="INVOICE"
        @submit="handleSubmit"
      />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" @click="open = false" />
        <UButton
          v-if="!confirmAutomatically"
          label="Crear borrador"
          variant="outline"
          :loading="saving"
          @click="formRef?.submit()"
        />
        <UButton
          label="Crear y confirmar"
          color="success"
          :loading="saving"
          @click="formRef?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>
