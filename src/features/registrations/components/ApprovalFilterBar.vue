<script setup lang="ts">
import { computed } from 'vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  selectedStatusTab: 'all' | 'pending' | 'approved' | 'rejected'
  selectedRole?: string
  viewMode: 'grid' | 'table'
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  isLoading: boolean
  showRoleFilter?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:selectedStatusTab', val: 'all' | 'pending' | 'approved' | 'rejected'): void
  (e: 'update:selectedRole', val: string): void
  (e: 'update:viewMode', val: 'grid' | 'table'): void
  (e: 'refresh'): void
}>()

const statusOptions = computed(() => [
  { label: `All Statuses (${props.totalCount})`, value: 'all' },
  { label: `Pending Review (${props.pendingCount})`, value: 'pending' },
  { label: `Approved & Verified (${props.approvedCount})`, value: 'approved' },
  { label: `Rejected (${props.rejectedCount})`, value: 'rejected' }
])

const roleOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Student', value: 'Student' },
  { label: 'Faculty', value: 'Faculty' },
  { label: 'Staff', value: 'Staff' },
  { label: 'Visitor', value: 'Visitor' }
]
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <!-- Search Bar -->
    <div class="flex-1 max-w-md">
      <UiInput
        :model-value="searchQuery"
        placeholder="Search by name, email, plate number..."
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

    <!-- Dropdowns and View Controls -->
    <div class="flex items-center gap-2.5 sm:ml-auto flex-wrap">
      <!-- Status Filter Dropdown -->
      <div class="w-44">
        <UiSelect
          :model-value="selectedStatusTab"
          :options="statusOptions"
          size="sm"
          @update:model-value="emit('update:selectedStatusTab', $event)"
        />
      </div>

      <!-- Role Filter Dropdown (Optional) -->
      <div v-if="showRoleFilter" class="w-36">
        <UiSelect
          :model-value="selectedRole || 'all'"
          :options="roleOptions"
          size="sm"
          @update:model-value="emit('update:selectedRole', $event)"
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
</template>
