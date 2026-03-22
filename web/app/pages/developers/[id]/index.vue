<script setup lang="ts">
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Users } from 'lucide-vue-next'

const NuxtLink = resolveComponent('NuxtLink')
const route = useRoute()
const router = useRouter()
const devSlug = route.params.id as string

type ViewFilter = 'all' | 'reviewers' | 'reviewing'
const viewOptions: { value: ViewFilter, label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'reviewers', label: 'Assigned reviewers' },
  { value: 'reviewing', label: 'Reviewing' },
]
const activeView = computed<ViewFilter>({
  get: () => {
    const q = route.query.view as string
    return q === 'reviewers' || q === 'reviewing' ? q : 'all'
  },
  set: (val) => {
    const query = { ...route.query }
    if (val === 'all')
      delete query.view
    else query.view = val
    router.replace({ query })
  },
})

const showHistory = ref(route.query.history === '1')

const { data: developer } = await useFetch(`/api/developers/${devSlug}`)
const { data: associations } = await useFetch(`/api/developers/${devSlug}/associations`)

interface RotationGroup {
  rotationId: string
  date: Date
  people: { name: string, id: string | null, slug: string | null }[]
}

interface TeamGroup {
  teamName: string
  teamSlug: string
  active: RotationGroup | null
  past: RotationGroup[]
}

// Group "assigned to me" by team, then split active/past per team
const reviewersByTeam = computed<TeamGroup[]>(() => {
  if (!associations.value?.assignedToMe)
    return []

  // First group by rotationId to collect reviewers per rotation
  const rotationMap = new Map<
    string,
    {
      date: Date
      teamName: string
      teamSlug: string
      reviewers: { name: string, id: string | null }[]
    }
  >()
  for (const row of associations.value.assignedToMe) {
    if (row.mode !== 'devs')
      continue
    if (!rotationMap.has(row.rotationId)) {
      rotationMap.set(row.rotationId, {
        date: row.date,
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        reviewers: [],
      })
    }
    const name = row.reviewerFirstName
      ? `${row.reviewerFirstName} ${row.reviewerLastName ?? ''}`.trim()
      : (row.reviewerName ?? 'Deleted')
    rotationMap
      .get(row.rotationId)!
      .reviewers
      .push({ name, id: row.reviewerId, slug: row.reviewerSlug })
  }

  // Now group rotations by team
  const teamMap = new Map<
    string,
    { teamName: string, teamSlug: string, rotations: RotationGroup[] }
  >()
  for (const [rotationId, r] of rotationMap) {
    if (!teamMap.has(r.teamSlug)) {
      teamMap.set(r.teamSlug, { teamName: r.teamName, teamSlug: r.teamSlug, rotations: [] })
    }
    teamMap.get(r.teamSlug)!.rotations.push({
      rotationId,
      date: r.date,
      people: r.reviewers,
    })
  }

  return Array.from(teamMap.values(), t => ({
    teamName: t.teamName,
    teamSlug: t.teamSlug,
    active: t.rotations[0] ?? null,
    past: t.rotations.slice(1),
  }))
})

// Group "reviewing others" by team, then split active/past per team
const reviewsByTeam = computed<TeamGroup[]>(() => {
  if (!associations.value?.reviewingOthers)
    return []

  const rotationMap = new Map<
    string,
    {
      date: Date
      teamName: string
      teamSlug: string
      targets: { name: string, id: string | null }[]
    }
  >()
  for (const row of associations.value.reviewingOthers) {
    if (row.mode !== 'devs')
      continue
    if (!rotationMap.has(row.rotationId)) {
      rotationMap.set(row.rotationId, {
        date: row.date,
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        targets: [],
      })
    }
    rotationMap.get(row.rotationId)!.targets.push({
      name: row.targetName ?? row.targetId,
      id: row.targetId,
      slug: row.targetSlug ?? null,
    })
  }

  const teamMap = new Map<
    string,
    { teamName: string, teamSlug: string, rotations: RotationGroup[] }
  >()
  for (const [rotationId, r] of rotationMap) {
    if (!teamMap.has(r.teamSlug)) {
      teamMap.set(r.teamSlug, { teamName: r.teamName, teamSlug: r.teamSlug, rotations: [] })
    }
    teamMap.get(r.teamSlug)!.rotations.push({
      rotationId,
      date: r.date,
      people: r.targets,
    })
  }

  return Array.from(teamMap.values(), t => ({
    teamName: t.teamName,
    teamSlug: t.teamSlug,
    active: t.rotations[0] ?? null,
    past: t.rotations.slice(1),
  }))
})

