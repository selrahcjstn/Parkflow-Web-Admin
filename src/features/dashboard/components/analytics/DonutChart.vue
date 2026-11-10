<script setup lang="ts">
import { computed, ref } from 'vue'

export interface DonutItem { label: string; value: number; color: string }

const props = defineProps<{ items: DonutItem[]; centerLabel?: string; chartLabel: string }>()

const SIZE = 168
const STROKE = 22
const radius = (SIZE - STROKE) / 2
const circumference = 2 * Math.PI * radius
const active = ref<string | null>(null)

const total = computed(() => props.items.reduce((sum, item) => sum + item.value, 0))

const segments = computed(() => {
  let offset = 0
  return props.items
    .filter((item) => item.value > 0)
    .map((item) => {
      const length = (item.value / total.value) * circumference
      const segment = { ...item, length, offset }
      offset += length
      return segment
    })
})

const percent = (value: number) => (total.value ? ((value / total.value) * 100).toFixed(1) : '0.0')
const shown = computed(() => props.items.find((i) => i.label === active.value))
</script>

<template>
  <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
    <div class="relative shrink-0" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }">
      <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`" role="img" :aria-label="chartLabel" class="-rotate-90">
        <circle :cx="SIZE / 2" :cy="SIZE / 2" :r="radius" fill="none" class="stroke-surface-muted" :stroke-width="STROKE" />
        <circle
          v-for="s in segments"
          :key="s.label"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="radius"
          fill="none"
          :stroke="s.color"
          :stroke-width="active === s.label ? STROKE + 4 : STROKE"
          :stroke-dasharray="`${Math.max(0, s.length - (segments.length > 1 ? 2 : 0))} ${circumference}`"
          :stroke-dashoffset="-s.offset"
          class="transition-[stroke-width] duration-150"
          @pointerenter="active = s.label"
          @pointerleave="active = null"
        >
          <title>{{ s.label }}: {{ s.value }} ({{ percent(s.value) }}%)</title>
        </circle>
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="text-[24px] font-bold leading-none text-text tabular-nums">{{ shown ? shown.value.toLocaleString('en-PH') : total.toLocaleString('en-PH') }}</span>
        <span class="mt-1 max-w-[96px] text-[11.5px] leading-tight text-muted">{{ shown ? `${shown.label} · ${percent(shown.value)}%` : (centerLabel ?? 'Total') }}</span>
      </div>
    </div>

    <ul class="m-0 flex w-full min-w-0 list-none flex-col gap-1.5 p-0">
      <li
        v-for="item in items"
        :key="item.label"
        class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors"
        :class="active === item.label ? 'bg-surface-muted' : ''"
        @pointerenter="active = item.label"
        @pointerleave="active = null"
      >
        <span class="size-2.5 shrink-0 rounded-full" :style="{ background: item.color }" />
        <span class="min-w-0 flex-1 truncate text-text-secondary">{{ item.label }}</span>
        <span class="font-semibold text-text tabular-nums">{{ item.value.toLocaleString('en-PH') }}</span>
        <span class="w-12 text-right text-muted tabular-nums">{{ percent(item.value) }}%</span>
      </li>
    </ul>
  </div>
</template>
