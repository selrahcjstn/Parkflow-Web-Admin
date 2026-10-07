<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    totalItems: number
    currentPage?: number
    itemsPerPage?: number
    perPageOptions?: number[]
  }>(),
  {
    currentPage: 1,
    itemsPerPage: 10,
    perPageOptions: () => [10, 25, 50, 100],
  },
)

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:itemsPerPage', size: number): void
}>()

const selectId = useId()

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage) || 1)

const startIndex = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endIndex = computed(() => {
  return Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
})

const summaryText = computed(() => {
  if (props.totalItems === 0) return 'Showing 0 entries'
  return `Showing ${startIndex.value} to ${endIndex.value} of ${props.totalItems} entries`
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const delta = 2
  const pages: (number | string)[] = []

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages
})

const goToPage = (page: number) => {
  if (props.disabled || page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('update:currentPage', page)
}

const handlePerPageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newSize = parseInt(target.value, 10)
  emit('update:itemsPerPage', newSize)
  emit('update:currentPage', 1)
}
</script>

<template>
  <div
    v-if="totalItems > 0"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4"
  >
    <div class="text-sm text-muted">
      <span>{{ summaryText }}</span>
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2 text-sm text-muted">
        <label :for="selectId">Per page:</label>
        <select
          :id="selectId"
          :value="itemsPerPage"
          :disabled="disabled"
          class="min-h-9 rounded-sm border border-border bg-surface px-2 text-sm font-medium text-text focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          @change="handlePerPageChange"
        >
          <option v-for="option in perPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <button
          type="button"
          class="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm font-medium text-text hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="disabled || currentPage === 1"
          @click="goToPage(currentPage - 1)"
          title="Previous Page"
        >
          Prev
        </button>
        <template v-for="(p, index) in visiblePages" :key="index">
          <span v-if="p === '...'" class="px-2 text-sm text-muted">...</span>
          <button
            type="button"
            v-else
            :disabled="disabled"
            :aria-current="currentPage === p ? 'page' : undefined"
            class="flex min-h-9 min-w-9 items-center justify-center rounded-sm border px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
            :class="
              currentPage === p
                ? 'border-primary bg-primary text-text-inverse'
                : 'border-border bg-surface text-text hover:border-primary hover:text-primary'
            "
            @click="goToPage(p as number)"
          >
            {{ p }}
          </button>
        </template>
        <button
          type="button"
          class="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm font-medium text-text hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="disabled || currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
          title="Next Page"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
