<script setup lang="ts">
import { computed } from 'vue'
import DashIcon, { type DashIconName } from './DashIcon.vue'
import type { PendingWork } from '../../api/dashboard.api'

const props = defineProps<{ pending: PendingWork }>()

interface Item { label: string; hint: string; count: number; to: string; icon: DashIconName }

const items = computed<Item[]>(() => [
  { label: 'Vehicle approvals', hint: 'Ownership documents and photos awaiting review', count: props.pending.vehicles, to: '/vehicles?status=pending', icon: 'car' },
  { label: 'Employee schedules', hint: 'Personnel IDs and schedules awaiting review', count: props.pending.corSchedules, to: '/employee-approvals', icon: 'file' },
  { label: 'Accounts awaiting verification', hint: 'Students activate once their vehicle is approved', count: props.pending.accounts, to: '/users', icon: 'user-check' },
])
const total = computed(() => items.value.reduce((sum, item) => sum + item.count, 0))
</script>

<template>
  <div>
    <p class="m-0 mb-3 text-[13px] text-muted">
      <template v-if="pending.vehicles + pending.corSchedules > 0">
        <b class="text-text tabular-nums">{{ pending.vehicles + pending.corSchedules }}</b> item{{ pending.vehicles + pending.corSchedules === 1 ? '' : 's' }} need an admin decision.
      </template>
      <template v-else>Nothing is waiting for an admin decision.</template>
    </p>
    <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
      <li v-for="item in items" :key="item.label">
        <RouterLink :to="item.to" class="group flex items-center gap-3 py-3 transition-colors hover:bg-surface-lighter focus-visible:outline-2 focus-visible:outline-[#D22730]">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-secondary"><DashIcon :name="item.icon" :size="17" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13.5px] font-semibold text-text">{{ item.label }}</span>
            <span class="block truncate text-[12px] text-muted">{{ item.hint }}</span>
          </span>
          <span
            class="min-w-8 rounded-full px-2 py-0.5 text-center text-[12.5px] font-bold tabular-nums"
            :class="item.count > 0 ? 'bg-[#FDB813]/25 text-[#7a5600]' : 'bg-surface-muted text-muted'"
          >{{ item.count }}</span>
          <DashIcon name="arrow-right" :size="15" class="text-subtle transition-transform group-hover:translate-x-0.5" />
        </RouterLink>
      </li>
    </ul>
    <span class="sr-only">{{ total }} pending items in total</span>
  </div>
</template>
