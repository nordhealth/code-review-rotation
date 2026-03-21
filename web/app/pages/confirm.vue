<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const confirmed = ref(false)

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    errorMessage.value = 'Missing confirmation token'
    loading.value = false
    return
  }

  try {
    await $fetch('/api/auth/confirm', {
      method: 'POST',
      body: { token },
    })
    confirmed.value = true
  }
  catch (error) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message || 'Confirmation failed'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-md">
    <div class="space-y-1 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">
        Confirm account
      </h1>
    </div>

    <div v-if="loading" class="py-4 text-center text-sm text-muted-foreground">
      Confirming your account...
    </div>

    <div v-else-if="confirmed" class="space-y-4">
      <div
        class="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        Email confirmed successfully! You can now sign in.
      </div>
      <UIButton as-child class="w-full">
        <NuxtLink to="/login">
          Sign in
        </NuxtLink>
      </UIButton>
    </div>

    <div v-else class="space-y-4">
      <div
        class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {{ errorMessage }}
      </div>
      <UIButton as-child variant="outline" class="w-full">
        <NuxtLink to="/register">
          Back to register
        </NuxtLink>
      </UIButton>
    </div>
  </div>
</template>
