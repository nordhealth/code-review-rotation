<script setup lang="ts">
import { Save, Trash2 } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const teamId = route.params.id as string;

const { data: team } = await useFetch(`/api/teams/${teamId}`);

const form = reactive({
  name: team.value?.name ?? "",
  defaultReviewerCount: team.value?.defaultReviewerCount ?? 2,
});
const submitting = ref(false);
const error = ref("");

async function save() {
  if (!form.name) return;
  submitting.value = true;
  error.value = "";
  try {
    const updated = await $fetch(`/api/teams/${teamId}`, {
      method: "PUT",
      body: {
        name: form.name,
        defaultReviewerCount: form.defaultReviewerCount,
      },
    });
    router.push(`/teams/${updated.slug}`);
  } catch (e: any) {
    error.value = e.data?.message || "Failed to update team";
  } finally {
    submitting.value = false;
  }
}

async function deleteTeam() {
  if (
    !window.confirm(`Are you sure you want to delete "${team.value?.name}"? This cannot be undone.`)
  )
    return;
  try {
    await $fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    router.push("/");
  } catch (e: any) {
    error.value = e.data?.message || "Failed to delete team";
  }
}
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'" />

    <div class="max-w-lg space-y-6">
      <div v-if="error" class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {{ error }}
      </div>

      <form class="space-y-4" @submit.prevent="save">
        <div class="space-y-2">
          <UILabel for="team-name">Team Name *</UILabel>
          <UIInput id="team-name" v-model="form.name" type="text" required />
        </div>

        <div class="space-y-2">
          <UILabel for="team-count">Default Reviewer Count</UILabel>
          <UINumberField v-model="form.defaultReviewerCount" :min="1">
            <UINumberFieldContent>
              <UINumberFieldDecrement />
              <UINumberFieldInput id="team-count" />
              <UINumberFieldIncrement />
            </UINumberFieldContent>
          </UINumberField>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <UIButton type="submit" :disabled="submitting">
            <Save class="size-4" />
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
        </div>
      </form>

      <div class="border-t pt-6">
        <h3 class="text-sm font-medium text-destructive">Danger Zone</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Deleting this team will remove all members, squads, and rotation history.
        </p>
        <UIButton variant="destructive" class="mt-3" @click="deleteTeam">
          <Trash2 class="size-4" />
          Delete Team
        </UIButton>
      </div>
    </div>
  </div>
</template>
