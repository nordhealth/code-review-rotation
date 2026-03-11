<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const devSlug = route.params.id as string;

const { data: developer } = await useFetch(`/api/developers/${devSlug}`);

const form = reactive({
  firstName: developer.value?.firstName ?? "",
  lastName: developer.value?.lastName ?? "",
  slackId: developer.value?.slackId ?? "",
  gitlabId: developer.value?.gitlabId ?? "",
});
const submitting = ref(false);
const error = ref("");

function getInitials(firstName: string, lastName?: string) {
  return `${firstName.charAt(0)}${(lastName ?? "").charAt(0) || ""}`.toUpperCase();
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push(`/developers/${devSlug}`);
  }
}

async function submit() {
  if (!form.firstName || !form.lastName) return;
  submitting.value = true;
  error.value = "";
  try {
    const updated = await $fetch(`/api/developers/${devSlug}`, {
      method: "PUT",
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        slackId: form.slackId || null,
        gitlabId: form.gitlabId || null,
      },
    });
    router.push(`/developers/${updated.slug}`);
  } catch (e: any) {
    error.value = e.data?.message || "Failed to update developer";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-8">
    <div v-if="!developer" class="py-12 text-center text-sm text-muted-foreground">
      Developer not found
    </div>

    <template v-else>
      <!-- Header (matches profile page) -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
          <button class="text-muted-foreground hover:text-foreground" @click="goBack">
            <ArrowLeft class="size-5" />
          </button>
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
              Edit {{ developer.firstName }} {{ developer.lastName }}
            </h1>
            <p class="text-sm text-muted-foreground">Update developer details</p>
          </div>
        </div>
      </div>

      <div v-if="error" class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {{ error }}
      </div>

      <form class="max-w-lg space-y-4" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <UILabel for="edit-dev-firstname">First Name *</UILabel>
            <UIInput id="edit-dev-firstname" v-model="form.firstName" type="text" required />
          </div>
          <div class="space-y-2">
            <UILabel for="edit-dev-lastname">Last Name *</UILabel>
            <UIInput id="edit-dev-lastname" v-model="form.lastName" type="text" required />
          </div>
        </div>

        <div class="space-y-2">
          <UILabel for="edit-dev-slack">Slack ID</UILabel>
          <UIInput id="edit-dev-slack" v-model="form.slackId" type="text" placeholder="U0..." />
        </div>

        <div class="space-y-2">
          <UILabel for="edit-dev-gitlab">GitLab ID</UILabel>
          <UIInput id="edit-dev-gitlab" v-model="form.gitlabId" type="text" />
        </div>

        <div class="flex items-center gap-3 pt-2">
          <UIButton type="submit" :disabled="submitting">
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
          <UIButton variant="ghost" @click.prevent="goBack"> Cancel </UIButton>
        </div>
      </form>
    </template>
  </div>
</template>
