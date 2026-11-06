export const useCommercialSummaryService = () => ({
  find: <T>(endpoint: string, days: number) => $fetch<T>(endpoint, { query: { days } }),
})
