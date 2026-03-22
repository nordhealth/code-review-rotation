<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const email = ref((route.query.email as string) ?? '')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const loading = ref(false)
const errorMessage = ref('')
const success = ref(false)
const devConfirmToken = ref('')

async function onSubmit() {
  if (!email.value || !password.value || !firstName.value || !lastName.value)
    return
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        firstName: firstName.value,
        lastName: lastName.value,
      },
    })
    success.value = true
    // In dev mode, the API returns the confirmation token for convenience
    if ('confirmationToken' in result) {
      devConfirmToken.value = (result as { confirmationToken: string }).confirmationToken
    }
  }
  catch (error) {
    errorMessage.value = extractErrorMessage(error, 'Registration failed')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-md">
    <div class="space-y-1 text-center">
      <div
        class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Create account
      </h1>
      <p class="text-sm text-muted-foreground">
        Only @nordhealth.com and @provet.com emails
      </p>
    </div>

    <!-- Success state -->
    <div v-if="success" class="space-y-4">
      <div
        class="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        <p class="font-medium">
          Account created!
        </p>
        <p class="mt-1">
          Please check the server console for the confirmation link.
        </p>
      </div>

      <UIButton v-if="devConfirmToken" as-child class="w-full">
        <NuxtLink :to="`/confirm?token=${devConfirmToken}`">
          <TrimText>Confirm account (dev shortcut)</TrimText>
        </NuxtLink>
      </UIButton>

      <UIButton as-child variant="outline" class="w-full">
        <NuxtLink to="/login">
          <TrimText>Back to sign in</TrimText>
        </NuxtLink>
      </UIButton>
    </div>

    <!-- Registration form -->
    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div
        v-if="errorMessage"
        class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {{ errorMessage }}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <UILabel for="register-firstname">
            First name
          </UILabel>
          <UIInput
            id="register-firstname"
            v-model="firstName"
            type="text"
            :disabled="loading"
            autocomplete="given-name"
            placeholder="João"
          />
        </div>
        <div class="space-y-2">
          <UILabel for="register-lastname">
            Last name
          </UILabel>
          <UIInput
            id="register-lastname"
            v-model="lastName"
            type="text"
            :disabled="loading"
            autocomplete="family-name"
            placeholder="Gonçalves"
          />
        </div>
      </div>

      <div class="space-y-2">
        <UILabel for="register-email">
          Email
        </UILabel>
        <EmailInput
          id="register-email"
          v-model="email"
          autocomplete="email"
          :disabled="loading"
        />
      </div>

      <div class="space-y-2">
        <UILabel for="register-password">
          Password
        </UILabel>
        <PasswordInput
          id="register-password"
          v-model="password"
          autocomplete="new-password"
          :disabled="loading"
          placeholder="Min. 8 characters"
        />
      </div>

      <UIButton
        type="submit"
        :disabled="loading || !email || !password || !firstName || !lastName"
        class="w-full"
      >
        {{ loading ? "Creating account..." : "Create account" }}
      </UIButton>
    </form>

    <p v-if="!success" class="text-center text-sm text-muted-foreground">
      Already have an account?
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
