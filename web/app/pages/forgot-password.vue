<script setup lang="ts">
definePageMeta({ layout: "auth" });

const email = ref("");
const loading = ref(false);
const errorMessage = ref("");
const success = ref(false);
const devResetToken = ref("");

async function onSubmit() {
  if (!email.value) return;
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await $fetch("/api/auth/forgot-password", {
      method: "POST",
      body: { email: email.value },
    });
    success.value = true;
    if ("resetToken" in result) {
      devResetToken.value = (result as any).resetToken;
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || "Something went wrong";
  } finally {
    loading.value = false;
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
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 class="text-2xl font-semibold tracking-tight">Forgot password</h1>
      <p class="text-sm text-muted-foreground">Enter your email and we'll send you a reset link</p>
    </div>

    <div v-if="success" class="space-y-4">
      <div
        class="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        <p>If an account exists with that email, a reset link has been sent.</p>
        <p class="mt-1 text-xs">Check the server console for the link (dev mode).</p>
      </div>

      <UIButton v-if="devResetToken" as-child class="w-full">
        <NuxtLink :to="`/reset-password?token=${devResetToken}`">
          Reset password (dev shortcut)
        </NuxtLink>
      </UIButton>

      <UIButton as-child variant="outline" class="w-full">
        <NuxtLink to="/login">Back to sign in</NuxtLink>
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
        <UILabel for="forgot-email">Email</UILabel>
        <EmailInput
          id="forgot-email"
          v-model="email"
          autocomplete="email"
          :disabled="loading"
        />
      </div>

      <UIButton
        type="submit"
        :disabled="loading || !email"
        class="w-full"
      >
        {{ loading ? "Sending..." : "Send reset link" }}
      </UIButton>
    </form>

    <p v-if="!success" class="text-center text-sm text-muted-foreground">
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">
        Back to sign in
      </NuxtLink>
    </p>
  </div>
</template>
