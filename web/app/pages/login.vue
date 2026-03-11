<script setup lang="ts">
definePageMeta({ layout: "auth" });

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

async function onSubmit() {
  if (!email.value || !password.value) return;
  loading.value = true;
  errorMessage.value = "";

  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });
    await useUserSession().fetch();
    await navigateTo("/");
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || "Sign in failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-md">
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
      <h1 class="text-2xl font-semibold tracking-tight">ReviewLeash</h1>
      <p class="text-sm text-muted-foreground">Sign in to your account</p>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div
        v-if="errorMessage"
        class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {{ errorMessage }}
      </div>

      <div class="space-y-2">
        <UILabel for="login-email">Email</UILabel>
        <EmailInput
          id="login-email"
          v-model="email"
          autocomplete="email"
          :disabled="loading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <UILabel for="login-password">Password</UILabel>
          <NuxtLink
            to="/forgot-password"
            class="text-sm text-muted-foreground hover:text-primary"
          >
            Forgot password?
          </NuxtLink>
        </div>
        <UIInput
          id="login-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          :disabled="loading"
          placeholder="Enter your password"
        />
      </div>

      <UIButton
        type="submit"
        :disabled="loading || !email || !password"
        class="w-full"
      >
        {{ loading ? "Signing in..." : "Sign in" }}
      </UIButton>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      Don't have an account?
      <NuxtLink to="/register" class="font-medium text-primary hover:underline">
        Create account
      </NuxtLink>
    </p>
  </div>
</template>
