<script setup lang="ts">
import type { Rotation } from '~/types'
import { ArrowLeft, ArrowRight, Check, Play } from 'lucide-vue-next'

useHead({ title: 'Run Rotation | Nord Review' })

const route = useRoute()
const teamId = route.params.id as string

const { data: team } = await useFetch(`/api/teams/${teamId}`)

const mode = ref<'devs' | 'teams'>('devs')
const isManual = ref(false)
const submitting = ref(false)
const error = ref('')
const result = ref<Rotation | null>(null)

async function runRotation() {
  submitting.value = true
  error.value = ''
  result.value = null
  try {
    const data = await $fetch(`/api/teams/${teamId}/rotations`, {
      method: 'POST',
      body: {
        mode: mode.value,
        isManual: isManual.value,
      },
    })
    result.value = data
  }
  catch (caughtError: unknown) {
    const message = (caughtError as { data?: { message?: string } })?.data?.message
    error.value = message || 'Failed to run rotation'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'" />

    <!-- Run form -->
    <div v-if="!result" class="max-w-xl space-y-6">
      <ErrorBanner v-if="error" :message="error" />

      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h2 class="text-base font-semibold">
          Run Rotation
        </h2>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Trigger a new code review rotation for {{ team?.name ?? "this team" }}.
        </p>

        <div class="mt-5 space-y-5">
          <!-- Mode toggle -->
          <div class="space-y-2">
            <span class="text-sm font-medium">Mode</span>
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
            <p class="text-sm text-muted-foreground">
              {{
                mode === "devs"
                  ? "Assign reviewers to individual developers"
                  : "Assign reviewers to squads"
              }}
            </p>
          </div>

          <!-- Manual toggle -->
          <label class="flex items-start gap-2 cursor-pointer select-none">
            <UICheckbox class="mt-0.5" :checked="isManual" @update:checked="isManual = $event" />
            <div>
              <span class="text-sm font-medium">Manual rotation</span>
              <p class="text-sm text-muted-foreground">
                Update existing column instead of creating a new one
              </p>
            </div>
          </label>

          <!-- Team summary -->
          <dl class="flex gap-x-6 gap-y-1 text-sm">
            <div class="flex gap-1.5">
              <dt class="text-muted-foreground">
                Team:
              </dt>
              <dd class="font-medium">
                {{ team?.name ?? "-" }}
              </dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-muted-foreground">
                Reviewers:
              </dt>
              <dd class="font-medium">
                {{ team?.defaultReviewerCount ?? "-" }}
              </dd>
            </div>
          </dl>

          <UIButton type="button" :disabled="submitting" @click="runRotation">
            <Play class="size-4" />
            {{ submitting ? "Running..." : "Run Rotation" }}
          </UIButton>
        </div>
      </div>
    </div>

    <!-- Result -->
    <div v-else class="max-w-xl space-y-6">
      <div class="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white dark:bg-green-500">
          <Check class="size-3" />
        </div>
        <div>
          <h2 class="font-medium text-green-800 dark:text-green-300">
            Rotation Complete
          </h2>
          <p class="mt-0.5 text-sm text-green-700 dark:text-green-400">
            The rotation has been run successfully.
          </p>
        </div>
      </div>

      <div v-if="result.assignments?.length" class="space-y-3">
        <h3 class="text-sm font-medium text-muted-foreground">
          Assignments ({{ result.assignments.length }})
        </h3>
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
                    .map((reviewer) =>
                      reviewer.developer
                        ? `${reviewer.developer.firstName} ${reviewer.developer.lastName}`
                        : reviewer.reviewerDeveloperId,
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
            <TrimText>Back to Rotation History</TrimText>
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
