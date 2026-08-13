<script setup lang="ts">
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const toast = useToast()
const router = useRouter()
const partiesService = useBusinessPartiesService()
const { baseCurrency, fetchBaseCurrency } = useCurrencies()
const { fetchActive, fetchAll } = useCurrentAccounts()

const loading = ref(false)
const allParties = ref<Array<{ id: string; name: string; tax_id?: string; type: string }>>([])

const form = reactive({
  party_type: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER',
  party_id: '',
  amount: 0,
  date: today(),
  description: 'Saldo inicial',
})

const partyTypeOptions = [
  { label: 'Cliente', value: 'CUSTOMER' },
  { label: 'Proveedor', value: 'SUPPLIER' },
]

const selectedPartyType = computed({
  get: () => partyTypeOptions.find(o => o.value === form.party_type) ?? null,
  set: (val) => { form.party_type = (val?.value as 'CUSTOMER' | 'SUPPLIER') ?? 'CUSTOMER' },
})

const partySearch = ref('')

const filteredParties = computed(() => {
  const q = partySearch.value.toLowerCase().trim()
  let filtered = allParties.value.filter(p => p.type === form.party_type)
  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tax_id && p.tax_id.includes(q))
    )
  }
  return filtered.map(p => ({
    label: p.tax_id ? `${p.name} (${p.tax_id})` : p.name,
    value: p.id
  }))
})

const selectedParty = computed({
  get: () => {
    const party = allParties.value.find(p => p.id === form.party_id)
    if (!party) return null
    return { label: party.tax_id ? `${party.name} (${party.tax_id})` : party.name, value: party.id }
  },
  set: (val) => { form.party_id = val?.value ?? '' },
})

const docTypeCode = computed(() =>
  form.party_type === 'CUSTOMER' ? 'SI-C' : 'SI-P'
)

onMounted(async () => {
  try {
    const [parties] = await Promise.all([partiesService.findAll(), fetchBaseCurrency()])
    allParties.value = parties as any
  } catch (e) {
    console.error('Error loading parties:', e)
  }
})

function close() {
  emit('update:open', false)
  form.party_id = ''
  form.amount = 0
  partySearch.value = ''
  form.date = today()
  form.description = 'Saldo inicial'
}

async function handleSubmit() {
  if (!form.party_id) {
    toast.add({ title: 'Seleccioná un tercero', color: 'error' })
    return
  }
  if (form.amount <= 0) {
    toast.add({ title: 'El monto debe ser mayor a 0', color: 'error' })
    return
  }

  try {
    loading.value = true

    const docTypes = await $fetch<any[]>('/api/erp/documents/documents-types', {
      query: { category: 'OPENING_BALANCE' }
    })
    const docType = docTypes.find((dt: any) => dt.code === docTypeCode.value)
    if (!docType) {
      toast.add({ title: `Tipo de documento ${docTypeCode.value} no encontrado`, color: 'error' })
      return
    }

    const doc = await $fetch<any>('/api/erp/documents/sales', {
      method: 'POST',
      body: {
        document_type_id: docType.id,
        party_id: form.party_id,
        date: form.date,
        currency_code: baseCurrency.value?.code ?? 'ARS',
        total: form.amount,
        subtotal: form.amount,
        descrip: form.description || 'Saldo inicial',
        items: [],
      }
    })

    await $fetch(`/api/erp/documents/sales/${doc.id}/confirm`, { method: 'PATCH' })

    await Promise.all([fetchActive(), fetchAll()])

    toast.add({ title: 'Saldo inicial registrado', color: 'success' })
    close()
    router.push(`/erp/treasury/current-accounts/${form.party_id}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? e.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Nuevo saldo inicial"
    description="Cargá el saldo de apertura para un cliente o proveedor"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField label="Tipo de tercero" required>
          <USelectMenu
            v-model="selectedPartyType"
            :items="partyTypeOptions"
            placeholder="Seleccionar tipo"
          />
        </UFormField>

        <UFormField label="Tercero" required>
          <USelectMenu
            v-model="selectedParty"
            :items="filteredParties"
            placeholder="Buscar cliente o proveedor..."
            searchable
            @update:search="partySearch = $event"
          />
        </UFormField>

        <UFormField label="Monto" required>
          <UInput
            v-model.number="form.amount"
            type="number"
            :min="0.01"
            :step="0.01"
            placeholder="0.00"
          />
        </UFormField>

        <UFormField label="Fecha">
          <UInput v-model="form.date" type="date" />
        </UFormField>

        <UFormField label="Descripción">
          <UInput v-model="form.description" placeholder="Saldo inicial" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton label="Cancelar" variant="ghost" @click="close" />
        <UButton
          label="Guardar"
          color="primary"
          :loading="loading"
          :disabled="!form.party_id || form.amount <= 0"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
