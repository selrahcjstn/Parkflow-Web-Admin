<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

type AccountType = 'Guard' | 'Admin'

const props = defineProps<{
  isOpen: boolean
  isSubmitting: boolean
  form: {
    firstName: string
    middleName?: string
    lastName: string
    email: string
    phoneNumber: string
    accountType: AccountType
    assignedGate: number
    roleLevel: number
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const gateNames: Record<number, string> = {
  1: 'Gate 1',
  2: 'Gate 2',
  3: 'Gate 3',
  4: 'Gate 4',
  5: 'Gate 5'
}
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="md"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#7B1113] flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Confirm Staff Registration</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Please review the official credentials below before creating this staff account.</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Summary details table -->
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
          <span class="font-bold text-slate-900 dark:text-white">
            {{ form.firstName }} {{ form.middleName ? form.middleName + ' ' : '' }}{{ form.lastName }}
          </span>
        </div>

        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Account Role</span>
          <span class="font-semibold" :class="form.accountType === 'Guard' ? 'text-[#7B1113]' : 'text-purple-600 dark:text-purple-400'">
            {{ form.accountType === 'Guard' ? 'Campus Security Guard' : 'System Administrator' }}
          </span>
        </div>

        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Official Email</span>
          <span class="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
            {{ form.email }}
            <span class="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20">Verified</span>
          </span>
        </div>

        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
          <span class="font-medium text-slate-900 dark:text-white">{{ form.phoneNumber }}</span>
        </div>

        <div class="flex justify-between items-center py-1">
          <span class="text-slate-500 dark:text-slate-400 font-medium">
            {{ form.accountType === 'Guard' ? 'Assigned Gate' : 'Authority Level' }}
          </span>
          <span class="font-semibold text-slate-900 dark:text-white">
            {{ form.accountType === 'Guard' ? (gateNames[form.assignedGate] || `Gate ${form.assignedGate}`) : 'System Administrator (Level 2)' }}
          </span>
        </div>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">
        By confirming, this staff account will be provisioned in the system. An email containing their initial credentials will be sent to their verified address.
      </p>
    </div>

    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        size="md"
        :disabled="isSubmitting"
        @click="emit('close')"
      >
        Cancel
      </UiButton>
      <UiButton
        type="button"
        variant="primary"
        size="md"
        :loading="isSubmitting"
        @click="emit('confirm')"
      >
        Confirm & Register
      </UiButton>
    </template>
  </UiModal>
</template>
