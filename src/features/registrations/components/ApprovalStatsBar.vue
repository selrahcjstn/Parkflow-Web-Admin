<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = withDefaults(
  defineProps<{
    totalCount: number
    pendingCount: number
    approvedCount: number
    rejectedCount: number
    activeStatusTab?: 'all' | 'pending' | 'approved' | 'rejected'
    isLoading?: boolean
  }>(),
  {
    activeStatusTab: 'all',
    isLoading: false
  }
)

const emit = defineEmits<{
  (e: 'selectStatus', status: 'all' | 'pending' | 'approved' | 'rejected'): void
}>()

interface StatItem {
  key: 'all' | 'pending' | 'approved' | 'rejected'
  title: string
  value: number
  icon: string
  colorClass: string
  bgClass: string
  activeRingClass: string
}

const statItems = computed<StatItem[]>(() => [
  {
    key: 'all',
    title: 'Total Submissions',
    value: props.totalCount,
    icon: 'document',
    colorClass: 'text-slate-700 dark:text-slate-200',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    activeRingClass: 'ring-2 ring-slate-400 dark:ring-slate-500 shadow-sm'
  },
  {
    key: 'pending',
    title: 'Pending Review',
    value: props.pendingCount,
    icon: 'clock',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    activeRingClass: 'ring-2 ring-amber-500 shadow-sm'
  },
  {
    key: 'approved',
    title: 'Approved & Verified',
    value: props.approvedCount,
    icon: 'check',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    activeRingClass: 'ring-2 ring-emerald-500 shadow-sm'
  },
  {
    key: 'rejected',
    title: 'Rejected / Declined',
    value: props.rejectedCount,
    icon: 'x',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    activeRingClass: 'ring-2 ring-rose-500 shadow-sm'
  }
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <template v-if="isLoading">
      <SkeletonLoader
        v-for="i in 4"
        :key="'approval-stat-skel-' + i"
        variant="rect"
        height="110px"
        style="border-radius: 16px;"
      />
    </template>
    <template v-else>
      <UiCard
        v-for="item in statItems"
        :key="item.key"
        hover
        custom-class="flex items-center justify-between p-5 cursor-pointer transition-all duration-200 select-none"
        :class="activeStatusTab === item.key ? item.activeRingClass : 'hover:border-slate-300 dark:hover:border-slate-700'"
        @click="emit('selectStatus', item.key)"
      >
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
            {{ item.value }}
          </span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ item.title }}
          </span>
        </div>

        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          :class="[item.colorClass, item.bgClass]"
        >
          <!-- Document / Total Icon -->
          <svg v-if="item.icon === 'document'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>

          <!-- Clock / Pending Icon -->
          <svg v-else-if="item.icon === 'clock'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
            <polyline points="12 6 12 12 16 14" stroke-linecap="round" stroke-linejoin="round" />
          </svg>

          <!-- Check / Verified Icon -->
          <svg v-else-if="item.icon === 'check'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <!-- X / Rejected Icon -->
          <svg v-else-if="item.icon === 'x'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="15" y1="9" x2="9" y2="15" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="9" y1="9" x2="15" y2="15" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </UiCard>
    </template>
  </div>
</template>
