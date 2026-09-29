<script setup lang="ts">
import type { UserWithDetails, AccountStatus } from '../types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const props = defineProps<{
  isOpen: boolean
  user: UserWithDetails | null
  targetStatus: AccountStatus
  isUpdating: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <ConfirmModal
    :is-open="isOpen"
    :title="targetStatus === 'Suspended' ? 'Suspend Client Account' : 'Verify & Unsuspend Account'"
    :message="
      targetStatus === 'Suspended'
        ? `Are you sure you want to suspend account access for <strong class='text-slate-900 dark:text-white font-bold'>${user?.fullName || ''}</strong>?<br/><span class='text-xs text-slate-500'>The user will immediately be prevented from reserving slots and accessing campus gates.</span>`
        : `Are you sure you want to restore active clearance for <strong class='text-slate-900 dark:text-white font-bold'>${user?.fullName || ''}</strong>?<br/><span class='text-xs text-slate-500'>Account access and vehicle parking permissions will be reinstated.</span>`
    "
    :confirm-text="targetStatus === 'Suspended' ? 'Suspend Account' : 'Activate Account'"
    cancel-text="Cancel"
    :variant="targetStatus === 'Suspended' ? 'danger' : 'success'"
    :is-submitting="isUpdating"
    @confirm="emit('confirm')"
    @cancel="emit('close')"
    @close="emit('close')"
  />
</template>
