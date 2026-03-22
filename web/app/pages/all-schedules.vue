<script setup lang="ts">
import type { Rotation, Settings, Squad, Team } from '~/types'

useHead({ title: 'All Schedules | Nord Review' })

const { data: globalSettings } = await useFetch<Settings>('/api/settings')
const { data: teams } = await useFetch<Team[]>('/api/teams')

const teamSquads = ref<Map<string, Squad[]>>(new Map())
const teamRotations = ref<Map<string, Rotation[]>>(new Map())

async function loadTeamData() {
  if (!teams.value)
    return
  const entries = await Promise.all(
    teams.value.map(async (team) => {
      const [squads, rotations] = await Promise.all([
        $fetch<Squad[]>(`/api/teams/${team.id}/squads`),
        $fetch<Rotation[]>(`/api/teams/${team.id}/rotations?limit=10`),
      ])
      return { teamId: team.id, squads, rotations }
    }),
  )
  teamSquads.value = new Map(entries.map(entry => [entry.teamId, entry.squads]))
  teamRotations.value = new Map(entries.map(entry => [entry.teamId, entry.rotations]))
}

await loadTeamData()

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function effectiveInterval(teamOverride: number | null, squadOverride?: number | null): number {
  return squadOverride ?? teamOverride ?? globalSettings.value?.defaultRotationIntervalDays ?? 14
}

function effectiveDay(teamOverride: string | null, squadOverride?: string | null): string {
  return squadOverride ?? teamOverride ?? globalSettings.value?.defaultRotationDay ?? 'wednesday'
}

function effectiveTimezone(teamOverride: string | null, squadOverride?: string | null): string {
  return squadOverride ?? teamOverride ?? globalSettings.value?.defaultRotationTimezone ?? 'Europe/Helsinki'
}

