<script setup lang="ts">
import {
  ChevronDown,
  ChevronRight,
  X,
  Check,
  ChevronsUpDown,
  CalendarClock,
} from "lucide-vue-next";
import type { Settings, Team } from "~/types";

const props = defineProps<{
  teamId: string;
  mode: "devs" | "teams";
}>();

const { data: rotations, refresh: refreshRotations } = await useFetch(
  `/api/teams/${props.teamId}/rotations`,
);
const { data: members } = await useFetch(`/api/teams/${props.teamId}/members`);
const { data: team } = await useFetch<Team>(`/api/teams/${props.teamId}`);
const { data: globalSettings } = await useFetch<Settings>("/api/settings");

const filteredRotations = computed(() => {
  if (!rotations.value) return [];
  return rotations.value.filter((r: any) => r.mode === props.mode);
});

const activeRotation = computed(() => filteredRotations.value[0] ?? null);
const pastRotations = computed(() => filteredRotations.value.slice(1));

const expandedRotations = ref<Set<string>>(new Set());
const historyOpen = ref(false);

const isEditing = ref(false);
const editState = ref<Map<string, string[]>>(new Map());
const openPopoverId = ref<string | null>(null);
const saving = ref(false);

function startEditing() {
  if (!activeRotation.value) return;
  isEditing.value = true;
  editState.value = new Map();
  for (const a of activeRotation.value.assignments ?? []) {
    editState.value.set(
      a.id,
      a.reviewers.map((r: any) => r.developer.id),
    );
  }
}

function cancelEditing() {
  isEditing.value = false;
  editState.value = new Map();
  openPopoverId.value = null;
}

watch(
  () => props.mode,
  () => cancelEditing(),
);

function getEditReviewerIds(assignmentId: string): string[] {
  return editState.value.get(assignmentId) ?? [];
}

function toggleReviewer(assignmentId: string, developerId: string) {
  const ids = [...(editState.value.get(assignmentId) ?? [])];
  const idx = ids.indexOf(developerId);
  if (idx >= 0) {
    ids.splice(idx, 1);
  } else {
    ids.push(developerId);
  }
  editState.value.set(assignmentId, ids);
}

async function saveAll() {
  if (!activeRotation.value) return;
  saving.value = true;
  try {
    for (const assignment of activeRotation.value.assignments ?? []) {
      const newIds = editState.value.get(assignment.id);
      if (!newIds) continue;
      const oldIds = assignment.reviewers.map((r: any) => r.developer.id).sort();
      const sortedNew = [...newIds].sort();
      if (JSON.stringify(oldIds) !== JSON.stringify(sortedNew)) {
        await $fetch(
          `/api/teams/${props.teamId}/rotations/${assignment.rotationId}/assignments/${assignment.id}`,
          { method: "PUT", body: { reviewerDeveloperIds: newIds } },
        );
      }
    }
    await refreshRotations();
    cancelEditing();
  } catch (err) {
    console.error("Failed to update reviewers:", err);
  } finally {
    saving.value = false;
  }
}

