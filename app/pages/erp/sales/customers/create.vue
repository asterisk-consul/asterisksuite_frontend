<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import BusinessPartyEditorPage from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyEditorPage.vue'
</script>

<template>
  <BusinessPartyEditorPage party-type="CUSTOMER" />
</template>
