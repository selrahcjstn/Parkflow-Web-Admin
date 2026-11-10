<script setup lang="ts">
import { computed } from 'vue'

export interface StatusRow {
  label: string
  to: string
  pending: number
  approved: number
  rejected: number
  /** Optional wording for the approved bucket, e.g. "Active" for accounts. */
  approvedLabel?: string
  rejectedLabel?: string
}

const props = defineProps<{ rows: StatusRow[] }>()

const COLORS = { approved: '#10b981', pending: '#FDB813', rejected: '#D22730' }

const prepared = computed(() =>
  props.rows.map((row) => {
    const total = row.pending + row.approved + row.rejected
    const part = (value: number) => (total ? (value / total) * 100 : 0)
    return { ...row, total, widths: { approved: part(row.approved), pending: part(row.pending), rejected: part(row.rejected) } }
  }),
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-for="row in prepared" :key="row.label">
      <div class="mb-1.5 flex items-baseline justify-between gap-3">
        <RouterLink :to="row.to" class="text-[13.5px] font-semibold text-text hover:text-[#D22730]">{{ row.label }}</RouterLink>
        <span class="text-[12px] text-muted tabular-nums">{{ row.total.toLocaleString('en-PH') }} total</span>
      </div>

      <div
        class="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted"
        role="img"
        :aria-label="`${row.label}: ${row.approved} ${row.approvedLabel ?? 'approved'}, ${row.pending} pending, ${row.rejected} ${row.rejectedLabel ?? 'rejected'}`"
      >
        <div v-if="row.widths.approved" class="h-full transition-[width] duration-500" :style="{ width: `${row.widths.approved}%`, background: COLORS.approved }" :title="`${row.approvedLabel ?? 'Approved'}: ${row.approved}`" />
        <div v-if="row.widths.pending" class="h-full transition-[width] duration-500" :style="{ width: `${row.widths.pending}%`, background: COLORS.pending }" :title="`Pending: ${row.pending}`" />
        <div v-if="row.widths.rejected" class="h-full transition-[width] duration-500" :style="{ width: `${row.widths.rejected}%`, background: COLORS.rejected }" :title="`${row.rejectedLabel ?? 'Rejected'}: ${row.rejected}`" />
      </div>

      <dl class="m-0 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
        <div class="flex items-center gap-1.5"><span class="size-2.5 rounded-full" :style="{ background: COLORS.approved }" /><dt class="text-muted">{{ row.approvedLabel ?? 'Approved' }}</dt><dd class="m-0 font-semibold text-text tabular-nums">{{ row.approved.toLocaleString('en-PH') }}</dd></div>
        <div class="flex items-center gap-1.5"><span class="size-2.5 rounded-full" :style="{ background: COLORS.pending }" /><dt class="text-muted">Pending</dt><dd class="m-0 font-semibold text-text tabular-nums">{{ row.pending.toLocaleString('en-PH') }}</dd></div>
        <div class="flex items-center gap-1.5"><span class="size-2.5 rounded-full" :style="{ background: COLORS.rejected }" /><dt class="text-muted">{{ row.rejectedLabel ?? 'Rejected' }}</dt><dd class="m-0 font-semibold text-text tabular-nums">{{ row.rejected.toLocaleString('en-PH') }}</dd></div>
      </dl>
    </div>
  </div>
</template>