// Group squad review assignments (teams mode) — active only
const squadAssignments = computed(() => {
  if (!associations.value?.reviewingOthers)
    return []

  // Only latest (first) teams-mode rotation per team
  const seen = new Map<string, { teamName: string, teamSlug: string, squadName: string, date: Date, reviewers: { name: string, id: string | null, slug: string | null }[] }>()
  for (const row of associations.value.reviewingOthers) {
    if (row.mode !== 'teams')
      continue
    const key = `${row.teamSlug}-${row.rotationId}`
    if (!seen.has(key)) {
      seen.set(key, {
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        squadName: row.targetName ?? 'Squad',
        date: row.date,
        reviewers: [],
      })
    }
  }

  // For squad assignments, this dev IS one of the reviewers.
  // We need to find ALL reviewers for that same squad assignment.
  // But the current data only has rows where THIS dev is the reviewer.
  // So we can't show other co-reviewers from this query alone.
  // Just show which squads this dev is assigned to review.
  const uniqueSquads = new Map<string, { teamName: string, teamSlug: string, squadName: string, date: Date }>()
  for (const row of associations.value.reviewingOthers) {
    if (row.mode !== 'teams')
      continue
    const key = `${row.teamSlug}-${row.targetName}`
    if (!uniqueSquads.has(key)) {
      uniqueSquads.set(key, {
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        squadName: row.targetName ?? 'Squad',
        date: row.date,
      })
    }
  }
  return Array.from(uniqueSquads.values())
})

const hasAnyHistory = computed(() =>
  reviewersByTeam.value.some(t => t.past.length > 0)
  || reviewsByTeam.value.some(t => t.past.length > 0),
)

const squadsByTeam = computed(() => {
  const map = new Map<string, { squadId: string, squadName: string }[]>()
  for (const squad of associations.value?.memberOfSquads ?? []) {
    const existing = map.get(squad.teamId) ?? []
    existing.push({ squadId: squad.squadId, squadName: squad.squadName })
    map.set(squad.teamId, existing)
  }
  return map
})

const expandedHistory = ref<Set<string>>(new Set())
const expandedRotations = ref<Set<string>>(new Set())

watch(showHistory, (val) => {
  const query = { ...route.query }
  if (val) {
    query.history = '1'
    const hasOpenRotation = expandedRotations.value.size > 0
    for (const group of reviewersByTeam.value) {
      if (group.past.length) {
        expandedHistory.value.add(`reviewers-${group.teamSlug}`)
        if (!hasOpenRotation)
          expandedRotations.value.add(group.past[0].rotationId)
      }
    }
    for (const group of reviewsByTeam.value) {
      if (group.past.length) {
        expandedHistory.value.add(`reviews-${group.teamSlug}`)
      }
    }
  }
  else {
    delete query.history
    expandedHistory.value.clear()
    expandedRotations.value.clear()
  }
  router.replace({ query })
})

function toggleHistory(key: string) {
  if (expandedHistory.value.has(key)) {
    expandedHistory.value.delete(key)
  }
  else {
    expandedHistory.value.add(key)
  }
}

function toggleRotation(rotationId: string) {
  if (expandedRotations.value.has(rotationId)) {
    expandedRotations.value.delete(rotationId)
  }
  else {
    expandedRotations.value.clear()
    expandedRotations.value.add(rotationId)
  }
}
</script>

