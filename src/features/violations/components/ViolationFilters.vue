<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  filterViolationType: string
  filterStatus: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:filterViolationType', val: string): void
  (e: 'update:filterStatus', val: string): void
}>()

const typeOptions = [
  { label: 'All Violation Types', value: 'all' },
  { label: 'Overstay Parking', value: 'Overstay' },
  { label: 'Unauthorized Parking', value: 'Unauthorized' },
  { label: 'No Valid Pass / QR', value: 'NoPass' },
  { label: 'Other Violations', value: 'Other' }
]

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Unpaid / Pending', value: 'Unpaid' },
  { label: 'Paid / Settled', value: 'Paid' }
]
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <!-- Search Input -->
    <div class="flex-1 max-w-md">
      <UiInput
        :model-value="searchQuery"
        placeholder="Search reference, plate, driver name..."
        size="sm"
        clearable
        @update:model-value="emit('update:searchQuery', String($event))"
      >
        <template #prefix>
          <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </template>
      </UiInput>
    </div>

    <!-- Filter Dropdowns -->
    <div class="flex items-center gap-2.5 sm:ml-auto flex-wrap">
      <div class="w-44">
        <UiSelect
          :model-value="filterViolationType"
          :options="typeOptions"
          size="sm"
          @update:model-value="emit('update:filterViolationType', String($event))"
        />
      </div>

      <div class="w-40">
        <UiSelect
          :model-value="filterStatus"
          :options="statusOptions"
          size="sm"
          @update:model-value="emit('update:filterStatus', String($event))"
        />
      </div>
    </div>
  </div>
</template>
