<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

defineProps<{
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  activeStatusTab?: 'all' | 'pending' | 'approved' | 'rejected'
}>()

const emit = defineEmits<{
  (e: 'selectStatus', status: 'all' | 'pending' | 'approved' | 'rejected'): void
}>()
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total Card -->
    <UiCard
      custom-class="p-4 flex items-center justify-between cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-600"
      :class="{ 'ring-2 ring-slate-400 dark:ring-slate-500': activeStatusTab === 'all' }"
      @click="emit('selectStatus', 'all')"
    >
      <div>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Submissions</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ totalCount }}</p>
      </div>
      <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    </UiCard>

    <!-- Pending Card -->
    <UiCard
      custom-class="p-4 flex items-center justify-between cursor-pointer transition-all hover:border-amber-400 dark:hover:border-amber-600"
      :class="{ 'ring-2 ring-amber-500': activeStatusTab === 'pending' }"
      @click="emit('selectStatus', 'pending')"
    >
      <div>
        <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Review</p>
        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ pendingCount }}</p>
      </div>
      <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </UiCard>

    <!-- Approved Card -->
    <UiCard
      custom-class="p-4 flex items-center justify-between cursor-pointer transition-all hover:border-emerald-400 dark:hover:border-emerald-600"
      :class="{ 'ring-2 ring-emerald-500': activeStatusTab === 'approved' }"
      @click="emit('selectStatus', 'approved')"
    >
      <div>
        <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved & Verified</p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ approvedCount }}</p>
      </div>
      <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </UiCard>

    <!-- Rejected Card -->
    <UiCard
      custom-class="p-4 flex items-center justify-between cursor-pointer transition-all hover:border-rose-400 dark:hover:border-rose-600"
      :class="{ 'ring-2 ring-rose-500': activeStatusTab === 'rejected' }"
      @click="emit('selectStatus', 'rejected')"
    >
      <div>
        <p class="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejected / Declined</p>
        <p class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{{ rejectedCount }}</p>
      </div>
      <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </UiCard>
  </div>
</template>
