<script setup lang="ts">
import type { RecentParkingActivity } from '../../api/dashboard.api'

defineProps<{ rows: RecentParkingActivity[] }>()

const formatter = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const time = (value: string | null) => (value ? formatter.format(new Date(value)) : '—')
</script>

<template>
  <div class="-mx-4 overflow-x-auto sm:mx-0">
    <table class="w-full min-w-[640px] border-collapse text-left text-[13px]">
      <caption class="sr-only">Most recent parking transactions</caption>
      <thead>
        <tr class="border-b border-border text-[11.5px] uppercase tracking-wide text-muted">
          <th scope="col" class="px-4 py-2 font-semibold sm:px-2">Vehicle</th>
          <th scope="col" class="px-2 py-2 font-semibold">Owner</th>
          <th scope="col" class="px-2 py-2 font-semibold">Type</th>
          <th scope="col" class="px-2 py-2 font-semibold">Entry</th>
          <th scope="col" class="px-2 py-2 font-semibold">Exit</th>
          <th scope="col" class="px-2 py-2 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="`${row.identifier}-${row.entryTime}-${i}`" class="border-b border-border/70 last:border-0 hover:bg-surface-lighter">
          <th scope="row" class="px-4 py-2.5 font-semibold text-text sm:px-2">
            <span class="font-mono text-[12.5px]">{{ row.identifier }}</span>
            <span v-if="row.source === 'Visitor'" class="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted">Visitor</span>
          </th>
          <td class="max-w-[180px] truncate px-2 py-2.5 text-text-secondary">{{ row.owner }}</td>
          <td class="px-2 py-2.5 text-text-secondary">{{ row.vehicleType }}</td>
          <td class="whitespace-nowrap px-2 py-2.5 text-text-secondary tabular-nums">{{ time(row.entryTime) }}</td>
          <td class="whitespace-nowrap px-2 py-2.5 text-text-secondary tabular-nums">{{ time(row.exitTime) }}</td>
          <td class="px-2 py-2.5">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
              :class="row.status === 'Inside' ? 'bg-success-bg text-success' : 'bg-surface-muted text-muted'"
            >
              <span class="size-1.5 rounded-full" :class="row.status === 'Inside' ? 'bg-success' : 'bg-subtle'" />{{ row.status }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
