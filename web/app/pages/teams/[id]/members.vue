<script setup lang="ts">
import { Plus, Trash2, Check, ChevronsUpDown, X } from "lucide-vue-next";

const route = useRoute();
const teamId = route.params.id as string;

const { data: team } = await useFetch(`/api/teams/${teamId}`);
const { data: members, refresh: refreshMembers } = useFetch(`/api/teams/${teamId}/members`);
const { data: allDevelopers } = useFetch("/api/developers");

const showAddForm = ref(false);
const selectedDeveloperId = ref("");
const addingMember = ref(false);

const editDialogOpen = ref(false);
const editingMember = ref<any>(null);
const editForm = reactive({
  reviewerCount: null as number | null,
  isExperienced: true,
  preferableReviewerIds: [] as string[],
});

const availableDevelopers = computed(() => {
  if (!allDevelopers.value || !members.value) return [];
  const memberDevIds = new Set(members.value.map((m) => m.developerId));
  return allDevelopers.value.filter((d) => !memberDevIds.has(d.id));
});

async function addMember() {
  if (!selectedDeveloperId.value) return;
  addingMember.value = true;
  try {
    await $fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      body: { developerId: selectedDeveloperId.value },
    });
    showAddForm.value = false;
    selectedDeveloperId.value = "";
    await refreshMembers();
  } catch (e: any) {
    alert(e.data?.message || "Failed to add member");
  } finally {
    addingMember.value = false;
  }
}

function openEditDialog(member: any) {
  editingMember.value = member;
  editForm.reviewerCount = member.reviewerCount ?? team.value?.defaultReviewerCount ?? 2;
  editForm.isExperienced = member.isExperienced === true || member.isExperienced === 1;
  editForm.preferableReviewerIds =
    member.preferableReviewers?.map((p: any) => p.preferredDeveloperId) ?? [];
  reviewersPopoverOpen.value = false;
  editDialogOpen.value = true;
}

async function saveEdit() {
  if (!editingMember.value) return;
  try {
    await $fetch(`/api/teams/${teamId}/members/${editingMember.value.id}`, {
      method: "PUT",
      body: {
        reviewerCount: editForm.reviewerCount,
        isExperienced: editForm.isExperienced,
        preferableReviewerIds: editForm.preferableReviewerIds,
      },
    });
    editDialogOpen.value = false;
    editingMember.value = null;
    await refreshMembers();
  } catch (e: any) {
    alert(e.data?.message || "Failed to update member");
  }
}

async function removeMember(memberId: string, name: string) {
  if (!window.confirm(`Remove ${name} from this team?`)) return;
  try {
    await $fetch(`/api/teams/${teamId}/members/${memberId}`, { method: "DELETE" });
    await refreshMembers();
  } catch (e: any) {
    alert(e.data?.message || "Failed to remove member");
  }
}

const reviewersPopoverOpen = ref(false);

function togglePreferableReviewer(devId: string) {
  const idx = editForm.preferableReviewerIds.indexOf(devId);
  if (idx >= 0) {
    editForm.preferableReviewerIds.splice(idx, 1);
  } else {
    editForm.preferableReviewerIds.push(devId);
  }
}

function getOtherMembers(currentMemberId: string) {
  return members.value?.filter((m) => m.id !== currentMemberId) ?? [];
}

function getMemberName(developerId: string): string {
  const m = members.value?.find((m) => m.developerId === developerId);
  return m ? `${m.developer.firstName} ${m.developer.lastName}` : "?";
}

function getPreferableNames(member: any): string {
  if (!member.preferableReviewers?.length) return "-";
  return member.preferableReviewers
    .map((pref: any) => {
      const m = members.value?.find((m) => m.developerId === pref.preferredDeveloperId);
      return m ? `${m.developer.firstName} ${m.developer.lastName}` : "?";
    })
    .join(", ");
}
</script>

