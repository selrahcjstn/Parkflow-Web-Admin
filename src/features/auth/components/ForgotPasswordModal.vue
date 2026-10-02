<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import api from '@/api/axios'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  isOpen: boolean
  initialEmail?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', email: string): void
}>()

type Step = 'email' | 'code' | 'password' | 'success'

const currentStep = ref<Step>('email')
const email = ref('')
const otpCode = ref('')
const resetToken = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Resend timer
const resendCountdown = ref(0)
let resendTimer: any = null

function startResendTimer(seconds = 60) {
  resendCountdown.value = seconds
  clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value--
    } else {
      clearInterval(resendTimer)
    }
  }, 1000)
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      currentStep.value = 'email'
      email.value = props.initialEmail || ''
      otpCode.value = ''
      resetToken.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      errorMessage.value = null
      successMessage.value = null
      showNewPassword.value = false
      showConfirmPassword.value = false
    } else {
      clearInterval(resendTimer)
    }
  }
)

const isEmailValid = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
})

const passwordMatch = computed(() => {
  return newPassword.value.length > 0 && newPassword.value === confirmPassword.value
})

const passwordLengthValid = computed(() => {
  return newPassword.value.length >= 8
})

async function handleSendCode() {
  errorMessage.value = null
  const trimmed = email.value.trim()
  if (!trimmed) {
    errorMessage.value = 'Please enter your email address.'
    return
  }
  if (!isEmailValid.value) {
    errorMessage.value = 'Please enter a valid email address.'
    return
  }

  isLoading.value = true
  try {
    const res = await api.post('/users/forgot-password', { email: trimmed })
    if (res.data?.isSuccess) {
      currentStep.value = 'code'
      startResendTimer(60)
    } else {
      errorMessage.value = res.data?.message || 'Unable to process password reset request.'
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to dispatch reset code. Please check your email and try again.'
  } finally {
    isLoading.value = false
  }
}

async function handleVerifyCode() {
  errorMessage.value = null
  const code = otpCode.value.trim()
  if (code.length < 6) {
    errorMessage.value = 'Please enter the complete 6-digit verification code.'
    return
  }

  isLoading.value = true
  try {
    const res = await api.post('/users/verify-reset-code', {
      email: email.value.trim(),
      code: code
    })

    if (res.data?.isSuccess && res.data?.data) {
      resetToken.value = res.data.data
      currentStep.value = 'password'
    } else {
      errorMessage.value = res.data?.message || 'Invalid or expired verification code.'
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Invalid or expired verification code.'
  } finally {
    isLoading.value = false
  }
}

async function handleResetPassword() {
  errorMessage.value = null

  if (!passwordLengthValid.value) {
    errorMessage.value = 'Password must be at least 8 characters long.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  isLoading.value = true
  try {
    const res = await api.post('/users/reset-password', {
      email: email.value.trim(),
      resetToken: resetToken.value,
      newPassword: newPassword.value
    })

    if (res.data?.isSuccess) {
      currentStep.value = 'success'
      emit('success', email.value.trim())
    } else {
      errorMessage.value = res.data?.message || 'Failed to reset password. Please try requesting a new code.'
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to reset password.'
  } finally {
    isLoading.value = false
  }
}

function handleDone() {
  emit('close')
}
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="sm"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#D22730]/10 text-[#D22730] flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="3" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            {{ currentStep === 'success' ? 'Password Reset Complete' : 'Reset Administrator Password' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ currentStep === 'email' ? 'Step 1 of 3: Account Verification' : currentStep === 'code' ? 'Step 2 of 3: Authorization Code' : currentStep === 'password' ? 'Step 3 of 3: Set New Password' : 'Account Ready' }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Error banner -->
      <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- STEP 1: Enter Email -->
      <div v-if="currentStep === 'email'" class="space-y-4">
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
          Enter your registered administrator email address. We will dispatch a 6-digit authorization code to reset your password.
        </p>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Administrator Email
          </label>
          <UiInput
            v-model="email"
            type="email"
            placeholder="admin@parkflow.com"
            size="md"
            autocomplete="email"
            @keydown.enter.prevent="handleSendCode"
          >
            <template #prefix>
              <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M22 7l-10 6L2 7" />
              </svg>
            </template>
          </UiInput>
        </div>
      </div>

      <!-- STEP 2: Enter 6-digit Code -->
      <div v-else-if="currentStep === 'code'" class="space-y-4">
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
          A 6-digit verification code has been dispatched to <strong class="text-slate-900 dark:text-white">{{ email }}</strong>. Please check your inbox and enter the code below.
        </p>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            6-Digit Authorization Code
          </label>
          <input
            :value="otpCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="123456"
            class="w-full text-center text-2xl tracking-widest font-mono py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D22730]/20 focus:border-[#D22730] transition box-border"
            @input="(e: any) => otpCode = e.target.value.replace(/\D/g, '').slice(0, 6)"
            @keydown.enter.prevent="handleVerifyCode"
          />
        </div>

        <div class="flex items-center justify-between text-xs pt-1">
          <button
            type="button"
            class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline border-none bg-transparent p-0 cursor-pointer text-xs"
            @click="currentStep = 'email'; errorMessage = null"
          >
            ← Change email
          </button>
          <button
            type="button"
            class="font-semibold text-[#D22730] dark:text-[#f87171] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer border-none bg-transparent p-0 text-xs"
            :disabled="resendCountdown > 0 || isLoading"
            @click="handleSendCode"
          >
            <span v-if="resendCountdown > 0">Resend code in {{ resendCountdown }}s</span>
            <span v-else>Resend Code</span>
          </button>
        </div>
      </div>

      <!-- STEP 3: Set New Password -->
      <div v-else-if="currentStep === 'password'" class="space-y-4">
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
          Authorization code confirmed. Please create a new secure password for your administrator account.
        </p>

        <!-- New Password -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            New Password
          </label>
          <UiInput
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            placeholder="At least 8 characters"
            size="md"
          >
            <template #prefix>
              <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="3" y="11" width="18" height="11" rx="3" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </template>
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                @click="showNewPassword = !showNewPassword"
              >
                <svg v-if="!showNewPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </template>
          </UiInput>
        </div>

        <!-- Confirm New Password -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirm New Password
          </label>
          <UiInput
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Re-enter your new password"
            size="md"
            @keydown.enter.prevent="handleResetPassword"
          >
            <template #prefix>
              <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="3" y="11" width="18" height="11" rx="3" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </template>
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg v-if="!showConfirmPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </template>
          </UiInput>
        </div>

        <!-- Requirements checklist -->
        <div class="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px]">
          <div class="flex items-center gap-2" :class="passwordLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>At least 8 characters in length</span>
          </div>
          <div class="flex items-center gap-2" :class="passwordMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Passwords match</span>
          </div>
        </div>
      </div>

      <!-- STEP 4: Success -->
      <div v-else-if="currentStep === 'success'" class="text-center py-4 space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h4 class="text-base font-bold text-slate-900 dark:text-white">Password Updated Successfully!</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Your administrator account credentials have been securely updated. You can now sign in with your new password.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2.5">
        <UiButton
          v-if="currentStep !== 'success'"
          type="button"
          variant="secondary"
          size="sm"
          :disabled="isLoading"
          @click="emit('close')"
        >
          Cancel
        </UiButton>

        <!-- Step 1 action -->
        <UiButton
          v-if="currentStep === 'email'"
          type="button"
          variant="primary"
          size="sm"
          :loading="isLoading"
          :disabled="!isEmailValid"
          @click="handleSendCode"
        >
          Send Reset Code
        </UiButton>

        <!-- Step 2 action -->
        <UiButton
          v-else-if="currentStep === 'code'"
          type="button"
          variant="primary"
          size="sm"
          :loading="isLoading"
          :disabled="otpCode.length < 6"
          @click="handleVerifyCode"
        >
          Verify Code
        </UiButton>

        <!-- Step 3 action -->
        <UiButton
          v-else-if="currentStep === 'password'"
          type="button"
          variant="primary"
          size="sm"
          :loading="isLoading"
          :disabled="!passwordLengthValid || !passwordMatch"
          @click="handleResetPassword"
        >
          Update Password
        </UiButton>

        <!-- Step 4 action -->
        <UiButton
          v-else-if="currentStep === 'success'"
          type="button"
          variant="primary"
          size="sm"
          @click="handleDone"
        >
          Return to Sign In
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
