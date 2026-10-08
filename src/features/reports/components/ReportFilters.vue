<script setup lang="ts">
import UiSelect from '@/components/ui/UiSelect.vue'
import UiButton from '@/components/ui/UiButton.vue'

const props = defineProps<{
  dateRange: string
  reportVehicleType: string
  exportingCSV: boolean
  exportingPDF: boolean
  lastSyncTime: string
}>()

const emit = defineEmits<{
  (e: 'update:dateRange', val: string): void
  (e: 'update:reportVehicleType', val: string): void
  (e: 'export', format: 'csv' | 'pdf'): void
  (e: 'refresh'): void
}>()

const dateRangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Semester', value: 'semester' },
  { label: 'All Time Records', value: 'all' },
]

const vehicleTypeOptions = [
  { label: 'All Vehicle Classes', value: 'all' },
  { label: 'Automobiles (Cars/SUVs)', value: 'cars' },
  { label: 'Motorcycles & Scooters', value: 'motorcycles' },
]
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <!-- Filter Selects -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="w-44">
        <UiSelect
          :model-value="dateRange"
          :options="dateRangeOptions"
          size="sm"
          @update:model-value="emit('update:dateRange', String($event))"
        />
      </div>

      <div class="w-52">
        <UiSelect
          :model-value="reportVehicleType"
          :options="vehicleTypeOptions"
          size="sm"
          @update:model-value="emit('update:reportVehicleType', String($event))"
        />
      </div>

      <span class="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
        Synced: {{ lastSyncTime }}
      </span>
    </div>

    <!-- Export & Refresh Actions -->
    <div class="flex items-center gap-2 flex-wrap">
      <UiButton
        variant="secondary"
        size="sm"
        @click="emit('refresh')"
        title="Refresh data from server"
      >
        <template #prefix>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </template>
        Refresh
      </UiButton>

      <UiButton
        variant="secondary"
        size="sm"
        :loading="exportingCSV"
        @click="emit('export', 'csv')"
      >
        <template #prefix>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </template>
        CSV Export
      </UiButton>

      <UiButton
        variant="primary"
        size="sm"
        :loading="exportingPDF"
        @click="emit('export', 'pdf')"
      >
        <template #prefix>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
        </template>
        Print / PDF
      </UiButton>
    </div>
  </div>
</template>
