<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'

const router = useRouter()

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
  if (isLoading.value) return
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
      otpCode.value = ''
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

function onOtpInput(e: Event) {
  const target = e.target as HTMLInputElement
  const raw = target.value || ''
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  otpCode.value = digits
  target.value = digits
}

function onOtpPaste(e: ClipboardEvent) {
  e.preventDefault()
  const pastedText = e.clipboardData?.getData('text') || ''
  const digits = pastedText.replace(/\D/g, '').slice(0, 6)
  otpCode.value = digits
  if (e.target) {
    (e.target as HTMLInputElement).value = digits
  }
}

function onEnterVerify() {
  if (isLoading.value || otpCode.value.replace(/\D/g, '').length < 6) return
  handleVerifyCode()
}

async function handleVerifyCode() {
  if (isLoading.value) return
  errorMessage.value = null
  const code = otpCode.value.replace(/\D/g, '')
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
  if (isLoading.value) return
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
    } else {
      errorMessage.value = res.data?.message || 'Failed to reset password. Please try requesting a new code.'
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to reset password.'
  } finally {
    isLoading.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
    <div class="w-full max-w-md space-y-6">
      <!-- Branding Header -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/5 p-2 border border-slate-100 dark:border-slate-800">
          <img src="/parkflow.png" alt="ParkFlow Logo" class="w-full h-full object-contain" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ParkFlow</h1>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Parking Management System</p>
        </div>
      </div>

      <!-- Card -->
      <UiCard custom-class="p-6 sm:p-8">
        <div class="mb-6 text-center">
          <h2 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {{ currentStep === 'success' ? 'Password Reset Complete' : 'Forgot Password' }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {{ currentStep === 'email' ? 'Enter your email to receive an authorization code' : currentStep === 'code' ? 'Enter the 6-digit code sent to your email' : currentStep === 'password' ? 'Create a new secure password' : 'Your password has been updated' }}
          </p>
        </div>

        <!-- Error banner -->
        <div v-if="errorMessage" class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- STEP 1: Enter Email -->
        <div v-if="currentStep === 'email'" class="space-y-4">
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
              :disabled="isLoading"
              @keydown.enter.prevent="!isLoading && isEmailValid && handleSendCode()"
            >
              <template #prefix>
                <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
              </template>
            </UiInput>
          </div>

          <UiButton
            type="button"
            variant="primary"
            size="lg"
            full-width
            :loading="isLoading"
            :disabled="isLoading || !isEmailValid"
            @click="handleSendCode"
          >
            Send Reset Code
          </UiButton>

          <div class="text-center pt-2">
            <button
              type="button"
              class="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-none bg-transparent cursor-pointer"
              @click="goToLogin"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>

        <!-- STEP 2: Enter Code -->
        <div v-else-if="currentStep === 'code'" class="space-y-4">
          <p class="text-xs text-slate-600 dark:text-slate-300 text-center m-0">
            Code sent to <strong class="text-slate-900 dark:text-white">{{ email }}</strong>
          </p>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
              6-Digit Authorization Code
            </label>
            <input
              :value="otpCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              placeholder="123456"
              :disabled="isLoading"
              class="w-full text-center text-2xl tracking-widest font-mono py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D22730]/20 focus:border-[#D22730] transition box-border"
              @input="onOtpInput"
              @paste="onOtpPaste"
              @keydown.enter.prevent="onEnterVerify"
            />
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline border-none bg-transparent p-0 cursor-pointer text-xs disabled:opacity-50"
              :disabled="isLoading"
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
              <span v-if="resendCountdown > 0">Resend in {{ resendCountdown }}s</span>
              <span v-else>Resend Code</span>
            </button>
          </div>

          <UiButton
            type="button"
            variant="primary"
            size="lg"
            full-width
            :loading="isLoading"
            :disabled="isLoading || otpCode.replace(/\D/g, '').length < 6"
            @click="handleVerifyCode"
          >
            Verify Code
          </UiButton>
        </div>

        <!-- STEP 3: Set New Password -->
        <div v-else-if="currentStep === 'password'" class="space-y-4">
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
              :disabled="isLoading"
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
              :disabled="isLoading"
              @keydown.enter.prevent="!isLoading && passwordLengthValid && passwordMatch && handleResetPassword()"
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

          <UiButton
            type="button"
            variant="primary"
            size="lg"
            full-width
            :loading="isLoading"
            :disabled="isLoading || !passwordLengthValid || !passwordMatch"
            @click="handleResetPassword"
          >
            Update Password
          </UiButton>
        </div>

        <!-- STEP 4: Success -->
        <div v-else-if="currentStep === 'success'" class="text-center py-4 space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <svg class="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h4 class="text-base font-bold text-slate-900 dark:text-white">Password Updated Successfully!</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Your administrator account credentials have been updated. You can now sign in with your new password.
            </p>
          </div>

          <UiButton
            type="button"
            variant="primary"
            size="lg"
            full-width
            @click="goToLogin"
          >
            Sign In with New Password
          </UiButton>
        </div>
      </UiCard>
    </div>
  </div>
</template>
