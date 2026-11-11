<script setup lang="ts">
import { usePriceUpdateSettingsService, type PriceUpdateSettings } from '~/modulos/erp/pricing/services/price-update-settings.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useAuthStore } from '~/modulos/auth/auth.store'

definePageMeta({ middleware: ['auth'] })

const service = usePriceUpdateSettingsService()
const toast = useToast()
const auth = useAuthStore()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const settings = ref<PriceUpdateSettings | null>(null)
const loading = ref(true)
const saving = ref(false)
const canEdit = computed(() => isOwnerOrAdmin.value || hasPermission('product-prices.update'))

async function load() {
  loading.value = true
  try {
    const companyId = auth.selectedCompany?.id
    if (companyId) await fetchMyPermissionsIfNeeded(companyId, auth.user?.id)
    settings.value = await service.get()
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar la configuración', description: error?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!settings.value || !canEdit.value || saving.value) return
  saving.value = true
  try {
    settings.value = await service.update(settings.value)
    toast.add({ title: 'Configuración guardada', description: 'Se aplicará a las próximas facturas que confirmes.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la configuración', description: error?.data?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <UPage class="flex flex-col gap-6 px-4 pb-10">
    <AppPageHeader
      title="Actualización de precios"
      description="Elegí qué valores se actualizan automáticamente al confirmar facturas de venta o compra."
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Las notas de crédito y débito no cambian precios"
      description="Esta configuración se aplica al confirmar facturas. Las NC y ND no actualizan precios ni costos y no generan avisos de actualización. Para cambiar el precio general de venta, además se necesita el permiso de actualización de precios."
    />

    <div v-if="loading" class="rounded-xl border border-default p-10 text-center text-sm text-muted">
      Cargando configuración…
    </div>

    <template v-else-if="settings">
      <div class="grid gap-4 xl:grid-cols-2">
        <UPageCard title="Facturas de venta" description="Usá el precio de venta facturado para actualizar los valores del cliente y del catálogo.">
          <div class="flex flex-col gap-5">
            <div class="flex items-start justify-between gap-6">
              <div>
                <p class="font-medium">Precio acordado con el cliente</p>
                <p class="text-sm text-muted">Guarda el precio de cada producto y moneda en la ficha de este cliente.</p>
              </div>
              <USwitch v-model="settings.update_sales_party_prices" :disabled="!canEdit" />
            </div>
            <USeparator />
            <div class="flex items-start justify-between gap-6">
              <div>
                <p class="font-medium">Precio general de venta</p>
                <p class="text-sm text-muted">Actualiza la lista general del producto o de su variante.</p>
              </div>
              <USwitch v-model="settings.update_sales_global_prices" :disabled="!canEdit" />
            </div>
          </div>
        </UPageCard>

        <UPageCard title="Facturas de compra" description="Usá el precio de compra para actualizar los valores del proveedor y los costos del catálogo.">
          <div class="flex flex-col gap-5">
            <div class="flex items-start justify-between gap-6">
              <div>
                <p class="font-medium">Precio acordado con el proveedor</p>
                <p class="text-sm text-muted">Actualiza la ficha del proveedor y sus precios acordados por producto.</p>
              </div>
              <USwitch v-model="settings.update_purchases_party_prices" :disabled="!canEdit" />
            </div>
            <USeparator />
            <div class="flex items-start justify-between gap-6">
              <div>
                <p class="font-medium">Costo global de compra</p>
                <p class="text-sm text-muted">Actualiza el costo del producto o de su variante en la moneda de la factura.</p>
              </div>
              <USwitch v-model="settings.update_purchases_global_costs" :disabled="!canEdit" />
            </div>
          </div>
        </UPageCard>
      </div>

      <UAlert
        v-if="!canEdit"
        color="warning"
        variant="subtle"
        icon="i-lucide-lock-keyhole"
        title="Solo lectura"
        description="Necesitás el permiso de actualización de precios para cambiar estas opciones."
      />

      <div v-else class="flex justify-end">
        <UButton label="Guardar configuración" icon="i-lucide-save" :loading="saving" @click="save" />
      </div>
    </template>
  </UPage>
</template>
