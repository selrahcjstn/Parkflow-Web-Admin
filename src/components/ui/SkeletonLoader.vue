<script setup lang="ts">
defineProps<{
  variant?: 'text' | 'circle' | 'rect' | 'card' | 'table-row'
  width?: string
  height?: string
  rows?: number
  columns?: number
}>()
</script>

<template>
  <!-- Text skeleton -->
  <div v-if="variant === 'text' || !variant" class="skeleton-group">
    <div
      v-for="n in (rows || 3)"
      :key="n"
      class="skeleton skeleton-text"
      :style="{
        width: n === (rows || 3) ? '60%' : (width || '100%'),
        height: height || '14px'
      }"
    />
  </div>

  <!-- Circle skeleton -->
  <div
    v-else-if="variant === 'circle'"
    class="skeleton skeleton-circle"
    :style="{ width: width || '44px', height: height || '44px' }"
  />

  <!-- Rect skeleton -->
  <div
    v-else-if="variant === 'rect'"
    class="skeleton"
    :style="{ width: width || '100%', height: height || '120px', borderRadius: '12px' }"
  />

  <!-- Card skeleton -->
  <div v-else-if="variant === 'card'" class="skeleton-card">
    <div class="skeleton-card__header">
      <div class="skeleton skeleton-circle" style="width: 44px; height: 44px" />
      <div style="flex: 1">
        <div class="skeleton skeleton-text" style="width: 50%; height: 12px" />
        <div class="skeleton skeleton-text" style="width: 30%; height: 10px" />
      </div>
    </div>
    <div class="skeleton" style="height: 32px; width: 60%; margin-top: 16px; border-radius: 8px" />
    <div class="skeleton skeleton-text" style="width: 40%; margin-top: 8px; height: 12px" />
  </div>

  <!-- Table row skeleton -->
  <tr v-else-if="variant === 'table-row'" class="skeleton-table-row">
    <td v-for="c in (columns || 5)" :key="c" style="padding: 14px 16px">
      <div class="skeleton skeleton-text" :style="{ width: c === 1 ? '70%' : '85%', height: '14px', marginBottom: 0 }" />
    </td>
  </tr>
</template>

<style scoped>
.skeleton-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skeleton-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
}

.skeleton-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-table-row td {
  border-bottom: 1px solid var(--color-border);
}
</style>