function formatInterval(days: number): string {
  if (days >= 365)
    return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}`
  if (days >= 30)
    return `${Math.round(days / 30)} month${days >= 60 ? 's' : ''}`
  return `${days} day${days !== 1 ? 's' : ''}`
}

function isOverridden(value: unknown): boolean {
  return value !== null && value !== undefined
}

function computeNextDate(intervalDays: number, targetDay: string, timezone: string, lastDate: Date): string {
  const candidate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  const targetDayIndex = DAY_INDEX[targetDay] ?? 3
  const candidateDay = candidate.getDay()
  const dayDifference = (targetDayIndex - candidateDay + 7) % 7
  if (dayDifference > 0) {
    candidate.setDate(candidate.getDate() + dayDifference)
  }
  candidate.setHours(4, 0, 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(candidate)
}

function getNextRotationForDevs(team: Team): string | null {
  const rotations = teamRotations.value.get(team.id) ?? []
  const lastDevRotation = rotations.find(rotation => rotation.mode === 'devs')
  if (!lastDevRotation)
    return null
  return computeNextDate(
    effectiveInterval(team.rotationIntervalDays),
    effectiveDay(team.rotationDay),
    effectiveTimezone(team.rotationTimezone),
    new Date(lastDevRotation.date),
  )
}

function getNextRotationForSquad(team: Team, squad: Squad): string | null {
  const rotations = teamRotations.value.get(team.id) ?? []
  const lastTeamsRotation = rotations.find(rotation => rotation.mode === 'teams')
  if (!lastTeamsRotation)
    return null
  return computeNextDate(
    effectiveInterval(team.rotationIntervalDays, squad.rotationIntervalDays),
    effectiveDay(team.rotationDay, squad.rotationDay),
    effectiveTimezone(team.rotationTimezone, squad.rotationTimezone),
    new Date(lastTeamsRotation.date),
  )
}
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      title="All Schedules"
      description="Rotation schedules across all teams and squads. Inherited values come from the team or global defaults."
    />

    <!-- Global defaults summary -->
    <div class="rounded-lg border bg-muted/20 px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span class="font-medium">Global Defaults</span>
          <span class="text-muted-foreground">
            Every {{ formatInterval(globalSettings?.defaultRotationIntervalDays ?? 14) }}
          </span>
          <span class="text-muted-foreground">
            {{ capitalizeFirst(globalSettings?.defaultRotationDay ?? 'wednesday') }}
          </span>
          <span class="text-muted-foreground">
            {{ globalSettings?.defaultRotationTimezone ?? 'Europe/Helsinki' }}
          </span>
        </div>
        <UIButton as-child variant="outline" size="sm" class="h-7 px-2.5 text-xs">
          <NuxtLink to="/settings">
            Edit
          </NuxtLink>
        </UIButton>
      </div>
    </div>

    <!-- Per-team sections -->
    <div v-for="team in teams" :key="team.id" class="space-y-3">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          {{ team.name }}
        </h2>
        <UIButton as-child variant="outline" size="sm" class="h-7 px-2.5 text-xs">
          <NuxtLink :to="`/teams/${team.slug}/settings`">
            Edit
          </NuxtLink>
        </UIButton>
      </div>

      <div class="overflow-x-auto rounded-lg border">
        <UITable>
          <UITableHeader>
            <UITableRow>
              <UITableHead>Target</UITableHead>
              <UITableHead>Interval</UITableHead>
              <UITableHead>Day</UITableHead>
              <UITableHead>Timezone</UITableHead>
              <UITableHead>Next Rotation</UITableHead>
              <UITableHead class="text-right" />
            </UITableRow>
          </UITableHeader>
          <UITableBody>
            <!-- Team row (devs mode) -->
            <UITableRow :class="(teamSquads.get(team.id) ?? []).length ? 'border-b-0' : ''">
              <UITableCell class="font-medium">
                Developers
              </UITableCell>
              <UITableCell>
                {{ formatInterval(effectiveInterval(team.rotationIntervalDays)) }}
                <span
                  v-if="!isOverridden(team.rotationIntervalDays)"
                  class="text-xs italic text-muted-foreground"
                >(global)</span>
              </UITableCell>
              <UITableCell>
                {{ capitalizeFirst(effectiveDay(team.rotationDay)) }}
                <span
                  v-if="!isOverridden(team.rotationDay)"
                  class="text-xs italic text-muted-foreground"
                >(global)</span>
              </UITableCell>
              <UITableCell>
                {{ effectiveTimezone(team.rotationTimezone) }}
                <span
                  v-if="!isOverridden(team.rotationTimezone)"
                  class="text-xs italic text-muted-foreground"
                >(global)</span>
              </UITableCell>
              <UITableCell class="font-medium">
                {{ getNextRotationForDevs(team) ?? '—' }}
              </UITableCell>
              <UITableCell class="text-right">
                <UIButton as-child variant="outline" size="sm" class="h-7 px-2.5 text-xs">
                  <NuxtLink :to="`/teams/${team.slug}/settings`">
                    Edit
                  </NuxtLink>
                </UIButton>
              </UITableCell>
            </UITableRow>

            <!-- Squad rows -->
            <UITableRow
              v-for="(squad, squadIndex) in teamSquads.get(team.id) ?? []"
              :key="squad.id"
              :class="squadIndex < (teamSquads.get(team.id) ?? []).length - 1 ? 'border-b-0' : ''"
              class="text-muted-foreground"
            >
              <UITableCell class="!py-0">
                <div class="flex items-stretch">
                  <div class="relative ml-5 mr-3.5 w-4 self-stretch overflow-visible">
                    <span
                      class="absolute left-0 right-0 border-l border-b border-muted-foreground/40 rounded-bl-md bottom-1/2"
                      :class="[
                        squadIndex === 0 ? '-top-4' : 'top-0',
                      ]"
                    />
                    <span
                      v-if="squadIndex < (teamSquads.get(team.id) ?? []).length - 1"
                      class="absolute left-0 top-1/2 bottom-0 w-px bg-muted-foreground/40"
                    />
                  </div>
                  <span class="py-2 font-medium text-foreground">{{ squad.name }}</span>
                </div>
              </UITableCell>
              <UITableCell>
                {{ formatInterval(effectiveInterval(team.rotationIntervalDays, squad.rotationIntervalDays)) }}
                <span
                  v-if="isOverridden(squad.rotationIntervalDays)"
                  class="text-xs italic"
                >(squad)</span>
                <span
                  v-else-if="isOverridden(team.rotationIntervalDays)"
                  class="text-xs italic"
                >(team)</span>
                <span
                  v-else
                  class="text-xs italic"
                >(global)</span>
              </UITableCell>
              <UITableCell>
                {{ capitalizeFirst(effectiveDay(team.rotationDay, squad.rotationDay)) }}
                <span
                  v-if="isOverridden(squad.rotationDay)"
                  class="text-xs italic"
                >(squad)</span>
                <span
                  v-else-if="isOverridden(team.rotationDay)"
                  class="text-xs italic"
                >(team)</span>
                <span
                  v-else
                  class="text-xs italic"
                >(global)</span>
              </UITableCell>
              <UITableCell>
                {{ effectiveTimezone(team.rotationTimezone, squad.rotationTimezone) }}
                <span
                  v-if="isOverridden(squad.rotationTimezone)"
                  class="text-xs italic"
                >(squad)</span>
                <span
                  v-else-if="isOverridden(team.rotationTimezone)"
                  class="text-xs italic"
                >(team)</span>
                <span
                  v-else
                  class="text-xs italic"
                >(global)</span>
              </UITableCell>
              <UITableCell class="font-medium">
                {{ getNextRotationForSquad(team, squad) ?? '—' }}
              </UITableCell>
              <UITableCell class="text-right">
                <UIButton as-child variant="outline" size="sm" class="h-7 px-2.5 text-xs">
                  <NuxtLink :to="`/teams/${team.slug}/squads/${squad.id}/edit`">
                    Edit
                  </NuxtLink>
                </UIButton>
              </UITableCell>
            </UITableRow>
          </UITableBody>
        </UITable>
      </div>
    </div>

    <div v-if="!teams?.length" class="py-12 text-center text-sm text-muted-foreground">
      No teams configured yet.
    </div>
  </div>
</template>
