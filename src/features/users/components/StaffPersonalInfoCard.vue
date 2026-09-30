<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  firstName: string
  middleName: string
  lastName: string
  email: string
  phoneNumber: string
  isEmailVerified: boolean
  isSendingOtp: boolean
  emailError?: string | null
  phoneError?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:firstName', val: string): void
  (e: 'update:middleName', val: string): void
  (e: 'update:lastName', val: string): void
  (e: 'update:email', val: string): void
  (e: 'update:phoneNumber', val: string): void
  (e: 'sendOtp'): void
  (e: 'emailInput'): void
}>()

function onPhoneInput(val: string | number) {
  const digits = String(val).replace(/\D/g, '').slice(0, 11)
  emit('update:phoneNumber', digits)
}
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">2. Staff Credentials & Contact Details</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Official staff identity details, authenticating email, and mobile contact</p>
      </div>
    </div>

    <!-- Name Fields -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <UiInput
        :model-value="firstName"
        @update:model-value="emit('update:firstName', String($event))"
        label="First Name"
        placeholder="e.g. Ricardo"
        required
      />

      <UiInput
        :model-value="middleName"
        @update:model-value="emit('update:middleName', String($event))"
        label="Middle Name (Optional)"
        placeholder="e.g. Alonzo"
      />

      <UiInput
        :model-value="lastName"
        @update:model-value="emit('update:lastName', String($event))"
        label="Last Name"
        placeholder="e.g. Santos"
        required
      />
    </div>

    <!-- Email & Phone Fields -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Email Address with OTP Verify Trigger -->
      <div class="md:col-span-2 space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Official Email Address <span class="text-red-500 font-bold">*</span>
          </label>
          <span
            v-if="isEmailVerified"
            class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified Email
          </span>
        </div>

        <div class="flex gap-2">
          <div class="flex-1">
            <UiInput
              :model-value="email"
              type="email"
              placeholder="e.g. guard.santos@bulsu.edu.ph"
              :error="emailError || ''"
              required
              @update:model-value="emit('update:email', String($event)); emit('emailInput')"
            />
          </div>

          <UiButton
            type="button"
            :variant="isEmailVerified ? 'success' : 'primary'"
            :loading="isSendingOtp"
            :disabled="!email.trim() || isEmailVerified"
            size="md"
            class="flex-shrink-0"
            @click="emit('sendOtp')"
          >
            <template #icon>
              <svg v-if="!isEmailVerified && !isSendingOtp" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <svg v-else-if="isEmailVerified" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </template>
            <span>{{ isEmailVerified ? 'Verified' : 'Verify Email' }}</span>
          </UiButton>
        </div>
      </div>

      <!-- Phone Number -->
      <div class="md:col-span-1">
        <UiInput
          :model-value="phoneNumber"
          type="tel"
          label="Phone Number (11 digits)"
          placeholder="09171234567"
          :maxlength="11"
          :error="phoneError || ''"
          hint="Philippine mobile number starting with 09"
          required
          @update:model-value="onPhoneInput"
        />
      </div>
    </div>
  </UiCard>
</template>
