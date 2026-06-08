export const useModuleSidebarState = () => {
  const moduleCollapsed = useState('module-sidebar-collapsed', () => false)
  return { moduleCollapsed }
}
