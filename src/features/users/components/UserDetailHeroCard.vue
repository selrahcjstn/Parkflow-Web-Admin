<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
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

function getStatusBadgeVariant(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Active' || status === 'Verified') return 'success'
  if (status === 'PendingVerification' || status === 'Pending') return 'warning'
  if (status === 'Suspended' || status === 'Rejected') return 'danger'
  return 'neutral'
}

function formatStatusText(status?: string): string {
  if (!status) return 'Not Submitted'
  if (status === 'Verified') return 'Clearance Active'
  if (status === 'Pending' || status === 'PendingVerification') return 'Pending COR'
  if (status === 'NotSubmitted' || status === 'Unverified') return 'No COR Upload'
  if (status === 'Rejected') return 'COR Rejected'
  if (status === 'Suspended') return 'Suspended'
  return status
}

function displayStatus(u?: UserWithDetails | null): string {
  if (!u) return 'NotSubmitted'
  if (u.status === 'Suspended') return 'Suspended'
  if (u.role === 'Guard' || u.role === 'Admin' || (u.role as string) === 'SuperAdmin') return 'Active'
  return u.corVerificationStatus || 'NotSubmitted'
}
</script>

<template>
  <UiCard class="p-6 bg-gradient-to-r from-white via-white to-slate-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border-slate-200/80 dark:border-slate-800 shadow-sm">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div class="flex items-center gap-4.5">
        <UiAvatar
          :name="user.fullName"
          :src="user.profilePictureUrl"
          size="lg"
          class="shadow-sm border-2 border-white dark:border-slate-800 flex-shrink-0"
        />
        <div class="flex flex-col gap-1.5 min-w-0">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {{ user.fullName }}
            </h2>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#D22730]/10 text-[#D22730] border border-[#D22730]/20">
              {{ getRoleLabel(user.role) }}
            </span>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Client ID: <span class="font-bold text-slate-700 dark:text-slate-200">{{ getIdentifier(user) }}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
        <UiStatusText :variant="getStatusBadgeVariant(displayStatus(user))" size="sm">
          {{ formatStatusText(displayStatus(user)) }}
        </UiStatusText>
        <UiBadge
          v-if="user.status === 'Suspended'"
          variant="danger"
          size="sm"
        >
          Account Suspended
        </UiBadge>
      </div>
    </div>
  </UiCard>
</template>
