<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const collapsed = computed(() => appStore.sidebarCollapsed)

const openDropdowns = ref<Record<string, boolean>>({
  client: true,
  approvals: true
})

const toggleDropdown = (key: string) => {
  openDropdowns.value[key] = !openDropdowns.value[key]
}

const isSubActive = (path: string) => {
  if (path.includes('?')) {
    const [basePath, queryStr] = path.split('?')
    if (route.path !== basePath) return false
    const params = new URLSearchParams(queryStr)
    for (const [key, val] of params.entries()) {
      if (route.query[key] !== val) return false
    }
    return true
  }
  return route.path === path
}

const isGroupActive = (item: NavItem) => {
  if (!item.children) {
    if (item.key === 'parking') {
      return route.path.startsWith('/parking')
    }
    if (item.key === 'client') {
      return route.path.startsWith('/users') && !route.path.startsWith('/users/create')
    }
    if (item.key === 'register-client') {
      return route.path === '/users/create'
    }
    return route.path === item.path
  }
  return item.children.some((child) => isSubActive(child.path))
}

watch(
  () => route.fullPath,
  (newFullPath) => {
    if (newFullPath.startsWith('/users?role=')) {
      openDropdowns.value['client'] = true
    }
    if (newFullPath.startsWith('/approvals') || newFullPath.startsWith('/registrations')) {
      openDropdowns.value['approvals'] = true
    }
  },
  { immediate: true }
)

interface SubNavItem {
  label: string
  path: string
  icon?: string
}

interface NavItem {
  key: string
  label: string
  path?: string
  icon: string
  children?: SubNavItem[]
  section?: boolean
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { key: 'divider-1', label: 'User Management', icon: '', section: true },
  { key: 'client', label: 'Client Accounts', path: '/users', icon: 'users' },
  { key: 'register-client', label: 'Register Client', path: '/users/create', icon: 'register' },
  { key: 'divider-approvals', label: 'Approvals & Verification', icon: '', section: true },
  {
    key: 'approvals',
    label: 'Approvals',
    icon: 'approvals',
    children: [
      { label: 'New User Approvals', path: '/approvals/new-users', icon: 'newUser' },
      { label: 'COR & Schedule Approvals', path: '/approvals/schedules', icon: 'schedule' },
      { label: 'Vehicle Approvals', path: '/approvals/vehicles', icon: 'vehicle' }
    ]
  },
  { key: 'divider-2', label: 'Operations', icon: '', section: true },
  { key: 'parking', label: 'Parking', path: '/parking', icon: 'parking' },
  { key: 'reservations', label: 'Reservations', path: '/reservations', icon: 'calendar' },
  { key: 'collections', label: 'Collections', path: '/violations', icon: 'violations' },
  { key: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'vehicles' },
  { key: 'feedback', label: 'Feedback & Suggestions', path: '/feedback', icon: 'feedback' },
  { key: 'divider-3', label: 'System', icon: '', section: true },
  { key: 'reports', label: 'Reports', path: '/reports', icon: 'reports' }
]

import { isSuperAdminUser, getStoredUserEmail } from '@/utils/auth'

const userEmail = computed(() => getStoredUserEmail() || 'admin@parkflow.com')
const isSuperAdmin = computed(() => isSuperAdminUser())

const filteredNavItems = computed(() => {
  return navItems
})

const userInitials = computed(() => {
  const email = userEmail.value
  const local = email.split('@')[0] || 'A'
  const parts = local.split(/[._-]/)
  const p0 = parts[0] || ''
  const p1 = parts[1] || ''
  if (p0 && p1) return (p0.charAt(0) + p1.charAt(0)).toUpperCase()
  return local.slice(0, 2).toUpperCase()
})
</script>

