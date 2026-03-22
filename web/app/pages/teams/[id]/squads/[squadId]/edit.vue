<script setup lang="ts">
import type { Settings } from '~/types'
import { ArrowLeft } from 'lucide-vue-next'

useHead({ title: 'Edit Squad | Nord Review' })

const route = useRoute()
const router = useRouter()
const teamId = route.params.id as string
const squadId = route.params.squadId as string

const { data: team } = await useFetch(`/api/teams/${teamId}`)
const { data: squad } = await useFetch(`/api/teams/${teamId}/squads/${squadId}`)
const { data: members } = useFetch(`/api/teams/${teamId}/members`)
const { data: globalSettings } = await useFetch<Settings>('/api/settings')

const form = reactive({
  name: squad.value?.name ?? '',
  reviewerCount: squad.value?.reviewerCount ?? 2,
  memberDeveloperIds: squad.value?.members?.map(member => member.developer.id) ?? ([] as string[]),
})

const scheduleForm = reactive({
  rotationIntervalDays: squad.value?.rotationIntervalDays ?? undefined as number | undefined,
  rotationDay: squad.value?.rotationDay ?? undefined as string | undefined,
  rotationTimezone: squad.value?.rotationTimezone ?? undefined as string | undefined,
})

const customInterval = ref(!!squad.value?.rotationIntervalDays)
const customDay = ref(!!squad.value?.rotationDay)
const customTimezone = ref(!!squad.value?.rotationTimezone)

const effectiveTeamInterval = computed(() => team.value?.rotationIntervalDays ?? globalSettings.value?.defaultRotationIntervalDays ?? 14)
const effectiveTeamDay = computed(() => team.value?.rotationDay ?? globalSettings.value?.defaultRotationDay ?? 'wednesday')
const effectiveTeamTimezone = computed(() => team.value?.rotationTimezone ?? globalSettings.value?.defaultRotationTimezone ?? 'Europe/Helsinki')

const submitting = ref(false)
const error = ref('')

function toggleMember(devId: string) {
  const idx = form.memberDeveloperIds.indexOf(devId)
  if (idx >= 0) {
    form.memberDeveloperIds.splice(idx, 1)
  }
  else {
    form.memberDeveloperIds.push(devId)
  }
}

async function submit() {
  if (!form.name)
    return
  submitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/teams/${teamId}/squads/${squadId}`, {
      method: 'PUT',
      body: {
        name: form.name,
        reviewerCount: form.reviewerCount,
        memberDeveloperIds: form.memberDeveloperIds,
        rotationIntervalDays: customInterval.value
          ? (scheduleForm.rotationIntervalDays ?? null)
          : null,
        rotationDay: customDay.value ? (scheduleForm.rotationDay ?? null) : null,
        rotationTimezone: customTimezone.value ? (scheduleForm.rotationTimezone ?? null) : null,
      },
    })
    router.push(`/teams/${teamId}/squads`)
  }
  catch (caughtError: unknown) {
    const message = (caughtError as { data?: { message?: string } })?.data?.message
    error.value = message || 'Failed to update squad'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink :to="`/teams/${teamId}/squads`" class="text-muted-foreground hover:text-foreground">
        <ArrowLeft class="size-5" />
      </NuxtLink>
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">
          Edit Squad
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ squad?.name ?? "Squad" }} · {{ team?.name ?? "Team" }}
        </p>
      </div>
    </div>

    <div v-if="!squad" class="py-12 text-center text-sm text-muted-foreground">
      Squad not found
    </div>

    <template v-else>
      <ErrorBanner v-if="error" :message="error" />

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-2">
          <UILabel for="squad-name">
            Name *
          </UILabel>
          <UIInput id="squad-name" v-model="form.name" type="text" placeholder="Bug Sheriff" required />
        </div>

        <div class="space-y-2">
          <UILabel for="squad-count">
            Reviewer Count
          </UILabel>
          <UINumberField v-model="form.reviewerCount" :min="1">
            <UINumberFieldContent>
              <UINumberFieldDecrement />
              <UINumberFieldInput id="squad-count" />
              <UINumberFieldIncrement />
            </UINumberFieldContent>
          </UINumberField>
          <p class="text-sm text-muted-foreground">
            Number of reviewers assigned to this squad per rotation
          </p>
        </div>

        <div class="space-y-2">
          <UILabel>Members</UILabel>
          <div class="flex flex-wrap gap-1">
            <UIButton
              v-for="member in members"
              :key="member.developerId"
              type="button"
              size="sm"
              :variant="
                form.memberDeveloperIds.includes(member.developerId) ? 'default' : 'secondary'
              "
              class="h-auto rounded-full px-2.5 py-1 text-xs"
              @click="toggleMember(member.developerId)"
            >
              {{ member.developer.firstName }} {{ member.developer.lastName }}
            </UIButton>
          </div>
          <p v-if="form.memberDeveloperIds.length" class="text-sm text-muted-foreground">
            {{ form.memberDeveloperIds.length }} selected
          </p>
        </div>

        <div class="border-t pt-4">
          <h3 class="text-sm font-semibold">
            Rotation Schedule
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Override the team schedule for this squad. Unchecked fields use the team's setting.
          </p>

          <div class="mt-4 space-y-4">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UICheckbox
                  id="squad-custom-interval"
                  :checked="customInterval"
                  @update:checked="customInterval = $event"
                />
                <UILabel for="squad-custom-interval">
                  Custom interval
                </UILabel>
              </div>
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
                Using team setting: {{ effectiveTeamInterval }} days
              </p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UICheckbox
                  id="squad-custom-day"
                  :checked="customDay"
                  @update:checked="customDay = $event"
                />
                <UILabel for="squad-custom-day">
                  Custom day
                </UILabel>
              </div>
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
                Using team setting: {{ capitalizeFirst(effectiveTeamDay) }}
              </p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UICheckbox
                  id="squad-custom-timezone"
                  :checked="customTimezone"
                  @update:checked="customTimezone = $event"
                />
                <UILabel for="squad-custom-timezone">
                  Custom timezone
                </UILabel>
              </div>
              <UIInput
                v-model="scheduleForm.rotationTimezone"
                type="text"
                :disabled="!customTimezone"
                placeholder="America/New_York"
              />
              <p v-if="!customTimezone" class="text-sm text-muted-foreground">
                Using team setting: {{ effectiveTeamTimezone }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <UIButton type="submit" :disabled="!form.name || submitting">
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
          <UIButton as-child variant="ghost">
            <NuxtLink :to="`/teams/${teamId}/squads`">
              <TrimText>Cancel</TrimText>
            </NuxtLink>
          </UIButton>
        </div>
      </form>
    </template>
  </div>
</template>
