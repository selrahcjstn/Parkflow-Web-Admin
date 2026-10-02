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
  isOtpSent?: boolean
  isVerifyingOtp?: boolean
  resendCountdown?: number
  otpError?: string | null
  otpCode?: string
}>()

const emit = defineEmits<{
  (e: 'update:firstName', val: string): void
  (e: 'update:middleName', val: string): void
  (e: 'update:lastName', val: string): void
  (e: 'update:email', val: string): void
  (e: 'update:phoneNumber', val: string): void
  (e: 'update:otpCode', val: string): void
  (e: 'sendOtp'): void
  (e: 'resendOtp'): void
  (e: 'verifyOtp', code: string): void
  (e: 'emailInput'): void
}>()

function onPhoneInput(val: string | number) {
  const digits = String(val).replace(/\D/g, '').slice(0, 11)
  emit('update:phoneNumber', digits)
}

function onOtpInput(e: Event) {
  const target = e.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '').slice(0, 6)
  emit('update:otpCode', digits)
}

function onVerifyClick() {
  if (props.otpCode && props.otpCode.length === 6 && !props.isVerifyingOtp) {
    emit('verifyOtp', props.otpCode.trim())
  }
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
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">2. Personal & Contact Information</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Basic client personal identity and contact credentials</p>
      </div>
    </div>

    <!-- Name Fields -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <UiInput
        :model-value="firstName"
        @update:model-value="emit('update:firstName', String($event))"
        label="First Name"
        placeholder="e.g. Juan"
        required
      />

      <UiInput
        :model-value="middleName"
        @update:model-value="emit('update:middleName', String($event))"
        label="Middle Name (Optional)"
        placeholder="e.g. Santos"
      />

      <UiInput
        :model-value="lastName"
        @update:model-value="emit('update:lastName', String($event))"
        label="Last Name"
        placeholder="e.g. Dela Cruz"
        required
      />
    </div>

    <!-- Email & Phone Fields -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Email Address with OTP Verify Trigger -->
      <div class="md:col-span-2 space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email Address <span class="text-red-500 font-bold">*</span>
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
              placeholder="e.g. juan.delacruz@bulsu.edu.ph"
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

        <!-- Inline Email OTP Verification Input (shown directly on form, no modal) -->
        <div
          v-if="isOtpSent && !isEmailVerified"
          class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 mt-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                Email Verification Code Required
              </span>
            </div>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">
              Code dispatched to <strong class="text-slate-700 dark:text-slate-300 font-mono">{{ email }}</strong>
            </span>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300 m-0">
            Enter the 6-digit verification code below to authenticate this email address.
          </p>

          <div v-if="otpError" class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ otpError }}</span>
          </div>

          <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div class="relative flex-1">
              <input
                :value="otpCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="Enter 6-digit code"
                class="w-full text-center text-lg tracking-widest font-mono py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition box-border"
                @input="onOtpInput"
                @keydown.enter.prevent="onVerifyClick"
              />
            </div>

            <UiButton
              type="button"
              variant="primary"
              size="md"
              :loading="isVerifyingOtp"
              :disabled="!otpCode || otpCode.length < 6"
              class="flex-shrink-0 font-semibold"
              @click="onVerifyClick"
            >
              <template #icon>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </template>
              <span>Verify Code</span>
            </UiButton>
          </div>

          <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span class="text-slate-500 dark:text-slate-400">Didn't receive the code?</span>
            <button
              type="button"
              class="font-semibold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer border-none bg-transparent p-0"
              :disabled="(resendCountdown ?? 0) > 0 || isSendingOtp"
              @click="emit('resendOtp')"
            >
              <span v-if="(resendCountdown ?? 0) > 0">Resend code in {{ resendCountdown }}s</span>
              <span v-else-if="isSendingOtp">Sending...</span>
              <span v-else>Resend Code</span>
            </button>
          </div>
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
