export interface TaxCategory {
  id: string
  code: string
  name: string
  description: string | null
  active: boolean
}

import { TaxesService } from '~/modulos/erp/taxes/services/taxes.service'

export function useTaxCategories() {
  const categories = ref<TaxCategory[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      categories.value = await TaxesService.getTaxCategories()
    } catch (e) {
      console.error('Error fetching tax categories:', e)
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  const categoryOptions = computed(() =>
    categories.value.map((c) => ({
      label: `${c.code} - ${c.name}`,
      value: c.id,
    }))
  )

  return { categories, categoryOptions, loading, fetchAll }
}
