<script setup lang="ts">
defineProps<{
  title: string
  value: string
  subtitle?: string
  trend: string
  trendUp: boolean
  accentColor: string // e.g. '#2563eb', '#059669', '#d97706', '#D22730'
  badgeBg: string    // e.g. 'rgba(37, 99, 235, 0.1)'
  progressPercent?: number // 0-100 (optional progress bar)
}>()
</script>

<template>
  <div class="stats-card">
    <!-- Top Row: Icon + Trend Badge -->
    <div class="stats-card__top">
      <div class="stats-card__icon-box" :style="{ background: badgeBg, color: accentColor }">
        <slot name="icon" />
      </div>

      <div
        class="stats-card__badge"
        :class="trendUp ? 'stats-card__badge--up' : 'stats-card__badge--down'"
      >
        <span class="stats-card__arrow">{{ trendUp ? '↑' : '↓' }}</span>
        <span>{{ trend }}</span>
      </div>
    </div>

    <!-- Center: Metric Title + Main Value -->
    <div class="stats-card__body">
      <span class="stats-card__title">{{ title }}</span>
      <div class="stats-card__value">{{ value }}</div>
    </div>

    <!-- Bottom: Progress Bar or Subtitle Context -->
    <div v-if="progressPercent !== undefined" class="stats-card__progress-wrap">
      <div class="stats-card__progress-track">
        <div
          class="stats-card__progress-fill"
          :style="{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%`, background: accentColor }"
        />
      </div>
      <div v-if="subtitle" class="stats-card__subtitle-row">
        <span class="stats-card__subtitle">{{ subtitle }}</span>
        <span class="stats-card__percent">{{ progressPercent }}%</span>
      </div>
    </div>
    <div v-else-if="subtitle" class="stats-card__footer">
      <span class="stats-card__subtitle">{{ subtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 148px;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
  position: relative;
  overflow: hidden;
}

.stats-card:hover {
  border-color: rgba(210, 39, 48, 0.3);
  box-shadow: var(--shadow-card);
}

/* Top Row */
.stats-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stats-card__icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.stats-card:hover .stats-card__icon-box {
  transform: scale(1.05);
}

.stats-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
}

.stats-card__badge--up {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.stats-card__badge--down {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.stats-card__arrow {
  font-size: 11px;
}

/* Body */
.stats-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-card__title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-muted);
}

.stats-card__value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

/* Progress bar */
.stats-card__progress-wrap {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats-card__progress-track {
  height: 5px;
  background: var(--color-surface-muted);
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
}

.stats-card__progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.stats-card__subtitle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-card__footer {
  margin-top: 12px;
}

.stats-card__subtitle {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--color-subtle);
}

.stats-card__percent {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}
</style>
