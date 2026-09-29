<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import ReportMetrics from './ReportMetrics.vue'
import OccupancyChart from './OccupancyChart.vue'
import VehicleDistributionChart from './VehicleDistributionChart.vue'

defineProps<{
  isLoading: boolean
  stats: Array<{
    title: string
    value: string
    subtitle: string
    icon: string
    gradient: string
  }>
  occupancySvgPath: {
    lineD: string
    areaD: string
    peakX: number
    peakY: number
    maxVal: number
  }
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
  hourlyTrafficData: Array<{
    timeSlot: string
    loadPercent: number
    status: string
  }>
  totalCampusCapacity: number
  lastSyncTime: string
}>()
</script>

<template>
  <div class="space-y-6">
    <!-- Performance Metrics KPI Cards -->
    <ReportMetrics
      :is-loading="isLoading"
      :stats="stats"
    />

    <!-- Visual Analytics Graphs Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <OccupancyChart
        :occupancy-svg-path="occupancySvgPath"
        :last-sync-time="lastSyncTime"
      />
      <VehicleDistributionChart
        :vehicle-pie-data="vehiclePieData"
      />
    </div>

    <!-- Operational Hourly Traffic Table Card -->
    <UiCard custom-class="p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
            Hourly Peak Traffic Distribution
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Breakdown of campus parking load factor across operational windows
          </p>
        </div>
        <span class="text-xs font-bold text-[#D22730] bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900">
          Capacity: {{ totalCampusCapacity }} Slots
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              <th class="py-2.5 px-3">Time Window</th>
              <th class="py-2.5 px-3">Load Factor</th>
              <th class="py-2.5 px-3">Traffic Intensity</th>
              <th class="py-2.5 px-3 text-right">Operational Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="item in hourlyTrafficData" :key="item.timeSlot" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{{ item.timeSlot }}</td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <div class="w-28 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="item.loadPercent >= 85 ? 'bg-[#D22730]' : item.loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'"
                      :style="{ width: `${item.loadPercent}%` }"
                    ></div>
                  </div>
                  <span class="font-bold text-slate-700 dark:text-slate-300">{{ item.loadPercent }}%</span>
                </div>
              </td>
              <td class="py-3 px-3">
                <span
                  class="inline-flex items-center gap-1.5 font-bold"
                  :class="item.loadPercent >= 85 ? 'text-[#D22730]' : item.loadPercent >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="item.loadPercent >= 85 ? 'bg-[#D22730]' : item.loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'"
                  ></span>
                  {{ item.loadPercent >= 85 ? 'Heavy Peak Load' : item.loadPercent >= 60 ? 'Moderate Demand' : 'Normal Operations' }}
                </span>
              </td>
              <td class="py-3 px-3 text-right text-slate-600 dark:text-slate-400 font-medium">{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>
