<script setup lang="ts">
import { History, Plus, Settings, Users } from 'lucide-vue-next'

useHead({ title: 'Teams | Nord Review' })

const { data: teams } = await useFetch('/api/teams')
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <PageHeader title="Teams" description="Manage code review rotation teams" />
      <UIButton as-child>
        <NuxtLink to="/teams/new" class="gap-2">
          <Plus class="size-4" />
          <TrimText>New Team</TrimText>
        </NuxtLink>
      </UIButton>
    </div>

    <div v-if="teams?.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="team in teams"
        :key="team.id"
        :to="`/teams/${team.slug}`"
        class="block rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none dark:hover:border-muted-foreground/20 dark:hover:shadow-[0_0_10px_rgb(255_255_255_/_0.05)]"
      >
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="font-semibold">
              {{ team.name }}
            </h3>
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
            <TrimText>Rotations</TrimText>
          </NuxtLink>
          <NuxtLink
            :to="`/teams/${team.slug}/members`"
            class="relative z-10 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            @click.stop
          >
            <Users class="size-3.5" />
            <TrimText>Members</TrimText>
          </NuxtLink>
          <NuxtLink
            :to="`/teams/${team.slug}/settings`"
            class="relative z-10 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            @click.stop
          >
            <Settings class="size-3.5" />
            <TrimText>Settings</TrimText>
          </NuxtLink>
        </div>
      </NuxtLink>
    </div>

    <EmptyState v-else message="No teams yet">
      <template #icon>
        <Users class="mb-3 size-10 text-muted-foreground/50" />
      </template>
      <UIButton as-child size="sm" class="mt-3">
        <NuxtLink to="/teams/new" class="gap-1.5">
          <Plus class="size-4" />
          <TrimText>Create your first team</TrimText>
        </NuxtLink>
      </UIButton>
    </EmptyState>
  </div>
</template>