function toggleExpanded(rotationId: string) {
  if (expandedRotations.value.has(rotationId)) {
    expandedRotations.value.delete(rotationId);
  } else {
    expandedRotations.value.add(rotationId);
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const allDevelopers = computed(() => {
  if (!members.value) return [];
  return members.value
    .map((m: any) => m.developer)
    .sort((a: any, b: any) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
});

function devName(devId: string) {
  const d = allDevelopers.value.find((d: any) => d.id === devId);
  return d ? `${d.firstName} ${d.lastName}` : "?";
}

function devInitials(devId: string) {
  const d = allDevelopers.value.find((d: any) => d.id === devId);
  return d ? getInitials(d.firstName, d.lastName) : "??";
}

const reviewerCountLabel = computed(() => {
  if (!team.value) return "";
  return `${team.value.defaultReviewerCount} reviewer${team.value.defaultReviewerCount !== 1 ? "s" : ""} each`;
});

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const nextRotationDate = computed(() => {
  if (!team.value || !globalSettings.value) return null;

  const intervalDays =
    team.value.rotationIntervalDays ?? globalSettings.value.defaultRotationIntervalDays;
  const targetDay = team.value.rotationDay ?? globalSettings.value.defaultRotationDay;
  const targetTime = team.value.rotationTime ?? globalSettings.value.defaultRotationTime;
  const timezone = team.value.rotationTimezone ?? globalSettings.value.defaultRotationTimezone;

  const lastRotation = filteredRotations.value[0];
  if (!lastRotation) return null;

  const lastDate = new Date(lastRotation.date);
  const candidate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  // Align to the target day of week
  const targetDayIndex = DAY_INDEX[targetDay] ?? 3;
  const candidateDay = candidate.getDay();
  const dayDifference = (targetDayIndex - candidateDay + 7) % 7;
  if (dayDifference > 0) {
    candidate.setDate(candidate.getDate() + dayDifference);
  }

  // Set target time
  const [hours, minutes] = targetTime.split(":").map(Number);
  candidate.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(candidate);
});
</script>

<template>
  <template v-if="filteredRotations.length">
    <!-- Next rotation banner -->
    <div
      v-if="nextRotationDate"
      class="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5"
    >
      <CalendarClock class="size-4 text-muted-foreground" />
      <span class="text-sm text-muted-foreground">Next rotation:</span>
      <span class="text-sm font-medium">{{ nextRotationDate }}</span>
    </div>

    <!-- Active rotation -->
    <div v-if="activeRotation" class="overflow-hidden rounded-lg border border-primary/30">
      <div class="flex items-center gap-3 border-b bg-primary/5 px-4 py-3">
        <span class="relative flex size-2.5">
          <span
            class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"
          />
          <span class="relative inline-flex size-2.5 rounded-full bg-green-500" />
        </span>
        <span class="text-sm font-semibold">Current Rotation</span>
        <span class="text-sm text-muted-foreground">&mdash;</span>
        <span class="text-sm font-medium">{{ formatDate(activeRotation.date) }}</span>
        <span
          v-if="activeRotation.isManual"
          class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          Manual
        </span>
        <span v-if="reviewerCountLabel" class="ml-auto text-xs text-muted-foreground">
          {{ reviewerCountLabel }}
        </span>

        <!-- Card-level Edit / Save / Cancel -->
        <template v-if="!isEditing">
          <UIButton
            size="sm"
            variant="outline"
            type="button"
            class="h-7 px-2.5 text-xs"
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
            class="h-7 px-2.5 text-xs"
            @click="saveAll"
          >
            {{ saving ? "Saving..." : "Save" }}
          </UIButton>
          <UIButton
            size="sm"
            variant="ghost"
            type="button"
            class="h-7 px-2.5 text-xs"
            @click="cancelEditing"
          >
            Cancel
          </UIButton>
        </template>
      </div>

      <div v-if="activeRotation.assignments?.length">
        <!-- Column headers -->
        <div class="flex items-center gap-4 border-b bg-muted/50 px-5 py-2">
          <div class="w-48 shrink-0 text-xs font-medium text-muted-foreground">
            {{ mode === "devs" ? "Developer" : "Target" }}
          </div>
          <div class="text-xs font-medium text-muted-foreground">Reviewers</div>
        </div>

        <div
          v-for="assignment in activeRotation.assignments"
          :key="assignment.id"
          class="flex items-start gap-4 border-b px-5 py-3 last:border-b-0"
        >
          <div class="w-48 shrink-0 pt-0.5">
            <NuxtLink
              v-if="assignment.targetSlug"
              :to="`/developers/${assignment.targetSlug}`"
              class="text-sm font-medium hover:underline"
            >
              {{ assignment.targetName ?? assignment.targetId }}
            </NuxtLink>
            <span v-else class="text-sm font-medium">
              {{ assignment.targetName ?? assignment.targetId }}
            </span>
          </div>

          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <!-- Read mode -->
            <template v-if="!isEditing">
              <template v-if="assignment.reviewers?.length">
                <NuxtLink
                  v-for="reviewer in assignment.reviewers"
                  :key="reviewer.id"
                  :to="
                    reviewer.developer.slug ? `/developers/${reviewer.developer.slug}` : undefined
                  "
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2 py-1 text-xs font-medium shadow-sm',
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
                  {{ reviewer.developer.firstName }} {{ reviewer.developer.lastName }}
                </NuxtLink>
              </template>
              <span v-else class="text-xs text-muted-foreground">No reviewers</span>
            </template>

            <!-- Edit mode -->
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
                    >{{ devInitials(devId) }}</UIAvatarFallback
                  >
                </UIAvatar>
                {{ devName(devId) }}
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
                    class="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground"
                  >
                    <ChevronsUpDown class="size-3" />
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
      </div>
      <p v-else class="px-5 py-4 text-sm text-muted-foreground">No assignments for this rotation</p>
    </div>

    <!-- Past rotations -->
    <div v-if="pastRotations.length" class="overflow-hidden rounded-lg border">
      <button
        type="button"
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
              <div class="flex items-center gap-4 border-t bg-muted px-8 py-2">
                <div class="w-44 shrink-0 text-xs font-medium text-muted-foreground">
                  {{ mode === "devs" ? "Developer" : "Target" }}
                </div>
                <div class="text-xs font-medium text-muted-foreground">Reviewers</div>
              </div>

              <div
                v-for="assignment in rotation.assignments"
                :key="assignment.id"
                class="flex items-start gap-4 border-t px-8 py-2.5"
              >
                <div class="w-44 shrink-0 pt-0.5">
                  <NuxtLink
                    v-if="assignment.targetSlug"
                    :to="`/developers/${assignment.targetSlug}`"
                    class="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {{ assignment.targetName ?? assignment.targetId }}
                  </NuxtLink>
                  <span v-else class="text-sm text-muted-foreground">
                    {{ assignment.targetName ?? assignment.targetId }}
                  </span>
                </div>

                <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
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
                      {{ reviewer.developer.firstName }} {{ reviewer.developer.lastName }}
                    </span>
                  </template>
                  <span v-else class="text-xs text-muted-foreground">No reviewers</span>
                </div>
              </div>
            </div>
            <p v-else class="px-8 py-3 text-sm text-muted-foreground">
              No assignments for this rotation
            </p>
          </div>
        </div>
      </div>
    </div>
  </template>

  <div
    v-else
    class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
  >
    <p class="text-sm text-muted-foreground">
      No {{ mode === "devs" ? "developer" : "team" }} rotations yet
    </p>
    <NuxtLink :to="`/teams/${teamId}/rotate`">
      <UIButton size="sm" class="mt-3">Run your first rotation</UIButton>
    </NuxtLink>
  </div>
</template>
