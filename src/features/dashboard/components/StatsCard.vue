<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

defineProps<{
  title: string
  value: string
  subtitle?: string
  trend: string
  trendUp: boolean
  accentColor: string
  badgeBg: string
  progressPercent?: number
}>()
</script>

<template>
  <UiCard hover custom-class="flex flex-col justify-between min-h-[148px] relative overflow-hidden group">
    <!-- Top Row: Icon + Trend Badge -->
    <div class="flex items-center justify-between mb-3">
      <div
        class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        :style="{ background: badgeBg, color: accentColor }"
      >
        <slot name="icon" />
      </div>

      <div
        :class="[
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-extrabold leading-none',
          trendUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        ]"
      >
        <span class="text-[11px]">{{ trendUp ? '↑' : '↓' }}</span>
        <span>{{ trend }}</span>
      </div>
    </div>

    <!-- Center: Metric Title + Main Value -->
    <div class="flex flex-col gap-1">
      <span class="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {{ title }}
      </span>
      <div class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
        {{ value }}
      </div>
    </div>

    <!-- Bottom: Progress Bar or Subtitle Context -->
    <div v-if="progressPercent !== undefined" class="mt-3.5 flex flex-col gap-1.5">
      <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%`, background: accentColor }"
        />
      </div>
      <div v-if="subtitle" class="flex items-center justify-between text-[11.5px]">
        <span class="font-medium text-slate-500 dark:text-slate-400">{{ subtitle }}</span>
        <span class="font-bold text-slate-700 dark:text-slate-300">{{ progressPercent }}%</span>
      </div>
    </div>
    <div v-else-if="subtitle" class="mt-3">
      <span class="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">{{ subtitle }}</span>
    </div>
  </UiCard>
</template>
