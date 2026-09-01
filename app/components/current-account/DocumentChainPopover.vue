<script setup lang="ts">
import type { DocumentChainNode } from '~/modulos/erp/current-accounts/types/current-accounts.types'

const props = defineProps<{
  chain: DocumentChainNode[]
  partyType?: string
}>()

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  'PRES': { label: 'Presupuesto', icon: 'i-lucide-file-text', color: 'neutral' },
  'OV': { label: 'Orden de Venta', icon: 'i-lucide-shopping-cart', color: 'info' },
  'OC': { label: 'Orden de Compra', icon: 'i-lucide-shopping-bag', color: 'info' },
  'REM-V': { label: 'Remito Venta', icon: 'i-lucide-truck', color: 'warning' },
  'REM-C': { label: 'Remito Compra', icon: 'i-lucide-truck', color: 'warning' },
  'REM-T': { label: 'Remito Traslado', icon: 'i-lucide-arrow-right-left', color: 'warning' },
  'FA-A': { label: 'Factura A', icon: 'i-lucide-receipt', color: 'primary' },
  'FA-B': { label: 'Factura B', icon: 'i-lucide-receipt', color: 'primary' },
  'FB-A': { label: 'Factura B', icon: 'i-lucide-receipt', color: 'primary' },
  'FC-A': { label: 'Factura C', icon: 'i-lucide-receipt', color: 'primary' },
  'FX-A': { label: 'Factura X', icon: 'i-lucide-receipt', color: 'primary' },
  'FA-C': { label: 'Factura A Compra', icon: 'i-lucide-receipt', color: 'primary' },
  'FB-C': { label: 'Factura B Compra', icon: 'i-lucide-receipt', color: 'primary' },
  'FC-C': { label: 'Factura C Compra', icon: 'i-lucide-receipt', color: 'primary' },
  'NCA': { label: 'NC A', icon: 'i-lucide-file-minus', color: 'success' },
  'NCB': { label: 'NC B', icon: 'i-lucide-file-minus', color: 'success' },
  'NCC-A': { label: 'NC C', icon: 'i-lucide-file-minus', color: 'success' },
  'NDA': { label: 'ND A', icon: 'i-lucide-file-plus', color: 'secondary' },
  'NDB': { label: 'ND B', icon: 'i-lucide-file-plus', color: 'secondary' },
  'NDC-A': { label: 'ND C', icon: 'i-lucide-file-plus', color: 'secondary' },
  'NCA-C': { label: 'NC Compra A', icon: 'i-lucide-file-minus', color: 'success' },
  'NCB-C': { label: 'NC Compra B', icon: 'i-lucide-file-minus', color: 'success' },
  'NCC-C': { label: 'NC Compra C', icon: 'i-lucide-file-minus', color: 'success' },
  'NDA-C': { label: 'ND Compra A', icon: 'i-lucide-file-plus', color: 'secondary' },
  'NDB-C': { label: 'ND Compra B', icon: 'i-lucide-file-plus', color: 'secondary' },
  'NDC-C': { label: 'ND Compra C', icon: 'i-lucide-file-plus', color: 'secondary' },
  'REC': { label: 'Recibo', icon: 'i-lucide-wallet', color: 'success' },
  'SI-C': { label: 'Saldo Inicial', icon: 'i-lucide-landmark', color: 'info' },
  'SI-P': { label: 'Saldo Inicial', icon: 'i-lucide-landmark', color: 'info' },
  'VALE': { label: 'Vale', icon: 'i-lucide-file-text', color: 'warning' },
}

function getDocConfig(typeCode: string) {
  return DOC_TYPE_CONFIG[typeCode] ?? { label: typeCode, icon: 'i-lucide-file', color: 'neutral' }
}

function getDocLink(node: DocumentChainNode, partyType?: string): string {
  if (partyType === 'SUPPLIER') {
    return `/erp/purchases/purchases-documents/${node.id}`
  }
  return `/erp/sales/${node.id}`
}

const isCurrent = (node: DocumentChainNode) => node.role === 'current'
const isParent = (node: DocumentChainNode) => node.role === 'parent'
</script>

<template>
  <UPopover mode="hover" :open-delay="200" :close-delay="100">
    <UButton
      icon="i-lucide-git-branch"
      color="neutral"
      variant="ghost"
      size="xs"
      title="Ver documentos relacionados"
    />
    <template #content>
      <div class="p-3 min-w-[260px] max-w-[380px]">
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-2">Cadena de documentos</p>
        <div class="space-y-0">
          <div
            v-for="(node, index) in chain"
            :key="node.id"
            class="flex items-start gap-2 relative"
          >
            <!-- Vertical line connector -->
            <div
              v-if="index < chain.length - 1"
              class="absolute left-[9px] top-[22px] w-px h-[calc(100%)] bg-default"
            />
            <!-- Node content -->
            <div
              class="flex items-center gap-2 py-1.5 px-2 rounded-md w-full text-sm transition-colors"
              :class="[
                isCurrent(node) ? 'bg-primary/10 font-medium' : 'hover:bg-default'
              ]"
            >
              <NuxtLink
                :to="getDocLink(node, partyType)"
                class="inline-flex items-center gap-1.5 text-primary hover:underline min-w-0"
              >
                <span :class="[getDocConfig(node.type_code).icon, 'text-xs shrink-0']" />
                <span class="truncate">{{ node.type_code }}-{{ node.number }}</span>
              </NuxtLink>
              <UBadge
                v-if="isCurrent(node)"
                label="movimiento"
                size="xs"
                color="primary"
                variant="soft"
                class="shrink-0"
              />
              <span v-if="node.description" class="text-xs text-muted truncate">
                {{ node.description }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
