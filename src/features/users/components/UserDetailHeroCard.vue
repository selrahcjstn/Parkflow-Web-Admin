<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
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

function getStatusBadgeVariant(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral'
  if (status === 'Active' || status === 'Verified' || status === 'Approved') return 'success'
  if (status === 'PendingVerification' || status === 'Pending') return 'warning'
  if (status === 'Suspended' || status === 'Rejected') return 'danger'
  return 'neutral'
}

function formatStatusText(status?: string): string {
  if (!status) return 'Not Submitted'
  if (status === 'Verified' || status === 'Approved' || status === 'Active') return 'Approved'
  if (status === 'Pending' || status === 'PendingVerification') return 'Pending'
  if (status === 'Rejected') return 'Rejected'
  if (status === 'NotSubmitted' || status === 'Unverified') return 'Not Submitted'
  if (status === 'Suspended') return 'Suspended'
  return status
}

function displayStatus(u?: UserWithDetails | null): string {
  if (!u) return 'NotSubmitted'
  if (u.status === 'Suspended') return 'Suspended'
  if (u.role === 'Student') {
    if (u.corVerificationStatus === 'Verified') return 'Approved'
    if (u.corVerificationStatus === 'Pending') return 'Pending'
    if (u.corVerificationStatus === 'Rejected') return 'Rejected'
    if (u.corVerificationStatus === 'NotSubmitted') return 'NotSubmitted'
  }
  if (u.status === 'Active') return 'Approved'
  if (u.status === 'PendingVerification') return 'Pending'
  return u.status || 'Approved'
}
</script>

<template>
  <UiCard class="p-6 bg-surface border-border shadow-sm">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div class="flex items-center gap-4">
        <UiAvatar
          :name="user.fullName"
          :src="user.profilePictureUrl"
          size="lg"
          class="border border-border flex-shrink-0"
        />
        <div class="flex flex-col gap-1.5 min-w-0">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-xl font-bold text-text tracking-tight truncate">
              {{ user.fullName }}
            </h2>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-light text-primary border border-primary/20"
            >
              {{ getRoleLabel(user.role) }}
            </span>
          </div>
          <span class="text-xs text-muted font-mono">
            Client ID: <span class="font-bold text-text-secondary">{{ getIdentifier(user) }}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
        <UiStatusText :variant="getStatusBadgeVariant(displayStatus(user))" size="sm">
          {{ formatStatusText(displayStatus(user)) }}
        </UiStatusText>
        <UiBadge v-if="user.status === 'Suspended'" variant="danger" size="sm">
          Account Suspended
        </UiBadge>
      </div>
    </div>
  </UiCard>
</template>
