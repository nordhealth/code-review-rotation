<script setup lang="ts">
import { Save, Trash2 } from "lucide-vue-next";
import type { Settings } from "~/types";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const route = useRoute();
const router = useRouter();
const teamId = route.params.id as string;

const { data: team } = await useFetch(`/api/teams/${teamId}`);
const { data: globalSettings } = await useFetch<Settings>("/api/settings");

const form = reactive({
  name: team.value?.name ?? "",
  defaultReviewerCount: team.value?.defaultReviewerCount ?? 2,
});

const scheduleForm = reactive({
  rotationIntervalDays: team.value?.rotationIntervalDays ?? undefined,
  rotationDay: team.value?.rotationDay ?? undefined,
  rotationTime: team.value?.rotationTime ?? undefined,
  rotationTimezone: team.value?.rotationTimezone ?? undefined,
});

const useGlobalInterval = ref(team.value?.rotationIntervalDays === null);
const useGlobalDay = ref(team.value?.rotationDay === null);
const useGlobalTime = ref(team.value?.rotationTime === null);
const useGlobalTimezone = ref(team.value?.rotationTimezone === null);

const submitting = ref(false);
const scheduleSubmitting = ref(false);
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
  } catch (submitError: any) {
    error.value = submitError.data?.message || "Failed to update team";
  } finally {
    submitting.value = false;
  }
}

async function saveSchedule() {
  scheduleSubmitting.value = true;
  error.value = "";
  try {
    await $fetch(`/api/teams/${teamId}`, {
      method: "PUT",
      body: {
        rotationIntervalDays: useGlobalInterval.value
          ? null
          : (scheduleForm.rotationIntervalDays ?? null),
        rotationDay: useGlobalDay.value ? null : (scheduleForm.rotationDay ?? null),
        rotationTime: useGlobalTime.value ? null : (scheduleForm.rotationTime ?? null),
        rotationTimezone: useGlobalTimezone.value ? null : (scheduleForm.rotationTimezone ?? null),
      },
    });
  } catch (submitError: any) {
    error.value = submitError.data?.message || "Failed to update schedule";
  } finally {
    scheduleSubmitting.value = false;
  }
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function deleteTeam() {
  if (
    !window.confirm(`Are you sure you want to delete "${team.value?.name}"? This cannot be undone.`)
  )
    return;
  try {
    await $fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    router.push("/");
  } catch (deleteError: any) {
    error.value = deleteError.data?.message || "Failed to delete team";
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
        <h3 class="text-sm font-semibold">Rotation Schedule</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Override global defaults for this team. Unchecked fields use the global default.
        </p>

        <form class="mt-4 space-y-4" @submit.prevent="saveSchedule">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UICheckbox
                id="use-custom-interval"
                :checked="!useGlobalInterval"
                @update:checked="(value: boolean) => (useGlobalInterval = !value)"
              />
              <UILabel for="use-custom-interval">Custom interval</UILabel>
            </div>
            <UINumberField
              v-model="scheduleForm.rotationIntervalDays"
              :min="1"
              :max="90"
              :disabled="useGlobalInterval"
            >
              <UINumberFieldContent>
                <UINumberFieldDecrement />
                <UINumberFieldInput />
                <UINumberFieldIncrement />
              </UINumberFieldContent>
            </UINumberField>
            <p v-if="useGlobalInterval" class="text-xs text-muted-foreground">
              Using global default: {{ globalSettings?.defaultRotationIntervalDays ?? 14 }} days
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UICheckbox
                id="use-custom-day"
                :checked="!useGlobalDay"
                @update:checked="(value: boolean) => (useGlobalDay = !value)"
              />
              <UILabel for="use-custom-day">Custom day</UILabel>
            </div>
            <UISelect v-model="scheduleForm.rotationDay" :disabled="useGlobalDay">
              <UISelectTrigger>
                <UISelectValue placeholder="Select day" />
              </UISelectTrigger>
              <UISelectContent>
                <UISelectItem v-for="day in DAYS_OF_WEEK" :key="day.value" :value="day.value">
                  {{ day.label }}
                </UISelectItem>
              </UISelectContent>
            </UISelect>
            <p v-if="useGlobalDay" class="text-xs text-muted-foreground">
              Using global default:
              {{ capitalizeFirst(globalSettings?.defaultRotationDay ?? "wednesday") }}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UICheckbox
                id="use-custom-time"
                :checked="!useGlobalTime"
                @update:checked="(value: boolean) => (useGlobalTime = !value)"
              />
              <UILabel for="use-custom-time">Custom time</UILabel>
            </div>
            <UIInput v-model="scheduleForm.rotationTime" type="time" :disabled="useGlobalTime" />
            <p v-if="useGlobalTime" class="text-xs text-muted-foreground">
              Using global default: {{ globalSettings?.defaultRotationTime ?? "04:00" }}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UICheckbox
                id="use-custom-timezone"
                :checked="!useGlobalTimezone"
                @update:checked="(value: boolean) => (useGlobalTimezone = !value)"
              />
              <UILabel for="use-custom-timezone">Custom timezone</UILabel>
            </div>
            <UIInput
              v-model="scheduleForm.rotationTimezone"
              type="text"
              :disabled="useGlobalTimezone"
              placeholder="e.g. America/New_York"
            />
            <p v-if="useGlobalTimezone" class="text-xs text-muted-foreground">
              Using global default:
              {{ globalSettings?.defaultRotationTimezone ?? "Europe/Helsinki" }}
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <UIButton type="submit" :disabled="scheduleSubmitting">
              <Save class="size-4" />
              {{ scheduleSubmitting ? "Saving..." : "Save Schedule" }}
            </UIButton>
          </div>
        </form>
      </div>

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
