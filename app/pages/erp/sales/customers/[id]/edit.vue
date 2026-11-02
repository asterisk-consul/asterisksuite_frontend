<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { useRoute } from 'vue-router'
import BusinessPartyEditorPage from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyEditorPage.vue'

const route = useRoute()
</script>

<template>
  <BusinessPartyEditorPage party-type="CUSTOMER" :party-id="String(route.params.id)" />
</template>
