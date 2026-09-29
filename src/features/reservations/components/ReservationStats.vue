<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  isLoading: boolean
  totalCount: number
  pendingCount: number
  approvedCount: number
  doneCount: number
  rejectedCount: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <template v-if="isLoading">
      <SkeletonLoader v-for="i in 5" :key="'res-skel-'+i" variant="rect" height="96px" style="border-radius: 16px;" />
    </template>
    <template v-else>
      <!-- Total -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-slate-900 dark:text-white leading-none block">
            {{ totalCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Total Passes
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </UiCard>

      <!-- Pending -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-none block">
            {{ pendingCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Pending Approval
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </UiCard>

      <!-- Approved -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none block">
            {{ approvedCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Approved / Active
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </UiCard>

      <!-- Completed / Done -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-blue-600 dark:text-blue-400 leading-none block">
            {{ doneCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Completed / Done
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
      </UiCard>

      <!-- Rejected -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-rose-600 dark:text-rose-400 leading-none block">
            {{ rejectedCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Declined / Rejected
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      </UiCard>
    </template>
  </div>
</template>
