<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiButton from '@/components/ui/UiButton.vue'

const route = useRoute()
const router = useRouter()

const targetEmail = computed(() => (route.query.email as string) || '')
const targetName = computed(() => (route.query.name as string) || 'Target User')
const targetRole = computed(() => (route.query.role as string) || 'User')

const verificationCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const isSubmitting = ref(false)
const isSendingOtp = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const otpCooldown = ref(0)
let cooldownTimer: any = null

const requestAdminOtp = async () => {
  if (!targetEmail.value || isSendingOtp.value || otpCooldown.value > 0) return

  isSendingOtp.value = true
  errorMessage.value = null

  try {
    const response = await api.post('/users/admin-request-reset-otp', {
      targetEmail: targetEmail.value
    })

    if (response.data?.isSuccess || response.status === 200) {
      successMessage.value = 'A 6-digit authorization code has been sent to your administrator email inbox.'
      startCooldown(60)
    } else {
      errorMessage.value = response.data?.message || 'Failed to dispatch verification code to admin email.'
    }
  } catch (error: any) {
    console.error('Error requesting admin OTP:', error)
    errorMessage.value = error.response?.data?.message || 'Failed to send verification code to administrator email.'
  } finally {
    isSendingOtp.value = false
  }
}

const startCooldown = (seconds: number) => {
  otpCooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    otpCooldown.value -= 1
    if (otpCooldown.value <= 0) {
      clearInterval(cooldownTimer)
    }
  }, 1000)
}

onMounted(() => {
  if (!targetEmail.value) {
    router.push('/users')
    return
  }
  requestAdminOtp()
})

const handlePasswordChange = async () => {
  errorMessage.value = null
  successMessage.value = null

  if (!verificationCode.value.trim()) {
    errorMessage.value = 'Please enter the 6-digit verification code sent to your admin email.'
    return
  }

  if (!newPassword.value) {
    errorMessage.value = 'Please enter a new password.'
    return
  }

  if (newPassword.value.length < 8) {
    errorMessage.value = 'New password must be at least 8 characters long.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'New password and confirmation do not match.'
    return
  }

  isSubmitting.value = true

  try {
    const response = await api.post('/users/reset-password', {
      email: targetEmail.value,
      resetToken: verificationCode.value.trim(),
      newPassword: newPassword.value.trim()
    })

    if (response.data?.isSuccess || response.status === 200) {
      router.push({ path: '/users', query: { passwordChanged: 'true' } })
    } else {
      errorMessage.value = response.data?.message || 'Invalid or expired verification code.'
    }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    errorMessage.value = error.response?.data?.message || 'Failed to reset password. Please check your verification code.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="space-y-2">
      <router-link
        to="/users"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Accounts List
      </router-link>
      <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Change Account Password</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">Authorize and update login credentials for client or staff accounts</p>
    </div>

    <!-- Target User Information Card -->
    <UiCard custom-class="p-5 flex items-center gap-4">
      <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ targetName }}</h3>
          <span class="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2 py-0.5 rounded">
            {{ targetRole }}
          </span>
        </div>
        <p class="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{{ targetEmail }}</p>
      </div>
    </UiCard>

    <!-- Admin Security Callout -->
    <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
      <div class="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div class="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
        <strong class="font-bold block">Administrator Verification Required</strong>
        <p class="opacity-90">
          A 6-digit authorization code has been dispatched to your active administrator email address.
        </p>
      </div>
    </div>

    <!-- Error / Success Alerts -->
    <div v-if="errorMessage" class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
      <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
      <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Reset Form -->
    <UiCard custom-class="p-6">
      <form @submit.prevent="handlePasswordChange" class="space-y-4">
        <!-- Verification Code -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
              Admin 6-Digit Verification Code <span class="text-rose-500">*</span>
            </label>
            <button
              type="button"
              class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
              :disabled="isSendingOtp || otpCooldown > 0"
              @click="requestAdminOtp"
            >
              <span v-if="isSendingOtp">Sending code...</span>
              <span v-else-if="otpCooldown > 0">Resend Code ({{ otpCooldown }}s)</span>
              <span v-else>Resend Code</span>
            </button>
          </div>
          <UiInput
            v-model="verificationCode"
            type="text"
            placeholder="e.g. 849201"
            size="lg"
            :maxlength="6"
            custom-class="text-center font-mono text-lg tracking-widest"
            required
          />
        </div>

        <!-- New Password -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            New Password <span class="text-rose-500">*</span>
          </label>
          <UiInput
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            placeholder="Enter new password (min 8 chars)"
            size="md"
            required
          >
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 p-1"
                @click="showNewPassword = !showNewPassword"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </template>
          </UiInput>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirm New Password <span class="text-rose-500">*</span>
          </label>
          <UiInput
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Confirm new password"
            size="md"
            required
          >
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 p-1"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </template>
          </UiInput>
        </div>

        <!-- Submit Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <UiButton
            variant="secondary"
            @click="router.push('/users')"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            variant="primary"
            :loading="isSubmitting"
          >
            Confirm Password Reset
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>
