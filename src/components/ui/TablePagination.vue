<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    totalItems: number
    currentPage?: number
    itemsPerPage?: number
    perPageOptions?: number[]
  }>(),
  {
    currentPage: 1,
    itemsPerPage: 10,
    perPageOptions: () => [10, 25, 50, 100]
  }
)

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:itemsPerPage', size: number): void
}>()

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
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
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
  <div v-if="totalItems > 0" class="table-pagination">
    <div class="pagination-info">
      <span>{{ summaryText }}</span>
    </div>
    <div class="pagination-controls">
      <div class="per-page-selector">
        <label for="perPageSelect">Per page:</label>
        <select id="perPageSelect" :value="itemsPerPage" class="per-page-select" @change="handlePerPageChange">
          <option v-for="option in perPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
      <div class="page-buttons">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
          title="Previous Page"
        >
          Prev
        </button>
        <template v-for="(p, index) in visiblePages" :key="index">
          <span v-if="p === '...'" class="page-ellipsis">...</span>
          <button
            v-else
            class="page-num-btn"
            :class="{ 'page-num-btn--active': currentPage === p }"
            @click="goToPage(p as number)"
          >
            {{ p }}
          </button>
        </template>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
          title="Next Page"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 13px;
  color: var(--color-muted, #64748b);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.per-page-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--color-muted, #64748b);
}

.per-page-select {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.per-page-select:focus {
  border-color: #4f46e5;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn:hover:not(:disabled) {
  border-color: #4f46e5;
  color: #4f46e5;
}

.page-num-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.page-num-btn:hover:not(.page-num-btn--active) {
  border-color: #4f46e5;
  color: #4f46e5;
}

.page-num-btn--active {
  background: #4f46e5 !important;
  border-color: #4f46e5 !important;
  color: #ffffff !important;
}

.page-ellipsis {
  font-size: 12px;
  color: var(--color-muted, #64748b);
  padding: 0 4px;
}
</style>
