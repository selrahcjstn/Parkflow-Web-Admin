<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ActivityBucket } from '../../api/dashboard.api'
import { useElementWidth } from '../../composables/useElementWidth'

const props = defineProps<{ series: ActivityBucket[]; granularity: 'hour' | 'day' }>()

const ENTRY_COLOR = '#D22730'
const EXIT_COLOR = '#FDB813'
const HEIGHT = 260
const margin = { top: 12, right: 12, bottom: 30, left: 36 }

const host = ref<HTMLElement | null>(null)
const width = useElementWidth(host)
const showEntries = ref(true)
const showExits = ref(true)
const hovered = ref<number | null>(null)

const innerW = computed(() => Math.max(1, width.value - margin.left - margin.right))
const innerH = HEIGHT - margin.top - margin.bottom

const maximum = computed(() => {
  const values = props.series.flatMap((b) => [showEntries.value ? b.entries : 0, showExits.value ? b.exits : 0])
  const peak = Math.max(0, ...values)
  const step = peak <= 4 ? 1 : Math.pow(10, Math.floor(Math.log10(peak / 4)))
  const nice = [1, 2, 5, 10].map((m) => m * step).find((s) => s * 4 >= peak) ?? step * 10
  return Math.max(4, nice * 4)
})
const ticks = computed(() => Array.from({ length: 5 }, (_, i) => (maximum.value * i) / 4))

const x = (i: number) => margin.left + (props.series.length <= 1 ? innerW.value / 2 : (i * innerW.value) / (props.series.length - 1))
const y = (v: number) => margin.top + innerH - (Math.max(0, v) / maximum.value) * innerH

const line = (field: 'entries' | 'exits') => props.series.map((b, i) => `${x(i).toFixed(1)},${y(b[field]).toFixed(1)}`).join(' ')
const area = (field: 'entries' | 'exits') =>
  props.series.length
    ? `${x(0).toFixed(1)},${y(0)} ${line(field)} ${x(props.series.length - 1).toFixed(1)},${y(0)}`
    : ''

const labelEvery = computed(() => {
  const fit = Math.max(1, Math.floor(innerW.value / 54))
  return Math.max(1, Math.ceil(props.series.length / fit))
})

function onMove(event: PointerEvent) {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left - margin.left
  const ratio = props.series.length <= 1 ? 0 : px / innerW.value
  hovered.value = Math.min(props.series.length - 1, Math.max(0, Math.round(ratio * (props.series.length - 1))))
}

const tip = computed(() => (hovered.value === null ? null : props.series[hovered.value]))
const tipLeft = computed(() => {
  if (hovered.value === null) return 0
  return Math.min(Math.max(x(hovered.value), 80), width.value - 80)
})
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-4 text-[12.5px]">
      <label class="flex cursor-pointer items-center gap-2 text-text">
        <input v-model="showEntries" type="checkbox" class="size-4" style="accent-color: #D22730" />
        <span class="size-2.5 rounded-full" :style="{ background: ENTRY_COLOR }" />Entries
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-text">
        <input v-model="showExits" type="checkbox" class="size-4" style="accent-color: #FDB813" />
        <span class="size-2.5 rounded-full" :style="{ background: EXIT_COLOR }" />Exits
      </label>
    </div>

    <p v-if="!showEntries && !showExits" class="flex h-[260px] items-center justify-center text-sm text-muted">
      Select Entries or Exits to show activity.
    </p>
    <div v-else ref="host" class="relative">
      <svg
        :viewBox="`0 0 ${width} ${HEIGHT}`"
        :width="width"
        :height="HEIGHT"
        class="block w-full touch-pan-y"
        role="img"
        :aria-label="`Entries and exits, ${series.length} ${granularity === 'hour' ? 'hours' : 'days'}`"
        @pointermove="onMove"
        @pointerleave="hovered = null"
      >
        <g v-for="t in ticks" :key="t">
          <line :x1="margin.left" :x2="width - margin.right" :y1="y(t)" :y2="y(t)" class="stroke-border" stroke-width="1" />
          <text :x="margin.left - 8" :y="y(t) + 4" text-anchor="end" class="fill-muted" font-size="11">{{ t }}</text>
        </g>
        <text
          v-for="(b, i) in series"
          v-show="i % labelEvery === 0"
          :key="b.key"
          :x="x(i)"
          :y="HEIGHT - 8"
          :text-anchor="i === series.length - 1 && series.length > 1 ? 'end' : 'middle'"
          class="fill-muted"
          font-size="11"
        >{{ b.label }}</text>

        <polygon v-if="showEntries" :points="area('entries')" :fill="ENTRY_COLOR" opacity="0.07" />
        <polyline v-if="showEntries" :points="line('entries')" fill="none" :stroke="ENTRY_COLOR" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <polyline v-if="showExits" :points="line('exits')" fill="none" :stroke="EXIT_COLOR" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

        <template v-if="hovered !== null && tip">
          <line :x1="x(hovered)" :x2="x(hovered)" :y1="margin.top" :y2="margin.top + innerH" class="stroke-subtle" stroke-dasharray="3 3" />
          <circle v-if="showEntries" :cx="x(hovered)" :cy="y(tip.entries)" r="4" :fill="ENTRY_COLOR" stroke="white" stroke-width="2" />
          <circle v-if="showExits" :cx="x(hovered)" :cy="y(tip.exits)" r="4" :fill="EXIT_COLOR" stroke="white" stroke-width="2" />
        </template>
        <rect :x="margin.left" :y="margin.top" :width="innerW" :height="innerH" fill="transparent" />
      </svg>

      <div
        v-if="tip && hovered !== null"
        class="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-sm"
        :style="{ left: `${tipLeft}px` }"
        role="status"
      >
        <p class="m-0 mb-1 font-semibold text-text">{{ tip.label }}</p>
        <p v-if="showEntries" class="m-0 flex items-center gap-1.5 text-text-secondary"><span class="size-2 rounded-full" :style="{ background: ENTRY_COLOR }" />Entries <b class="ml-auto pl-3 text-text tabular-nums">{{ tip.entries }}</b></p>
        <p v-if="showExits" class="m-0 flex items-center gap-1.5 text-text-secondary"><span class="size-2 rounded-full" :style="{ background: EXIT_COLOR }" />Exits <b class="ml-auto pl-3 text-text tabular-nums">{{ tip.exits }}</b></p>
      </div>
    </div>

    <table class="sr-only">
      <caption>Entries and exits by {{ granularity }}</caption>
      <thead><tr><th scope="col">{{ granularity === 'hour' ? 'Hour' : 'Day' }}</th><th scope="col">Entries</th><th scope="col">Exits</th></tr></thead>
      <tbody><tr v-for="b in series" :key="b.key"><th scope="row">{{ b.label }}</th><td>{{ b.entries }}</td><td>{{ b.exits }}</td></tr></tbody>
    </table>
  </div>
</template>
