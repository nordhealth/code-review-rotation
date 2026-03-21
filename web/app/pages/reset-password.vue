<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const success = ref(false)

const token = computed(() => (route.query.token as string) || '')

async function onSubmit() {
  if (!token.value || !password.value)
    return
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    success.value = true
  }
  catch (error) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message || 'Password reset failed'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-md">
    <div class="space-y-1 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">
        Reset password
      </h1>
      <p class="text-sm text-muted-foreground">
        Enter your new password
      </p>
    </div>

    <div v-if="!token" class="space-y-4">
      <div
        class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        Missing reset token. Please use the link from your email.
      </div>
      <UIButton as-child variant="outline" class="w-full">
        <NuxtLink to="/forgot-password">
          Request new reset link
        </NuxtLink>
      </UIButton>
    </div>

    <div v-else-if="success" class="space-y-4">
      <div
        class="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        Password updated successfully!
      </div>
      <UIButton as-child class="w-full">
        <NuxtLink to="/login">
          Sign in
        </NuxtLink>
      </UIButton>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div
        v-if="errorMessage"
        class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {{ errorMessage }}
      </div>

      <div class="space-y-2">
        <UILabel for="reset-password">
          New password
        </UILabel>
        <UIInput
          id="reset-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          :disabled="loading"
          placeholder="Min. 8 characters"
        />
      </div>

      <div class="space-y-2">
        <UILabel for="reset-confirm">
          Confirm password
        </UILabel>
        <UIInput
          id="reset-confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          :disabled="loading"
          placeholder="Repeat your password"
        />
      </div>

      <UIButton
        type="submit"
        :disabled="loading || !password || !confirmPassword"
        class="w-full"
      >
        {{ loading ? "Updating..." : "Update password" }}
      </UIButton>
    </form>
  </div>
</template>
