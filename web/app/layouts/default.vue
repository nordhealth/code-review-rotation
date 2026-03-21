<script setup lang="ts">
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  Key,
  LogOut,
  Moon,
  Sun,
} from "lucide-vue-next";

const { user, clear } = useUserSession();
const colorMode = useColorMode();

const navigation = computed(() => {
  const items = [
    { name: "Teams", to: "/", icon: LayoutDashboard },
    { name: "Developers", to: "/developers", icon: Users },
    { name: "API Keys", to: "/api-keys", icon: Key },
  ];
  if (user.value?.role === "admin") {
    items.push({ name: "Users", to: "/users", icon: ShieldCheck });
    items.push({ name: "Settings", to: "/settings", icon: Settings });
  }
  return items;
});

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await clear();
  navigateTo("/login");
}

function toggleColorMode() {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <div class="min-h-screen">
    <nav class="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight"> ReviewLeash </NuxtLink>

        <div class="flex items-center gap-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            active-class="!bg-primary/10 !text-primary"
          >
            <component :is="item.icon" class="size-4" />
            {{ item.name }}
          </NuxtLink>
        </div>

        <div class="ml-auto flex items-center gap-3">
          <button
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            @click="toggleColorMode"
          >
            <Sun v-if="colorMode.value === 'dark'" class="size-4" />
            <Moon v-else class="size-4" />
          </button>

          <div v-if="user" class="flex items-center gap-2 text-sm">
            <span class="text-muted-foreground">{{ user.name }}</span>
            <button
              class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Sign out"
              @click="logout"
            >
              <LogOut class="size-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
