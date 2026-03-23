<script setup lang="ts">
import type { Developer, Rotation, RotationAssignment, Settings, Squad, Team, TeamMember } from '~/types'
import {
  CalendarClock,
  Check,
  Clock,
  Play,
  Plus,
  Users,
  X,
} from 'lucide-vue-next'

useHead({ title: 'Squad Rotations | Nord Review' })

const route = useRoute()
const teamId = route.params.id as string

const { data: team } = await useFetch<Team>(`/api/teams/${teamId}`)
const { data: squads } = await useFetch<Squad[]>(`/api/teams/${teamId}/squads`)
const { data: members } = await useFetch<TeamMember[]>(`/api/teams/${teamId}/members`)
const { data: rotations, refresh: refreshRotations } = await useFetch<Rotation[]>(
  `/api/teams/${teamId}/rotations`,
)
const { data: globalSettings } = await useFetch<Settings>('/api/settings')

const teamRotations = computed(() => {
  if (!rotations.value)
    return []
  return rotations.value.filter(rotation => rotation.mode === 'teams')
})

const activeRotation = computed(() => teamRotations.value[0] ?? null)

const assignmentBySquadId = computed(() => {
  const map = new Map<string, RotationAssignment>()
  if (!activeRotation.value)
    return map
  for (const assignment of activeRotation.value.assignments ?? []) {
    if (assignment.targetType === 'squad') {
      map.set(assignment.targetId, assignment)
    }
  }
  return map
})

const allDevelopers = computed(() => {
  if (!members.value)
    return []
  return members.value
    .map(member => member.developer)
    .sort((a: Developer, b: Developer) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    )
})

function developerName(developerId: string) {
  const developer = allDevelopers.value.find(d => d.id === developerId)
  return developer ? `${developer.firstName} ${developer.lastName}` : '?'
}

function developerInitials(developerId: string) {
  const developer = allDevelopers.value.find(d => d.id === developerId)
  return developer ? getInitials(developer.firstName, developer.lastName) : '??'
}

// --- Per-card editing ---
const editingAssignmentId = ref<string | null>(null)
const editReviewerIds = ref<string[]>([])
const openPopoverId = ref<string | null>(null)
const saving = ref(false)

function startEditing(assignment: RotationAssignment) {
  editingAssignmentId.value = assignment.id
  editReviewerIds.value = assignment.reviewers.map(reviewer => reviewer.developer.id)
  openPopoverId.value = null
}

function cancelEditing() {
  editingAssignmentId.value = null
  editReviewerIds.value = []
  openPopoverId.value = null
}

function toggleReviewer(developerId: string) {
  const index = editReviewerIds.value.indexOf(developerId)
  if (index >= 0) {
    editReviewerIds.value.splice(index, 1)
  }
  else {
    editReviewerIds.value.push(developerId)
  }
}

async function saveAssignment(assignment: RotationAssignment) {
  saving.value = true
  try {
    const oldIds = assignment.reviewers.map(reviewer => reviewer.developer.id).sort()
    const sortedNew = [...editReviewerIds.value].sort()
    if (JSON.stringify(oldIds) !== JSON.stringify(sortedNew)) {
      await $fetch(
        `/api/teams/${teamId}/rotations/${assignment.rotationId}/assignments/${assignment.id}`,
        { method: 'PUT', body: { reviewerDeveloperIds: editReviewerIds.value } },
      )
    }
    await refreshRotations()
    cancelEditing()
  }
  catch (error) {
    console.error('Failed to update reviewers:', error)
  }
  finally {
    saving.value = false
  }
}

// --- Search ---
const selectedDeveloperId = ref<string | undefined>()

const filteredSquads = computed(() => {
  if (!squads.value)
    return []
  if (!selectedDeveloperId.value)
    return squads.value
  return squads.value.filter((squad) => {
    const assignment = assignmentBySquadId.value.get(squad.id)
    if (!assignment)
      return false
    return assignment.reviewers.some(
      reviewer => reviewer.developer.id === selectedDeveloperId.value,
    )
  })
})

