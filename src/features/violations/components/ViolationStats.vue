<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  isLoading: boolean
  totalCount: number
  unpaidCount: number
  paidCount: number
  totalCollection: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <template v-if="isLoading">
      <SkeletonLoader v-for="i in 4" :key="'stat-skel-'+i" variant="rect" height="110px" style="border-radius: 16px;" />
    </template>
    <template v-else>
      <!-- Total Violations -->
      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none block">
            {{ totalCount }}
          </span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Total Violations
          </span>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
      </UiCard>

      <!-- Unpaid Accounts -->
      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 leading-none block">
            {{ unpaidCount }}
          </span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Unpaid Accounts
          </span>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      </UiCard>

      <!-- Paid Settlements -->
      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none block">
            {{ paidCount }}
          </span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Paid Settlements
          </span>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </UiCard>

      <!-- Total Collected Fine -->
      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none block">
            ₱{{ totalCollection.toFixed(2) }}
          </span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Total Collections
          </span>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      </UiCard>
    </template>
  </div>
</template>
