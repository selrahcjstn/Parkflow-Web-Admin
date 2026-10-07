<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  selectedRole: string
  selectedStatus: string
  selectedVehicleFilter: string
  totalCount: number
  studentCount: number
  facultyCount: number
  staffCount: number
  guardCount: number
  adminCount: number
  isSuperAdmin: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:selectedRole', val: string): void
  (e: 'update:selectedStatus', val: string): void
  (e: 'update:selectedVehicleFilter', val: string): void
  (e: 'update:viewMode', val: 'grid' | 'table'): void
  (e: 'refresh'): void
}>()

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Not Submitted', value: 'NotSubmitted' },
  { label: 'Suspended', value: 'Suspended' },
]

const vehicleOptions = [
  { label: 'All Vehicles', value: 'all' },
  { label: 'With Registered Vehicle', value: 'with-vehicle' },
  { label: 'No Vehicle Registered', value: 'no-vehicle' },
]

const roleOptions = computed(() => [
  { label: `All Account Types (${props.totalCount})`, value: 'all' },
  { label: `Student (${props.studentCount})`, value: 'Student' },
  { label: `Faculty Member (${props.facultyCount})`, value: 'UniversityStaff' },
  { label: `University Staff (${props.staffCount})`, value: 'NonAcademicPersonnel' },
  ...(props.isSuperAdmin
    ? [
        { label: `Security Guards (${props.guardCount})`, value: 'Guard' },
        { label: `Administrators (${props.adminCount})`, value: 'Admin' },
      ]
    : []),
])
</script>

<template>
  <div class="flex flex-col gap-3 xl:flex-row xl:items-end">
    <UiInput
      class="flex-1 xl:max-w-md"
      label="Search"
      :model-value="searchQuery"
      placeholder="Search name, email or plate"
      clearable
      @update:model-value="emit('update:searchQuery', String($event))"
    />
    <div class="flex flex-wrap items-end gap-3 xl:ml-auto">
      <UiSelect
        class="w-44"
        label="Role"
        :model-value="selectedRole"
        :options="roleOptions"
        @update:model-value="emit('update:selectedRole', $event)"
      />
      <UiSelect
        class="w-40"
        label="Status"
        :model-value="selectedStatus"
        :options="statusOptions"
        @update:model-value="emit('update:selectedStatus', $event)"
      />
      <UiSelect
        class="w-44"
        label="Vehicle"
        :model-value="selectedVehicleFilter"
        :options="vehicleOptions"
        @update:model-value="emit('update:selectedVehicleFilter', $event)"
      />
      <UiButton variant="secondary" :loading="isLoading" @click="emit('refresh')">
        <template #prefix
          ><svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3"
            /></svg></template
        >Refresh
      </UiButton>
    </div>
  </div>
</template>