<template>
  <aside
    class="fixed left-0 top-0 h-screen z-40 transition-all duration-300 overflow-visible lg:translate-x-0"
    :class="[
      collapsed ? 'w-[72px]' : 'w-[260px]',
      appStore.sidebarMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <!-- Mobile backdrop -->
    <Transition name="backdrop">
      <div
        v-if="appStore.sidebarMobileOpen"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-39 lg:hidden"
        @click="appStore.closeMobileSidebar"
      />
    </Transition>

    <!-- Sidebar content -->
    <div class="relative w-full h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden z-41">

      <!-- Logo -->
      <div
        class="flex items-center gap-3 px-4 py-3.5 min-h-[68px] border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0"
        :class="collapsed ? 'lg:justify-center lg:px-0' : 'justify-start'"
      >
        <div class="w-9 h-9 min-w-[36px] rounded-xl bg-[#D22730] flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" opacity="0.85" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" opacity="0.6" />
          </svg>
        </div>
        <div
          class="flex flex-col gap-0.5 whitespace-nowrap transition-all duration-200 overflow-hidden"
          :class="collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'"
        >
          <div class="flex items-center gap-1.5">
            <span class="text-[15px] font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">ParkFlow</span>
            <span class="text-[9px] font-extrabold text-[#D22730] bg-[#D22730]/10 border border-[#D22730]/20 tracking-wider px-1.5 py-0.5 rounded leading-none">ADMIN</span>
          </div>
          <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none">Parking Management System</span>
        </div>
      </div>

      <!-- Nav section -->
      <nav class="flex-1 py-2 overflow-y-auto overflow-x-hidden no-scrollbar">
        <template v-for="item in filteredNavItems" :key="item.key">

          <!-- Section Divider Label -->
          <div v-if="item.section && !collapsed" class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 pt-4 pb-1.5 select-none">
            {{ item.label }}
          </div>
          <div v-else-if="item.section && collapsed" class="h-[1px] bg-slate-100 dark:bg-slate-800 my-2.5 mx-3.5"></div>

          <!-- Standard Single Link -->
          <router-link
            v-else-if="!item.children"
            :to="item.path!"
            custom
            v-slot="{ href, navigate }"
          >
            <a
              :href="href"
              class="group relative flex items-center gap-2.5 h-[38px] my-0.5 mx-2.5 rounded-lg text-xs font-medium transition-all border-none w-[calc(100%-20px)] whitespace-nowrap text-left cursor-pointer no-underline"
              :class="[
                collapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3',
                isGroupActive(item) ? 'bg-[#D22730] text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white bg-transparent'
              ]"
              @click="(e) => {
                navigate(e);
                appStore.closeMobileSidebar();
                if (route.path === item.path && Object.keys(route.query).length > 0) {
                  router.push(item.path!);
                }
              }"
            >
              <div class="flex items-center justify-center w-6 h-6 flex-shrink-0">
                <!-- Dashboard icon -->
                <svg v-if="item.icon === 'dashboard'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <!-- Users / Client icon -->
                <svg v-else-if="item.icon === 'users'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <circle cx="17" cy="8" r="3" />
                  <path d="M21 21v-1.5a3 3 0 0 0-2.5-2.96" />
                </svg>
                <!-- Register / User-plus icon -->
                <svg v-else-if="item.icon === 'register'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
                <!-- Parking icon -->
                <svg v-else-if="item.icon === 'parking'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M10 16V8h3a3 3 0 0 1 0 6h-3" />
                </svg>
                <!-- Calendar / Reservations icon -->
                <svg v-else-if="item.icon === 'calendar'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <!-- Collections icon -->
                <svg v-else-if="item.icon === 'violations'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                  <path d="M13 5v14" stroke-dasharray="2 2" />
                </svg>
                <!-- Vehicles icon -->
                <svg v-else-if="item.icon === 'vehicles'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 17h14" />
                  <path d="M6 11l1.5-4.5a1 1 0 0 1 .95-.5h7.1a1 1 0 0 1 .95.5L18 11" />
                  <rect x="3" y="11" width="18" height="6" rx="2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <!-- Feedback icon -->
                <svg v-else-if="item.icon === 'feedback'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="13" y2="13" />
                </svg>
                <!-- Reports icon -->
                <svg v-else-if="item.icon === 'reports'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="12" width="4" height="8" rx="1" />
                  <rect x="10" y="8" width="4" height="12" rx="1" />
                  <rect x="17" y="4" width="4" height="16" rx="1" />
                </svg>
                <!-- Settings icon -->
                <svg v-else-if="item.icon === 'settings'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <span
                class="text-[13px] font-medium flex-1 overflow-hidden transition-all duration-200"
                :class="collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'"
              >
                {{ item.label }}
              </span>
            </a>
          </router-link>

          <!-- Dropdown Group (Client, Register) -->
          <div v-else class="flex flex-col">
            <button
              class="group relative flex items-center gap-2.5 h-[38px] my-0.5 mx-2.5 rounded-lg text-xs font-medium transition-all border-none w-[calc(100%-20px)] whitespace-nowrap text-left cursor-pointer"
              :class="[
                collapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3',
                isGroupActive(item) ? 'bg-[#D22730] text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white bg-transparent'
              ]"
              @click="toggleDropdown(item.key)"
            >
              <div class="flex items-center justify-center w-6 h-6 flex-shrink-0">
                <!-- Users / Client Icon -->
                <svg v-if="item.icon === 'users'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <circle cx="17" cy="8" r="3" />
                  <path d="M21 21v-1.5a3 3 0 0 0-2.5-2.96" />
                </svg>
                <!-- Register Icon -->
                <svg v-else-if="item.icon === 'register'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
                <!-- Approvals / Verification Icon -->
                <svg v-else-if="item.icon === 'approvals'" class="w-4.5 h-4.5 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <span
                class="text-[13px] font-medium flex-1 overflow-hidden transition-all duration-200"
                :class="collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'"
              >
                {{ item.label }}
              </span>
              <svg
                class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                :class="[
                  openDropdowns[item.key] ? 'rotate-180' : '',
                  collapsed ? 'lg:hidden' : ''
                ]"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <!-- Sub Nav List -->
            <div v-show="openDropdowns[item.key] && !collapsed" class="flex flex-col gap-0.5 border-l border-slate-200 dark:border-slate-800 ml-5.5 pl-2 py-1">
              <router-link
                v-for="sub in item.children"
                :key="sub.path"
                :to="sub.path"
                custom
                v-slot="{ navigate }"
              >
                <a
                  class="flex items-center gap-2 h-8 px-2.5 my-0.5 rounded-md text-[12.5px] font-medium transition-all no-underline cursor-pointer"
                  :class="[
                    isSubActive(sub.path)
                      ? 'text-[#D22730] dark:text-[#f87171] bg-[#D22730]/10 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  ]"
                  @click="(e) => { navigate(e); appStore.closeMobileSidebar(); }"
                >
                  <!-- Sub item icons -->
                  <svg v-if="sub.icon === 'newUser'" class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="16" y1="11" x2="22" y2="11" />
                  </svg>
                  <svg v-else-if="sub.icon === 'schedule'" class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="12 14 12 17 15 17" />
                  </svg>
                  <svg v-else-if="sub.icon === 'vehicle'" class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 17h14" />
                    <path d="M6 11l1.5-4.5a1 1 0 0 1 .95-.5h7.1a1 1 0 0 1 .95.5L18 11" />
                    <rect x="3" y="11" width="18" height="6" rx="2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                  <span>{{ sub.label }}</span>
                </a>
              </router-link>
            </div>
          </div>
        </template>
      </nav>

      <!-- User mini-profile at bottom -->
      <div
        class="flex items-center gap-2.5 px-3.5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50 flex-shrink-0 min-h-[58px]"
        :class="collapsed ? 'lg:justify-center lg:px-0' : 'justify-start'"
      >
        <div class="w-8 h-8 min-w-[32px] rounded-full bg-[#D22730] flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 tracking-wider">
          {{ userInitials }}
        </div>
        <div
          class="flex flex-col gap-0.5 overflow-hidden whitespace-nowrap transition-all duration-200"
          :class="collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'"
        >
          <span class="text-[11.5px] font-bold text-slate-900 dark:text-white leading-none">{{ isSuperAdmin ? 'Super Administrator' : 'Administrator' }}</span>
          <span class="text-[10.5px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-[150px]">{{ userEmail }}</span>
        </div>
      </div>
    </div>

    <!-- Collapse toggle button (direct child of <aside> to avoid overflow clipping) -->
    <button
      type="button"
      class="hidden lg:flex absolute top-[20px] -right-3.5 items-center justify-center w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all z-50 shadow-md hover:scale-110 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95"
      @click="appStore.toggleSidebar"
      :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      aria-label="Toggle sidebar collapse"
    >
      <svg
        class="w-3.5 h-3.5 transition-transform duration-300"
        :class="{ 'rotate-180': collapsed }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  </aside>
</template>
