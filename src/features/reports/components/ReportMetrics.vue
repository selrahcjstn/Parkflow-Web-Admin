<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  isLoading: boolean
  stats: Array<{
    title: string
    value: string
    subtitle: string
    icon: string
    gradient: string
  }>
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <template v-if="isLoading">
      <SkeletonLoader v-for="i in 4" :key="'rep-skel-' + i" variant="rect" height="100px" style="border-radius: 16px;" />
    </template>
    <template v-else>
      <UiCard
        v-for="stat in stats"
        :key="stat.title"
        custom-class="p-5 flex items-center justify-between transition-all duration-200"
      >
        <div class="space-y-1">
          <span class="text-2xl font-black text-slate-900 dark:text-white leading-none block">
            {{ stat.value }}
          </span>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {{ stat.title }}
          </span>
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">
            {{ stat.subtitle }}
          </span>
        </div>

        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
          :style="{ background: stat.gradient }"
        >
          <svg v-if="stat.icon === 'peak'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 22H6M12 2v16M8 8l4-4 4 4M12 18H12.01" />
          </svg>
          <svg v-else-if="stat.icon === 'duration'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <svg v-else-if="stat.icon === 'infractions'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <svg v-else-if="stat.icon === 'revenue'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      </UiCard>
    </template>
  </div>
</template>
