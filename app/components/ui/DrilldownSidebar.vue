<script setup lang="ts">
import type { DrilldownNode } from '~/data/navigationTree'
import { useDrilldownNavigation } from '~/composables/useDrilldownNavigation'
import { useVersion } from '~/composables/useVersion'

const props = defineProps<{
  open?: boolean
  resizable?: boolean
  withFooter?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:collapsed': [value: boolean]
}>()

const versions = useVersion()
const { stack, currentLevel, isRoot, isActive, back, goHome, select } = useDrilldownNavigation()

const depth = computed(() => stack.value.length - 1)

const parentNode = computed(() => {
  if (depth.value === 0) return null
  const prevLevel = stack.value[stack.value.length - 2]
  const currentArr = stack.value[stack.value.length - 1]
  return prevLevel?.find(n => n.children === currentArr) ?? null
})
</script>

<template>
  <UDashboardSidebar
    collapsible
    :resizable="resizable"
    :open="open"
    class="bg-elevated/25"
    :ui="withFooter ? { footer: 'lg:border-t lg:border-default' } : {}"
    @update:open="emit('update:open', $event)"
    @update:collapsed="emit('update:collapsed', $event)"
  >
    <template #header="{ collapsed }">
      <TeamsMenu :collapsed="collapsed" />
    </template>

    <template #default="{ collapsed }">
      <!-- 👉 MODO COLAPSADO: solo íconos del nivel actual -->
      <div v-if="collapsed" class="flex flex-col gap-0.5 px-2 py-2">
        <UTooltip v-if="!isRoot" text="Volver">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            square
            @click="back"
          />
        </UTooltip>

        <UTooltip
          v-for="item in currentLevel"
          :key="item.label"
          :text="item.label"
        >
          <UButton
            :icon="item.icon || 'i-lucide-circle'"
            variant="ghost"
            color="neutral"
            :square="true"
            :class="{ 'text-primary': isActive(item) }"
            class="w-full justify-center"
            @click="select(item)"
          />
        </UTooltip>
      </div>

      <!-- 👉 MODO EXPANDIDO: niveles con animación push -->
      <div v-else class="flex flex-col h-full">
        <!-- BÚSQUEDA GLOBAL: siempre visible -->
        <UDashboardSearchButton class="bg-transparent ring-default mx-2 mt-2 mb-1 shrink-0" />

        <!-- SLIDER DE NIVELES -->
        <div class="relative overflow-hidden flex-1 min-h-0">
          <div
            class="flex transition-transform duration-300 ease-in-out h-full"
            :style="{ transform: `translateX(${-depth * 100}%)` }"
          >
            <div
              v-for="(level, levelIndex) in stack"
              :key="levelIndex"
              class="w-full shrink-0 flex flex-col min-h-0"
            >
              <!-- HEADER DEL NIVEL -->
              <div v-if="levelIndex > 0" class="px-3 pt-3 pb-1">
                <div class="flex items-center gap-2">
                  <UButton
                    icon="i-lucide-arrow-left"
                    variant="ghost"
                    color="neutral"
                    square
                    size="sm"
                    @click="back"
                  />
                  <UIcon
                    v-if="stack[levelIndex - 1]?.find(n => n.children === level)?.icon"
                    :name="stack[levelIndex - 1].find(n => n.children === level)!.icon!"
                    class="size-4 text-muted shrink-0"
                  />
                  <span class="text-sm font-semibold truncate">
                    {{ stack[levelIndex - 1]?.find(n => n.children === level)?.label || '' }}
                  </span>
                </div>
              </div>

              <!-- ITEMS DEL NIVEL -->
              <div class="flex flex-col overflow-y-auto flex-1 px-2 pb-2 pt-1">
                <UButton
                  v-for="item in level"
                  :key="item.label"
                  :icon="item.icon"
                  variant="ghost"
                  color="neutral"
                  class="group w-full justify-start gap-2 rounded-lg px-2.5 py-2 !ring-0 relative"
                  :class="[
                    isActive(item) ? 'bg-elevated text-primary border-l-2 border-primary rounded-l-none' : 'hover:bg-elevated/50'
                  ]"
                  @click="select(item)"
                >
                  <template #trailing>
                    <UIcon
                      v-if="item.children?.length"
                      name="i-lucide-chevron-right"
                      class="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </template>
                  <span class="flex-1 text-left truncate">{{ item.label }}</span>
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-if="withFooter" #footer="{ collapsed }">
      <div class="flex flex-col w-full">
        <UserMenu :collapsed="collapsed" />

        <div class="py-3 flex justify-center">
          <NuxtLink
            to="/changelog/"
            class="flex items-center text-xs text-muted hover:text-foreground transition-colors"
          >
            <span class="font-medium">v{{ versions.version }}</span>

            <UBadge
              v-if="versions.stage && !collapsed"
              size="xs"
              variant="soft"
              color="neutral"
              class="ml-2 capitalize"
            >
              {{ versions.stage }}
            </UBadge>
          </NuxtLink>
        </div>
      </div>
    </template>
  </UDashboardSidebar>
</template>