<template>
  <div class="space-y-6">
    <TeamSubNav :team-id="teamId" :team-name="team?.name ?? 'Loading...'">
      <template #actions>
        <UIButton size="sm" @click="showAddForm = !showAddForm">
          <Plus class="size-4" />
          Add Member
        </UIButton>
      </template>
    </TeamSubNav>

    <div v-if="showAddForm" class="rounded-lg border bg-muted/30 p-4">
      <div class="flex items-end gap-3">
        <div class="flex-1 space-y-2">
          <UILabel for="add-member-dev">Developer</UILabel>
          <UISelect v-model="selectedDeveloperId">
            <UISelectTrigger id="add-member-dev">
              <UISelectValue placeholder="Select a developer..." />
            </UISelectTrigger>
            <UISelectContent>
              <UISelectItem v-for="dev in availableDevelopers" :key="dev.id" :value="dev.id">
                {{ dev.firstName }} {{ dev.lastName }}
              </UISelectItem>
            </UISelectContent>
          </UISelect>
        </div>
        <UIButton :disabled="!selectedDeveloperId || addingMember" @click="addMember">
          {{ addingMember ? "Adding..." : "Add" }}
        </UIButton>
        <UIButton variant="ghost" @click="showAddForm = false"> Cancel </UIButton>
      </div>
      <p v-if="availableDevelopers.length === 0" class="mt-2 text-xs text-muted-foreground">
        All developers are already members of this team.
      </p>
    </div>

    <div v-if="members?.length" class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="w-[25%] px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Developer
            </th>
            <th class="w-[15%] px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Reviewer Count
            </th>
            <th class="w-[12%] px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Experienced
            </th>
            <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Preferable Reviewers
            </th>
            <th class="w-[12%] px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.id"
            class="border-b last:border-b-0 hover:bg-muted/30"
          >
            <td class="px-4 py-3 font-medium">
              <NuxtLink :to="`/developers/${member.developer.slug}`" class="hover:underline">
                {{ member.developer.firstName }} {{ member.developer.lastName }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{
                !member.reviewerCount || member.reviewerCount === team?.defaultReviewerCount
                  ? `Team default (${team?.defaultReviewerCount})`
                  : member.reviewerCount
              }}
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  member.isExperienced
                    ? 'border border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'border border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                "
              >
                {{ member.isExperienced ? "Yes" : "No" }}
              </span>
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ getPreferableNames(member) }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <UIButton
                  variant="outline"
                  size="sm"
                  class="h-7 px-2.5 text-xs"
                  @click="openEditDialog(member)"
                >
                  Edit
                </UIButton>
                <UIButton
                  variant="ghost"
                  size="icon-sm"
                  class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove"
                  @click="
                    removeMember(
                      member.id,
                      `${member.developer.firstName} ${member.developer.lastName}`,
                    )
                  "
                >
                  <Trash2 class="size-4" />
                </UIButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
    >
      <p class="text-sm text-muted-foreground">No members yet</p>
      <UIButton size="sm" class="mt-3" @click="showAddForm = true">
        <Plus class="size-4" />
        Add your first member
      </UIButton>
    </div>

    <!-- Edit Member Dialog -->
    <UIDialog v-model:open="editDialogOpen">
      <UIDialogContent class="sm:max-w-md">
        <UIDialogHeader>
          <UIDialogTitle>
            Edit {{ editingMember?.developer.firstName }} {{ editingMember?.developer.lastName }}
          </UIDialogTitle>
        </UIDialogHeader>

        <div class="space-y-6 py-4">
          <div>
            <UILabel for="edit-reviewer-count" class="mb-2 block">Reviewer Count</UILabel>
            <UINumberField
              :model-value="editForm.reviewerCount ?? undefined"
              :min="1"
              @update:model-value="editForm.reviewerCount = $event"
            >
              <UINumberFieldContent>
                <UINumberFieldDecrement />
                <UINumberFieldInput id="edit-reviewer-count" />
                <UINumberFieldIncrement />
              </UINumberFieldContent>
            </UINumberField>
            <p class="mt-1.5 text-xs text-muted-foreground">
              Team default is {{ team?.defaultReviewerCount }}.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <UICheckbox id="edit-experienced" v-model="editForm.isExperienced" />
            <UILabel for="edit-experienced">Experienced developer</UILabel>
          </div>

          <div>
            <UILabel class="mb-2 block">Preferable Reviewers</UILabel>
            <template v-if="editingMember && getOtherMembers(editingMember.id).length">
              <UIPopover v-model:open="reviewersPopoverOpen">
                <UIPopoverTrigger as-child>
                  <UIButton
                    variant="outline"
                    role="combobox"
                    :aria-expanded="reviewersPopoverOpen"
                    class="w-full justify-between font-normal"
                  >
                    <span
                      v-if="editForm.preferableReviewerIds.length === 0"
                      class="text-muted-foreground"
                    >
                      Select reviewers...
                    </span>
                    <span v-else class="truncate">
                      {{ editForm.preferableReviewerIds.length }} selected
                    </span>
                    <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
                  </UIButton>
                </UIPopoverTrigger>
                <UIPopoverContent class="w-[--reka-popover-trigger-width] p-0" align="start">
                  <UICommand multiple :model-value="editForm.preferableReviewerIds">
                    <UICommandInput placeholder="Search members..." />
                    <UICommandEmpty>No members found.</UICommandEmpty>
                    <UICommandList>
                      <UICommandGroup>
                        <UICommandItem
                          v-for="other in getOtherMembers(editingMember.id)"
                          :key="other.id"
                          :value="other.developerId"
                          @select="togglePreferableReviewer(other.developerId)"
                        >
                          <Check
                            class="size-4 shrink-0"
                            :class="
                              editForm.preferableReviewerIds.includes(other.developerId)
                                ? 'opacity-100'
                                : 'opacity-0'
                            "
                          />
                          {{ other.developer.firstName }} {{ other.developer.lastName }}
                        </UICommandItem>
                      </UICommandGroup>
                    </UICommandList>
                  </UICommand>
                </UIPopoverContent>
              </UIPopover>
              <div v-if="editForm.preferableReviewerIds.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="devId in editForm.preferableReviewerIds"
                  :key="devId"
                  class="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs"
                >
                  {{ getMemberName(devId) }}
                  <button
                    type="button"
                    class="rounded-full p-0.5 hover:bg-muted"
                    @click="togglePreferableReviewer(devId)"
                  >
                    <X class="size-3" />
                  </button>
                </span>
              </div>
            </template>
            <p v-else class="text-xs text-muted-foreground">No other members to select.</p>
          </div>
        </div>

        <UIDialogFooter>
          <UIButton variant="ghost" @click="editDialogOpen = false"> Cancel </UIButton>
          <UIButton @click="saveEdit"> Save </UIButton>
        </UIDialogFooter>
      </UIDialogContent>
    </UIDialog>
  </div>
</template>
