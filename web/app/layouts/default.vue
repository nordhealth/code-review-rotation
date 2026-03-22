<script setup lang="ts">
import {
  BookOpen,
  Bot,
  CalendarClock,
  ChevronDown,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-vue-next'

const { user, clear } = useUserSession()
const colorMode = useColorMode()

const mainNav = [
  { name: 'Teams', to: '/', icon: LayoutDashboard },
  { name: 'Developers', to: '/developers', icon: Users },
]

const userMenuItems = computed(() => {
  if (user.value?.role !== 'admin')
    return []
  return {
    admin: [
      { name: 'All Schedules', to: '/all-schedules', icon: CalendarClock },
      { name: 'Users', to: '/users', icon: ShieldCheck },
      { name: 'Settings', to: '/settings', icon: Settings },
    ],
    api: [
      { name: 'API Keys', to: '/api-keys', icon: Key },
      { name: 'API Docs', to: '/docs/api', icon: BookOpen, external: true },
      { name: 'MCP Server', to: '/docs/mcp', icon: Bot },
    ],
  }
})

const route = useRoute()

const allDropdownPaths = computed(() => {
  const items = userMenuItems.value
  if (Array.isArray(items))
    return []
  return [...(items.admin ?? []), ...(items.api ?? [])].map(item => item.to)
})

const isDropdownPageActive = computed(() =>
  allDropdownPaths.value.some(path => route.path.startsWith(path)),
)

const isMainNavActive = computed(() =>
  mainNav.some(item => isMenuItemActive(item.to)),
)

function isMenuItemActive(to: string) {
  if (to === '/')
    return route.path === '/' || route.path.startsWith('/teams')
  return route.path.startsWith(to)
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  navigateTo('/login')
}

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen">
    <NuxtLoadingIndicator color="var(--color-primary)" />
    <nav class="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-semibold tracking-tight">
          <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 150 150" width="24" xmlns="http://www.w3.org/2000/svg"><rect fill="#3559c7" height="150" rx="33" width="150" /><g fill="#fff"><path d="m104.46 121.081c-4.137 0-8.0751-1.591-11.0187-4.535l-.0795-.079c-.0796-.04-.1194-.12-.1989-.16l-41.4886-41.9257 6.7623-6.7623 41.409 40.255.0796.08c.0798.04.1188.119.1988.199 1.154 1.154 2.705 1.83 4.336 1.83 3.381 0 6.563-2.785 6.563-6.245v-58.355c0-3.4607-3.142-6.2451-6.563-6.2451-1.551 0-3.103.6364-4.256 1.7502l-.12.1193-19.5706 17.9798-6.7622-6.7623 19.3719-19.372c.0398-.0397.0796-.1193.1591-.1591 2.9834-2.9833 7.0408-4.6938 11.1778-4.6938 8.592 0 15.991 6.9612 16.11 15.5532v62.0138c-.159 8.592-7.558 15.514-16.11 15.514z" /><path d="m44.7124 28c4.1369 0 8.0749 1.5911 11.0185 4.5347l.0795.0796c.0796.0397.1194.1193.1989.1591l41.8864 41.5283-6.7623 6.7623-41.8068-39.8577-.0795-.0795c-.0796-.0398-.1194-.1194-.1989-.1989-1.1536-1.1536-2.7049-1.8298-4.3358-1.8298-3.3812 0-6.1657 2.7845-6.1657 6.2452v58.3547c0 3.46 2.7447 6.245 6.1657 6.245 1.5513 0 3.1026-.636 4.2562-1.75l.1193-.12 19.5709-17.9793 6.7623 6.7622-19.372 19.3721c-.0398.04-.0795.119-.1591.159-2.9833 2.983-7.0407 4.694-11.1776 4.694-8.5921 0-15.5931-6.961-15.7124-15.553v-62.0145c.1591-8.5921 7.1601-15.5135 15.7124-15.5135z" /></g></svg>
          <TrimText>
            Review
          </TrimText>
        </NuxtLink>

        <UIDropdownMenu class="sm:hidden">
          <UIDropdownMenuTrigger as-child>
            <button
              type="button"
              aria-label="Open navigation menu"
              class="rounded-md p-1.5 transition-colors hover:bg-muted hover:text-foreground sm:hidden"
              :class="isMainNavActive ? 'bg-primary/10 text-primary-text' : 'text-muted-foreground'"
            >
              <Menu class="size-5" />
            </button>
          </UIDropdownMenuTrigger>
          <UIDropdownMenuContent align="start">
            <NuxtLink
              v-for="item in mainNav"
              :key="item.to"
              :to="item.to"
            >
              <UIDropdownMenuItem
                class="cursor-pointer"
                :class="isMenuItemActive(item.to) ? 'bg-primary/10 text-primary-text' : ''"
              >
                <component :is="item.icon" class="mr-2 size-4" />
                {{ item.name }}
              </UIDropdownMenuItem>
            </NuxtLink>
          </UIDropdownMenuContent>
        </UIDropdownMenu>

        <div class="hidden sm:flex items-center gap-1">
          <NuxtLink
            v-for="item in mainNav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            active-class="!bg-primary/10 !text-primary-text"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            <TrimText>{{ item.name }}</TrimText>
          </NuxtLink>
        </div>

        <div class="ml-auto flex min-w-0 items-center gap-3">
          <UIDropdownMenu v-if="user">
            <UIDropdownMenuTrigger as-child>
              <button
                type="button"
                class="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground"
                :class="isDropdownPageActive ? 'bg-primary/10 text-primary-text' : 'text-muted-foreground'"
              >
                <TrimText class="truncate">
                  {{ user.name }}
                </TrimText>
                <ChevronDown class="size-3.5 shrink-0" />
              </button>
            </UIDropdownMenuTrigger>
            <UIDropdownMenuContent align="end" class="min-w-56">
              <UIDropdownMenuLabel class="font-normal">
                <p class="max-w-[17.5rem] truncate text-xs text-muted-foreground">
                  {{ user.email }}
                </p>
              </UIDropdownMenuLabel>
              <template v-if="userMenuItems.admin?.length">
                <UIDropdownMenuSeparator />
                <NuxtLink
                  v-for="item in userMenuItems.admin"
                  :key="item.to"
                  :to="item.to"
                >
                  <UIDropdownMenuItem
                    class="cursor-pointer"
                    :class="isMenuItemActive(item.to) ? 'bg-primary/10 text-primary-text' : ''"
                  >
                    <component :is="item.icon" class="mr-2 size-4" />
                    {{ item.name }}
                  </UIDropdownMenuItem>
                </NuxtLink>
              </template>
              <template v-if="userMenuItems.api?.length">
                <UIDropdownMenuSeparator />
                <NuxtLink
                  v-for="item in userMenuItems.api"
                  :key="item.to"
                  :to="item.to"
                  :external="item.external"
                  :target="item.external ? '_blank' : undefined"
                >
                  <UIDropdownMenuItem
                    class="cursor-pointer"
                    :class="isMenuItemActive(item.to) ? 'bg-primary/10 text-primary-text' : ''"
                  >
                    <component :is="item.icon" class="mr-2 size-4" />
                    {{ item.name }}
                  </UIDropdownMenuItem>
                </NuxtLink>
              </template>
              <UIDropdownMenuSeparator />
              <UIDropdownMenuItem class="cursor-pointer" @click="logout">
                <LogOut class="mr-2 size-4" />
                Sign out
              </UIDropdownMenuItem>
            </UIDropdownMenuContent>
          </UIDropdownMenu>

          <button
            type="button"
            :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            class="rounded-md p-1.5 text-muted-foreground transition-transform hover:bg-muted hover:text-foreground active:rotate-45"
            @click="toggleColorMode"
          >
            <Sun v-if="colorMode.value === 'dark'" class="size-4" />
            <Moon v-else class="size-4" />
          </button>
        </div>
      </div>
    </nav>

    <main class="mx-auto max-w-7xl px-4 pt-6 pb-16">
      <slot />
    </main>

    <ConfirmDialog />
  </div>
</template>
