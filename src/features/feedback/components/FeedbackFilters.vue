<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  selectedCategory: string
  selectedStatus: string
  selectedRating: number | 'All'
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:selectedCategory', val: string): void
  (e: 'update:selectedStatus', val: string): void
  (e: 'update:selectedRating', val: number | 'All'): void
}>()

const categories = ['All', 'Bug Report', 'Feature Request', 'UI/UX', 'General']

const statusOptions = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Reviewed', value: 'Reviewed' },
  { label: 'Resolved', value: 'Resolved' }
]

const ratingOptions = [
  { label: 'All Ratings', value: 'All' },
  { label: '5 Stars ★★★★★', value: 5 },
  { label: '4 Stars ★★★★☆', value: 4 },
  { label: '3 Stars ★★★☆☆', value: 3 },
  { label: '2 Stars ★★☆☆☆', value: 2 },
  { label: '1 Star ★☆☆☆☆', value: 1 }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Category Filter Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        @click="emit('update:selectedCategory', cat)"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="flex-1 max-w-md">
        <UiInput
          :model-value="searchQuery"
          placeholder="Search by feedback content, user name, email..."
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
        <div class="w-36">
          <UiSelect
            :model-value="selectedStatus"
            :options="statusOptions"
            size="sm"
            @update:model-value="emit('update:selectedStatus', String($event))"
          />
        </div>

        <div class="w-44">
          <UiSelect
            :model-value="selectedRating"
            :options="ratingOptions"
            size="sm"
            @update:model-value="emit('update:selectedRating', $event === 'All' ? 'All' : Number($event))"
          />
        </div>
      </div>
    </div>
  </div>
</template>
