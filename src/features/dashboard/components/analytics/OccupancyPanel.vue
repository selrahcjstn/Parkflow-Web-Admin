<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardSummary } from '../../api/dashboard.api'

const props = defineProps<{ summary: DashboardSummary }>()

const capacity = computed(() => props.summary.maxCapacity)
const occupied = computed(() => props.summary.activeParking)
const available = computed(() => Math.max(0, capacity.value - occupied.value))
const percent = computed(() => (capacity.value > 0 ? (occupied.value / capacity.value) * 100 : 0))
const over = computed(() => capacity.value > 0 && occupied.value > capacity.value)
const barColor = computed(() => (percent.value >= 90 ? '#D22730' : percent.value >= 70 ? '#FDB813' : '#10b981'))

const types = computed(() => [
  { label: 'Cars', used: props.summary.carCount ?? 0, total: props.summary.carCapacity ?? 0 },
  { label: 'Motorcycles', used: props.summary.motorcycleCount ?? 0, total: props.summary.motorcycleCapacity ?? 0 },
].filter((t) => t.total > 0))
</script>

<template>
  <div v-if="capacity <= 0" class="py-6 text-center text-sm text-muted">
    Parking capacity has not been configured. Set it in Settings to see occupancy.
  </div>
  <div v-else class="flex flex-col gap-5">
    <div>
      <div class="flex items-end justify-between">
        <p class="m-0 text-[32px] font-bold leading-none text-text tabular-nums">{{ percent.toFixed(1) }}<span class="text-[18px] text-muted">%</span></p>
        <p class="m-0 text-[12.5px] text-muted">{{ over ? 'Over capacity' : 'of spaces in use' }}</p>
      </div>
      <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" role="meter" :aria-valuenow="Math.round(percent)" aria-valuemin="0" aria-valuemax="100" aria-label="Parking occupancy">
        <div class="h-full rounded-full transition-[width] duration-500" :style="{ width: `${Math.min(percent, 100)}%`, background: barColor }" />
      </div>
    </div>

    <dl class="m-0 grid grid-cols-3 gap-3 text-center">
      <div class="rounded-lg bg-surface-lighter px-2 py-2.5"><dd class="m-0 text-lg font-bold text-text tabular-nums">{{ capacity.toLocaleString('en-PH') }}</dd><dt class="text-[11.5px] text-muted">Capacity</dt></div>
      <div class="rounded-lg bg-surface-lighter px-2 py-2.5"><dd class="m-0 text-lg font-bold text-text tabular-nums">{{ occupied.toLocaleString('en-PH') }}</dd><dt class="text-[11.5px] text-muted">Occupied</dt></div>
      <div class="rounded-lg bg-surface-lighter px-2 py-2.5"><dd class="m-0 text-lg font-bold text-text tabular-nums">{{ available.toLocaleString('en-PH') }}</dd><dt class="text-[11.5px] text-muted">Available</dt></div>
    </dl>

    <ul v-if="types.length" class="m-0 flex list-none flex-col gap-3 p-0">
      <li v-for="t in types" :key="t.label">
        <div class="mb-1 flex items-center justify-between text-[12.5px]">
          <span class="text-text-secondary">{{ t.label }}</span>
          <span class="font-semibold text-text tabular-nums">{{ t.used }} / {{ t.total }}</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full rounded-full bg-text-secondary/70 transition-[width] duration-500" :style="{ width: `${Math.min((t.used / t.total) * 100, 100)}%` }" />
        </div>
      </li>
    </ul>
  </div>
</template>
