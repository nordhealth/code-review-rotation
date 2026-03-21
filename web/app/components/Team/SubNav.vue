<script setup lang="ts">
const props = defineProps<{ teamId: string, teamName: string }>()
const route = useRoute()

const links = computed(() => [
  { name: 'Rotations', to: `/teams/${props.teamId}/developers` },
  { name: 'Members', to: `/teams/${props.teamId}/members` },
  { name: 'Squads', to: `/teams/${props.teamId}/squads` },
  { name: 'Rotate', to: `/teams/${props.teamId}/rotate` },
  { name: 'Settings', to: `/teams/${props.teamId}/settings` },
])

function isActive(link: { name: string, to: string }) {
  if (link.name === 'Rotations') {
    return route.path.endsWith('/developers') || route.path.endsWith('/teams')
  }
  return route.path === link.to
}
</script>

<template>
  <div class="mb-6">
    <div class="mb-4 flex min-h-9 items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ teamName }}
      </h1>
      <slot name="actions" />
    </div>
    <nav class="flex gap-1 border-b">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        :class="{
          '!text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary':
            isActive(link),
        }"
      >
        {{ link.name }}
      </NuxtLink>
    </nav>
  </div>
</template>
