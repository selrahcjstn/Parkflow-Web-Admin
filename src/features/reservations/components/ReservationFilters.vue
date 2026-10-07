<script setup lang="ts">
import UiSelect from '@/components/ui/UiSelect.vue'
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
  <div class="flex flex-col gap-3 md:flex-row md:items-end">
    <UiInput
      class="flex-1 md:max-w-md"
      label="Search"
      :model-value="searchQuery"
      placeholder="Search reference, applicant or email"
      clearable
      @update:model-value="emit('update:searchQuery', String($event))"
    />
    <div class="flex flex-wrap items-end gap-3 md:ml-auto">
      <UiSelect
        class="w-44"
        label="Status"
        :model-value="selectedStatusTab"
        :options="statusTabs.map((tab) => ({ value: tab.id, label: tab.label }))"
        @update:model-value="emit('update:selectedStatusTab', $event as typeof props.selectedStatusTab)"
      />
      <UiInput
        label="Date"
        type="date"
        :model-value="selectedDateFilter"
        clearable
        @update:model-value="emit('update:selectedDateFilter', String($event))"
      />
    </div>
  </div>
</template>
