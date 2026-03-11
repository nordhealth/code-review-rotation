<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <NuxtLoadingIndicator color="#7c3aed" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <Toaster rich-colors position="bottom-right" />
  </ClientOnly>
</template>
