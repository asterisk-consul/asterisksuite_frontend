import { computed } from 'vue'
import { useCompaniesStore } from '../store/company.store'
import type {
  Company,
  CompanyUser,
  CreateCompanyInput,
  UpdateCompanyInput,
  AddCompanyUserDto,
  CreateCompanyUserDto
} from '~/modulos/companies/types/company.types'

export interface CompanySelectItem {
  label: string
  value: string
}

export function useCompanies() {
  const store = useCompaniesStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // COMPANY ACTIONS
  // =========================

  const create = async (payload: CreateCompanyInput) => store.create(payload)

  const update = async (id: string, payload: UpdateCompanyInput) => store.update(id, payload)

  const deactivate = async (id: string) => store.deactivate(id)

  // =========================
  // USER ACTIONS
  // =========================

  const listUsers = async (companyId: string) => store.fetchUsers(companyId)

  const addUser = async (companyId: string, dto: AddCompanyUserDto) =>
    store.addUser(companyId, dto.email, dto.role)

  const createUser = async (companyId: string, dto: CreateCompanyUserDto) =>
    store.createUser(companyId, dto)

  const removeUser = async (companyId: string, userId: string) =>
    store.removeUser(companyId, userId)

  // =========================
  // COMPUTED
  // =========================

  const items = computed<CompanySelectItem[]>(() =>
    store.items.map((company) => ({
      label: company.name,
      value: company.id
    }))
  )

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((c) => c.id === id)

  const formatLabel = (id: string) => {
    const company = store.items.find((c) => c.id === id)
    return company?.name ?? ''
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    companies: computed(() => store.items),
    current: computed(() => store.current),
    users: computed(() => store.users),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),

    // computed
    items,

    // helpers
    findById,
    formatLabel,

    // actions
    init,
    create,
    update,
    deactivate,

    // user actions
    listUsers,
    addUser,
    createUser,
    removeUser
  }
}
