<script setup lang="ts">
import type { Developer, Rotation, Settings, Squad, Team, TeamMember } from '~/types'
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Users,
  X,
} from 'lucide-vue-next'

const props = defineProps<{
  teamId: string
  mode: 'devs' | 'teams'
}>()

const { data: rotations, refresh: refreshRotations } = await useFetch<Rotation[]>(
  `/api/teams/${props.teamId}/rotations`,
)
const { data: members } = await useFetch<TeamMember[]>(`/api/teams/${props.teamId}/members`)
const { data: team } = await useFetch<Team>(`/api/teams/${props.teamId}`)
const { data: globalSettings } = await useFetch<Settings>('/api/settings')
const { data: squads } = await useFetch<Squad[]>(`/api/teams/${props.teamId}/squads`)

const filteredRotations = computed(() => {
  if (!rotations.value)
    return []
  return rotations.value.filter(rotation => rotation.mode === props.mode)
})

const activeRotation = computed(() => filteredRotations.value[0] ?? null)
const pastRotations = computed(() => filteredRotations.value.slice(1))

const expandedRotations = ref<Set<string>>(new Set())
const historyOpen = ref(false)

watch(historyOpen, (open) => {
  if (open && expandedRotations.value.size === 0 && pastRotations.value.length > 0) {
    expandedRotations.value.add(pastRotations.value[0].id)
  }
})

const isEditing = ref(false)
const editState = ref<Map<string, string[]>>(new Map())
const openPopoverId = ref<string | null>(null)
const saving = ref(false)

function startEditing() {
  if (!activeRotation.value)
    return
  isEditing.value = true
  editState.value = new Map()
  for (const a of activeRotation.value.assignments ?? []) {
    editState.value.set(
      a.id,
      a.reviewers.map(reviewer => reviewer.developer.id),
    )
  }
}

function cancelEditing() {
  isEditing.value = false
  editState.value = new Map()
  openPopoverId.value = null
}

watch(
  () => props.mode,
  () => cancelEditing(),
)

function getEditReviewerIds(assignmentId: string): string[] {
  return editState.value.get(assignmentId) ?? []
}

function toggleReviewer(assignmentId: string, developerId: string) {
  const ids = [...(editState.value.get(assignmentId) ?? [])]
  const idx = ids.indexOf(developerId)
  if (idx >= 0) {
    ids.splice(idx, 1)
  }
  else {
    ids.push(developerId)
  }
  editState.value.set(assignmentId, ids)
}

async function saveAll() {
  if (!activeRotation.value)
    return
  saving.value = true
  try {
    for (const assignment of activeRotation.value.assignments ?? []) {
      const newIds = editState.value.get(assignment.id)
      if (!newIds)
        continue
      const oldIds = assignment.reviewers.map(reviewer => reviewer.developer.id).sort()
      const sortedNew = [...newIds].sort()
      if (JSON.stringify(oldIds) !== JSON.stringify(sortedNew)) {
        await $fetch(
          `/api/teams/${props.teamId}/rotations/${assignment.rotationId}/assignments/${assignment.id}`,
          { method: 'PUT', body: { reviewerDeveloperIds: newIds } },
        )
      }
    }
    await refreshRotations()
    cancelEditing()
  }
  catch (err) {
    console.error('Failed to update reviewers:', err)
  }
  finally {
    saving.value = false
  }
}

function toggleExpanded(rotationId: string) {
  if (expandedRotations.value.has(rotationId)) {
    expandedRotations.value.delete(rotationId)
  }
  else {
    expandedRotations.value.clear()
    expandedRotations.value.add(rotationId)
  }
}

const allDevelopers = computed(() => {
  if (!members.value)
    return []
  return members.value
    .map(member => member.developer)
    .sort((a: Developer, b: Developer) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    )
})

function devName(devId: string) {
  const d = allDevelopers.value.find(developer => developer.id === devId)
  return d ? `${d.firstName} ${d.lastName}` : '?'
}

function devInitials(devId: string) {
  const d = allDevelopers.value.find(developer => developer.id === devId)
  return d ? getInitials(d.firstName, d.lastName) : '??'
}

