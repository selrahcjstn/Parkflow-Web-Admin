<script setup lang="ts">
import type { UserWithDetails, AccountStatus } from '../types'
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'

const props = defineProps<{
  user: UserWithDetails
}>()

const emit = defineEmits<{
  (e: 'viewProfile', user: UserWithDetails): void
  (e: 'edit', user: UserWithDetails): void
  (e: 'approve', user: UserWithDetails): void
  (e: 'reject', user: UserWithDetails): void
  (e: 'toggleStatus', user: UserWithDetails, targetStatus: AccountStatus): void
  (e: 'changePassword', user: UserWithDetails): void
  (e: 'delete', user: UserWithDetails): void
}>()

function displayStatus(u: UserWithDetails): string {
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

function getStatusBadgeVariant(status?: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (!status) return 'neutral'
  if (status === 'Verified' || status === 'Approved' || status === 'Active') return 'success'
  if (status === 'Pending' || status === 'PendingVerification') return 'warning'
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

function getIdentifier(u: UserWithDetails): string {
  if (u.student?.studentNumber) return u.student.studentNumber
  if (u.personnel?.idCardNumber) return u.personnel.idCardNumber
  if (u.guard?.assignedGate) return `Gate ${u.guard.assignedGate}`
  if (u.role === 'Guard') return `Gate ${u.guard?.assignedGate || 1}`
  if (u.role === 'Admin' || (u.role as string) === 'SuperAdmin') return '—'
  return '—'
}

function getRoleLabel(role: string): string {
  if (role === 'UniversityStaff' || role === 'Faculty') return 'Faculty Member'
  if (role === 'NonAcademicPersonnel' || role === 'Staff') return 'University Staff'
  if (role === 'Guard') return 'Security Guard'
  if (role === 'Admin') return 'Administrator'
  if (role === 'SuperAdmin') return 'Super Administrator'
  return role
}
</script>

<template>
  <UiCard
    hover
    custom-class="p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:border-blue-500/40"
    @click="emit('viewProfile', user)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <UiAvatar :name="user.fullName" :src="user.profilePictureUrl" size="lg" />
        <div class="flex flex-col min-w-0">
          <h4 class="font-bold text-slate-900 dark:text-white text-sm truncate leading-snug m-0">
            {{ user.fullName }}
          </h4>
          <span class="text-xs text-slate-500 dark:text-slate-400 truncate">
            {{ user.email }}
          </span>
          <span
            v-if="user.role !== 'Admin' && (user.role as string) !== 'SuperAdmin'"
            class="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 mt-0.5"
          >
            ID: {{ getIdentifier(user) }}
          </span>
        </div>
      </div>
      <UiBadge :variant="getStatusBadgeVariant(displayStatus(user))" size="xs" class="flex-shrink-0">
        {{ formatStatusText(displayStatus(user)) }}
      </UiBadge>
    </div>

    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
      <div>
        <span class="text-slate-400 dark:text-slate-500 text-[10.5px] uppercase font-bold tracking-wider block">Role</span>
        <span class="font-medium text-slate-700 dark:text-slate-300">{{ getRoleLabel(user.role) }}</span>
      </div>
      <div>
        <span class="text-slate-400 dark:text-slate-500 text-[10.5px] uppercase font-bold tracking-wider block">Vehicles</span>
        <span class="font-medium text-slate-700 dark:text-slate-300">
          {{ (user.vehicles || []).length === 0 ? 'None' : `${user.vehicles.length} Registered` }}
        </span>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800" @click.stop>
      <button
        type="button"
        class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline border-none bg-transparent cursor-pointer p-0"
        @click="emit('viewProfile', user)"
      >
        View Profile
      </button>

      <div class="flex items-center gap-1">
        <!-- Quick Approve / Reject for Student Pending -->
        <template v-if="user.role === 'Student' && displayStatus(user) === 'Pending'">
          <button
            type="button"
            title="Approve Registration"
            @click="emit('approve', user)"
            class="px-2 py-1 rounded-md bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer border-none mr-1"
          >
            Approve
          </button>
          <button
            type="button"
            title="Reject Registration"
            @click="emit('reject', user)"
            class="px-2 py-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-[11px] hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200/80 mr-1"
          >
            Reject
          </button>
        </template>

        <button
          type="button"
          title="Edit Account"
          @click="emit('edit', user)"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          v-if="user.status !== 'Suspended'"
          type="button"
          title="Suspend Account"
          @click="emit('toggleStatus', user, 'Suspended')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border-none bg-transparent"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          v-else
          type="button"
          title="Verify / Unsuspend Account"
          @click="emit('toggleStatus', user, 'Active')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer border-none bg-transparent"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          title="Change Password"
          @click="emit('changePassword', user)"
          class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer border-none bg-transparent"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>

        <button
          type="button"
          title="Delete Account"
          @click="emit('delete', user)"
          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border-none bg-transparent"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </UiCard>
</template>
