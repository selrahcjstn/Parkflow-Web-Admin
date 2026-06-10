<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

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
  <div class="chart-card">
    <div class="chart-card__header">
      <div class="chart-card__header-left">
        <h3 class="chart-card__title">Parking Activity</h3>
        <span class="chart-card__subtitle">Last 7 days</span>
      </div>
      <div class="chart-card__legend">
        <div class="chart-card__legend-item">
          <span class="chart-card__legend-dot chart-card__legend-dot--checkin"></span>
          Check-in
        </div>
        <div class="chart-card__legend-item">
          <span class="chart-card__legend-dot chart-card__legend-dot--checkout"></span>
          Check-out
        </div>
      </div>
    </div>

    <div class="chart-card__chart-wrapper">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="chart-card__svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="checkinGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f87171" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#f87171" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="checkoutGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#23a55a" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#23a55a" stop-opacity="0" />
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
          stroke="rgba(255,255,255,0.05)"
          stroke-dasharray="4 4"
        />

        <!-- Y-axis labels -->
        <text
          v-for="line in gridLines"
          :key="'ylabel-' + line.label"
          :x="chartPadding.left - 12"
          :y="line.y + 4"
          text-anchor="end"
          fill="#71717a"
          font-size="11"
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
          fill="#71717a"
          font-size="11"
        >
          {{ pos.label }}
        </text>

        <!-- Area fills -->
        <path
          :d="checkInArea"
          fill="url(#checkinGradient)"
          class="chart-card__area"
          :class="{ 'chart-card__area--visible': mounted }"
        />
        <path
          :d="checkOutArea"
          fill="url(#checkoutGradient)"
          class="chart-card__area"
          :class="{ 'chart-card__area--visible': mounted }"
        />

        <!-- Check-out line -->
        <path
          :d="checkOutLine"
          fill="none"
          stroke="#23a55a"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="chart-card__line"
          :class="{ 'chart-card__line--animated': mounted }"
          :style="{ strokeDasharray: totalLineLength, strokeDashoffset: mounted ? 0 : totalLineLength }"
        />

        <!-- Check-in line -->
        <path
          :d="checkInLine"
          fill="none"
          stroke="#f87171"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="chart-card__line"
          :class="{ 'chart-card__line--animated': mounted }"
          :style="{ strokeDasharray: totalLineLength, strokeDashoffset: mounted ? 0 : totalLineLength }"
        />

        <!-- Check-in data points -->
        <g v-for="(point, i) in checkInPoints" :key="'ci-dot-' + i">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="12"
            fill="transparent"
            class="chart-card__hover-target"
          />
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#f87171"
            stroke="var(--color-surface)"
            stroke-width="2"
            class="chart-card__dot"
            :class="{ 'chart-card__dot--visible': mounted }"
          />
        </g>

        <!-- Check-out data points -->
        <g v-for="(point, i) in checkOutPoints" :key="'co-dot-' + i">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="12"
            fill="transparent"
            class="chart-card__hover-target"
          />
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#23a55a"
            stroke="var(--color-surface)"
            stroke-width="2"
            class="chart-card__dot"
            :class="{ 'chart-card__dot--visible': mounted }"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
}

.chart-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.chart-card__header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.chart-card__subtitle {
  font-size: 12px;
  color: var(--color-muted);
}

.chart-card__legend {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chart-card__legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-muted);
}

.chart-card__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-card__legend-dot--checkin {
  background: #f87171;
}

.chart-card__legend-dot--checkout {
  background: #23a55a;
}

.chart-card__chart-wrapper {
  width: 100%;
  overflow: hidden;
}

.chart-card__svg {
  width: 100%;
  height: auto;
  display: block;
}

.chart-card__line {
  transition: stroke-dashoffset 1s ease-out;
}

.chart-card__area {
  opacity: 0;
  transition: opacity 0.8s ease-out 0.4s;
}

.chart-card__area--visible {
  opacity: 1;
}

.chart-card__dot {
  opacity: 0;
  transition: opacity 0.3s ease-out 0.9s, r 0.15s ease;
}

.chart-card__dot--visible {
  opacity: 1;
}

.chart-card__hover-target {
  cursor: pointer;
}

.chart-card__hover-target:hover + .chart-card__dot {
  r: 6;
}
</style>
