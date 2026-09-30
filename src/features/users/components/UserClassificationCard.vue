<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import type { UserWithDetails } from '../types'
import { getRoleLabel } from '@/utils/role'

const props = defineProps<{
  user: UserWithDetails
}>()

function getIdentifier(u?: UserWithDetails | null): string {
  if (!u) return 'N/A'
  if (u.student?.studentNumber) return u.student.studentNumber
  if (u.personnel?.idCardNumber) return u.personnel.idCardNumber
  if (u.guard?.assignedGate) return `Gate ${u.guard.assignedGate}`
  return u.id || 'N/A'
}

function formatYearLevel(level?: number): string {
  if (!level) return 'N/A'
  if (level >= 7 && level <= 12) return `Grade ${level}`
  if (level === 1) return '1st Year'
  if (level === 2) return '2nd Year'
  if (level === 3) return '3rd Year'
  if (level === 4) return '4th Year'
  if (level >= 5) return '5th Year+'
  return `${level}`
}
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Institutional Classification</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Role-specific academic or departmental placement</p>
      </div>
    </div>

    <!-- Student View -->
    <div v-if="user.student || user.role === 'Student'" class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Student ID</span>
        <span class="text-sm font-mono font-semibold text-slate-900 dark:text-white">{{ user.student?.studentNumber || getIdentifier(user) }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Year Level</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatYearLevel(user.student?.yearLevel) }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course / Program</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ user.student?.course || '—' }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned Section</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ user.student?.section || '—' }}</span>
      </div>
    </div>

    <!-- Faculty / Staff View -->
    <div v-else-if="user.personnel || user.role === 'UniversityStaff' || user.role === 'NonAcademicPersonnel'" class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee / Client ID</span>
        <span class="text-sm font-mono font-semibold text-slate-900 dark:text-white">{{ user.personnel?.idCardNumber || getIdentifier(user) }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department / Unit</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ user.personnel?.department || '—' }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Staff Classification</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ getRoleLabel(user.role) }}</span>
      </div>
    </div>

    <!-- Security Guard View -->
    <div v-else-if="user.guard || user.role === 'Guard'" class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Security ID</span>
        <span class="text-sm font-mono font-semibold text-slate-900 dark:text-white">{{ getIdentifier(user) }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned Campus Gate</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">Gate {{ user.guard?.assignedGate || 1 }}</span>
      </div>
    </div>

    <!-- Default Fallback -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Client ID</span>
        <span class="text-sm font-mono font-semibold text-slate-900 dark:text-white">{{ getIdentifier(user) }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Role</span>
        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ getRoleLabel(user.role) }}</span>
      </div>
    </div>
  </UiCard>
</template>
