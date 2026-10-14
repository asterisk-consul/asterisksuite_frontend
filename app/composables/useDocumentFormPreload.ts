export function useDocumentFormPreload(path: string) {
  onMounted(() => {
    // Descargar el chunk mientras el usuario revisa el listado. La navegación
    // posterior reutiliza esta descarga y no comienza desde cero al hacer clic.
    void preloadRouteComponents(path).catch(() => {
      // La navegación normal sigue funcionando si la precarga falla.
    })
  })
}
