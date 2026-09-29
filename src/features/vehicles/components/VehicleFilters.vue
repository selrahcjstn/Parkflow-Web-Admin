<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  filterType: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:filterType', val: string): void
}>()

const vehicleTypeOptions = [
  { label: 'All Vehicle Types', value: 'all' },
  { label: 'Cars', value: 'Car' },
  { label: 'Motorcycles', value: 'Motorcycle' },
  { label: 'Electric Bikes', value: 'ElectricBike' }
]
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <!-- Search Input -->
    <div class="flex-1 max-w-md">
      <UiInput
        :model-value="searchQuery"
        placeholder="Search by plate, owner, brand..."
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

    <!-- Vehicle Type Dropdown -->
    <div class="w-48 sm:ml-auto">
      <UiSelect
        :model-value="filterType"
        :options="vehicleTypeOptions"
        size="sm"
        @update:model-value="emit('update:filterType', String($event))"
      />
    </div>
  </div>
</template>
