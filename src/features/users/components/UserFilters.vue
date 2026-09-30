<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  selectedRole: string
  selectedStatus: string
  selectedVehicleFilter: string
  viewMode: 'grid' | 'table'
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
  { label: 'Pending Verification', value: 'Pending' },
  { label: 'Approved / Verified', value: 'Verified' },
  { label: 'Not Submitted', value: 'NotSubmitted' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Suspended', value: 'Suspended' }
]

const vehicleOptions = [
  { label: 'All Vehicles', value: 'all' },
  { label: 'With Registered Vehicle', value: 'with-vehicle' },
  { label: 'No Vehicle Registered', value: 'no-vehicle' }
]

const roleOptions = [
  { label: `All Account Types (${props.totalCount})`, value: 'all' },
  { label: `Student (${props.studentCount})`, value: 'Student' },
  { label: `Faculty Member (${props.facultyCount})`, value: 'UniversityStaff' },
  { label: `University Staff (${props.staffCount})`, value: 'NonAcademicPersonnel' },
  ...(props.isSuperAdmin ? [
    { label: `Security Guards (${props.guardCount})`, value: 'Guard' },
    { label: `Administrators (${props.adminCount})`, value: 'Admin' }
  ] : [])
]
</script>

<template>
  <div class="space-y-4">
    <!-- Role Filter Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
      <button
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'all' ? 'bg-[#D22730] text-white border-[#D22730] shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        @click="emit('update:selectedRole', 'all')"
      >
        All Accounts ({{ totalCount }})
      </button>

      <button
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'Student' ? 'bg-[#D22730] text-white border-[#D22730] shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        @click="emit('update:selectedRole', 'Student')"
      >
        Students ({{ studentCount }})
      </button>

      <button
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'UniversityStaff' ? 'bg-[#D22730] text-white border-[#D22730] shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        @click="emit('update:selectedRole', 'UniversityStaff')"
      >
        Faculty Member ({{ facultyCount }})
      </button>

      <button
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'NonAcademicPersonnel' ? 'bg-[#D22730] text-white border-[#D22730] shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        @click="emit('update:selectedRole', 'NonAcademicPersonnel')"
      >
        University Staff ({{ staffCount }})
      </button>

      <button
        v-if="isSuperAdmin"
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'Guard' ? 'bg-[#D22730] text-white border-[#D22730] shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        @click="emit('update:selectedRole', 'Guard')"
      >
        Security Guards ({{ guardCount }})
      </button>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="flex-1 max-w-md">
        <UiInput
          :model-value="searchQuery"
          placeholder="Search by name, email, ID number..."
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

      <!-- Filter Dropdowns & Controls -->
      <div class="flex items-center gap-2.5 sm:ml-auto flex-wrap">
        <div class="w-44">
          <UiSelect
            :model-value="selectedRole"
            :options="roleOptions"
            size="sm"
            @update:model-value="emit('update:selectedRole', String($event))"
          />
        </div>

        <div class="w-40">
          <UiSelect
            :model-value="selectedStatus"
            :options="statusOptions"
            size="sm"
            @update:model-value="emit('update:selectedStatus', String($event))"
          />
        </div>

        <div class="w-44">
          <UiSelect
            :model-value="selectedVehicleFilter"
            :options="vehicleOptions"
            size="sm"
            @update:model-value="emit('update:selectedVehicleFilter', String($event))"
          />
        </div>

        <!-- View Mode Grid/Table Switcher -->
        <div class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            class="p-1.5 rounded-lg transition-colors cursor-pointer border-none"
            :class="viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent'"
            title="Grid view"
            @click="emit('update:viewMode', 'grid')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            class="p-1.5 rounded-lg transition-colors cursor-pointer border-none"
            :class="viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent'"
            title="Table view"
            @click="emit('update:viewMode', 'table')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6" stroke-linecap="round" />
              <line x1="8" y1="12" x2="21" y2="12" stroke-linecap="round" />
              <line x1="8" y1="18" x2="21" y2="18" stroke-linecap="round" />
              <line x1="3" y1="6" x2="3.01" y2="6" stroke-linecap="round" />
              <line x1="3" y1="12" x2="3.01" y2="12" stroke-linecap="round" />
              <line x1="3" y1="18" x2="3.01" y2="18" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <!-- Refresh Button -->
        <button
          type="button"
          class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-none cursor-pointer"
          :class="{ 'animate-spin': isLoading }"
          title="Refresh data"
          @click="emit('refresh')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
