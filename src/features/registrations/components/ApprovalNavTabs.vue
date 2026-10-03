<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{
  newUserCount?: number
  scheduleCount?: number
  vehicleCount?: number
}>()

const route = useRoute()
const router = useRouter()

const tabs = computed(() => [
  {
    key: 'new-users',
    label: 'New User Approvals',
    path: '/approvals/new-users',
    icon: 'newUser',
    count: props.newUserCount
  },
  {
    key: 'schedules',
    label: 'COR & Schedule Approvals',
    path: '/approvals/schedules',
    icon: 'schedule',
    count: props.scheduleCount
  },
  {
    key: 'vehicles',
    label: 'Vehicle Approvals',
    path: '/approvals/vehicles',
    icon: 'vehicle',
    count: props.vehicleCount
  }
])

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path)
}

function navigateToTab(path: string) {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none"
      :class="[
        isActive(tab.path)
          ? 'bg-[#D22730] text-white shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
      ]"
      @click="navigateToTab(tab.path)"
    >
      <!-- New User Icon -->
      <svg
        v-if="tab.icon === 'newUser'"
        class="w-4 h-4 flex-shrink-0"
        :class="isActive(tab.path) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
      </svg>

      <!-- COR & Schedule Icon -->
      <svg
        v-else-if="tab.icon === 'schedule'"
        class="w-4 h-4 flex-shrink-0"
        :class="isActive(tab.path) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="12 14 12 17 15 17" />
      </svg>

      <!-- Vehicle Icon -->
      <svg
        v-else-if="tab.icon === 'vehicle'"
        class="w-4 h-4 flex-shrink-0"
        :class="isActive(tab.path) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 17h14" />
        <path d="M6 11l1.5-4.5a1 1 0 0 1 .95-.5h7.1a1 1 0 0 1 .95.5L18 11" />
        <rect x="3" y="11" width="18" height="6" rx="2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>

      <span>{{ tab.label }}</span>

      <span
        v-if="tab.count !== undefined && tab.count > 0"
        class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold"
        :class="isActive(tab.path) ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
