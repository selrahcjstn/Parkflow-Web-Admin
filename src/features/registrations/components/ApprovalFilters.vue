<script setup lang="ts">
import { computed } from 'vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  selectedStatusTab: 'all' | 'pending' | 'approved' | 'rejected'
  selectedCategoryFilter: 'all' | 'Registration' | 'Schedule' | 'Vehicle'
  viewMode: 'grid' | 'table'
  totalCount: number
  newUserCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  scheduleCount: number
  vehicleCount: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:selectedStatusTab', val: 'all' | 'pending' | 'approved' | 'rejected'): void
  (e: 'update:selectedCategoryFilter', val: 'all' | 'Registration' | 'Schedule' | 'Vehicle'): void
  (e: 'update:viewMode', val: 'grid' | 'table'): void
  (e: 'refresh'): void
}>()

const categoryOptions = computed(() => [
  { label: `All Requests (${props.totalCount})`, value: 'all' },
  { label: `New User Approvals (${props.newUserCount})`, value: 'Registration' },
  { label: `COR & Schedule Approvals (${props.scheduleCount})`, value: 'Schedule' },
  { label: `Vehicle Approvals (${props.vehicleCount})`, value: 'Vehicle' }
])

const statusOptions = computed(() => [
  { label: `All Statuses (${props.totalCount})`, value: 'all' },
  { label: `Pending Review (${props.pendingCount})`, value: 'pending' },
  { label: `Approved & Verified (${props.approvedCount})`, value: 'approved' },
  { label: `Rejected / Declined (${props.rejectedCount})`, value: 'rejected' }
])
</script>

<template>
  <div class="space-y-4">
    <!-- Filters Row -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="flex-1 max-w-md">
        <UiInput
          :model-value="searchQuery"
          placeholder="Search by applicant, email, plate number..."
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
        <div class="w-48">
          <UiSelect
            :model-value="selectedCategoryFilter"
            :options="categoryOptions"
            size="sm"
            @update:model-value="emit('update:selectedCategoryFilter', $event as typeof props.selectedCategoryFilter)"
          />
        </div>

        <div class="w-44">
          <UiSelect
            :model-value="selectedStatusTab"
            :options="statusOptions"
            size="sm"
            @update:model-value="emit('update:selectedStatusTab', $event as typeof props.selectedStatusTab)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
