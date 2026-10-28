<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'

const props = defineProps<{ direction: 'sales' | 'purchases' }>()
const router = useRouter()
const { can } = useDocumentPermissions()
const menuOpen = ref(false)

const categories = computed(() => props.direction === 'sales'
  ? [
      { category: 'QUOTE', label: 'Presupuesto', icon: 'i-lucide-file-text' },
      { category: 'ORDER', label: 'Orden de Venta', icon: 'i-lucide-clipboard-list' },
      { category: 'INVOICE', label: 'Factura', icon: 'i-lucide-receipt' },
      { category: 'REMITO', label: 'Remito', icon: 'i-lucide-package-check' },
      { category: 'CREDIT_NOTE', label: 'Nota de Crédito', icon: 'i-lucide-file-minus-2' },
      { category: 'DEBIT_NOTE', label: 'Nota de Débito', icon: 'i-lucide-file-plus-2' }
    ]
  : [
      { category: 'ORDER', label: 'Orden de Compra', icon: 'i-lucide-clipboard-list' },
      { category: 'INVOICE', label: 'Factura', icon: 'i-lucide-receipt' },
      { category: 'REMITO', label: 'Remito', icon: 'i-lucide-package-check' },
      { category: 'CREDIT_NOTE', label: 'Nota de Crédito', icon: 'i-lucide-file-minus-2' },
      { category: 'DEBIT_NOTE', label: 'Nota de Débito', icon: 'i-lucide-file-plus-2' }
    ])

function getCreatePath(category: string) {
  if (props.direction === 'sales') return `/erp/sales/new?category=${category}`
  if (category === 'ORDER') return '/erp/purchases/orders/new'
  if (category === 'REMITO') return '/erp/purchases/remitos/new'
  return `/erp/purchases/purchases-documents/new?category=${category}`
}

const menuItems = computed<DropdownMenuItem[]>(() => categories.value
  .filter(item => can(props.direction, item.category, 'create'))
  .map(item => ({
    label: item.label,
    icon: item.icon,
    onSelect: async () => {
      menuOpen.value = false
      await router.push(getCreatePath(item.category))
    }
  })))

function handleCreateShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || menuItems.value.length === 0) return
  const target = event.target
  const isTyping = target instanceof HTMLElement && (
    target.isContentEditable
    || Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
  )
  if (event.key.toLowerCase() !== 'n' || !event.altKey || event.ctrlKey || event.metaKey || isTyping || event.repeat) return
  event.preventDefault()
  event.stopPropagation()
  menuOpen.value = true
}

onMounted(() => window.addEventListener('keydown', handleCreateShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleCreateShortcut))
</script>

<template>
  <UDropdownMenu v-if="menuItems.length" v-model:open="menuOpen" :items="menuItems">
    <UButton
      color="primary"
      aria-keyshortcuts="Alt+N"
      title="Crear nuevo comprobante (Alt + N)"
    >
      <UIcon name="i-lucide-plus" class="size-4" />
      <span>Crear nuevo comprobante</span>
      <KeyboardShortcutHint :keys="['Alt', 'N']" size="2xs" />
      <UIcon name="i-lucide-chevron-down" class="size-4" />
    </UButton>
  </UDropdownMenu>
</template>
