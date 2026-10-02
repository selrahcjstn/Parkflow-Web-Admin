<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

defineProps<{
  firstName: string
  middleName: string
  lastName: string
  email: string
  phoneNumber: string
  status: 'Active' | 'Suspended' | 'PendingVerification' | string
}>()

const emit = defineEmits<{
  (e: 'update:firstName', val: string): void
  (e: 'update:middleName', val: string): void
  (e: 'update:lastName', val: string): void
  (e: 'update:email', val: string): void
  (e: 'update:phoneNumber', val: string): void
  (e: 'update:status', val: string): void
}>()

const statusOptions = [
  { label: 'Active Clearance', value: 'Active' },
  { label: 'Suspended Access', value: 'Suspended' },
  { label: 'Pending Verification', value: 'PendingVerification' }
]
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">2. Personal Information</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Basic identity details, contact info, and clearance standing</p>
      </div>
    </div>

    <!-- Name Fields Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <UiInput
        :model-value="firstName"
        label="First Name"
        placeholder="e.g. Juan"
        required
        @update:model-value="emit('update:firstName', String($event))"
      />

      <UiInput
        :model-value="middleName"
        label="Middle Name (Optional)"
        placeholder="e.g. Santos"
        @update:model-value="emit('update:middleName', String($event))"
      />

      <UiInput
        :model-value="lastName"
        label="Last Name"
        placeholder="e.g. Dela Cruz"
        required
        @update:model-value="emit('update:lastName', String($event))"
      />
    </div>

    <!-- Contact & Status Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <UiInput
        :model-value="email"
        type="email"
        label="Email Address"
        placeholder="e.g. user@bulsu.edu.ph"
        required
        @update:model-value="emit('update:email', String($event))"
      />

      <UiInput
        :model-value="phoneNumber"
        label="Phone Number"
        placeholder="e.g. 0917 123 4567"
        @update:model-value="emit('update:phoneNumber', String($event))"
      />

      <UiSelect
        :model-value="status"
        label="Account Clearance Status"
        :options="statusOptions"
        required
        @update:model-value="emit('update:status', String($event))"
      />
    </div>
  </UiCard>
</template>
