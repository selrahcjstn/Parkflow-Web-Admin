<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  isLoading: boolean
  totalCount: number
  pendingCount: number
  reviewedCount: number
  resolvedCount: number
  averageRating: string
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <template v-if="isLoading">
      <SkeletonLoader v-for="i in 5" :key="'fb-stat-'+i" variant="rect" height="96px" style="border-radius: 16px;" />
    </template>
    <template v-else>
      <!-- Total Submissions -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-slate-900 dark:text-white leading-none block">
            {{ totalCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Total Inquiries
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </UiCard>

      <!-- Pending Attention -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-none block">
            {{ pendingCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Pending Attention
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      </UiCard>

      <!-- Under Review -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 leading-none block">
            {{ reviewedCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Under Review
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </UiCard>

      <!-- Resolved Inquiries -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none block">
            {{ resolvedCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Resolved Inquiries
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </UiCard>

      <!-- Average Rating -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-amber-500 leading-none block">
            ★ {{ averageRating }} / 5.0
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Client Rating
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-amber-500 bg-amber-50 dark:bg-amber-950/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
      </UiCard>
    </template>
  </div>
</template>