const summaryLabel = computed(() => {
  if (!team.value)
    return ''
  const reviewerPart = `${team.value.defaultReviewerCount} reviewer${team.value.defaultReviewerCount !== 1 ? 's' : ''}`
  const memberCount = members.value?.length ?? 0
  const memberPart = `${memberCount} member${memberCount !== 1 ? 's' : ''}`
  return `${reviewerPart} • ${memberPart}`
})

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function getNextRotationDate(squadId?: string): string | null {
  if (!team.value || !globalSettings.value)
    return null

  const lastRotation = filteredRotations.value[0]
  if (!lastRotation)
    return null

  const squadOverride = squadId
    ? squads.value?.find(squad => squad.id === squadId)
    : undefined

  const intervalDays
    = squadOverride?.rotationIntervalDays
      ?? team.value.rotationIntervalDays
      ?? globalSettings.value.defaultRotationIntervalDays
  const targetDay
    = squadOverride?.rotationDay
      ?? team.value.rotationDay
      ?? globalSettings.value.defaultRotationDay
  const timezone
    = squadOverride?.rotationTimezone
      ?? team.value.rotationTimezone
      ?? globalSettings.value.defaultRotationTimezone

  const lastDate = new Date(lastRotation.date)
  const candidate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  // Align to the target day of week
  const targetDayIndex = DAY_INDEX[targetDay] ?? 3
  const candidateDay = candidate.getDay()
  const dayDifference = (targetDayIndex - candidateDay + 7) % 7
  if (dayDifference > 0) {
    candidate.setDate(candidate.getDate() + dayDifference)
  }

  // Hardcoded rotation time: 04:00
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

const nextRotationDate = computed(() => {
  if (props.mode === 'teams')
    return null
  return getNextRotationDate()
})

const selectedDeveloperId = ref<string | undefined>()

const selectedDeveloperName = computed(() => {
  if (!selectedDeveloperId.value)
    return ''
  const developer = allDevelopers.value.find(d => d.id === selectedDeveloperId.value)
  return developer ? `${developer.firstName} ${developer.lastName}` : ''
})

const filteredAssignments = computed(() => {
  const assignments = activeRotation.value?.assignments
  if (!assignments)
    return []
  if (!selectedDeveloperId.value)
    return assignments
  return assignments.filter((assignment) => {
    const targetMatch = assignment.targetId === selectedDeveloperId.value
    const reviewerMatch = assignment.reviewers?.some(
      reviewer => reviewer.developer.id === selectedDeveloperId.value,
    )
    return targetMatch || reviewerMatch
  })
})
</script>

<template>
  <template v-if="filteredRotations.length">
    <!-- Developer filter -->
    <DeveloperFilter v-model="selectedDeveloperId" :developers="allDevelopers" data-testid="rotation-search" />

    <!-- Title + last rotated + edit controls -->
    <div v-if="activeRotation" class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span class="relative flex size-2.5">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span class="relative inline-flex size-2.5 rounded-full bg-green-500" />
          </span>
          Current rotation
        </h1>
        <p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users class="size-3.5" />
          {{ summaryLabel }}
        </p>
        <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock class="size-3.5" />
          Last rotated: {{ formatDate(activeRotation.date) }}
          <span
            v-if="activeRotation.isManual"
            class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs"
          >Manual</span>
        </p>
      </div>
    </div>

    <!-- Active rotation -->
    <div v-if="activeRotation" class="overflow-hidden rounded-lg border">
      <div v-if="filteredAssignments.length">
        <!-- Developer mode: table layout -->
        <template v-if="mode === 'devs'">
          <!-- Column headers -->
          <div class="hidden items-center gap-4 border-b bg-primary/5 px-5 py-2.5 sm:flex">
            <div class="w-48 shrink-0 text-xs font-semibold uppercase tracking-wider text-primary-text">
              Developer
            </div>
            <div class="flex-1 text-xs font-semibold uppercase tracking-wider text-primary-text">
              Reviewers
            </div>
            <div class="ml-auto flex items-center gap-1">
              <template v-if="!isEditing">
                <UIButton
                  size="sm"
                  variant="outline"
                  type="button"
                  class="h-6 px-2 text-xs"
                  @click="startEditing"
                >
                  Edit
                </UIButton>
              </template>
              <template v-else>
                <UIButton
                  size="sm"
                  variant="default"
                  type="button"
                  :disabled="saving"
                  class="h-6 px-2 text-xs"
                  @click="saveAll"
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
              </template>
            </div>
          </div>

          <div
            v-for="assignment in filteredAssignments"
            :key="assignment.id"
            class="flex items-start gap-2 border-b px-5 py-2 leading-[2.0625rem] last:border-b-0 transition-colors even:bg-muted/40 hover:bg-muted sm:gap-4"
          >
            <div class="w-28 shrink-0 pt-0.5 sm:w-48">
              <NuxtLink
                v-if="assignment.targetSlug"
                :to="`/developers/${assignment.targetSlug}`"
                class="text-sm font-semibold leading-6 hover:underline"
              >
                {{ assignment.targetName ?? assignment.targetId }}
              </NuxtLink>
              <span v-else class="text-sm font-semibold leading-6">
                {{ assignment.targetName ?? assignment.targetId }}
              </span>
            </div>

            <div class="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
              <template v-if="!isEditing">
                <span class="text-xs font-medium text-muted-foreground sm:hidden">Reviewers:</span>
                <template v-if="assignment.reviewers?.length">
                  <NuxtLink
                    v-for="reviewer in assignment.reviewers"
                    :key="reviewer.id"
                    :to="
                      reviewer.developer.slug ? `/developers/${reviewer.developer.slug}` : undefined
                    "
                    class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 text-sm font-medium shadow-sm" :class="[
                      reviewer.developer.slug
                        ? 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80'
                        : '',
                    ]"
                  >
                    <UIAvatar class="size-6">
                      <UIAvatarFallback
                        class="!text-[9px] !font-semibold !leading-none"
                        :label="
                          getInitials(reviewer.developer.firstName, reviewer.developer.lastName)
                        "
                      >
                        {{ getInitials(reviewer.developer.firstName, reviewer.developer.lastName) }}
                      </UIAvatarFallback>
                    </UIAvatar>
                    <TrimText>{{ reviewer.developer.firstName }} {{ reviewer.developer.lastName }}</TrimText>
                  </NuxtLink>
                </template>
                <span v-else class="text-sm text-muted-foreground">No reviewers</span>
              </template>

              <template v-else>
                <span
                  v-for="devId in getEditReviewerIds(assignment.id)"
                  :key="devId"
                  class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary"
                >
                  <UIAvatar class="size-6">
                    <UIAvatarFallback
                      class="!text-[9px] !font-semibold !leading-none"
                      :label="devInitials(devId)"
                    >{{ devInitials(devId) }}</UIAvatarFallback>
                  </UIAvatar>
                  <TrimText>{{ devName(devId) }}</TrimText>
                  <button
                    type="button"
                    class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    @click="toggleReviewer(assignment.id, devId)"
                  >
                    <X class="size-3" />
                  </button>
                </span>

                <UIPopover
                  :open="openPopoverId === assignment.id"
                  @update:open="(v: boolean) => (openPopoverId = v ? assignment.id : null)"
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
                            v-for="dev in allDevelopers"
                            :key="dev.id"
                            :value="`${dev.firstName} ${dev.lastName}`"
                            @select="toggleReviewer(assignment.id, dev.id)"
                          >
                            <div class="flex items-center gap-2">
                              <div class="flex size-4 items-center justify-center">
                                <Check
                                  v-if="getEditReviewerIds(assignment.id).includes(dev.id)"
                                  class="size-3.5"
                                />
                              </div>
                              <UIAvatar class="size-5">
                                <UIAvatarFallback
                                  class="!text-[8px] !font-semibold !leading-none"
                                  :label="getInitials(dev.firstName, dev.lastName)"
                                >
                                  {{ getInitials(dev.firstName, dev.lastName) }}
                                </UIAvatarFallback>
                              </UIAvatar>
                              {{ dev.firstName }} {{ dev.lastName }}
                            </div>
                          </UICommandItem>
                        </UICommandGroup>
                      </UICommandList>
                    </UICommand>
                  </UIPopoverContent>
                </UIPopover>
              </template>
            </div>
          </div>
        </template>

        <!-- Squads mode: card layout -->
        <template v-else>
          <div
            v-for="assignment in filteredAssignments"
            :key="assignment.id"
            class="border-b px-5 py-4 last:border-b-0 space-y-3"
          >
            <h3 class="text-lg font-semibold">
              {{ assignment.targetName ?? assignment.targetId }}
            </h3>

            <div>
              <p class="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reviewers
              </p>
              <div class="flex flex-wrap gap-1.5">
                <template v-if="!isEditing">
                  <template v-if="assignment.reviewers?.length">
                    <NuxtLink
                      v-for="reviewer in assignment.reviewers"
                      :key="reviewer.id"
                      :to="
                        reviewer.developer.slug ? `/developers/${reviewer.developer.slug}` : undefined
                      "
                      class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2 py-1 text-xs font-medium shadow-sm" :class="[
                        reviewer.developer.slug
                          ? 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80'
                          : '',
                      ]"
                    >
                      <UIAvatar class="size-5">
                        <UIAvatarFallback
                          class="!text-[8px] !font-semibold !leading-none"
                          :label="
                            getInitials(reviewer.developer.firstName, reviewer.developer.lastName)
                          "
                        >
                          {{ getInitials(reviewer.developer.firstName, reviewer.developer.lastName) }}
                        </UIAvatarFallback>
                      </UIAvatar>
                      <TrimText>{{ reviewer.developer.firstName }} {{ reviewer.developer.lastName }}</TrimText>
                    </NuxtLink>
                  </template>
                  <span v-else class="text-xs text-muted-foreground">No reviewers</span>
                </template>

                <template v-else>
                  <span
                    v-for="devId in getEditReviewerIds(assignment.id)"
                    :key="devId"
                    class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  >
                    <UIAvatar class="size-5">
                      <UIAvatarFallback
                        class="!text-[8px] !font-semibold !leading-none"
                        :label="devInitials(devId)"
                      >{{ devInitials(devId) }}</UIAvatarFallback>
                    </UIAvatar>
                    <TrimText>{{ devName(devId) }}</TrimText>
                    <button
                      type="button"
                      class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                      @click="toggleReviewer(assignment.id, devId)"
                    >
                      <X class="size-3" />
                    </button>
                  </span>

                  <UIPopover
                    :open="openPopoverId === assignment.id"
                    @update:open="(v: boolean) => (openPopoverId = v ? assignment.id : null)"
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
                              v-for="dev in allDevelopers"
                              :key="dev.id"
                              :value="`${dev.firstName} ${dev.lastName}`"
                              @select="toggleReviewer(assignment.id, dev.id)"
                            >
                              <div class="flex items-center gap-2">
                                <div class="flex size-4 items-center justify-center">
                                  <Check
                                    v-if="getEditReviewerIds(assignment.id).includes(dev.id)"
                                    class="size-3.5"
                                  />
                                </div>
                                <UIAvatar class="size-5">
                                  <UIAvatarFallback
                                    class="!text-[8px] !font-semibold !leading-none"
                                    :label="getInitials(dev.firstName, dev.lastName)"
                                  >
                                    {{ getInitials(dev.firstName, dev.lastName) }}
                                  </UIAvatarFallback>
                                </UIAvatar>
                                {{ dev.firstName }} {{ dev.lastName }}
                              </div>
                            </UICommandItem>
                          </UICommandGroup>
                        </UICommandList>
                      </UICommand>
                    </UIPopoverContent>
                  </UIPopover>
                </template>
              </div>
            </div>

            <div
              v-if="assignment.targetType === 'squad' && getNextRotationDate(assignment.targetId)"
              class="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5"
            >
              <CalendarClock class="size-4 text-muted-foreground" />
              <span class="text-sm text-muted-foreground">Next rotation: </span>
              <span class="text-sm font-medium">{{ getNextRotationDate(assignment.targetId) }}</span>
            </div>
          </div>
        </template>
      </div>
      <p v-else-if="selectedDeveloperId && activeRotation.assignments?.length" class="px-5 py-4 text-sm text-muted-foreground">
        No assignments matching "{{ selectedDeveloperName }}"
      </p>
      <p v-else class="px-5 py-4 text-sm text-muted-foreground">
        No assignments for this rotation
      </p>
    </div>

    <!-- Next rotation banner -->
    <div
      v-if="nextRotationDate"
      class="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5"
    >
      <CalendarClock class="size-4 text-muted-foreground" />
      <TrimText>
        <span class="text-sm text-muted-foreground">Next rotation: </span>
        <span class="text-sm font-medium">{{ nextRotationDate }}</span>
      </TrimText>
    </div>

    <!-- Past rotations -->
    <div v-if="pastRotations.length" class="overflow-hidden rounded-lg border">
      <button
        type="button"
        :aria-expanded="historyOpen"
        class="flex w-full items-center gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        @click="historyOpen = !historyOpen"
      >
        <ChevronDown v-if="historyOpen" class="size-4 shrink-0 text-muted-foreground" />
        <ChevronRight v-else class="size-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium text-muted-foreground">History</span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ pastRotations.length }} past rotation{{ pastRotations.length !== 1 ? "s" : "" }}
        </span>
      </button>

      <div v-if="historyOpen">
        <div v-for="rotation in pastRotations" :key="rotation.id">
          <button
            type="button"
            :aria-expanded="expandedRotations.has(rotation.id)"
            class="flex w-full items-center gap-3 border-t px-5 py-2.5 text-left transition-colors hover:bg-muted/30"
            @click="toggleExpanded(rotation.id)"
          >
            <ChevronDown
              v-if="expandedRotations.has(rotation.id)"
              class="size-3.5 shrink-0 text-muted-foreground transition-transform"
            />
            <ChevronRight
              v-else
              class="size-3.5 shrink-0 text-muted-foreground transition-transform"
            />

            <span class="text-sm font-medium">{{ formatDate(rotation.date) }}</span>

            <span
              v-if="rotation.isManual"
              class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              Manual
            </span>

            <span class="ml-auto text-xs text-muted-foreground">
              {{ rotation.assignments?.length ?? 0 }} assignment{{
                (rotation.assignments?.length ?? 0) !== 1 ? "s" : ""
              }}
            </span>
          </button>

          <div v-if="expandedRotations.has(rotation.id)" class="bg-muted/50">
            <div v-if="rotation.assignments?.length">
              <!-- Column headers for history -->
              <div class="hidden items-center gap-4 border-t bg-primary/5 px-4 py-2.5 sm:flex sm:px-8">
                <div class="w-44 shrink-0 text-xs font-semibold uppercase tracking-wider text-primary-text">
                  {{ mode === "devs" ? "Developer" : "Target" }}
                </div>
                <div class="text-xs font-semibold uppercase tracking-wider text-primary-text">
                  Reviewers
                </div>
              </div>

              <div
                v-for="assignment in rotation.assignments"
                :key="assignment.id"
                class="flex flex-col gap-1.5 border-t px-4 py-2.5 transition-colors even:bg-muted/40 hover:bg-muted sm:flex-row sm:items-start sm:gap-4 sm:px-8"
              >
                <div class="shrink-0 pt-0.5 sm:w-44">
                  <NuxtLink
                    v-if="assignment.targetSlug"
                    :to="`/developers/${assignment.targetSlug}`"
                    class="text-sm leading-6 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {{ assignment.targetName ?? assignment.targetId }}
                  </NuxtLink>
                  <span v-else class="text-sm leading-6 text-muted-foreground">
                    {{ assignment.targetName ?? assignment.targetId }}
                  </span>
                </div>

                <div class="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <template v-if="assignment.reviewers?.length">
                    <span
                      v-for="reviewer in assignment.reviewers"
                      :key="reviewer.id"
                      class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-background px-2 py-1 text-xs font-medium shadow-sm"
                    >
                      <UIAvatar class="size-5">
                        <UIAvatarFallback
                          class="!text-[8px] !font-semibold !leading-none"
                          :label="
                            getInitials(reviewer.developer.firstName, reviewer.developer.lastName)
                          "
                        >
                          {{
                            getInitials(reviewer.developer.firstName, reviewer.developer.lastName)
                          }}
                        </UIAvatarFallback>
                      </UIAvatar>
                      <TrimText>{{ reviewer.developer.firstName }} {{ reviewer.developer.lastName }}</TrimText>
                    </span>
                  </template>
                  <span v-else class="text-xs text-muted-foreground">No reviewers</span>
                </div>
              </div>
            </div>
            <p v-else class="px-4 sm:px-8 py-3 text-sm text-muted-foreground">
              No assignments for this rotation
            </p>
          </div>
        </div>
      </div>
    </div>
  </template>

  <EmptyState v-else :message="`No ${mode === 'devs' ? 'developer' : 'team'} rotations yet`">
    <NuxtLink :to="`/teams/${teamId}/rotate`">
      <UIButton size="sm" class="mt-3">
        Run your first rotation
      </UIButton>
    </NuxtLink>
  </EmptyState>
</template>
