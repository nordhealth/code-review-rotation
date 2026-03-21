<script setup lang="ts">
const props = defineProps<{
  id?: string;
  modelValue: string;
  autocomplete?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const DOMAINS = ["nordhealth.com", "provet.com"] as const;

const username = ref("");
const domain = ref<string>(DOMAINS[0]);
const hiddenEmailRef = ref<HTMLInputElement | null>(null);

// Compose full email from parts
const fullEmail = computed(() => {
  if (!username.value) return "";
  return `${username.value}@${domain.value}`;
});

// Sync outward when parts change
watch([username, domain], () => {
  emit("update:modelValue", fullEmail.value);
});

// Parse incoming email — extracts username, updates domain if recognized
function parseEmail(email: string) {
  const atIdx = email.indexOf("@");
  if (atIdx === -1) {
    username.value = email;
    return;
  }
  const user = email.slice(0, atIdx);
  const dom = email.slice(atIdx + 1);
  username.value = user;
  if (dom && (DOMAINS as readonly string[]).includes(dom)) {
    domain.value = dom;
  }
}

// Watch username for any @ that slips through (autofill, drag-drop, IME)
watch(username, (val) => {
  if (val.includes("@")) {
    parseEmail(val);
  }
});

// Block @ from being typed
function onKeydown(e: KeyboardEvent) {
  if (e.key === "@") {
    e.preventDefault();
  }
}

// Handle paste — extract username part, update domain if it matches
function onPaste(e: ClipboardEvent) {
  e.preventDefault();
  const pasted = e.clipboardData?.getData("text")?.trim() ?? "";
  parseEmail(pasted);
}

// Sync inward when modelValue changes externally
watch(
  () => props.modelValue,
  (val) => {
    if (val && val !== fullEmail.value) {
      parseEmail(val);
    }
  },
  { immediate: true },
);

// Detect browser autofill on the hidden input
function onHiddenInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.value && target.value !== fullEmail.value) {
    parseEmail(target.value);
  }
}

// Poll for autofill (some browsers don't fire input events)
const { pause: pauseAutofillPoll } = useIntervalFn(() => {
  if (hiddenEmailRef.value?.value && hiddenEmailRef.value.value !== fullEmail.value) {
    parseEmail(hiddenEmailRef.value.value);
  }
}, 500);
</script>

<template>
  <div class="space-y-1">
    <!-- Hidden real email input for browser autocomplete / password managers -->
    <input
      ref="hiddenEmailRef"
      type="email"
      name="email"
      :autocomplete="autocomplete || 'email'"
      :value="fullEmail"
      inert
      class="absolute h-0 w-0 overflow-hidden opacity-0"
      @input="onHiddenInput"
    />

    <!-- Visible username + domain selector -->
    <div class="flex gap-1.5">
      <div class="relative flex-1">
        <UIInput
          :id="id"
          v-model="username"
          type="text"
          :disabled="disabled"
          placeholder="Username"
          autocomplete="off"
          @keydown="onKeydown"
          @paste="onPaste"
        />
      </div>

      <UISelect v-model="domain" :disabled="disabled">
        <UISelectTrigger aria-label="Email domain" class="w-auto">
          <UISelectValue />
        </UISelectTrigger>
        <UISelectContent>
          <UISelectItem v-for="d in DOMAINS" :key="d" :value="d">
            @{{ d }}
          </UISelectItem>
        </UISelectContent>
      </UISelect>
    </div>
  </div>
</template>
