<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'

const auth = useAuthStore()
const toast = useToast()

const fileRef = ref<HTMLInputElement>()

const profileSchema = z.object({
  name: z.string().min(2, 'Muy corto'),
  email: z.string().email('Email inválido'),
  avatar: z.string().optional(),
  bio: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

// ✅ Estado basado en el usuario real
const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  email: '',
  avatar: undefined,
  bio: undefined
})

// ✅ Cargar datos reales
onMounted(async () => {
  if (!auth.user) {
    await auth.fetchMe()
  }

  if (auth.user) {
    profile.name = auth.user.name
    profile.email = auth.user.email
  }
})

// ✅ Submit (por ahora mock hasta que tengas endpoint)
async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    // 🔥 cuando tengas endpoint:
    // await authService.updateProfile(event.data)

    toast.add({
      title: 'Perfil actualizado',
      description: 'Los cambios fueron guardados',
      color: 'success'
    })

    console.log('DATA A ENVIAR:', event.data)
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message || 'No se pudo actualizar',
      color: 'error'
    })
  }
}

// Avatar
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) return

  profile.avatar = URL.createObjectURL(input.files[0]!)
}

function onFileClick() {
  fileRef.value?.click()
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Mi perfil"
      description="Actualizá tus datos personales y la información visible en el sistema."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Guardar cambios"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="Nombre"
        description="Se mostrará en comprobantes y comunicaciones."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.name" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        label="Correo electrónico"
        description="Se utiliza para ingresar y recibir comunicaciones."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.email" type="email" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="username"
        label="Nombre de usuario"
        description="Identificación utilizada dentro del sistema."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.name" type="username" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="avatar"
        label="Imagen de perfil"
        description="JPG, GIF o PNG de hasta 1 MB."
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar :src="profile.avatar" :alt="profile.name" size="lg" />
          <UButton label="Seleccionar" color="neutral" @click="onFileClick" />
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            accept=".jpg, .jpeg, .png, .gif"
            @change="onFileChange"
          />
        </div>
      </UFormField>
      <USeparator />
      <UFormField
        name="bio"
        label="Descripción"
        description="Información breve y opcional sobre tu perfil."
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea v-model="profile.bio" :rows="5" autoresize class="w-full" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
