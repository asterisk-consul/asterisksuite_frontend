<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>

<template>
  <div class="mx-auto w-full max-w-2xl space-y-4">
    <UPageCard
      title="Avisos dentro de Asterisk Suite"
      description="Las asignaciones dirigidas a vos y las alertas operativas de tu empresa aparecen en la campana de la barra superior."
      variant="subtle"
    >
      <div class="flex items-start gap-3 text-sm text-muted">
        <UIcon name="i-lucide-bell" class="mt-0.5 size-5 shrink-0 text-primary" />
        <p>Al abrir la campana se actualizan las asignaciones, vencimientos fiscales y avisos de Tesorería disponibles para tus permisos.</p>
      </div>
    </UPageCard>

    <UPageCard
      title="Canales externos"
      description="Email, notificaciones de escritorio y WhatsApp todavía no están conectados a estos avisos."
      variant="subtle"
    />
  </div>
</template>
