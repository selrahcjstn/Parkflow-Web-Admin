<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HourOfDay } from '../../api/dashboard.api'
import { useElementWidth } from '../../composables/useElementWidth'

const props = defineProps<{ hours: HourOfDay[] }>()

const HEIGHT = 230
const margin = { top: 10, right: 8, bottom: 28, left: 34 }
const metric = ref<'entries' | 'exits'>('entries')
const hovered = ref<number | null>(null)

const host = ref<HTMLElement | null>(null)
const width = useElementWidth(host)
const innerW = computed(() => Math.max(1, width.value - margin.left - margin.right))
const innerH = HEIGHT - margin.top - margin.bottom

const values = computed(() => props.hours.map((h) => h[metric.value]))
const maximum = computed(() => {
  const peak = Math.max(0, ...values.value)
  const step = peak <= 4 ? 1 : Math.pow(10, Math.floor(Math.log10(peak / 4)))
  const nice = [1, 2, 5, 10].map((m) => m * step).find((s) => s * 4 >= peak) ?? step * 10
  return Math.max(4, nice * 4)
})
const ticks = computed(() => Array.from({ length: 5 }, (_, i) => (maximum.value * i) / 4))

const slot = computed(() => innerW.value / Math.max(1, props.hours.length))
const barW = computed(() => Math.max(3, slot.value * 0.62))
const y = (v: number) => margin.top + innerH - (v / maximum.value) * innerH
const x = (i: number) => margin.left + i * slot.value + (slot.value - barW.value) / 2

// The three busiest hours are emphasised; everything else stays neutral.
const topHours = computed(() => {
  const ranked = props.hours
    .map((h, i) => ({ i, v: h[metric.value] }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
  return new Set(ranked.map((r) => r.i))
})
const peak = computed(() => {
  const best = props.hours.reduce<HourOfDay | null>((acc, h) => (!acc || h[metric.value] > acc[metric.value] ? h : acc), null)
  return best && best[metric.value] > 0 ? { hour: best.label, count: best[metric.value], kind: metric.value } : null
})
const labelEvery = computed(() => (slot.value >= 26 ? 1 : slot.value >= 14 ? 2 : 3))
</script>

<template>
  <div>
    <div class="mb-3 inline-flex rounded-lg border border-border p-0.5 text-[12.5px]" role="tablist" aria-label="Peak hours metric">
      <button
        v-for="option in [{ id: 'entries', label: 'Arrivals' }, { id: 'exits', label: 'Departures' }] as const"
        :key="option.id"
        type="button"
        role="tab"
        :aria-selected="metric === option.id"
        class="min-h-8 rounded-md px-3 font-medium transition-colors"
        :class="metric === option.id ? 'bg-text text-surface' : 'text-muted hover:text-text'"
        @click="metric = option.id"
      >{{ option.label }}</button>
    </div>

    <div ref="host" class="relative">
      <svg :viewBox="`0 0 ${width} ${HEIGHT}`" :width="width" :height="HEIGHT" class="block w-full" role="img"
        :aria-label="`${metric === 'entries' ? 'Arrivals' : 'Departures'} by hour of day`" @pointerleave="hovered = null">
        <g v-for="t in ticks" :key="t">
          <line :x1="margin.left" :x2="width - margin.right" :y1="y(t)" :y2="y(t)" class="stroke-border" />
          <text :x="margin.left - 6" :y="y(t) + 4" text-anchor="end" class="fill-muted" font-size="11">{{ t }}</text>
        </g>
        <g v-for="(h, i) in hours" :key="h.hour" @pointerenter="hovered = i">
          <rect :x="margin.left + i * slot" :y="margin.top" :width="slot" :height="innerH" fill="transparent" />
          <rect
            :x="x(i)"
            :y="y(h[metric])"
            :width="barW"
            :height="Math.max(0, y(0) - y(h[metric]))"
            rx="2"
            :fill="topHours.has(i) ? (metric === 'entries' ? '#D22730' : '#FDB813') : 'currentColor'"
            :class="topHours.has(i) ? '' : 'text-border'"
            :opacity="hovered === i ? 0.85 : 1"
          />
          <text v-if="i % labelEvery === 0" :x="x(i) + barW / 2" :y="HEIGHT - 8" text-anchor="middle" class="fill-muted" font-size="10.5">{{ h.label.replace(' ', '') }}</text>
        </g>
      </svg>
      <div
        v-if="hovered !== null && hours[hovered]"
        class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-sm"
        :style="{ left: `${Math.min(Math.max(x(hovered) + barW / 2, 70), width - 70)}px` }"
        role="status"
      >
        <p class="m-0 font-semibold text-text">{{ hours[hovered]!.label }}</p>
        <p class="m-0 text-text-secondary">Arrivals <b class="text-text tabular-nums">{{ hours[hovered]!.entries }}</b></p>
        <p class="m-0 text-text-secondary">Departures <b class="text-text tabular-nums">{{ hours[hovered]!.exits }}</b></p>
      </div>
    </div>

    <p class="m-0 mt-3 text-[12.5px] text-muted">
      <template v-if="peak">
        Busiest {{ metric === 'entries' ? 'arrival' : 'departure' }} hour:
        <b class="text-text">{{ peak.hour }}</b> with {{ peak.count.toLocaleString('en-PH') }}
        {{ metric === 'entries' ? 'entries' : 'exits' }}.
      </template>
      <template v-else>No {{ metric === 'entries' ? 'arrivals' : 'departures' }} recorded in this period.</template>
    </p>

    <!-- The wrapper must be a div: browsers ignore height/overflow on a <table>, so an sr-only table
         keeps its full height and stretches the page, which lets the whole window scroll. -->
    <div class="sr-only">
      <table>
        <caption>Arrivals and departures by hour</caption>
        <thead><tr><th scope="col">Hour</th><th scope="col">Arrivals</th><th scope="col">Departures</th></tr></thead>
        <tbody><tr v-for="h in hours" :key="h.hour"><th scope="row">{{ h.label }}</th><td>{{ h.entries }}</td><td>{{ h.exits }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>
