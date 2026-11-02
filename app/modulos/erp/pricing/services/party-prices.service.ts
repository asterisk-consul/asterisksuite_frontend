export type PartyPriceOperation = 'SALE' | 'PURCHASE'

export interface PartyPriceInput {
  product_id: string
  party_id: string
  currency_id: string
  operation_type: PartyPriceOperation
  price: number
}

export interface PartyPriceRecord {
  id: string
  product_id: string
  party_id: string
  currency_id: string
  operation_type: PartyPriceOperation
  price: string | number
  effective_from?: string | null
  products?: { id?: string; name?: string | null }
  currencies?: { id?: string; code?: string | null; symbol?: string | null }
  [key: string]: unknown
}

export interface PartyPriceHistoryEntry {
  id: string
  operation_type: PartyPriceOperation
  previous_price: string | number | null
  new_price: string | number
  effective_at: string
  products?: { name?: string | null }
  currencies?: { code?: string | null }
}

export interface ResolvePartyPriceQuery {
  productId: string
  partyId: string
  currencyCode: string
  operationType: PartyPriceOperation
}

const urlBase = '/api/backend/pricing/party-prices'

export const usePartyPricesService = () => ({
  byParty: (partyId: string) => $fetch<PartyPriceRecord[]>(`${urlBase}/party/${partyId}`),
  partyHistory: (partyId: string) => $fetch<PartyPriceHistoryEntry[]>(`${urlBase}/party/${partyId}/history`),
  byProduct: (productId: string) => $fetch<PartyPriceRecord[]>(`${urlBase}/product/${productId}`),
  productHistory: (productId: string) => $fetch<PartyPriceHistoryEntry[]>(`${urlBase}/product/${productId}/history`),
  resolve: (query: ResolvePartyPriceQuery) => $fetch<{ price: number | null }>(`${urlBase}/resolve`, { query }),
  upsert: (input: PartyPriceInput) => $fetch<PartyPriceRecord>(urlBase, { method: 'POST', body: input }),
  remove: (priceId: string) => $fetch<void>(`${urlBase}/${priceId}`, { method: 'DELETE' })
})
