<script setup lang="ts">
export interface NavigationItem {
  label: string
  to?: string
  badge?: number | string
  icon?: string
}

export interface NavigationSection {
  title: string
  items: NavigationItem[]
}

defineProps<{
  shortcuts?: NavigationItem[]
  sections?: NavigationSection[]
}>()
</script>

<template>
  <UCard>
    <div class="space-y-8">
      <!-- SHORTCUTS -->
      <section v-if="shortcuts?.length">
        <h2 class="text-xl font-semibold mb-4">Atajos</h2>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ULink
            v-for="shortcut in shortcuts"
            :key="shortcut.label"
            :to="shortcut.to"
            class="flex items-center gap-2 hover:text-primary"
          >
            <span>{{ shortcut.label }}</span>

            <UIcon :name="shortcut.icon || 'i-lucide-arrow-up-right'" class="size-4" />
            <UBadge
              v-if="shortcut.badge !== undefined"
              :label="String(shortcut.badge)"
              size="sm"
              variant="solid"
              class="font-bold rounded-full"
            />
          </ULink>
        </div>
      </section>

      <!-- SECTIONS -->
      <section v-if="sections?.length">
        <h2 class="text-xl font-semibold mb-6">Reportes y Maestros</h2>

        <div class="grid md:grid-cols-3 gap-10">
          <div v-for="section in sections" :key="section.title">
            <h3 class="font-semibold text-lg mb-4">
              {{ section.title }}
            </h3>

            <div class="flex flex-col gap-3">
              <ULink v-for="item in section.items" :key="item.label" :to="item.to" class="flex items-center gap-2">
                <span>{{ item.label }}</span>

                <UBadge v-if="item.badge !== undefined" :label="String(item.badge)" size="sm" variant="soft" />

                <UIcon :name="item.icon || 'i-lucide-arrow-up-right'" class="size-3.5 text-muted" />
              </ULink>
            </div>
          </div>
        </div>
      </section>
    </div>
  </UCard>
</template>
