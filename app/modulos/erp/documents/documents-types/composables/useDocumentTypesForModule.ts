import { computed, type Ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useDocumentsTypesStore } from '~/modulos/erp/documents/documents-types/store/documents-types.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'

import type { DocumentsType } from '../types/documents-types.types'

export interface DocumentTypeOption {
  label: string
  value: string
  code: string
  letter_type?: string | null
}

/**
 * Calcula las letras válidas según la matriz emisor × receptor:
 *
 *   Emisor       | Receptor        | Letra
 *   -------------|-----------------|------
 *   RI           | RI              | A
 *   RI           | Monotributo     | B
 *   RI           | Consumidor Final| B
 *   RI           | Exento          | B
 *   Monotributo  | *               | C
 *   Exento       | *               | C
 */
function getValidLetterTypes(issuer: string | null, partner: string | null): string[] {
  if (!issuer) return []

  const issuerNorm = issuer.toUpperCase()
  if (issuerNorm === 'MONOTRIBUTO' || issuerNorm === 'EXENTO') return ['C']

  // Emisor RI
  if (!partner) return ['A', 'B'] // sin partner seleccionado, mostrar ambas

  const partnerNorm = partner.toUpperCase()
  if (partnerNorm === 'RI' || partnerNorm === 'RESPONSABLE_INSCRIPTO') return ['A']

  return ['B'] // Monotributo, Consumidor Final, Exento como receptor
}

export function useDocumentTypesForModule(
  moduleCode: 'SALES' | 'PURCHASES',
  partnerCondition?: Ref<string | null | undefined>
) {
  const documentsTypesStore = useDocumentsTypesStore()
  const companiesStore = useCompaniesStore()
  const authStore = useAuthStore()

  const { items: documentsTypes } = storeToRefs(documentsTypesStore)

  const companyId = computed(() => authStore.selectedCompany?.id ?? '')

  const issuerCondition = computed(() => {
    return companiesStore.current?.vat_condition ?? null
  })

  const partnerCond = computed(() => partnerCondition?.value ?? null)

  const direction = computed(() => (moduleCode === 'SALES' ? 1 : -1))

  const validLetters = computed(() => {
    if (moduleCode === 'PURCHASES') {
      // Compras: proveedor = emisor, empresa = receptor
      return getValidLetterTypes(partnerCond.value, issuerCondition.value)
    }
    // Ventas: empresa = emisor, proveedor = receptor
    return getValidLetterTypes(issuerCondition.value, partnerCond.value)
  })

  const filteredDocumentTypes = computed<DocumentTypeOption[]>(() => {
    return documentsTypes.value
      .filter((d: DocumentsType) => d.active !== false)
      .filter((d: DocumentsType) => d.direction === direction.value)
      .filter((d: DocumentsType) => {
        if (validLetters.value.length === 0) return true
        return !d.letter_type || validLetters.value.includes(d.letter_type)
      })
      .map((d: DocumentsType) => ({
        label: d.code ? `${d.code} - ${d.description}` : d.description,
        value: d.id,
        code: d.code,
        letter_type: d.letter_type,
      }))
  })

  const isDocumentTypeValid = (letterType: string | null | undefined): boolean => {
    if (!letterType || validLetters.value.length === 0) return true
    return validLetters.value.includes(letterType)
  }

  const getValidationMessage = (code: string, letterType: string | null | undefined): string | null => {
    if (!letterType || validLetters.value.length === 0) return null
    if (validLetters.value.includes(letterType)) return null

    const issuer = issuerCondition.value ?? 'desconocido'
    const partner = partnerCond.value ?? 'no seleccionado'
    return `Comprobante "${code}" (letra ${letterType}) no válido para emisor "${issuer}" → receptor "${partner}". Letras válidas: ${validLetters.value.join(', ')}`
  }

  const fetchIssuerCondition = async () => {
    if (companiesStore.current?.vat_condition) return
    if (!companyId.value) return
    try {
      await companiesStore.fetchOne(companyId.value)
    } catch {
      // silent
    }
  }

  return {
    filteredDocumentTypes,
    issuerCondition,
    partnerCond,
    validLetters,
    isDocumentTypeValid,
    getValidationMessage,
    fetchIssuerCondition,
  }
}
