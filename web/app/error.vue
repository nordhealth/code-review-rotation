<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage: string
  }
}>()

useHead({ title: `${props.error.statusCode} | Nord Review` })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background px-4">
    <h1 class="text-6xl font-bold text-muted-foreground">
      {{ error.statusCode }}
    </h1>
    <p class="mt-4 text-lg text-muted-foreground">
      {{ error.statusMessage || 'Something went wrong' }}
    </p>
    <UIButton as-child class="mt-8">
      <NuxtLink to="/">
        Back to home
      </NuxtLink>
    </UIButton>
  </div>
</template>
