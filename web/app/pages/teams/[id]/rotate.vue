<script setup lang="ts">
import { ArrowRight, Play, ArrowLeft } from "lucide-vue-next";

const route = useRoute();
const teamId = route.params.id as string;

const { data: team } = await useFetch(`/api/teams/${teamId}`);

const mode = ref<"devs" | "teams">("devs");
const isManual = ref(false);
const submitting = ref(false);
const error = ref("");
const result = ref<any>(null);

async function runRotation() {
  submitting.value = true;
  error.value = "";
  result.value = null;
  try {
    const data = await $fetch(`/api/teams/${teamId}/rotations`, {
      method: "POST",
      body: {
        mode: mode.value,
        isManual: isManual.value,
      },
    });
    result.value = data;
  } catch (e: any) {
    error.value = e.data?.message || "Failed to run rotation";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'" />

    <div v-if="!result" class="max-w-lg space-y-6">
      <div>
        <h2 class="text-lg font-medium">Run Rotation</h2>
        <p class="text-sm text-muted-foreground">
          Trigger a new code review rotation for {{ team?.name ?? "this team" }}
        </p>
      </div>

      <div v-if="error" class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {{ error }}
      </div>

      <div class="rounded-lg border bg-muted/30 p-4">
        <h3 class="text-sm font-medium">Team Info</h3>
        <dl class="mt-2 space-y-1 text-sm">
          <div class="flex gap-2">
            <dt class="text-muted-foreground">Team:</dt>
            <dd>{{ team?.name ?? "-" }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-muted-foreground">Default reviewers:</dt>
            <dd>{{ team?.defaultReviewerCount ?? "-" }}</dd>
          </div>
        </dl>
      </div>

      <div class="space-y-4">
        <div>
          <UILabel class="mb-2">Mode</UILabel>
          <div class="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                mode === 'devs'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="mode = 'devs'"
            >
              Developers
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                mode === 'teams'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="mode = 'teams'"
            >
              Squads
            </button>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            {{
              mode === "devs"
                ? "Assign reviewers to individual developers"
                : "Assign reviewers to squads"
            }}
          </p>
        </div>

        <div>
          <UILabel class="flex items-center gap-2">
            <UICheckbox :checked="isManual" @update:checked="isManual = $event" />
            <span>Manual rotation</span>
          </UILabel>
          <p class="ml-6 text-xs text-muted-foreground">
            Update existing column instead of creating a new one
          </p>
        </div>

        <UIButton type="button" :disabled="submitting" @click="runRotation">
          <Play class="size-4" />
          {{ submitting ? "Running..." : "Run Rotation" }}
        </UIButton>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div
        class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
      >
        <h2 class="font-medium text-green-800 dark:text-green-300">Rotation Complete</h2>
        <p class="mt-1 text-sm text-green-700 dark:text-green-400">
          The rotation has been run successfully.
        </p>
      </div>

      <div v-if="result.assignments?.length" class="space-y-2">
        <h3 class="text-sm font-medium">Assignments</h3>
        <div class="overflow-hidden rounded-lg border">
          <div
            v-for="assignment in result.assignments"
            :key="assignment.id"
            class="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <span class="text-sm font-medium">{{
              assignment.targetName ?? assignment.targetId
            }}</span>
            <ArrowRight class="size-3.5 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">
              <template v-if="assignment.reviewers?.length">
                {{
                  assignment.reviewers
                    .map((r: any) =>
                      r.developer
                        ? `${r.developer.firstName} ${r.developer.lastName}`
                        : r.reviewerDeveloperId,
                    )
                    .join(", ")
                }}
              </template>
              <template v-else>No reviewers assigned</template>
            </span>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <UIButton as-child variant="secondary">
          <NuxtLink :to="`/teams/${teamId}`" class="gap-2">
            <ArrowLeft class="size-4" />
            Back to Rotation History
          </NuxtLink>
        </UIButton>
        <UIButton
          type="button"
          variant="ghost"
          @click="
            result = null;
            error = '';
          "
        >
          Run Another
        </UIButton>
      </div>
    </div>
  </div>
</template>
