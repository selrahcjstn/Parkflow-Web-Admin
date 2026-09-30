<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import type { VehicleInfo } from '../types'
import { getVehicleTypeLabel } from '@/utils/vehicleType'

const props = defineProps<{
  vehicles: VehicleInfo[]
}>()
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <path d="M5 17h14" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M6 11l1.5-4.5h9L18 11" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Registered Vehicles & Parking Passes</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Active vehicles linked to this motorist account</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!vehicles || vehicles.length === 0" class="text-center py-9 px-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/60">
      <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </div>
      <p class="text-sm font-bold text-slate-700 dark:text-slate-300 m-0">No Registered Vehicles Found</p>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-0">This client account has not yet registered any vehicles on campus.</p>
    </div>

    <!-- Vehicles Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="veh in vehicles"
        :key="veh.plateNumber"
        class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
      >
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0" />
              <circle cx="7.5" cy="16.5" r="2.5" />
              <circle cx="16.5" cy="16.5" r="2.5" />
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-mono font-bold text-slate-900 dark:text-white text-sm tracking-wide">{{ veh.plateNumber }}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ veh.brand || 'Vehicle' }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <UiBadge variant="neutral" size="xs">
            {{ getVehicleTypeLabel(veh.vehicleType) }}
          </UiBadge>
          <UiBadge v-if="veh.isPrimary" variant="success" size="xs">
            Primary Pass
          </UiBadge>
        </div>
      </div>
    </div>
  </UiCard>
</template>
