<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

const props = defineProps<{
  vehiclePieData: {
    cars: number
    motos: number
    ebikes: number
    total: number
    carPct: number
    motoPct: number
    ebikePct: number
    carDash: string
    motoDash: string
    ebikeDash: string
    carOffset: number
    motoOffset: number
    ebikeOffset: number
  }
}>()
</script>

<template>
  <UiCard custom-class="p-5 flex flex-col justify-between">
    <div class="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Vehicle Type Breakdown
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            LIVE VEHICLES
          </span>
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time breakdown of campus vehicles by classification
        </p>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-around gap-6 mt-2">
      <!-- Donut SVG -->
      <div class="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 200 200" class="w-full h-full transform -rotate-90">
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-width="22"/>
          
          <!-- Cars (Emerald) -->
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#10b981"
            stroke-width="22"
            :stroke-dasharray="vehiclePieData.carDash"
            :stroke-dashoffset="vehiclePieData.carOffset"
            stroke-linecap="round"
          />

          <!-- Motorcycles (Amber) -->
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#f59e0b"
            stroke-width="22"
            :stroke-dasharray="vehiclePieData.motoDash"
            :stroke-dashoffset="vehiclePieData.motoOffset"
            stroke-linecap="round"
          />

          <!-- E-Bikes (Indigo) -->
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#6366f1"
            stroke-width="22"
            :stroke-dasharray="vehiclePieData.ebikeDash"
            :stroke-dashoffset="vehiclePieData.ebikeOffset"
            stroke-linecap="round"
          />
        </svg>

        <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span class="text-xl font-black text-slate-900 dark:text-white leading-none">
            {{ vehiclePieData.total }}
          </span>
          <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
            Total
          </span>
        </div>
      </div>

      <!-- Breakdown Legend list -->
      <div class="flex-1 space-y-3 w-full max-w-xs">
        <!-- Cars -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Automobiles
            </span>
            <span class="font-bold text-slate-900 dark:text-white">{{ vehiclePieData.cars }} ({{ vehiclePieData.carPct }}%)</span>
          </div>
          <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 rounded-full" :style="{ width: vehiclePieData.carPct + '%' }"></div>
          </div>
        </div>

        <!-- Motorcycles -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Motorcycles
            </span>
            <span class="font-bold text-slate-900 dark:text-white">{{ vehiclePieData.motos }} ({{ vehiclePieData.motoPct }}%)</span>
          </div>
          <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-amber-500 rounded-full" :style="{ width: vehiclePieData.motoPct + '%' }"></div>
          </div>
        </div>

        <!-- E-Bikes -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              Electric Bikes
            </span>
            <span class="font-bold text-slate-900 dark:text-white">{{ vehiclePieData.ebikes }} ({{ vehiclePieData.ebikePct }}%)</span>
          </div>
          <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full" :style="{ width: vehiclePieData.ebikePct + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </UiCard>
</template>
