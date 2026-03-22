<script setup lang="ts">
import type { Settings } from '~/types'
import { Check, ChevronsUpDown, Save, X } from 'lucide-vue-next'

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
})

const customInterval = ref(!!squad.value?.rotationIntervalDays)
const customDay = ref(!!squad.value?.rotationDay)

const effectiveTeamInterval = computed(() => team.value?.rotationIntervalDays ?? globalSettings.value?.defaultRotationIntervalDays ?? 14)
const effectiveTeamDay = computed(() => team.value?.rotationDay ?? globalSettings.value?.defaultRotationDay ?? 'wednesday')

const submitting = ref(false)
const error = ref('')
const membersOpen = ref(false)

const selectedMembers = computed(() => {
  if (!members.value)
    return []
  return form.memberDeveloperIds
    .map(id => members.value!.find(member => member.developerId === id))
    .filter(Boolean)
})

function toggleMember(devId: string) {
  const idx = form.memberDeveloperIds.indexOf(devId)
  if (idx >= 0) {
    form.memberDeveloperIds.splice(idx, 1)
  }
  else {
    form.memberDeveloperIds.push(devId)
  }
}

function removeMember(devId: string) {
  const idx = form.memberDeveloperIds.indexOf(devId)
  if (idx >= 0) {
    form.memberDeveloperIds.splice(idx, 1)
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
  <div class="space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">
        Edit Squad
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ squad?.name ?? "Squad" }} · {{ team?.name ?? "Team" }}
      </p>
    </div>

    <div v-if="!squad" class="py-12 text-center text-sm text-muted-foreground">
      Squad not found
    </div>

    <template v-else>
      <div class="max-w-xl space-y-6">
        <ErrorBanner v-if="error" :message="error" />

        <!-- General -->
        <div class="rounded-lg border bg-card p-5 shadow-sm">
          <h3 class="text-lg font-semibold">
            General
          </h3>
          <p class="mt-0.5 text-sm text-muted-foreground">
            Squad name, reviewer count, and member selection.
          </p>

          <div class="mt-5 space-y-4">
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
              <div v-if="selectedMembers.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="member in selectedMembers"
                  :key="member!.developerId"
                  class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  <UIAvatar class="size-5">
                    <UIAvatarFallback
                      class="!text-[8px] !font-semibold !leading-none"
                      :label="getInitials(member!.developer.firstName, member!.developer.lastName)"
                    >
                      {{ getInitials(member!.developer.firstName, member!.developer.lastName) }}
                    </UIAvatarFallback>
                  </UIAvatar>
                  <TrimText>{{ member!.developer.firstName }} {{ member!.developer.lastName }}</TrimText>
                  <button
                    type="button"
                    class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    @click="removeMember(member!.developerId)"
                  >
                    <X class="size-3" />
                  </button>
                </span>
              </div>
              <UIPopover v-model:open="membersOpen">
                <UIPopoverTrigger as-child>
                  <UIButton
                    variant="outline"
                    role="combobox"
                    :aria-expanded="membersOpen"
                    class="w-full justify-between"
                    type="button"
                  >
                    <span class="text-muted-foreground">
                      {{ form.memberDeveloperIds.length ? `${form.memberDeveloperIds.length} selected` : 'Select members...' }}
                    </span>
                    <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
                  </UIButton>
                </UIPopoverTrigger>
                <UIPopoverContent class="w-[--reka-popper-anchor-width] p-0">
                  <UICommand>
                    <UICommandInput placeholder="Search member..." />
                    <UICommandEmpty>No members found.</UICommandEmpty>
                    <UICommandList>
                      <UICommandGroup>
                        <UICommandItem
                          v-for="member in members"
                          :key="member.developerId"
                          :value="`${member.developer.firstName} ${member.developer.lastName}`"
                          @select="toggleMember(member.developerId)"
                        >
                          <div class="flex items-center gap-2">
                            <div class="flex size-4 items-center justify-center">
                              <Check
                                v-if="form.memberDeveloperIds.includes(member.developerId)"
                                class="size-3.5"
                              />
                            </div>
                            <UIAvatar class="size-5">
                              <UIAvatarFallback
                                class="!text-[8px] !font-semibold !leading-none"
                                :label="getInitials(member.developer.firstName, member.developer.lastName)"
                              >
                                {{ getInitials(member.developer.firstName, member.developer.lastName) }}
                              </UIAvatarFallback>
                            </UIAvatar>
                            {{ member.developer.firstName }} {{ member.developer.lastName }}
                          </div>
                        </UICommandItem>
                      </UICommandGroup>
                    </UICommandList>
                  </UICommand>
                </UIPopoverContent>
              </UIPopover>
            </div>
          </div>
        </div>

        <!-- Rotation Schedule -->
        <div class="rounded-lg border bg-card p-5 shadow-sm">
          <h3 class="text-lg font-semibold">
            Rotation Schedule
          </h3>
          <p class="mt-0.5 text-sm text-muted-foreground">
            Override the team schedule for this squad. Unchecked fields use the team's setting.
          </p>

          <div class="mt-5 space-y-5">
            <div class="space-y-2">
              <label for="squad-custom-interval" class="flex items-center gap-2 cursor-pointer select-none">
                <UICheckbox
                  id="squad-custom-interval"
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
                Using team setting: {{ effectiveTeamInterval }} days
              </p>
            </div>

            <div class="space-y-2">
              <label for="squad-custom-day" class="flex items-center gap-2 cursor-pointer select-none">
                <UICheckbox
                  id="squad-custom-day"
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
                Using team setting: {{ capitalizeFirst(effectiveTeamDay) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
          <UIButton type="button" :disabled="!form.name || submitting" @click="submit">
            <Save class="size-4" />
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
          <UIButton as-child variant="ghost">
            <NuxtLink :to="`/teams/${teamId}/squads`">
              Cancel
            </NuxtLink>
          </UIButton>
        </div>
      </div>
    </template>
  </div>
</template>
