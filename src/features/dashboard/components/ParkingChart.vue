<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'

const mounted = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    mounted.value = true
  })
})

const props = defineProps<{
  activityData?: { day: string; checkIns: number; checkOuts: number }[]
}>()

const chartData = computed(() => {
  if (props.activityData && props.activityData.length > 0) {
    return {
      checkIns: props.activityData.map((a) => a.checkIns),
      checkOuts: props.activityData.map((a) => a.checkOuts),
      days: props.activityData.map((a) => a.day),
    }
  }
  return {
    checkIns: [0, 0, 0, 0, 0, 0, 0],
    checkOuts: [0, 0, 0, 0, 0, 0, 0],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  }
})

const maxY = computed(() => {
  const maxVal = Math.max(...chartData.value.checkIns, ...chartData.value.checkOuts)
  return maxVal > 0 ? Math.ceil((maxVal + 5) / 10) * 10 : 60
})

const yLabels = computed(() => {
  const step = maxY.value / 4
  return [0, Math.round(step), Math.round(step * 2), Math.round(step * 3), maxY.value]
})

const chartPadding = { top: 20, right: 30, bottom: 30, left: 40 }
const chartWidth = 700
const chartHeight = 220
const plotWidth = chartWidth - chartPadding.left - chartPadding.right
const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom

function dataToPoints(data: number[]): { x: number; y: number }[] {
  return data.map((val, i) => ({
    x: chartPadding.left + (i / (data.length - 1)) * plotWidth,
    y: chartPadding.top + plotHeight - (val / maxY.value) * plotHeight,
  }))
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  const firstPoint = points[0]
  if (!firstPoint) return ''
  let d = `M ${firstPoint.x},${firstPoint.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]
    if (!p0 || !p1 || !p2 || !p3) continue
    const tension = 0.3
    const cp1x = p1.x + ((p2.x - p0.x) * tension)
    const cp1y = p1.y + ((p2.y - p0.y) * tension)
    const cp2x = p2.x - ((p3.x - p1.x) * tension)
    const cp2y = p2.y - ((p3.y - p1.y) * tension)
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

function areaPath(points: { x: number; y: number }[]): string {
  const linePath = smoothPath(points)
  const bottomY = chartPadding.top + plotHeight
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  if (!firstPoint || !lastPoint) return ''
  return `${linePath} L ${lastPoint.x},${bottomY} L ${firstPoint.x},${bottomY} Z`
}

const checkInPoints = computed(() => dataToPoints(chartData.value.checkIns))
const checkOutPoints = computed(() => dataToPoints(chartData.value.checkOuts))

const checkInLine = computed(() => smoothPath(checkInPoints.value))
const checkOutLine = computed(() => smoothPath(checkOutPoints.value))
const checkInArea = computed(() => areaPath(checkInPoints.value))
const checkOutArea = computed(() => areaPath(checkOutPoints.value))

const totalLineLength = 1200

const gridLines = computed(() =>
  yLabels.value.map((val) => ({
    label: val,
    y: chartPadding.top + plotHeight - (val / maxY.value) * plotHeight,
  }))
)

const xLabelPositions = computed(() =>
  chartData.value.days.map((day, i) => ({
    label: day,
    x: chartPadding.left + (i / (chartData.value.days.length - 1)) * plotWidth,
  }))
)
</script>

<template>
  <UiCard>
    <!-- Header Row -->
    <div class="flex items-start justify-between mb-5">
      <div class="flex flex-col gap-0.5">
        <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight m-0">
          Parking Activity
        </h3>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Last 7 days</span>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
          <span>Check-in</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Check-out</span>
        </div>
      </div>
    </div>

    <!-- Chart SVG -->
    <div class="w-full overflow-hidden">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="checkinGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="checkoutGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Grid lines -->
        <line
          v-for="line in gridLines"
          :key="'grid-' + line.label"
          :x1="chartPadding.left"
          :y1="line.y"
          :x2="chartWidth - chartPadding.right"
          :y2="line.y"
          stroke="#e2e8f0"
          stroke-dasharray="4 4"
        />

        <!-- Y-axis labels -->
        <text
          v-for="line in gridLines"
          :key="'ylabel-' + line.label"
          :x="chartPadding.left - 12"
          :y="line.y + 4"
          text-anchor="end"
          fill="#94a3b8"
          font-size="11"
          font-weight="500"
        >
          {{ line.label }}
        </text>

        <!-- X-axis labels -->
        <text
          v-for="pos in xLabelPositions"
          :key="'xlabel-' + pos.label"
          :x="pos.x"
          :y="chartHeight - 6"
          text-anchor="middle"
          fill="#94a3b8"
          font-size="11"
          font-weight="500"
        >
          {{ pos.label }}
        </text>

        <!-- Area fills -->
        <path
          :d="checkInArea"
          fill="url(#checkinGradient)"
          class="transition-opacity duration-700 ease-out"
          :class="mounted ? 'opacity-100' : 'opacity-0'"
        />
        <path
          :d="checkOutArea"
          fill="url(#checkoutGradient)"
          class="transition-opacity duration-700 ease-out"
          :class="mounted ? 'opacity-100' : 'opacity-0'"
        />

        <!-- Check-out line -->
        <path
          :d="checkOutLine"
          fill="none"
          stroke="#10b981"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transition-all duration-1000 ease-out"
          :style="{ strokeDasharray: totalLineLength, strokeDashoffset: mounted ? 0 : totalLineLength }"
        />

        <!-- Check-in line -->
        <path
          :d="checkInLine"
          fill="none"
          stroke="#4f46e5"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transition-all duration-1000 ease-out"
          :style="{ strokeDasharray: totalLineLength, strokeDashoffset: mounted ? 0 : totalLineLength }"
        />

        <!-- Check-in data points -->
        <g v-for="(point, i) in checkInPoints" :key="'ci-dot-' + i" class="group/dot cursor-pointer">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="12"
            fill="transparent"
          />
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#4f46e5"
            stroke="#ffffff"
            stroke-width="2"
            class="transition-all duration-300 ease-out group-hover/dot:r-6"
            :class="mounted ? 'opacity-100' : 'opacity-0'"
          />
        </g>

        <!-- Check-out data points -->
        <g v-for="(point, i) in checkOutPoints" :key="'co-dot-' + i" class="group/dot cursor-pointer">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="12"
            fill="transparent"
          />
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#10b981"
            stroke="#ffffff"
            stroke-width="2"
            class="transition-all duration-300 ease-out group-hover/dot:r-6"
            :class="mounted ? 'opacity-100' : 'opacity-0'"
          />
        </g>
      </svg>
    </div>
  </UiCard>
</template>
