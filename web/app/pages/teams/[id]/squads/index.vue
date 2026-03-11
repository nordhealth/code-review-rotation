<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";

const route = useRoute();
const teamId = route.params.id as string;

const { data: team } = await useFetch(`/api/teams/${teamId}`);
const { data: squads, refresh: refreshSquads } = useFetch(`/api/teams/${teamId}/squads`);

// --- 2-row clamp ---
const visibleCounts = reactive<Record<string, number>>({});
const measureRefs = new Map<string, HTMLElement>();

function measureMembers(el: any, squadId: string, total: number) {
  if (!el) {
    measureRefs.delete(squadId);
    return;
  }
  measureRefs.set(squadId, el as HTMLElement);
  computeVisible(el as HTMLElement, squadId, total);
}

function computeVisible(container: HTMLElement, squadId: string, total: number) {
  nextTick(() => {
    const badges = Array.from(container.querySelectorAll("[data-member]")) as HTMLElement[];
    if (badges.length === 0) return;

    const firstTop = badges[0].offsetTop;
    const rowHeight = badges[0].offsetHeight;
    const gap = 4;
    const maxBottom = firstTop + rowHeight * 2 + gap;

    let count = 0;
    for (const badge of badges) {
      if (badge.offsetTop + badge.offsetHeight <= maxBottom) {
        count++;
      } else {
        break;
      }
    }

    if (count < total) {
      count = Math.max(1, count - 1);
    }

    visibleCounts[squadId] = count;
  });
}

if (import.meta.client) {
  useEventListener("resize", () => {
    for (const [squadId, el] of measureRefs) {
      const squad = squads.value?.find((s) => s.id === squadId);
      if (squad?.members) {
        computeVisible(el, squadId, squad.members.length);
      }
    }
  });
}

async function deleteSquad(squadId: string, name: string) {
  if (!window.confirm(`Delete squad "${name}"?`)) return;
  try {
    await $fetch(`/api/teams/${teamId}/squads/${squadId}`, { method: "DELETE" });
    await refreshSquads();
  } catch (e: any) {
    alert(e.data?.message || "Failed to delete squad");
  }
}
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'">
      <template #actions>
        <UIButton as-child size="sm">
          <NuxtLink :to="`/teams/${teamId}/squads/new`">
            <Plus class="size-4" />
            New Squad
          </NuxtLink>
        </UIButton>
      </template>
    </TeamSubNav>

    <div v-if="squads?.length" class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="squad in squads"
        :key="squad.id"
        class="relative rounded-lg border bg-card p-5 shadow-sm"
      >
        <div class="mb-3 flex items-start justify-between">
          <div>
            <h3 class="font-semibold">{{ squad.name }}</h3>
            <p class="text-sm text-muted-foreground">{{ squad.reviewerCount }} reviewers</p>
          </div>
          <div class="flex items-center gap-1">
            <UIButton as-child variant="outline" size="sm" class="h-7 px-2.5 text-xs">
              <NuxtLink :to="`/teams/${teamId}/squads/${squad.id}/edit`"> Edit </NuxtLink>
            </UIButton>
            <UIButton
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
              @click="deleteSquad(squad.id, squad.name)"
            >
              <Trash2 class="size-4" />
            </UIButton>
          </div>
        </div>
        <div v-if="squad.members?.length">
          <!-- Hidden measurement container -->
          <div
            :ref="(el) => measureMembers(el, squad.id, squad.members?.length ?? 0)"
            class="pointer-events-none invisible absolute flex flex-wrap gap-1"
            :style="{ width: 'calc(100% - 2.5rem)' }"
            aria-hidden="true"
          >
            <span
              v-for="member in squad.members"
              :key="member.id"
              data-member
              class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {{ member.developer.firstName }} {{ member.developer.lastName }}
            </span>
          </div>
          <!-- Visible badges -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="member in squad.members.slice(
                0,
                visibleCounts[squad.id] ?? squad.members.length,
              )"
              :key="member.id"
              class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {{ member.developer.firstName }} {{ member.developer.lastName }}
            </span>
            <UIPopover
              v-if="(visibleCounts[squad.id] ?? squad.members.length) < squad.members.length"
            >
              <UIPopoverTrigger as-child>
                <button
                  class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  +{{ squad.members.length - (visibleCounts[squad.id] ?? squad.members.length) }}
                  more
                </button>
              </UIPopoverTrigger>
              <UIPopoverContent class="w-auto p-2" align="start">
                <div class="flex flex-col gap-1">
                  <span
                    v-for="member in squad.members.slice(
                      visibleCounts[squad.id] ?? squad.members.length,
                    )"
                    :key="member.id"
                    class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {{ member.developer.firstName }} {{ member.developer.lastName }}
                  </span>
                </div>
              </UIPopoverContent>
            </UIPopover>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">No members</p>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
    >
      <p class="text-sm text-muted-foreground">No squads yet</p>
      <UIButton as-child size="sm" class="mt-3">
        <NuxtLink :to="`/teams/${teamId}/squads/new`">
          <Plus class="size-4" />
          Create your first squad
        </NuxtLink>
      </UIButton>
    </div>
  </div>
</template>
