<script setup lang="ts">
import { Plus, Users, Settings, History } from 'lucide-vue-next'

const { data: teams, refresh } = useFetch('/api/teams')
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Teams</h1>
        <p class="text-sm text-muted-foreground">Manage code review rotation teams</p>
      </div>
      <NuxtLink
        to="/teams/new"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus class="size-4" />
        New Team
      </NuxtLink>
    </div>

    <div v-if="teams?.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="team in teams"
        :key="team.id"
        :to="`/teams/${team.slug}`"
        class="block rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="font-semibold">{{ team.name }}</h3>
            <p class="text-sm text-muted-foreground">
              {{ team.memberCount }} member{{ team.memberCount !== 1 ? 's' : '' }}
              · {{ team.defaultReviewerCount }} reviewers
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            :to="`/teams/${team.slug}`"
            class="relative z-10 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            @click.stop
          >
            <History class="size-3.5" />
            Rotations
          </NuxtLink>
          <NuxtLink
            :to="`/teams/${team.slug}/members`"
            class="relative z-10 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            @click.stop
          >
            <Users class="size-3.5" />
            Members
          </NuxtLink>
          <NuxtLink
            :to="`/teams/${team.slug}/settings`"
            class="relative z-10 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            @click.stop
          >
            <Settings class="size-3.5" />
            Settings
          </NuxtLink>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
      <Users class="mb-3 size-10 text-muted-foreground/50" />
      <p class="text-sm text-muted-foreground">No teams yet</p>
      <NuxtLink
        to="/teams/new"
        class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus class="size-4" />
        Create your first team
      </NuxtLink>
    </div>
  </div>
</template>
