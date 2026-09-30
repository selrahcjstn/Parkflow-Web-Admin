<script setup lang="ts">
import type { ApprovalItem } from '../types'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { getVehicleTypeLabel } from '@/utils/vehicleType'

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
          <div class="text-[11px] text-slate-400 dark:text-slate-500">
            Role: <span class="font-medium text-slate-600 dark:text-slate-300">{{ item.role }}</span>
          </div>
        </div>
      </template>

      <!-- Documents Column -->
      <template #cell-documents="{ item }">
        <div class="flex items-center gap-1 flex-wrap">
          <span v-if="item.corUrl" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            📄 COR
          </span>
          <span v-if="item.schedules && item.schedules.length > 0" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            ⏱ Sched
          </span>
          <span v-if="item.orcrUrl" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            📋 OR/CR
          </span>
          <span v-if="item.motorPicUrl" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            🚗 Photo
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
