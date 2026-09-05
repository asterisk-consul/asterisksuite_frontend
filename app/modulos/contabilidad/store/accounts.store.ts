import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  buildAccountTree,
  flattenAccountTree
} from '~/modulos/contabilidad/utils/account-tree'

import { useAccountsService } from '~/modulos/contabilidad/service/accounts.service'

import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput
} from '~/modulos/contabilidad/types/accounts.types'

export const useAccountsStore = defineStore(
  'accounts',
  () => {
    const service = useAccountsService()

    const items = ref<Account[]>([])
    const current = ref<Account | null>(null)

    const loading = ref(false)

    // =========================
    // COMPUTEDS
    // =========================

    const activeItems = computed(() =>
      items.value.filter((i) => i.active !== false)
    )

    const rootAccounts = computed(() =>
      items.value.filter((i) => !i.parent_id)
    )

    // =========================
    // LOAD ALL
    // =========================

    const fetchAll = async () => {
      try {
        loading.value = true

        items.value = await service.findAll()

        return items.value
      } finally {
        loading.value = false
      }
    }

    // =========================
    // LOAD ONE
    // =========================

    const fetchOne = async (id: string) => {
      try {
        loading.value = true

        const data = await service.findOne(id)

        current.value = data

        return data
      } finally {
        loading.value = false
      }
    }

    // =========================
    // CREATE
    // =========================

    const create = async (
      payload: CreateAccountInput
    ) => {
      const created = await service.create(payload)

      items.value.push(created)

      return created
    }

    // =========================
    // UPDATE
    // =========================

    const update = async (
      id: string,
      payload: UpdateAccountInput
    ) => {
      const updated = await service.update(id, payload)

      const index = items.value.findIndex(
        (i) => i.id === id
      )

      if (index !== -1) {
        items.value[index] = updated
      }

      if (current.value?.id === id) {
        current.value = updated
      }

      return updated
    }

    // =========================
    // DELETE
    // =========================

    const remove = async (id: string) => {
      await service.remove(id)

      items.value = items.value.filter(
        (i) => i.id !== id
      )

      if (current.value?.id === id) {
        current.value = null
      }
    }

    const accountTree = computed(() =>
  buildAccountTree(items.value)
)

const flattenedAccounts = computed(() =>
  flattenAccountTree(accountTree.value)
)

    return {
      // state
      items,
      current,
      loading,

      // computed
      activeItems,
      rootAccounts,
      accountTree,
      flattenedAccounts,

      // actions
      fetchAll,
      fetchOne,
      create,
      update,
      remove
    }
  }
)
