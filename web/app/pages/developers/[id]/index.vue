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

const showHistory = computed({
  get: () => route.query.history === '1',
  set: (val) => {
    const query = { ...route.query }
    if (val)
      query.history = '1'
    else delete query.history
    router.replace({ query })
  },
})

const { data: developer } = await useFetch(`/api/developers/${devSlug}`)
const { data: associations } = await useFetch(`/api/developers/${devSlug}/associations`)

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(firstName: string, lastName?: string) {
  return `${firstName.charAt(0)}${(lastName ?? '').charAt(0) || ''}`.toUpperCase()
}

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

const expandedHistory = ref<Set<string>>(new Set())
const expandedRotations = ref<Set<string>>(new Set())

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
    expandedRotations.value.add(rotationId)
  }
}
</script>

<template>
  <div class="space-y-8">
    <div v-if="!developer" class="py-12 text-center text-sm text-muted-foreground">
      Developer not found
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink to="/developers" class="text-muted-foreground hover:text-foreground">
            <ArrowLeft class="size-5" />
          </NuxtLink>
          <UIAvatar class="size-12">
            <UIAvatarFallback
              class="text-xl"
              :label="getInitials(developer.firstName, developer.lastName)"
            >
              {{ getInitials(developer.firstName, developer.lastName) }}
            </UIAvatarFallback>
          </UIAvatar>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">
              {{ developer.firstName }} {{ developer.lastName }}
            </h1>
            <div class="flex items-center gap-3 text-sm text-muted-foreground">
              <span v-if="developer.slackId" class="inline-flex items-center gap-1.5">
                <svg class="size-4" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M26.9 80.4a13.4 13.4 0 1 1-13.4-13.4h13.4v13.4zm6.7 0a13.4 13.4 0 0 1 26.8 0v33.5a13.4 13.4 0 1 1-26.8 0V80.4z"
                    fill="#E01E5A"
                  />
                  <path
                    d="M47.2 26.9a13.4 13.4 0 1 1 13.4-13.4v13.4H47.2zm0 6.7a13.4 13.4 0 0 1 0 26.8H13.4a13.4 13.4 0 0 1 0-26.8h33.8z"
                    fill="#36C5F0"
                  />
                  <path
                    d="M100.8 47.2a13.4 13.4 0 1 1 13.4 13.4h-13.4V47.2zm-6.7 0a13.4 13.4 0 0 1-26.8 0V13.4a13.4 13.4 0 1 1 26.8 0v33.8z"
                    fill="#2EB67D"
                  />
                  <path
                    d="M80.4 100.8a13.4 13.4 0 1 1-13.4 13.4v-13.4h13.4zm0-6.7a13.4 13.4 0 0 1 0-26.8h33.8a13.4 13.4 0 0 1 0 26.8H80.4z"
                    fill="#ECB22E"
                  />
                </svg>
                {{ developer.slackId }}
              </span>
              <span v-if="developer.gitlabId" class="inline-flex items-center gap-1.5">
                <svg class="size-4" viewBox="0 0 380 380" xmlns="http://www.w3.org/2000/svg">
                  <path d="m190.4 340.2 68.6-211.1H121.8l68.6 211.1z" fill="#E24329" />
                  <path d="m190.4 340.2-68.6-211.1H30.8l159.6 211.1z" fill="#FC6D26" />
                  <path
                    d="M30.8 129.1 5.8 205.9a17.2 17.2 0 0 0 6.2 19.2l178.4 129.6L30.8 129.1z"
                    fill="#FCA326"
                  />
                  <path
                    d="M30.8 129.1h91l-39.1-120.3a8.6 8.6 0 0 0-16.4 0L30.8 129.1z"
                    fill="#E24329"
                  />
                  <path d="m190.4 340.2 68.6-211.1H350l-159.6 211.1z" fill="#FC6D26" />
                  <path
                    d="M350 129.1l25 76.8a17.2 17.2 0 0 1-6.2 19.2L190.4 354.7 350 129.1z"
                    fill="#FCA326"
                  />
                  <path
                    d="M350 129.1h-91l39.1-120.3a8.6 8.6 0 0 1 16.4 0L350 129.1z"
                    fill="#E24329"
                  />
                </svg>
                {{ developer.gitlabId }}
              </span>
              <span v-if="!developer.slackId && !developer.gitlabId">No integrations configured</span>
            </div>
          </div>
        </div>
        <UIButton as-child variant="outline" size="sm">
          <NuxtLink :to="`/developers/${devSlug}/edit`">
            <Pencil class="size-3.5" />
            Edit
          </NuxtLink>
        </UIButton>
      </div>

      <!-- Teams -->
      <div v-if="associations?.memberOf?.length" class="space-y-3">
        <h2 class="text-base font-semibold">
          Teams
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="team in associations.memberOf"
            :key="team.teamId"
            :to="`/teams/${team.teamSlug}/developers`"
            class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Users class="size-4 text-muted-foreground" />
            {{ team.teamName }}
            <span
              class="rounded-full px-1.5 py-0.5 text-xs"
              :class="
                team.isExperienced
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              "
            >
              {{ team.isExperienced ? "Experienced" : "Junior" }}
            </span>
            <ChevronRight class="size-3.5 text-muted-foreground" />
          </NuxtLink>
        </div>
      </div>

      <!-- View filter -->
      <div class="flex items-center gap-4">
        <div class="inline-flex items-center rounded-lg border bg-muted/30 p-0.5">
          <button
            v-for="opt in viewOptions"
            :key="opt.value"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            :class="
              activeView === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="activeView = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <label class="flex items-center gap-2 text-sm text-muted-foreground">
          <UISwitch :checked="showHistory" @update:checked="showHistory = $event" />
          Show history
        </label>
      </div>

      <!-- Reviewers section -->
      <div v-show="activeView === 'all' || activeView === 'reviewers'" class="space-y-3">
        <div>
          <h2 class="text-base font-semibold">
            Assigned reviewers
          </h2>
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
                  :to="`/teams/${teamGroup.teamSlug}/developers`"
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
                  {{ person.name }}
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
                  {{ teamGroup.teamName }} history
                </span>
                <span class="ml-auto text-xs text-muted-foreground">
                  {{ teamGroup.past.length }} past rotation{{
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
          <h2 class="text-base font-semibold">
            Reviewing
          </h2>
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
                  :to="`/teams/${teamGroup.teamSlug}/developers`"
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
                  {{ person.name }}
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
                  {{ teamGroup.teamName }} history
                </span>
                <span class="ml-auto text-xs text-muted-foreground">
                  {{ teamGroup.past.length }} past rotation{{
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
    </template>
  </div>
</template>
