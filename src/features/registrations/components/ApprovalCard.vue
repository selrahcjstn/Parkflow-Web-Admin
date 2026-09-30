<script setup lang="ts">
import type { ApprovalItem } from '../types'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { getVehicleTypeLabel } from '@/utils/vehicleType'

const props = defineProps<{
  item: ApprovalItem
  index: number
}>()

const emit = defineEmits<{
  (e: 'inspect', item: ApprovalItem): void
  (e: 'approve', item: ApprovalItem): void
  (e: 'reject', item: ApprovalItem): void
  (e: 'zoomImage', url: string): void
}>()

function getScheduleSummary(schedules?: any[]): string {
  if (!schedules || schedules.length === 0) return 'No schedule set'
  const dayAbbrs: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' }
  const activeDays = schedules.map(s => dayAbbrs[s.dayOfWeek] || '').filter(Boolean).join(', ')
  const firstTime = schedules[0]
  const formatTime = (t: string) => t ? t.slice(0, 5) : ''
  const timeStr = firstTime ? `${formatTime(firstTime.startTime)} - ${formatTime(firstTime.endTime)}` : ''
  return activeDays ? `${activeDays}${timeStr ? ' • ' + timeStr : ''}` : 'No active days'
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}
</script>

<template>
  <UiCard
    hover
    custom-class="p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:border-blue-500/40"
    @click="emit('inspect', item)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
          {{ item.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-slate-900 dark:text-white text-sm truncate leading-snug m-0">
              {{ item.fullName }}
            </h4>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-bold"
              :class="item.category === 'Registration' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : item.category === 'Schedule' ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'"
            >
              {{ item.category === 'Registration' ? 'New Registration' : item.category }}
            </span>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {{ item.role }} • Applied {{ item.dateApplied }}
          </span>
        </div>
      </div>

      <UiBadge :variant="getStatusBadgeVariant(item.status)" size="xs" class="flex-shrink-0">
        {{ item.status.charAt(0).toUpperCase() + item.status.slice(1) }}
      </UiBadge>
    </div>

    <!-- Combined Registration Bar (Registration category: 3 documents + Schedule) -->
    <div v-if="item.category === 'Registration'" class="space-y-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.vehiclePlate }}</span>
          <span class="text-slate-500 dark:text-slate-400">• {{ item.brand }}</span>
        </div>
        <span class="font-semibold text-slate-700 dark:text-slate-300">{{ getVehicleTypeLabel(item.vehicleType) }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
        <span class="font-bold text-slate-600 dark:text-slate-300">Hours:</span>
        <span class="truncate">{{ getScheduleSummary(item.schedules) }}</span>
      </div>
    </div>

    <!-- Vehicle Badge Bar (Vehicle category) -->
    <div v-else-if="item.category === 'Vehicle'" class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
      <div class="flex items-center gap-2">
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.vehiclePlate }}</span>
        <span class="text-slate-500 dark:text-slate-400">• {{ item.brand }}</span>
      </div>
      <span class="font-semibold text-slate-700 dark:text-slate-300">{{ getVehicleTypeLabel(item.vehicleType) }}</span>
    </div>

    <!-- Schedule summary bar (Schedule category) -->
    <div v-else-if="item.category === 'Schedule'" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
      <span class="text-slate-500 dark:text-slate-400 block text-[10.5px] uppercase font-bold tracking-wider mb-0.5">Campus Hours</span>
      <span class="font-semibold text-slate-900 dark:text-white">{{ getScheduleSummary(item.schedules) }}</span>
    </div>

    <!-- Quick Document Thumbnails -->
    <div class="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
      <div
        v-if="item.corUrl"
        class="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-900 text-center border border-slate-200/60 dark:border-slate-800 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300"
      >
        📄 COR
      </div>
      <div
        v-if="item.schedules && item.schedules.length > 0"
        class="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-900 text-center border border-slate-200/60 dark:border-slate-800 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300"
      >
        ⏱ Schedule
      </div>
      <div
        v-if="item.orcrUrl"
        class="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-900 text-center border border-slate-200/60 dark:border-slate-800 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300"
      >
        📋 OR/CR
      </div>
      <div
        v-if="item.motorPicUrl"
        class="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-900 text-center border border-slate-200/60 dark:border-slate-800 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300"
      >
        🚗 Photo
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800" @click.stop>
      <button
        type="button"
        class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline border-none bg-transparent cursor-pointer p-0"
        @click="emit('inspect', item)"
      >
        Inspect & Verify
      </button>

      <div class="flex items-center gap-1.5">
        <template v-if="item.status === 'pending'">
          <button
            type="button"
            title="Approve Submission"
            @click="emit('approve', item)"
            class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer border-none"
          >
            Approve
          </button>
          <button
            type="button"
            title="Reject Submission"
            @click="emit('reject', item)"
            class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-[11px] hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200/80"
          >
            Reject
          </button>
        </template>
        <span v-else class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          Reviewed
        </span>
      </div>
    </div>
  </UiCard>
</template>
