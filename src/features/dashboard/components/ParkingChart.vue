<script setup lang="ts">
import { computed, ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
const props = defineProps<{
  activityData?: { day: string; checkIns: number; checkOuts: number }[]
}>()
const mode = ref('bar')
const showEntries = ref(true)
const showExits = ref(true)
const showValues = ref(false)
const rows = computed(() => props.activityData || [])
const maximum = computed(() => {
  const values = rows.value.flatMap((row) => [
    showEntries.value ? row.checkIns : 0,
    showExits.value ? row.checkOuts : 0,
  ])
  return Math.max(4, Math.ceil(Math.max(0, ...values) / 4) * 4)
})
const ticks = computed(() => Array.from({ length: 5 }, (_, i) => (maximum.value * i) / 4))
function x(index: number) {
  return 50 + ((index + 0.5) * 600) / Math.max(1, rows.value.length)
}
function y(value: number) {
  return 190 - (Math.max(0, value) / maximum.value) * 160
}
function points(field: 'checkIns' | 'checkOuts') {
  return rows.value.map((row, i) => `${x(i)},${y(row[field])}`).join(' ')
}
</script>

<template>
  <UiCard>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-text">Parking activity</h2>
        <p class="mt-1 text-sm text-muted">Entries and exits over the last 7 days</p>
      </div>
      <UiSelect
        class="w-32"
        aria-label="Chart format"
        :placeholder="''"
        v-model="mode"
        :options="[
          { label: 'Bar chart', value: 'bar' },
          { label: 'Line chart', value: 'line' },
        ]"
      />
    </div>
    <div class="mb-4 flex flex-wrap items-center gap-5 text-sm">
      <label class="flex min-h-10 cursor-pointer items-center gap-2 text-primary"
        ><input v-model="showEntries" type="checkbox" class="size-4 accent-primary" />Entries</label
      >
      <label class="flex min-h-10 cursor-pointer items-center gap-2 text-muted"
        ><input v-model="showExits" type="checkbox" class="size-4 accent-primary" />Exits</label
      >
      <button
        type="button"
        class="ml-auto min-h-10 text-primary hover:underline"
        :aria-expanded="showValues"
        @click="showValues = !showValues"
      >
        {{ showValues ? 'Hide data' : 'View data' }}
      </button>
    </div>
    <p v-if="!rows.length" class="py-12 text-center text-sm text-muted">
      No parking activity available.
    </p>
    <p v-else-if="!showEntries && !showExits" class="py-12 text-center text-sm text-muted">
      Select Entries or Exits to show activity.
    </p>
    <svg
      v-else
      viewBox="0 0 700 225"
      class="block w-full"
      role="img"
      aria-label="Parking entries and exits for the last seven days"
    >
      <g v-for="tick in ticks" :key="tick">
        <line x1="50" x2="650" :y1="y(tick)" :y2="y(tick)" class="stroke-border" />
        <text x="38" :y="y(tick) + 4" text-anchor="end" class="fill-muted text-xs">{{ tick }}</text>
      </g>
      <g v-for="(row, index) in rows" :key="index">
        <text :x="x(index)" y="215" text-anchor="middle" class="fill-muted text-xs">
          {{ row.day }}
        </text>
        <template v-if="mode === 'bar'">
          <rect
            v-if="showEntries"
            :x="x(index) - 18"
            :y="y(row.checkIns)"
            width="16"
            :height="190 - y(row.checkIns)"
            rx="2"
            class="fill-primary"
          >
            <title>{{ row.day }}: {{ row.checkIns }} entries</title>
          </rect>
          <rect
            v-if="showExits"
            :x="x(index) + 2"
            :y="y(row.checkOuts)"
            width="16"
            :height="190 - y(row.checkOuts)"
            rx="2"
            class="fill-muted"
          >
            <title>{{ row.day }}: {{ row.checkOuts }} exits</title>
          </rect>
        </template>
        <template v-else>
          <circle
            v-if="showEntries"
            :cx="x(index)"
            :cy="y(row.checkIns)"
            r="4"
            class="fill-primary"
          >
            <title>{{ row.day }}: {{ row.checkIns }} entries</title>
          </circle>
          <circle v-if="showExits" :cx="x(index)" :cy="y(row.checkOuts)" r="4" class="fill-muted">
            <title>{{ row.day }}: {{ row.checkOuts }} exits</title>
          </circle>
        </template>
      </g>
      <template v-if="mode === 'line'">
        <polyline
          v-if="showEntries"
          :points="points('checkIns')"
          fill="none"
          stroke-width="2"
          class="stroke-primary"
        />
        <polyline
          v-if="showExits"
          :points="points('checkOuts')"
          fill="none"
          stroke-width="2"
          stroke-dasharray="5 4"
          class="stroke-muted"
        />
      </template>
    </svg>
    <div v-if="showValues" class="mt-5 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Parking activity data
        </caption>
        <thead class="border-b border-border text-muted">
          <tr>
            <th scope="col" class="py-3 font-medium">Day</th>
            <th scope="col" class="py-3 font-medium">Entries</th>
            <th scope="col" class="py-3 font-medium">Exits</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="index" class="border-b border-border">
            <th scope="row" class="py-3 font-medium">{{ row.day }}</th>
            <td>{{ row.checkIns }}</td>
            <td>{{ row.checkOuts }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiCard>
</template>
