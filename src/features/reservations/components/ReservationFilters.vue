<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  searchQuery: string
  selectedStatusTab: 'all' | 'pending' | 'approved' | 'done' | 'rejected'
  selectedDateFilter: string
  counts: {
    total: number
    pending: number
    approved: number
    done: number
    rejected: number
  }
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:selectedStatusTab', val: 'all' | 'pending' | 'approved' | 'done' | 'rejected'): void
  (e: 'update:selectedDateFilter', val: string): void
}>()

const statusTabs = [
  { id: 'all', label: 'All Requests', countKey: 'total' as const },
  { id: 'pending', label: 'Pending', countKey: 'pending' as const },
  { id: 'approved', label: 'Active Passes', countKey: 'approved' as const },
  { id: 'done', label: 'Done', countKey: 'done' as const },
  { id: 'rejected', label: 'Declined / Cancelled', countKey: 'rejected' as const },
] as const
</script>

<template>
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full max-w-full">
    <!-- Status Filter Tabs -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar max-w-full">
      <button
        v-for="tab in statusTabs"
        :key="tab.id"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex-shrink-0"
        :class="[
          selectedStatusTab === tab.id
            ? 'bg-[#D22730] text-white border-[#D22730] shadow-sm'
            : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
        ]"
        @click="emit('update:selectedStatusTab', tab.id)"
      >
        <span>{{ tab.label }}</span>
        <span
          class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
          :class="[
            selectedStatusTab === tab.id
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          ]"
        >
          {{ counts[tab.countKey] }}
        </span>
      </button>
    </div>

    <!-- Right Controls: Date Picker + Search -->
    <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full lg:w-auto">
      <!-- Date Picker Filter -->
      <div class="relative min-w-[150px]">
        <input
          type="date"
          :value="selectedDateFilter"
          class="w-full h-9 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D22730]/20 focus:border-[#D22730] transition-colors"
          title="Filter by reservation date"
          @input="emit('update:selectedDateFilter', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="selectedDateFilter"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold w-4 h-4 flex items-center justify-center cursor-pointer"
          title="Clear date filter"
          @click="emit('update:selectedDateFilter', '')"
        >
          &times;
        </button>
      </div>

      <!-- Search Input -->
      <div class="w-full sm:w-64">
        <UiInput
          :model-value="searchQuery"
          placeholder="Search ref #, applicant, email..."
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
    </div>
  </div>
</template>
