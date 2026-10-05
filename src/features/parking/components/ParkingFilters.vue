<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  currentTab: 'active' | 'history'
  filterVehicleType: string
  filterStatus: string
  filterMethod: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:currentTab', val: 'active' | 'history'): void
  (e: 'update:filterVehicleType', val: string): void
  (e: 'update:filterStatus', val: string): void
  (e: 'update:filterMethod', val: string): void
}>()

const vehicleTypeOptions = [
  { label: 'All Vehicle Types', value: 'all' },
  { label: 'Car', value: 'Car' },
  { label: 'Motorcycle', value: 'Motorcycle' },
  { label: 'E-Bike', value: 'ElectricBike' }
]

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Parked', value: 'Parked' },
  { label: 'Overstay', value: 'Overstay' }
]

const methodOptions = [
  { label: 'All Entry Methods', value: 'all' },
  { label: 'QR Code', value: 'QrCode' },
  { label: 'Manual Entry', value: 'Manual' }
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

    <!-- Tabs & Filter Selects -->
    <div class="flex items-center gap-2.5 sm:ml-auto flex-wrap">
      <!-- Active / History Tabs Switcher -->
      <div class="flex items-center p-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl gap-1 flex-shrink-0">
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
          :class="currentTab === 'active' ? 'bg-[#7B1113] text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent'"
          @click="emit('update:currentTab', 'active')"
        >
          Active
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
          :class="currentTab === 'history' ? 'bg-[#7B1113] text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent'"
          @click="emit('update:currentTab', 'history')"
        >
          History
        </button>
      </div>

      <!-- Vehicle Type Dropdown -->
      <div class="w-40">
        <UiSelect
          :model-value="filterVehicleType"
          :options="vehicleTypeOptions"
          size="sm"
          @update:model-value="emit('update:filterVehicleType', String($event))"
        />
      </div>

      <!-- Status / Method Dropdown -->
      <div v-if="currentTab === 'active'" class="w-36">
        <UiSelect
          :model-value="filterStatus"
          :options="statusOptions"
          size="sm"
          @update:model-value="emit('update:filterStatus', String($event))"
        />
      </div>
      <div v-else class="w-40">
        <UiSelect
          :model-value="filterMethod"
          :options="methodOptions"
          size="sm"
          @update:model-value="emit('update:filterMethod', String($event))"
        />
      </div>
    </div>
  </div>
</template>
