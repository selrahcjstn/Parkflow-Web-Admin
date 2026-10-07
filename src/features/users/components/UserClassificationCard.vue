<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import type { UserWithDetails } from '../types'
import { getRoleLabel } from '@/utils/role'

defineProps<{
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
    <div class="flex items-center gap-3.5 pb-4 border-b border-border">
      <div
        class="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-text">Institutional Classification</h3>
        <p class="text-xs text-muted">Academic or department details</p>
      </div>
    </div>

    <!-- Student View -->
    <div
      v-if="user.student || user.role === 'Student'"
      class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6"
    >
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Student ID</span>
        <span class="text-sm font-mono font-semibold text-text">{{
          user.student?.studentNumber || getIdentifier(user)
        }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Year Level</span>
        <span class="text-sm font-semibold text-text">{{
          formatYearLevel(user.student?.yearLevel)
        }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Course / Program</span>
        <span class="text-sm font-semibold text-text">{{ user.student?.course || '—' }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Assigned Section</span>
        <span class="text-sm font-semibold text-text">{{ user.student?.section || '—' }}</span>
      </div>
    </div>

    <!-- Faculty / Staff View -->
    <div
      v-else-if="
        user.personnel || user.role === 'UniversityStaff' || user.role === 'NonAcademicPersonnel'
      "
      class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6"
    >
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Employee / Client ID</span>
        <span class="text-sm font-mono font-semibold text-text">{{
          user.personnel?.idCardNumber || getIdentifier(user)
        }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Department / Unit</span>
        <span class="text-sm font-semibold text-text">{{ user.personnel?.department || '—' }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Staff Classification</span>
        <span class="text-sm font-semibold text-text">{{ getRoleLabel(user.role) }}</span>
      </div>
    </div>

    <!-- Security Guard View -->
    <div
      v-else-if="user.guard || user.role === 'Guard'"
      class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6"
    >
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Security ID</span>
        <span class="text-sm font-mono font-semibold text-text">{{ getIdentifier(user) }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Assigned Campus Gate</span>
        <span class="text-sm font-semibold text-text"
          >Gate {{ user.guard?.assignedGate || 1 }}</span
        >
      </div>
    </div>

    <!-- Default Fallback -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Client ID</span>
        <span class="text-sm font-mono font-semibold text-text">{{ getIdentifier(user) }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Role</span>
        <span class="text-sm font-semibold text-text">{{ getRoleLabel(user.role) }}</span>
      </div>
    </div>
  </UiCard>
</template>
