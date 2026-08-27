import type { TrashTable } from '~/modulos/trash/types/trash.types'

export function useTableDelete(tableName: TrashTable) {
  const toast = useToast()
  const loading = ref(false)

  async function deleteOne(id: string) {
    loading.value = true
    try {
      await $fetch(`/api/trash/${tableName}/${id}`, { method: 'DELETE' })
      toast.add({
        title: 'Enviado a la papelera',
        description: 'Podés recuperar el elemento desde la Papelera en Ajustes.',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } catch (e: any) {
      toast.add({
        title: 'Error al eliminar',
        description: e?.data?.message || e.message,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteMany(ids: string[]) {
    loading.value = true
    try {
      await $fetch(`/api/trash/bulk/${tableName}`, {
        method: 'DELETE',
        body: { ids }
      })
      toast.add({
        title: `${ids.length} elemento(s) enviado(s) a la papelera`,
        description: 'Podés recuperarlos desde la Papelera en Ajustes.',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } catch (e: any) {
      toast.add({
        title: 'Error al eliminar',
        description: e?.data?.message || e.message,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw e
    } finally {
      loading.value = false
    }
  }

  return { deleteOne, deleteMany, loading }
}
