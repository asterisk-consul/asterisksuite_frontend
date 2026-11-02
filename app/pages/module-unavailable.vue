<script setup lang="ts">
import { usePlatformModulesStore } from '~/modulos/platform-modules/platform-modules.store'

const route = useRoute()
const modules = usePlatformModulesStore()
const moduleCode = computed(() => String(route.query.module ?? ''))
const current = computed(() => modules.modules.find((item) => item.code === moduleCode.value))

definePageMeta({ middleware: ['auth'] })
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-xl items-center px-6">
    <UCard class="w-full">
      <div class="space-y-4 text-center">
        <UIcon name="i-lucide-lock-keyhole" class="mx-auto size-12 text-warning" />
        <div>
          <h1 class="text-xl font-semibold">Módulo no disponible</h1>
          <p class="mt-2 text-sm text-muted">
            {{ current?.reason || 'Esta función no está incluida en el plan activo de la empresa.' }}
          </p>
        </div>
        <div class="flex justify-center gap-2">
          <UButton label="Volver al inicio" icon="i-lucide-house" to="/" />
          <UButton label="Ver configuración" variant="outline" to="/settings" />
        </div>
      </div>
    </UCard>
  </div>
</template>
