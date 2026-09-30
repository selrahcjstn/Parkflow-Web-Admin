<script setup lang="ts">
import type { UserWithDetails, AccountStatus } from '../types'

const props = defineProps<{
  user: UserWithDetails | null
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'edit'): void
  (e: 'changePassword'): void
  (e: 'toggleStatus', status: AccountStatus): void
}>()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
    <div class="flex flex-col gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer w-fit"
        @click="emit('back')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Client Accounts
      </button>

      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Client Record Details
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Inspect account credentials, classification, vehicle clearances, and active permissions.
        </p>
      </div>
    </div>

    <!-- Actions Toolbar -->
    <div v-if="user && !isLoading" class="flex items-center gap-2.5 flex-wrap">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors cursor-pointer"
        @click="emit('changePassword')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Change Password
      </button>

      <button
        v-if="user.status !== 'Suspended'"
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shadow-sm transition-colors cursor-pointer"
        @click="emit('toggleStatus', 'Suspended')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        Suspend Account
      </button>

      <button
        v-else
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm transition-colors cursor-pointer"
        @click="emit('toggleStatus', 'Active')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Activate Account
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#D22730] hover:bg-[#b91c1c] text-white shadow-sm transition-colors cursor-pointer"
        @click="emit('edit')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        Edit Profile
      </button>
    </div>
  </div>
</template>
