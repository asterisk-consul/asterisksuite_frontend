import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useEngineeringService } from '~/modulos/logistica/master-data/engineering/service/engineering.service'

import type {
  EngineeringTree,
  EngineeringCalculation,
  CreateEngineeringComponentInput
} from '~/modulos/logistica/master-data/engineering/types/engineering.types'

export const useEngineeringStore = defineStore('engineering', () => {
  const service = useEngineeringService()

  const tree = ref<EngineeringTree | null>(null)

  const calculation = ref<EngineeringCalculation | null>(null)

  const loading = ref(false)

  // =========================
  // CREATE COMPONENT
  // =========================

  const createComponent = async (payload: CreateEngineeringComponentInput) => {
    return service.createComponent(payload)
  }

  // =========================
  // LOAD TREE
  // =========================

  const fetchTree = async (productId: string) => {
    try {
      loading.value = true

      const data = await service.getEngineeringTree(productId)

      tree.value = data

      return data
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CALCULATE
  // =========================

  const calculate = async (productId: string) => {
    try {
      loading.value = true

      const data = await service.calculate(productId)

      calculation.value = data

      return data
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    tree,
    calculation,
    loading,

    // actions
    createComponent,
    fetchTree,
    calculate
  }
})
