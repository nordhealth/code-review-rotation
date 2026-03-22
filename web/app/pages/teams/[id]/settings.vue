<script setup lang="ts">
import type { Settings } from '~/types'
import { Save, Trash2 } from 'lucide-vue-next'

useHead({ title: 'Team Settings | Nord Review' })

const route = useRoute()
const router = useRouter()
const teamId = route.params.id as string

const { data: team } = await useFetch(`/api/teams/${teamId}`)
const { data: globalSettings } = await useFetch<Settings>('/api/settings')

const form = reactive({
  name: team.value?.name ?? '',
  defaultReviewerCount: team.value?.defaultReviewerCount ?? 2,
})

const scheduleForm = reactive({
  rotationIntervalDays: team.value?.rotationIntervalDays ?? undefined,
  rotationDay: team.value?.rotationDay ?? undefined,
  rotationTimezone: team.value?.rotationTimezone ?? undefined,
})

const customInterval = ref(!!team.value?.rotationIntervalDays)
const customDay = ref(!!team.value?.rotationDay)
const customTimezone = ref(!!team.value?.rotationTimezone)

const { confirm } = useConfirm()

const submitting = ref(false)
const scheduleSubmitting = ref(false)
const error = ref('')

async function save() {
  if (!form.name)
    return
  submitting.value = true
  error.value = ''
  try {
    const updated = await $fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      body: {
        name: form.name,
        defaultReviewerCount: form.defaultReviewerCount,
      },
    })
    router.push(`/teams/${updated.slug}`)
  }
  catch (submitError) {
    error.value = extractErrorMessage(submitError, 'Failed to update team')
  }
  finally {
    submitting.value = false
  }
}

async function saveSchedule() {
  scheduleSubmitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      body: {
        rotationIntervalDays: customInterval.value
          ? (scheduleForm.rotationIntervalDays ?? null)
          : null,
        rotationDay: customDay.value ? (scheduleForm.rotationDay ?? null) : null,
        rotationTimezone: customTimezone.value ? (scheduleForm.rotationTimezone ?? null) : null,
      },
    })
  }
  catch (submitError) {
    error.value = extractErrorMessage(submitError, 'Failed to update schedule')
  }
  finally {
    scheduleSubmitting.value = false
  }
}

async function deleteTeam() {
  const confirmed = await confirm({
    title: 'Delete team',
    description: `Are you sure you want to delete "${team.value?.name}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed)
    return
  try {
    await $fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
    router.push('/')
  }
  catch (deleteError) {
    error.value = extractErrorMessage(deleteError, 'Failed to delete team')
  }
}
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'" />

    <div class="max-w-xl space-y-6">
      <ErrorBanner v-if="error" :message="error" />

      <!-- General -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          General
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Team name and default reviewer count.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="save">
          <div class="space-y-2">
            <UILabel for="team-name">
              Team Name *
            </UILabel>
            <UIInput id="team-name" v-model="form.name" type="text" placeholder="Clinical Foundation" required />
          </div>

          <div class="space-y-2">
            <UILabel for="team-count">
              Default Reviewer Count
            </UILabel>
            <UINumberField v-model="form.defaultReviewerCount" :min="1">
              <UINumberFieldContent>
                <UINumberFieldDecrement />
                <UINumberFieldInput id="team-count" />
                <UINumberFieldIncrement />
              </UINumberFieldContent>
            </UINumberField>
          </div>

          <UIButton type="submit" :disabled="submitting">
            <Save class="size-4" />
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
        </form>
      </div>

      <!-- Rotation Schedule -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          Rotation Schedule
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Override global defaults for this team. Unchecked fields use the global default.
        </p>

        <form class="mt-5 space-y-5" @submit.prevent="saveSchedule">
          <!-- Custom interval -->
          <div class="space-y-2">
            <label for="use-custom-interval" class="flex items-center gap-2 cursor-pointer select-none">
              <UICheckbox
                id="use-custom-interval"
                :checked="customInterval"
                @update:checked="customInterval = $event"
              />
              <span class="text-sm font-medium">Custom interval</span>
            </label>
            <UINumberField
              v-model="scheduleForm.rotationIntervalDays"
              :min="1"
              :max="90"
              :disabled="!customInterval"
            >
              <UINumberFieldContent>
                <UINumberFieldDecrement />
                <UINumberFieldInput />
                <UINumberFieldIncrement />
              </UINumberFieldContent>
            </UINumberField>
            <p v-if="!customInterval" class="text-sm text-muted-foreground">
              Using global default: {{ globalSettings?.defaultRotationIntervalDays ?? 14 }} days
            </p>
          </div>

          <!-- Custom day -->
          <div class="space-y-2">
            <label for="use-custom-day" class="flex items-center gap-2 cursor-pointer select-none">
              <UICheckbox
                id="use-custom-day"
                :checked="customDay"
                @update:checked="customDay = $event"
              />
              <span class="text-sm font-medium">Custom day</span>
            </label>
            <UISelect v-model="scheduleForm.rotationDay" :disabled="!customDay">
              <UISelectTrigger>
                <UISelectValue placeholder="Select day" />
              </UISelectTrigger>
              <UISelectContent>
                <UISelectItem v-for="day in DAYS_OF_WEEK" :key="day.value" :value="day.value">
                  {{ day.label }}
                </UISelectItem>
              </UISelectContent>
            </UISelect>
            <p v-if="!customDay" class="text-sm text-muted-foreground">
              Using global default:
              {{ capitalizeFirst(globalSettings?.defaultRotationDay ?? "wednesday") }}
            </p>
          </div>

          <!-- Custom timezone -->
          <div class="space-y-2">
            <label for="use-custom-timezone" class="flex items-center gap-2 cursor-pointer select-none">
              <UICheckbox
                id="use-custom-timezone"
                :checked="customTimezone"
                @update:checked="customTimezone = $event"
              />
              <span class="text-sm font-medium">Custom timezone</span>
            </label>
            <UIInput
              v-model="scheduleForm.rotationTimezone"
              type="text"
              :disabled="!customTimezone"
              placeholder="America/New_York"
            />
            <p v-if="!customTimezone" class="text-sm text-muted-foreground">
              Using global default:
              {{ globalSettings?.defaultRotationTimezone ?? "Europe/Helsinki" }}
            </p>
          </div>

          <UIButton type="submit" :disabled="scheduleSubmitting">
            <Save class="size-4" />
            {{ scheduleSubmitting ? "Saving..." : "Save Schedule" }}
          </UIButton>
        </form>
      </div>

      <!-- Danger Zone -->
      <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <h3 class="text-base font-semibold text-destructive">
          Danger Zone
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Deleting this team will remove all members, squads, and rotation history.
        </p>
        <UIButton variant="destructive" type="button" class="mt-4" @click="deleteTeam">
          <Trash2 class="size-4" />
          Delete Team
        </UIButton>
      </div>
    </div>
  </div>
</template>
