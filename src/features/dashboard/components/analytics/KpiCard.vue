<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import DashIcon, { type DashIconName } from './DashIcon.vue'

const props = withDefaults(defineProps<{
  title: string
  value: string
  icon: DashIconName
  /** Short supporting line under the value. */
  hint?: string
  /** Comparison text; only pass it when a real previous value exists. */
  delta?: string
  /** positive = good news, negative = bad news, neutral = just information. */
  deltaTone?: 'positive' | 'negative' | 'neutral'
  deltaDirection?: 'up' | 'down' | 'flat'
  /** 0-100 for utilisation style cards. */
  progress?: number
  to?: string
  loading?: boolean
  tone?: 'brand' | 'gold' | 'slate'
}>(), { deltaTone: 'neutral', deltaDirection: 'flat', tone: 'slate' })

const iconClass = computed(() => ({
  brand: 'bg-[#D22730]/10 text-[#D22730]',
  gold: 'bg-[#FDB813]/20 text-[#8a6100]',
  slate: 'bg-surface-muted text-text-secondary',
}[props.tone]))

const deltaClass = computed(() => ({
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-muted',
}[props.deltaTone]))
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="group block rounded-card border border-border bg-surface p-4 transition-colors duration-150"
    :class="to ? 'hover:border-[#D22730]/40 focus-visible:outline-2 focus-visible:outline-[#D22730]' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <p class="m-0 text-[12px] font-semibold uppercase tracking-wide text-muted">{{ title }}</p>
      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg" :class="iconClass">
        <DashIcon :name="icon" :size="17" />
      </span>
    </div>

    <div v-if="loading" class="mt-3 h-8 w-24 animate-pulse rounded bg-surface-muted" />
    <p v-else class="m-0 mt-2 text-[26px] font-bold leading-none tracking-tight text-text tabular-nums">{{ value }}</p>

    <div v-if="progress !== undefined && !loading" class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        class="h-full rounded-full bg-[#D22730] transition-[width] duration-500"
        :style="{ width: `${Math.min(Math.max(progress, 0), 100)}%` }"
      />
    </div>

    <div class="mt-2 flex min-h-4 flex-wrap items-center gap-x-2 text-[12px]">
      <span v-if="delta && !loading" class="inline-flex items-center gap-0.5 font-semibold tabular-nums" :class="deltaClass">
        <span v-if="deltaDirection !== 'flat'" aria-hidden="true">{{ deltaDirection === 'up' ? '▲' : '▼' }}</span>{{ delta }}
      </span>
      <span v-if="hint" class="text-muted">{{ hint }}</span>
    </div>
  </component>
</template>
