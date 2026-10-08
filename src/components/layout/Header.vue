<script setup lang="ts">
import { refreshAdminData } from '@/api/axios'
import { useAdminNotificationStore } from '@/stores/notification.store'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import HeaderNotificationDropdown from '@/components/layout/HeaderNotificationDropdown.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const pageTitle = computed(() => {
  if (route.path === '/users') {
    const role = route.query.role as string
    if (role === 'Student') return 'Students'
    if (role === 'UniversityStaff') return 'Faculty'
    if (role === 'NAPA' || role === 'NonAcademicPersonnel') return 'University Staff'
    if (role === 'AdminStaff' || role === 'Guard' || role === 'Admin') return 'Staff & Admin'
    return 'Clients'
  }
  return (route.meta?.title as string) || (route.name as string) || 'Dashboard'
})

// Profile dropdown state
const dropdownOpen = ref(false)
const showLogoutConfirm = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

import { isSuperAdminUser, getStoredUserEmail } from '@/utils/auth'

// User info from localStorage
const userEmail = computed(() => getStoredUserEmail() || 'admin@parkflow.com')
const isSuperAdmin = computed(() => isSuperAdminUser())
const userInitials = computed(() => {
  const email = userEmail.value
  const local = email.split('@')[0] || 'A'
  const parts = local.split(/[._-]/)
  const p0 = parts[0] || ''
  const p1 = parts[1] || ''
  if (p0 && p1) return (p0.charAt(0) + p1.charAt(0)).toUpperCase()
  return local.slice(0, 2).toUpperCase()
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function openLogoutConfirm() {
  dropdownOpen.value = false
  showLogoutConfirm.value = true
}

function confirmLogout() {
  refreshAdminData()
  useAdminNotificationStore().disconnect()
  localStorage.removeItem('parkflow_token')
  localStorage.removeItem('parkflow_user_email')
  localStorage.removeItem('parkflow_user_id')
  localStorage.removeItem('parkflow_user_role')
  showLogoutConfirm.value = false
  router.push('/login')
}

function handleGoToSettings() {
  dropdownOpen.value = false
  router.push('/account-settings')
}

// Close dropdown on outside click
function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex items-center justify-between h-[60px] px-6 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex-shrink-0 transition-colors"
  >
    <!-- Left side -->
    <div class="flex items-center gap-3">
      <!-- Mobile hamburger -->
      <button
        class="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        @click="appStore.toggleMobileSidebar"
        aria-label="Toggle sidebar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="17" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div>
        <h1 class="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
          {{ pageTitle }}
        </h1>
      </div>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2">
      <!-- Notification Center Dropdown -->
      <HeaderNotificationDropdown />

      <!-- Profile dropdown -->
      <div class="relative ml-1.5" ref="dropdownRef">
        <button
          class="flex items-center gap-2 h-9 px-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
          :class="{ 'ring-2 ring-blue-500/20 border-blue-500': dropdownOpen }"
          aria-label="User menu"
          @click="toggleDropdown"
        >
          <span
            class="w-7 h-7 rounded-full bg-[#7B1113] flex items-center justify-center text-[11px] font-bold text-white tracking-wide select-none"
          >
            {{ userInitials }}
          </span>
          <svg
            class="w-3 h-3 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': dropdownOpen }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <!-- Dropdown panel -->
        <Transition name="dropdown-slide">
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-50"
          >
            <!-- User info header -->
            <div
              class="flex items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800"
            >
              <div
                class="w-10 h-10 rounded-full bg-[#7B1113] flex items-center justify-center text-xs font-bold text-white tracking-wide flex-shrink-0"
              >
                {{ userInitials }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ isSuperAdmin ? 'Super Administrator' : 'Administrator' }}
                </span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {{ userEmail }}
                </span>
              </div>
            </div>

            <!-- Menu items -->
            <div class="p-1.5 space-y-0.5">
              <button
                class="flex items-center gap-2.5 w-full h-9 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left border-none"
                @click="handleGoToSettings"
              >
                <svg
                  class="w-4 h-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                </svg>
                Account Settings
              </button>

              <div class="h-px bg-slate-100 dark:bg-slate-800 my-1" />

              <button
                class="flex items-center gap-2.5 w-full h-9 px-3 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left border-none"
                @click="openLogoutConfirm"
              >
                <svg
                  class="w-4 h-4 text-rose-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>

  <!-- Logout Confirmation Dialog with Reusable ConfirmModal -->
  <ConfirmModal
    :is-open="showLogoutConfirm"
    title="Sign out of ParkFlow?"
    message="You will be returned to the login screen. Any unsaved changes will be lost."
    confirm-text="Yes, Sign Out"
    cancel-text="Cancel"
    variant="danger"
    @confirm="confirmLogout"
    @close="showLogoutConfirm = false"
  />
</template>

<style scoped>
.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