<template>
  <div class="space-y-8">
    <EmptyState v-if="!developer" message="Developer not found">
      <UIButton as-child size="sm" class="mt-3">
        <NuxtLink to="/developers">
          Back to developers
        </NuxtLink>
      </UIButton>
    </EmptyState>

    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
          <UIAvatar class="size-12">
            <UIAvatarFallback
              class="text-xl"
              :label="getInitials(developer.firstName, developer.lastName)"
            >
              {{ getInitials(developer.firstName, developer.lastName) }}
            </UIAvatarFallback>
          </UIAvatar>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight mb-1">
              {{ developer.firstName }} {{ developer.lastName }}
            </h1>
            <div class="flex items-center gap-3 text-sm text-muted-foreground">
              <span v-if="developer.slackId" class="inline-flex items-center gap-1.5">
                <IconsSlackIcon class="size-4" />
                {{ developer.slackId }}
              </span>
              <span v-if="developer.gitlabId" class="inline-flex items-center gap-1.5">
                <IconsGitlabIcon class="size-4" />
                {{ developer.gitlabId }}
              </span>
              <span v-if="developer.githubId" class="inline-flex items-center gap-1.5">
                <IconsGithubIcon class="size-4" />
                {{ developer.githubId }}
              </span>
              <span v-if="!developer.slackId && !developer.gitlabId && !developer.githubId">No integrations configured</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UIButton as-child variant="outline">
            <NuxtLink to="/developers">
              <ArrowLeft class="size-4" />
              Back to Developers
            </NuxtLink>
          </UIButton>
          <UIButton as-child>
            <NuxtLink :to="`/developers/${devSlug}/edit`">
              <Pencil class="size-4" />
              Edit
            </NuxtLink>
          </UIButton>
        </div>
      </div>

      <!-- Teams -->
      <div v-if="associations?.memberOf?.length" class="space-y-3">
        <h2 class="text-xl font-semibold">
          Teams
        </h2>
        <div class="flex flex-col gap-2">
          <div v-for="team in associations.memberOf" :key="team.teamId" class="space-y-1.5">
            <NuxtLink
              :to="`/teams/${team.teamSlug}/rotations/developers`"
              class="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted"
            >
              <Users class="size-4 text-muted-foreground" />
              {{ team.teamName }}
              <StatusBadge
                :label="team.isExperienced ? 'Experienced' : 'Junior'"
                :color="team.isExperienced ? 'purple' : 'yellow'"
              />
              <ChevronRight class="size-3.5 text-muted-foreground" />
            </NuxtLink>
            <div v-if="squadsByTeam.get(team.teamId)?.length" class="ml-5 space-y-0">
              <div
                v-for="(squad, index) in squadsByTeam.get(team.teamId)"
                :key="squad.squadId"
                class="relative flex items-center gap-2 py-1 pl-5 before:absolute before:left-0 before:top-0 before:h-1/2 before:w-4 before:border-b-2 before:border-l-2 before:rounded-bl-md before:border-border before:content-['']"
                :class="index < (squadsByTeam.get(team.teamId)?.length ?? 1) - 1 ? 'after:absolute after:left-0 after:top-1/2 after:h-1/2 after:border-l-2 after:border-border after:content-[\'\']' : ''"
              >
                <NuxtLink
                  :to="`/teams/${team.teamSlug}/squads`"
                  class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <TrimText>{{ squad.squadName }}</TrimText>
                </NuxtLink>
                <StatusBadge
                  v-if="squadAssignments.some(a => a.squadName === squad.squadName)"
                  label="Active reviewer"
                  color="green"
                >
                  <span class="relative flex size-2">
                    <span class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span class="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                </StatusBadge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UISeparator />

      <!-- Rotation assignments -->
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            Rotation Assignments
          </h2>
          <label v-if="hasAnyHistory" class="flex items-center gap-2 text-sm text-muted-foreground">
            <UISwitch v-model="showHistory" />
            Show history
          </label>
        </div>

        <!-- View filter -->
        <SegmentControl v-model="activeView" :options="viewOptions" />

        <!-- Reviewers section -->
        <div v-show="activeView === 'all' || activeView === 'reviewers'" class="space-y-3">
          <div>
            <h3 class="text-lg font-semibold">
              Assigned reviewers
            </h3>
            <p class="text-sm text-muted-foreground">
              Who reviews {{ developer.firstName }}'s pull requests
            </p>
          </div>

          <template v-if="reviewersByTeam.length">
            <div v-for="teamGroup in reviewersByTeam" :key="teamGroup.teamSlug" class="space-y-2">
              <!-- Active rotation -->
              <div
                v-if="teamGroup.active"
                class="overflow-hidden rounded-lg border border-primary/30"
              >
                <div class="flex items-center gap-3 bg-primary/5 px-4 py-2.5">
                  <span class="relative flex size-2">
                    <span
                      class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"
                    />
                    <span class="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  <NuxtLink
                    :to="`/teams/${teamGroup.teamSlug}/rotations/developers`"
                    class="text-sm font-semibold hover:underline"
                  >
                    {{ teamGroup.teamName }}
                  </NuxtLink>
                  <span class="text-xs text-muted-foreground">
                    {{ formatDate(teamGroup.active.date) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5 px-4 py-3">
                  <component
                    :is="person.slug ? NuxtLink : 'span'"
                    v-for="person in teamGroup.active.people"
                    :key="person.id ?? person.name"
                    :to="person.slug ? `/developers/${person.slug}` : undefined"
                    class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 text-sm font-medium shadow-sm"
                    :class="
                      person.slug && 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80'
                    "
                  >
                    <UIAvatar class="size-5">
                      <UIAvatarFallback
                        class="!text-[8px] !font-semibold !leading-none"
                        :label="getInitials(person.name.split(' ')[0], person.name.split(' ')[1])"
                      >
                        {{ getInitials(person.name.split(" ")[0], person.name.split(" ")[1]) }}
                      </UIAvatarFallback>
                    </UIAvatar>
                    <TrimText>{{ person.name }}</TrimText>
                  </component>
                </div>
              </div>

              <!-- History (collapsed) -->
              <div
                v-if="teamGroup.past.length && showHistory"
                class="overflow-hidden rounded-lg border"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                  @click="toggleHistory(`reviewers-${teamGroup.teamSlug}`)"
                >
                  <ChevronDown
                    v-if="expandedHistory.has(`reviewers-${teamGroup.teamSlug}`)"
                    class="size-4 shrink-0 text-muted-foreground"
                  />
                  <ChevronRight v-else class="size-4 shrink-0 text-muted-foreground" />
                  <span class="text-sm font-medium text-muted-foreground">
                    Past assigned reviewers
                  </span>
                  <span class="ml-auto text-xs text-muted-foreground">
                    {{ teamGroup.past.length }} rotation{{
                      teamGroup.past.length !== 1 ? "s" : ""
                    }}
                  </span>
                </button>

                <div v-if="expandedHistory.has(`reviewers-${teamGroup.teamSlug}`)">
                  <div v-for="rotation in teamGroup.past" :key="rotation.rotationId">
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 border-t px-5 py-2.5 text-left transition-colors hover:bg-muted/30"
                      @click="toggleRotation(rotation.rotationId)"
                    >
                      <ChevronDown
                        v-if="expandedRotations.has(rotation.rotationId)"
                        class="size-3.5 shrink-0 text-muted-foreground"
                      />
                      <ChevronRight v-else class="size-3.5 shrink-0 text-muted-foreground" />
                      <span class="text-sm font-medium">{{ formatDate(rotation.date) }}</span>
                      <span class="ml-auto text-xs text-muted-foreground">
                        {{ rotation.people.length }} reviewer{{
                          rotation.people.length !== 1 ? "s" : ""
                        }}
                      </span>
                    </button>

                    <div
                      v-if="expandedRotations.has(rotation.rotationId)"
                      class="border-t bg-muted/50 px-8 py-3"
                    >
                      <div class="flex flex-wrap gap-1.5">
                        <component
                          :is="person.slug ? NuxtLink : 'span'"
                          v-for="person in rotation.people"
                          :key="person.id ?? person.name"
                          :to="person.slug ? `/developers/${person.slug}` : undefined"
                          class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-background px-2 py-1 text-xs font-medium shadow-sm"
                          :class="
                            person.slug
                              && 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80'
                          "
                        >
                          <UIAvatar class="size-5">
                            <UIAvatarFallback
                              class="!text-[8px] !font-semibold !leading-none"
                              :label="
                                getInitials(person.name.split(' ')[0], person.name.split(' ')[1])
                              "
                            >
                              {{ getInitials(person.name.split(" ")[0], person.name.split(" ")[1]) }}
                            </UIAvatarFallback>
                          </UIAvatar>
                          {{ person.name }}
                        </component>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <p v-else class="text-sm text-muted-foreground">
            No rotation history yet.
          </p>
        </div>

        <!-- Reviews section -->
        <div v-show="activeView === 'all' || activeView === 'reviewing'" class="space-y-3">
          <div>
            <h3 class="text-lg font-semibold">
              Reviewing
            </h3>
            <p class="text-sm text-muted-foreground">
              Pull requests {{ developer.firstName }} is assigned to review
            </p>
          </div>

          <template v-if="reviewsByTeam.length">
            <div v-for="teamGroup in reviewsByTeam" :key="teamGroup.teamSlug" class="space-y-2">
              <!-- Active rotation -->
              <div
                v-if="teamGroup.active"
                class="overflow-hidden rounded-lg border border-primary/30"
              >
                <div class="flex items-center gap-3 bg-primary/5 px-4 py-2.5">
                  <span class="relative flex size-2">
                    <span
                      class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"
                    />
                    <span class="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  <NuxtLink
                    :to="`/teams/${teamGroup.teamSlug}/rotations/developers`"
                    class="text-sm font-semibold hover:underline"
                  >
                    {{ teamGroup.teamName }}
                  </NuxtLink>
                  <span class="text-xs text-muted-foreground">
                    {{ formatDate(teamGroup.active.date) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5 px-4 py-3">
                  <component
                    :is="person.slug ? NuxtLink : 'span'"
                    v-for="person in teamGroup.active.people"
                    :key="person.id ?? person.name"
                    :to="person.slug ? `/developers/${person.slug}` : undefined"
                    class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 text-sm font-medium shadow-sm"
                    :class="
                      person.slug && 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80'
                    "
                  >
                    <UIAvatar class="size-5">
                      <UIAvatarFallback
                        class="!text-[8px] !font-semibold !leading-none"
                        :label="getInitials(person.name.split(' ')[0], person.name.split(' ')[1])"
                      >
                        {{ getInitials(person.name.split(" ")[0], person.name.split(" ")[1]) }}
                      </UIAvatarFallback>
                    </UIAvatar>
                    <TrimText>{{ person.name }}</TrimText>
                  </component>
                </div>
              </div>

              <!-- History (collapsed) -->
              <div
                v-if="teamGroup.past.length && showHistory"
                class="overflow-hidden rounded-lg border"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                  @click="toggleHistory(`reviews-${teamGroup.teamSlug}`)"
                >
                  <ChevronDown
                    v-if="expandedHistory.has(`reviews-${teamGroup.teamSlug}`)"
                    class="size-4 shrink-0 text-muted-foreground"
                  />
                  <ChevronRight v-else class="size-4 shrink-0 text-muted-foreground" />
                  <span class="text-sm font-medium text-muted-foreground">
                    Past reviews
                  </span>
                  <span class="ml-auto text-xs text-muted-foreground">
                    {{ teamGroup.past.length }} rotation{{
                      teamGroup.past.length !== 1 ? "s" : ""
                    }}
                  </span>
                </button>

                <div v-if="expandedHistory.has(`reviews-${teamGroup.teamSlug}`)">
                  <div v-for="rotation in teamGroup.past" :key="rotation.rotationId">
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 border-t px-5 py-2.5 text-left transition-colors hover:bg-muted/30"
                      @click="toggleRotation(rotation.rotationId)"
                    >
                      <ChevronDown
                        v-if="expandedRotations.has(rotation.rotationId)"
                        class="size-3.5 shrink-0 text-muted-foreground"
                      />
                      <ChevronRight v-else class="size-3.5 shrink-0 text-muted-foreground" />
                      <span class="text-sm font-medium">{{ formatDate(rotation.date) }}</span>
                      <span class="ml-auto text-xs text-muted-foreground">
                        {{ rotation.people.length }} target{{
                          rotation.people.length !== 1 ? "s" : ""
                        }}
                      </span>
                    </button>

                    <div
                      v-if="expandedRotations.has(rotation.rotationId)"
                      class="border-t bg-muted/50 px-8 py-3"
                    >
                      <div class="flex flex-wrap gap-1.5">
                        <component
                          :is="person.slug ? NuxtLink : 'span'"
                          v-for="person in rotation.people"
                          :key="person.id ?? person.name"
                          :to="person.slug ? `/developers/${person.slug}` : undefined"
                          class="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-background px-2 py-1 text-xs font-medium shadow-sm"
                          :class="
                            person.slug
                              && 'cursor-pointer transition-all hover:shadow-md hover:bg-muted/80'
                          "
                        >
                          <UIAvatar class="size-5">
                            <UIAvatarFallback
                              class="!text-[8px] !font-semibold !leading-none"
                              :label="
                                getInitials(person.name.split(' ')[0], person.name.split(' ')[1])
                              "
                            >
                              {{ getInitials(person.name.split(" ")[0], person.name.split(" ")[1]) }}
                            </UIAvatarFallback>
                          </UIAvatar>
                          {{ person.name }}
                        </component>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <p v-else class="text-sm text-muted-foreground">
            No rotation history yet.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
