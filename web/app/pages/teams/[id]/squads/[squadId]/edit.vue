<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

useHead({ title: 'Edit Squad | Nord Review' })

const route = useRoute()
const router = useRouter()
const teamId = route.params.id as string
const squadId = route.params.squadId as string

const { data: team } = await useFetch(`/api/teams/${teamId}`)
const { data: squad } = await useFetch(`/api/teams/${teamId}/squads/${squadId}`)
const { data: members } = useFetch(`/api/teams/${teamId}/members`)

const form = reactive({
  name: squad.value?.name ?? '',
  reviewerCount: squad.value?.reviewerCount ?? 2,
  memberDeveloperIds: squad.value?.members?.map(member => member.developer.id) ?? ([] as string[]),
})
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
        <h1 class="text-2xl font-semibold tracking-tight">
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
          <UIInput id="squad-name" v-model="form.name" type="text" required />
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
          <p class="text-xs text-muted-foreground">
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
          <p v-if="form.memberDeveloperIds.length" class="text-xs text-muted-foreground">
            {{ form.memberDeveloperIds.length }} selected
          </p>
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
