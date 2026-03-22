<script setup lang="ts">
import { Play } from 'lucide-vue-next'

useHead({ title: 'Developer Rotations | Nord Review' })

const route = useRoute()
const teamId = route.params.id as string

const { data: team } = await useFetch(`/api/teams/${teamId}`)
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'">
      <template #actions>
        <NuxtLink :to="`/teams/${teamId}/rotate`">
          <UIButton>
            <Play class="size-4" />
            Run Rotation
          </UIButton>
        </NuxtLink>
      </template>
    </TeamSubNav>

    <SegmentControl
      :options="[
        { value: 'developers', label: 'Developers', to: `/teams/${teamId}/rotations/developers` },
        { value: 'squads', label: 'Squads', to: `/teams/${teamId}/rotations/squads` },
      ]"
    />

    <TeamRotationList :team-id="teamId" mode="devs" />
  </div>
</template>
