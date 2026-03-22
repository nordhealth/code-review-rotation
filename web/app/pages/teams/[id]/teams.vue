<script setup lang="ts">
import { Play } from 'lucide-vue-next'

useHead({ title: 'Squad Rotations | Nord Review' })

const route = useRoute()
const teamId = route.params.id as string

const { data: team } = await useFetch(`/api/teams/${teamId}`)
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'">
      <template #actions>
        <NuxtLink :to="`/teams/${teamId}/rotate`">
          <UIButton size="sm">
            <Play class="size-4" />
            Run Rotation
          </UIButton>
        </NuxtLink>
      </template>
    </TeamSubNav>

    <div class="flex gap-1 rounded-lg bg-muted p-1 w-fit">
      <NuxtLink
        :to="`/teams/${teamId}/developers`"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
      >
        <TrimText>Developers</TrimText>
      </NuxtLink>
      <NuxtLink
        :to="`/teams/${teamId}/teams`"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-background text-foreground shadow-sm"
      >
        <TrimText>Squads</TrimText>
      </NuxtLink>
    </div>

    <TeamRotationList :team-id="teamId" mode="teams" />
  </div>
</template>
