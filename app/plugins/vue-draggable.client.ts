import { vDraggable } from 'vue-draggable-plus'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('draggable', vDraggable)
})
