import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import {
  mapBusinessPartyToForm,
  mapFormToBusinessPartyDto
} from '~/modulos/logistica/master-data/bussiness-parties/mapper/mapFormToBusines'

type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'PARTNER'

export function useBusinessPartiesByType(type: PartyType, basePath: string) {
  const store = useBusinessPartiesStore()
  const router = useRouter()
  const { items, loading, error, errors } = storeToRefs(store)

  // ✅ filtra por tipo
  const filteredItems = computed(() => items.value.filter((i) => i.type === type))

  const initialForm: Partial<FormType> = { type }

  // =========================
  // LIST
  // =========================
  const fetchAll = async () => {
    await store.fetchAll()
  }

  // =========================
  // CREATE
  // =========================
  const handleCreate = async (form: FormType) => {
    const payload = mapFormToBusinessPartyDto({ ...form, type })
    await store.create(payload)
    await router.push(basePath)
  }

  // =========================
  // EDIT - cargar
  // =========================
  const fetchOne = async (id: string) => {
    const data = await store.fetchOne(id)
    return mapBusinessPartyToForm(data)
  }

  // =========================
  // EDIT - guardar
  // =========================
  const handleUpdate = async (id: string, form: FormType) => {
    const payload = mapFormToBusinessPartyDto({ ...form, type })
    await store.update(id, payload)
    await router.push(basePath)
  }

  // =========================
  // NAV helpers
  // =========================
  const goToCreate = () => router.push(`${basePath}/create`)
  const goToEdit = (row: { id: string }) => router.push(`${basePath}/${row.id}/edit`)

  return {
    // state
    filteredItems,
    loading,
    error,
    errors,
    initialForm,

    // actions
    fetchAll,
    fetchOne,
    handleCreate,
    handleUpdate,

    // nav
    goToCreate,
    goToEdit
  }
}
