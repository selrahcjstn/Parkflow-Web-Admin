<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import type { UserWithDetails } from '../types'

defineProps<{
  user: UserWithDetails
}>()

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
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3.5 pb-4 border-b border-border">
      <div
        class="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-text">Account & Contact Information</h3>
        <p class="text-xs text-muted">Account and contact details</p>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4.5 gap-x-6">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Email Address</span>
        <span class="text-sm font-semibold text-text break-all">{{ user.email }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Phone Number</span>
        <span class="text-sm font-semibold text-text">{{ user.phoneNumber }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Authentication Method</span>
        <span class="text-sm font-semibold text-text capitalize">{{ user.authProvider }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">Date Registered</span>
        <span class="text-sm font-semibold text-text">
          {{
            new Date(user.createdAt).toLocaleDateString([], {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          }}
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-muted">COR Verification Status</span>
        <div>
          <UiBadge :variant="getStatusBadgeVariant(user.corVerificationStatus)" size="xs">
            {{ formatStatusText(user.corVerificationStatus) }}
          </UiBadge>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-muted">Account Status</span>
        <div>
          <UiBadge :variant="getStatusBadgeVariant(user.status)" size="xs">
            {{ formatStatusText(user.status) }}
          </UiBadge>
        </div>
      </div>
    </div>
  </UiCard>
</template>