// --- Next rotation date ---
const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function getNextRotationDate(squad?: Squad): string | null {
  if (!team.value || !globalSettings.value)
    return null

  const lastRotation = teamRotations.value[0]
  if (!lastRotation)
    return null

  const intervalDays
    = squad?.rotationIntervalDays
      ?? team.value.rotationIntervalDays
      ?? globalSettings.value.defaultRotationIntervalDays
  const targetDay
    = squad?.rotationDay
      ?? team.value.rotationDay
      ?? globalSettings.value.defaultRotationDay
  const timezone
    = team.value.rotationTimezone
      ?? globalSettings.value.defaultRotationTimezone

  const lastDate = new Date(lastRotation.date)
  const candidate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  const targetDayIndex = DAY_INDEX[targetDay] ?? 3
  const candidateDay = candidate.getDay()
  const dayDifference = (targetDayIndex - candidateDay + 7) % 7
  if (dayDifference > 0) {
    candidate.setDate(candidate.getDate() + dayDifference)
  }

  candidate.setHours(4, 0, 0, 0)

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(candidate)
}
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

    <template v-if="squads?.length">
      <DeveloperFilter v-model="selectedDeveloperId" :developers="allDevelopers" />

      <div>
        <h1 class="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span class="relative flex size-2.5">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span class="relative inline-flex size-2.5 rounded-full bg-green-500" />
          </span>
          Current rotation{{ (squads?.length ?? 0) !== 1 ? 's' : '' }}
        </h1>
        <p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users class="size-3.5" />
          {{ squads?.length ?? 0 }} squad{{ (squads?.length ?? 0) !== 1 ? 's' : '' }}
        </p>
      </div>

      <!-- Squad table -->
      <div class="overflow-hidden rounded-lg border">
        <!-- Table header -->
        <div class="hidden items-center gap-4 border-b bg-primary/5 px-5 py-2.5 sm:flex">
          <div class="w-64 shrink-0 text-xs font-semibold uppercase tracking-wider text-primary-text">
            Squad
          </div>
          <div class="flex-1 text-xs font-semibold uppercase tracking-wider text-primary-text">
            Reviewers
          </div>
        </div>

        <!-- Squad rows -->
        <div class="divide-y">
          <div
            v-for="squad in filteredSquads"
            :key="squad.id"
            class="transition-colors even:bg-muted/40 hover:bg-muted"
            :class="[getNextRotationDate(squad) ? 'pb-4' : '']"
          >
            <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
              <!-- Squad info cell -->
              <div class="w-64 shrink-0">
                <h3 class="mb-1 text-lg font-semibold">
                  {{ squad.name }}
                </h3>
                <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users class="size-3.5" />
                  {{ squad.reviewerCount }} reviewers • {{ squad.members?.length ?? 0 }} members
                </p>
                <p v-if="assignmentBySquadId.get(squad.id)" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock class="size-3.5" />
                  Last rotated: {{ formatDate(activeRotation!.date) }}
                </p>
                <p v-else class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock class="size-3.5" />
                  Not yet rotated
                </p>
              </div>

              <!-- Reviewers cell -->
              <div class="flex min-w-0 flex-1 flex-wrap items-start gap-1.5">
                <template v-if="assignmentBySquadId.get(squad.id)">
                  <template v-if="editingAssignmentId !== assignmentBySquadId.get(squad.id)!.id">
                    <div class="flex w-full items-start justify-between gap-2">
                      <div class="flex flex-wrap gap-1.5">
                        <template v-if="assignmentBySquadId.get(squad.id)!.reviewers?.length">
                          <NuxtLink
                            v-for="reviewer in assignmentBySquadId.get(squad.id)!.reviewers"
                            :key="reviewer.id"
                            :to="reviewer.developer.slug ? `/developers/${reviewer.developer.slug}` : undefined"
                            class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 text-sm font-medium shadow-sm"
                            :class="[reviewer.developer.slug ? 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80' : '']"
                          >
                            <UIAvatar class="size-6">
                              <UIAvatarFallback
                                class="!text-[9px] !font-semibold !leading-none"
                                :label="getInitials(reviewer.developer.firstName, reviewer.developer.lastName)"
                              >
                                {{ getInitials(reviewer.developer.firstName, reviewer.developer.lastName) }}
                              </UIAvatarFallback>
                            </UIAvatar>
                            <TrimText>{{ reviewer.developer.firstName }} {{ reviewer.developer.lastName }}</TrimText>
                          </NuxtLink>
                        </template>
                        <span v-else class="text-sm text-muted-foreground">No reviewers</span>
                      </div>
                      <UIButton
                        size="sm"
                        variant="outline"
                        type="button"
                        class="h-6 shrink-0 px-2 text-xs"
                        @click="startEditing(assignmentBySquadId.get(squad.id)!)"
                      >
                        Edit
                      </UIButton>
                    </div>
                  </template>

                  <template v-else>
                    <span
                      v-for="developerId in editReviewerIds"
                      :key="developerId"
                      class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary"
                    >
                      <UIAvatar class="size-6">
                        <UIAvatarFallback
                          class="!text-[9px] !font-semibold !leading-none"
                          :label="developerInitials(developerId)"
                        >
                          {{ developerInitials(developerId) }}
                        </UIAvatarFallback>
                      </UIAvatar>
                      <TrimText>{{ developerName(developerId) }}</TrimText>
                      <button
                        type="button"
                        class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                        @click="toggleReviewer(developerId)"
                      >
                        <X class="size-3" />
                      </button>
                    </span>

                    <UIPopover
                      :open="openPopoverId === assignmentBySquadId.get(squad.id)!.id"
                      @update:open="(v: boolean) => (openPopoverId = v ? assignmentBySquadId.get(squad.id)!.id : null)"
                    >
                      <UIPopoverTrigger as-child>
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground"
                        >
                          <Plus class="size-3.5" />
                          Add
                        </button>
                      </UIPopoverTrigger>
                      <UIPopoverContent class="w-56 p-0" align="start">
                        <UICommand>
                          <UICommandInput placeholder="Search developer..." />
                          <UICommandEmpty>No developer found.</UICommandEmpty>
                          <UICommandList>
                            <UICommandGroup>
                              <UICommandItem
                                v-for="developer in allDevelopers"
                                :key="developer.id"
                                :value="`${developer.firstName} ${developer.lastName}`"
                                @select="toggleReviewer(developer.id)"
                              >
                                <div class="flex items-center gap-2">
                                  <div class="flex size-4 items-center justify-center">
                                    <Check
                                      v-if="editReviewerIds.includes(developer.id)"
                                      class="size-3.5"
                                    />
                                  </div>
                                  <UIAvatar class="size-5">
                                    <UIAvatarFallback
                                      class="!text-[8px] !font-semibold !leading-none"
                                      :label="getInitials(developer.firstName, developer.lastName)"
                                    >
                                      {{ getInitials(developer.firstName, developer.lastName) }}
                                    </UIAvatarFallback>
                                  </UIAvatar>
                                  {{ developer.firstName }} {{ developer.lastName }}
                                </div>
                              </UICommandItem>
                            </UICommandGroup>
                          </UICommandList>
                        </UICommand>
                      </UIPopoverContent>
                    </UIPopover>

                    <div class="ml-auto flex items-center gap-1">
                      <UIButton
                        size="sm"
                        variant="default"
                        type="button"
                        :disabled="saving"
                        class="h-6 px-2 text-xs"
                        @click="saveAssignment(assignmentBySquadId.get(squad.id)!)"
                      >
                        {{ saving ? "Saving..." : "Save" }}
                      </UIButton>
                      <UIButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        class="h-6 px-2 text-xs"
                        @click="cancelEditing"
                      >
                        Cancel
                      </UIButton>
                    </div>
                  </template>
                </template>
                <span v-else class="text-sm text-muted-foreground">—</span>
              </div>
            </div>
            <!-- Next rotation banner -->
            <div
              v-if="getNextRotationDate(squad)"
              class="mx-5 flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5"
            >
              <CalendarClock class="size-4 shrink-0 text-muted-foreground" />
              <span class="text-sm text-muted-foreground">Next rotation: </span>
              <span class="text-sm font-medium">{{ getNextRotationDate(squad) }}</span>
            </div>
          </div>
          <p v-if="!filteredSquads.length && selectedDeveloperId" class="px-5 py-4 text-sm text-muted-foreground">
            No squads match the selected developer
          </p>
        </div>
      </div>
    </template>

    <EmptyState v-else message="No squads yet">
      <NuxtLink :to="`/teams/${teamId}/squads/new`">
        <UIButton size="sm" class="mt-3">
          Create your first squad
        </UIButton>
      </NuxtLink>
    </EmptyState>
  </div>
</template>
