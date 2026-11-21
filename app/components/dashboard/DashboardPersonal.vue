<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { DashboardPersonal } from '~/modulos/erp/dashboard/types/dashboard.types'

const props = defineProps<{
  data?: DashboardPersonal
  loading?: boolean
}>()

const agendaTo = computed(() => `/erp/mis-pendientes?date=${encodeURIComponent(props.data?.activityDate ?? '')}`)
const todayEntries = computed(() => props.data?.todayActivities.slice(0, 4) ?? [])
const completedTasks = computed(() => props.data?.completedTasks.slice(0, 2) ?? [])

function entryIcon(kind: string) {
  if (kind === 'checks') return 'i-lucide-landmark'
  if (kind === 'payments') return 'i-lucide-wallet'
  if (kind === 'tasks') return 'i-lucide-list-checks'
  if (kind === 'documents') return 'i-lucide-file-text'
  if (kind === 'products') return 'i-lucide-package'
  return 'i-lucide-plus'
}
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-calendar-check-2" class="size-5 text-primary" />
        <h3 class="text-sm font-semibold">Mi actividad</h3>
      </div>
      <UButton to="/erp/mis-pendientes" label="Ver agenda" icon="i-lucide-arrow-up-right" size="xs" variant="ghost" />
    </template>

    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-14 w-full rounded-lg" />
      <USkeleton class="h-20 w-full rounded-lg" />
    </div>

    <div v-else-if="!data" class="py-4 text-center text-sm text-muted">
      Sin datos disponibles
    </div>

    <div v-else class="space-y-3">
      <div class="grid gap-2" :class="data.tasksEnabled ? 'grid-cols-3' : 'grid-cols-2'">
        <NuxtLink :to="agendaTo" class="min-w-0 rounded-lg bg-muted/30 p-2 text-center transition-colors hover:bg-muted/50">
          <p class="truncate text-lg font-bold text-primary">{{ data.activityCount }}</p>
          <p class="truncate text-[10px] text-muted">Cargaste hoy</p>
        </NuxtLink>
        <NuxtLink v-if="data.tasksEnabled" :to="agendaTo" class="min-w-0 rounded-lg bg-muted/30 p-2 text-center transition-colors hover:bg-muted/50">
          <p class="truncate text-lg font-bold text-success">{{ data.completedTasksCount }}</p>
          <p class="truncate text-[10px] text-muted">Resueltas hoy</p>
        </NuxtLink>
        <NuxtLink :to="{ path: '/erp/mis-pendientes', query: { view: 'pending' } }" class="min-w-0 rounded-lg bg-muted/30 p-2 text-center transition-colors hover:bg-muted/50">
          <p class="truncate text-lg font-bold text-info">{{ data.pendingDocuments }}</p>
          <p class="truncate text-[10px] text-muted">Pendientes</p>
        </NuxtLink>
      </div>

      <div v-if="todayEntries.length">
        <div class="mb-1.5 flex items-center justify-between">
          <h4 class="text-xs font-semibold text-muted">Cargado hoy</h4>
          <span v-if="data.activityHasMore" class="text-[10px] text-muted">{{ data.activityCount }} registros</span>
        </div>
        <div class="space-y-1">
          <NuxtLink
            v-for="activity in todayEntries"
            :key="activity.id"
            :to="activity.to || agendaTo"
            class="group flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/30"
          >
            <UIcon :name="entryIcon(activity.kind)" class="size-4 shrink-0 text-primary" />
            <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ activity.title }}<span v-if="activity.detail" class="font-normal text-muted"> · {{ activity.detail }}</span></span>
            <time class="shrink-0 text-[10px] text-muted">{{ formatTimeAgo(new Date(activity.date)) }}</time>
            <UIcon name="i-lucide-chevron-right" class="size-3 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </NuxtLink>
        </div>
      </div>
      <div v-else class="rounded-md border border-dashed border-default px-3 py-3 text-center text-xs text-muted">
        Todavía no cargaste registros hoy.
      </div>

      <div v-if="completedTasks.length" class="border-t border-default pt-2">
        <h4 class="mb-1 text-xs font-semibold text-muted">Tareas resueltas hoy</h4>
        <NuxtLink v-for="task in completedTasks" :key="task.id" :to="task.to" class="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30">
          <UIcon name="i-lucide-circle-check" class="size-4 shrink-0 text-success" />
          <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ task.title }}<span class="font-normal text-muted"> · {{ task.board }}</span></span>
          <UIcon name="i-lucide-chevron-right" class="size-3 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
        </NuxtLink>
      </div>

      <div class="border-t border-default pt-2">
        <NuxtLink :to="agendaTo" class="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline">
          Abrir agenda del día <UIcon name="i-lucide-arrow-right" class="size-3.5" />
        </NuxtLink>
      </div>
    </div>
  </UPageCard>
</template>
