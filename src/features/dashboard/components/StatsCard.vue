<script setup lang="ts">
defineProps<{
  title: string
  value: string
  trend: string
  trendUp: boolean
  iconBg: string
}>()
</script>

<template>
  <div class="stats-card">
    <div class="stats-card__header">
      <div class="stats-card__icon" :style="{ background: iconBg }">
        <slot name="icon" />
      </div>
      <span
        class="stats-card__trend"
        :class="trendUp ? 'stats-card__trend--up' : 'stats-card__trend--down'"
      >
        <span class="stats-card__trend-arrow">{{ trendUp ? '▲' : '▼' }}</span>
        {{ trend }}
      </span>
    </div>
    <div class="stats-card__value">{{ value }}</div>
    <div class="stats-card__title">{{ title }}</div>
  </div>
</template>

<style scoped>
.stats-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
  transition: transform 200ms ease, box-shadow 200ms ease;
  cursor: default;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.stats-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.stats-card__trend--up {
  background: rgba(35, 165, 90, 0.12);
  color: #23a55a;
}

.stats-card__trend--down {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

.stats-card__trend-arrow {
  font-size: 9px;
}

.stats-card__value {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-text);
  margin-top: 16px;
  line-height: 1.1;
}

.stats-card__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
