export const useInboxService = () => ({
  findAll: () => $fetch<Mail[]>('/api/mails')
})
