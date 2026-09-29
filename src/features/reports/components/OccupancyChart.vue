<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

const props = defineProps<{
  occupancySvgPath: {
    lineD: string
    areaD: string
    peakX: number
    peakY: number
    maxVal: number
  }
  lastSyncTime: string
}>()
</script>

<template>
  <UiCard custom-class="p-5 flex flex-col justify-between">
    <div class="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Hourly Occupancy Load
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            LIVE SYNC
          </span>
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Average active parking capacity over 24-hour cycle • Last synced {{ lastSyncTime }}
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span class="w-2.5 h-2.5 rounded-full bg-[#D22730]"></span>
        <span>Capacity load %</span>
      </div>
    </div>

    <div class="w-full h-56 mt-2">
      <svg viewBox="0 0 600 240" class="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#D22730" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#D22730" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Grid Lines -->
        <line x1="40" y1="30" x2="560" y2="30" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="4 4"/>
        <line x1="40" y1="80" x2="560" y2="80" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="4 4"/>
        <line x1="40" y1="130" x2="560" y2="130" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="4 4"/>
        <line x1="40" y1="180" x2="560" y2="180" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="4 4"/>
        <line x1="40" y1="200" x2="560" y2="200" stroke="currentColor" class="text-slate-300 dark:text-slate-700"/>

        <!-- Y Axis labels -->
        <text x="30" y="34" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-right" text-anchor="end">100%</text>
        <text x="30" y="84" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-right" text-anchor="end">75%</text>
        <text x="30" y="134" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-right" text-anchor="end">50%</text>
        <text x="30" y="184" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-right" text-anchor="end">25%</text>

        <!-- Dynamic Area & Line Paths -->
        <path :d="occupancySvgPath.areaD" fill="url(#loadGrad)" />
        <path :d="occupancySvgPath.lineD" fill="none" stroke="#D22730" stroke-width="3" stroke-linecap="round"/>

        <!-- Dynamic Highlight Peak Point -->
        <circle :cx="occupancySvgPath.peakX" :cy="occupancySvgPath.peakY" r="5" fill="#D22730" stroke="#ffffff" stroke-width="2"/>

        <!-- X Axis labels -->
        <text x="90" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">06 AM</text>
        <text x="160" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">08 AM</text>
        <text x="240" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">10 AM</text>
        <text x="320" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">12 PM</text>
        <text x="400" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">02 PM</text>
        <text x="480" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">04 PM</text>
        <text x="560" y="222" class="text-[10px] fill-slate-400 dark:fill-slate-500 text-center" text-anchor="middle">06 PM</text>
      </svg>
    </div>
  </UiCard>
</template>
