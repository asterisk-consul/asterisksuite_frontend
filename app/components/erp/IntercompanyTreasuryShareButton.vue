<script setup lang="ts">
import { useIntercompanyTreasuryService, type IntercompanyFundType } from '~/modulos/erp/treasury/intercompany-treasury.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const props = defineProps<{
  fundType: IntercompanyFundType
  fundId: string
  fundName: string
}>()

const service = useIntercompanyTreasuryService()
const toast = useToast()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const open = ref(false)
const loading = ref(false)
const saving = ref(false)
const companies = ref<Array<{ id: string; name: string; subdomain: string }>>([])
const rows = ref<Array<{ company_id: string; name: string; active: boolean; allow_payments: boolean; allow_collections: boolean; allow_hr: boolean }>>([])
// These permission codes must match the tenant RBAC catalog (seed-sql.ts).
const permission = computed(() => props.fundType === 'CASH_BOX' ? 'cash_boxes.update' : 'bank_accounts.update')
const canConfigure = computed(() => isOwnerOrAdmin.value || hasPermission(permission.value))

watch(open, async (isOpen) => {
  if (isOpen) await load()
})

async function load() {
  loading.value = true
  try {
    const [companyRows, shares] = await Promise.all([
      service.findCompanies(props.fundType),
      service.findShares(props.fundType, props.fundId),
    ])
    companies.value = companyRows
    rows.value = companyRows.map((company) => {
      const share = shares.find((item: any) => item.consumer_company_id === company.id)
      return {
        company_id: company.id,
        name: company.name,
        active: Boolean(share?.active),
        allow_payments: Boolean(share?.allow_payments),
        allow_collections: Boolean(share?.allow_collections),
        allow_hr: Boolean(share?.allow_hr),
      }
    })
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar el uso entre empresas', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const shares = rows.value
      .filter((row) => row.active && (row.allow_payments || row.allow_collections || row.allow_hr))
      .map(({ company_id, allow_payments, allow_collections, allow_hr }) => ({ company_id, allow_payments, allow_collections, allow_hr }))
    await service.saveShares(props.fundType, props.fundId, shares)
    toast.add({ title: 'Uso intercompany actualizado', color: 'success' })
    open.value = false
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la configuración', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

function openModal() {
  open.value = true
}

function closeModal() {
  open.value = false
}
</script>

<template>
  <UButton
    v-if="canConfigure"
    label="Uso entre empresas"
    icon="i-lucide-building"
    variant="outline"
    color="neutral"
    @click="openModal"
  />

  <UModal v-model:open="open" title="Uso de este fondo en otras empresas" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          <strong>{{ fundName }}</strong> conserva su saldo y sus movimientos en su empresa titular. Elegí qué empresas pueden usarlo.
        </p>

        <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-sm text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Cargando empresas y permisos…
        </div>
        <div v-else-if="!rows.length" class="rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted">
          No hay otras empresas vinculadas a tu usuario para configurar.
        </div>
        <div v-else class="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <section v-for="row in rows" :key="row.company_id" class="rounded-xl border border-default p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-medium">{{ row.name }}</p>
                <p class="text-xs text-muted">{{ row.active ? 'Fondo disponible' : 'Sin acceso al fondo' }}</p>
              </div>
              <USwitch v-model="row.active" aria-label="Habilitar empresa" />
            </div>
            <div v-if="row.active" class="mt-4 grid gap-3 border-t border-default pt-3 sm:grid-cols-3">
              <UCheckbox v-model="row.allow_payments" label="Pagos y sueldos" />
              <UCheckbox v-model="row.allow_collections" label="Cobros" />
              <UCheckbox v-model="row.allow_hr" label="Vales de socios" />
            </div>
          </section>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" :disabled="saving" @click="closeModal" />
        <UButton label="Guardar permisos" icon="i-lucide-check" :loading="saving" :disabled="loading || saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
