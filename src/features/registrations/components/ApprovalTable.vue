<script setup lang="ts">
import type { ApprovalItem } from '../types'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { getVehicleTypeLabel } from '@/utils/vehicleType'
import { getRoleLabel } from '@/utils/role'

defineProps<{
  items: ApprovalItem[]
  showCategory?: boolean
}>()

const emit = defineEmits<{
  (e: 'inspect', item: ApprovalItem): void
  (e: 'approve', item: ApprovalItem): void
  (e: 'reject', item: ApprovalItem): void
}>()

const columns: TableColumn[] = [
  { key: 'applicant', label: 'Applicant' },
  { key: 'details', label: 'Details' },
  { key: 'documents', label: 'Documents' },
  { key: 'dateApplied', label: 'Date Applied' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
    <UiTable :columns="columns" :data="items">
      <!-- Applicant Column -->
      <template #cell-applicant="{ item }">
        <div class="flex items-center gap-3 py-1">
          <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
            {{ item.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <span class="font-bold text-slate-900 dark:text-white block text-sm leading-tight">{{ item.fullName }}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400 block">{{ item.email }}</span>
          </div>
        </div>
      </template>

      <!-- Details Column -->
      <template #cell-details="{ item }">
        <div class="space-y-0.5 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ item.vehiclePlate }}</span>
            <span class="text-slate-500">• {{ getVehicleTypeLabel(item.vehicleType) }}</span>
          </div>
          <div v-if="item.brand && item.brand !== '—'" class="text-[11px] text-slate-500 dark:text-slate-400">
            Brand: <span class="font-semibold text-slate-700 dark:text-slate-300">{{ item.brand }}</span>
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-500">
            Role: <span class="font-medium text-slate-600 dark:text-slate-300">{{ getRoleLabel(item.role) }}</span>
          </div>
        </div>
      </template>

      <!-- Documents Column -->
      <template #cell-documents="{ item }">
        <div class="flex items-center gap-1 flex-wrap">
          <span v-if="item.corUrl" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <svg class="w-2.5 h-2.5 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>COR</span>
          </span>
          <span v-if="item.schedules && item.schedules.length > 0" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <svg class="w-2.5 h-2.5 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Sched</span>
          </span>
          <span v-if="item.orcrUrl" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <svg class="w-2.5 h-2.5 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span>OR/CR</span>
          </span>
          <span v-if="item.motorPicUrl" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <svg class="w-2.5 h-2.5 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Photo</span>
          </span>
        </div>
      </template>

      <!-- Date Column -->
      <template #cell-dateApplied="{ item }">
        <span class="text-xs text-slate-600 dark:text-slate-400">{{ item.dateApplied }}</span>
      </template>

      <!-- Status Column -->
      <template #cell-status="{ item }">
        <UiStatusText :status="item.status" />
      </template>

      <!-- Actions Column -->
      <template #cell-actions="{ item }">
        <div class="flex items-center justify-end gap-1.5 py-1">
          <UiButton
            variant="secondary"
            size="xs"
            @click="emit('inspect', item)"
          >
            Inspect
          </UiButton>
          <template v-if="item.status === 'pending'">
            <UiButton
              variant="success"
              size="xs"
              @click="emit('approve', item)"
            >
              Approve
            </UiButton>
            <UiButton
              variant="danger"
              size="xs"
              @click="emit('reject', item)"
            >
              Reject
            </UiButton>
          </template>
        </div>
      </template>
    </UiTable>
  </div>
</template>
