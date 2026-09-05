<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'

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
  // Automatically trigger OTP email dispatch upon loading page
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
  <div class="change-password-page">
    <!-- Header with Back Button -->
    <div class="page-header">
      <div class="header-left">
        <router-link to="/users" class="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Accounts List
        </router-link>
        <h1 class="page-title">Change Account Password</h1>
        <p class="page-subtitle">Authorize and update login credentials for client or staff accounts</p>
      </div>
    </div>

    <div class="form-container">
      <!-- Target User Information Card -->
      <div class="user-summary-card">
        <div class="user-avatar-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div class="user-summary-info">
          <div class="user-title-row">
            <h3 class="user-name">{{ targetName }}</h3>
            <span class="role-badge">{{ targetRole }}</span>
          </div>
          <p class="user-email">{{ targetEmail }}</p>
        </div>
      </div>

      <!-- Admin Security Banner -->
      <div class="security-banner">
        <div class="security-banner-header">
          <div class="security-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h4 class="security-title">Administrator Verification Required</h4>
            <p class="security-desc">
              For security compliance, a 6-digit authorization code has been dispatched to your active administrator email address.
            </p>
          </div>
        </div>
      </div>

      <!-- Alert Banners -->
      <div v-if="errorMessage" class="alert-banner alert-banner--error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="alert-banner alert-banner--success">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>

      <!-- Password Reset Form Card -->
      <form @submit.prevent="handlePasswordChange" class="form-card">
        <div class="card-header">
          <h3 class="card-title">Enter Verification & New Credentials</h3>
        </div>

        <div class="form-body">
          <!-- Verification Code Input -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label required">Admin 6-Digit Verification Code</label>
              <button
                type="button"
                class="resend-btn"
                :disabled="isSendingOtp || otpCooldown > 0"
                @click="requestAdminOtp"
              >
                <span v-if="isSendingOtp">Sending code...</span>
                <span v-else-if="otpCooldown > 0">Resend Code ({{ otpCooldown }}s)</span>
                <span v-else>Resend Code to Admin Email</span>
              </button>
            </div>
            <input
              v-model="verificationCode"
              type="text"
              maxlength="6"
              placeholder="e.g. 849201"
              class="form-input code-input"
              required
            />
          </div>

          <!-- New Password Input -->
          <div class="form-group">
            <label class="form-label required">New Password</label>
            <div class="password-input-wrapper">
              <input
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Enter new password"
                class="form-input"
                required
              />
              <button
                type="button"
                class="toggle-password-btn"
                @click="showNewPassword = !showNewPassword"
              >
                <svg v-if="!showNewPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Confirm New Password Input -->
          <div class="form-group">
            <label class="form-label required">Confirm New Password</label>
            <div class="password-input-wrapper">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Re-enter new password"
                class="form-input"
                required
              />
              <button
                type="button"
                class="toggle-password-btn"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg v-if="!showConfirmPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="form-footer">
          <router-link to="/users" class="btn btn--secondary">Cancel</router-link>
          <button type="submit" class="btn btn--primary" :disabled="isSubmitting">
            <span v-if="isSubmitting">Updating Password...</span>
            <span v-else>Confirm Change Password</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.change-password-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 8px;
  transition: color 150ms ease;
}

.back-link:hover {
  color: var(--color-text);
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-summary-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-soft);
}

.user-avatar-badge {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-summary-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.role-badge {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-email {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

/* Security Banner */
.security-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 12px;
  padding: 16px 20px;
}

.security-banner-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.security-icon {
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 2px;
}

.security-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.security-desc {
  font-size: 12.5px;
  color: var(--color-muted);
  margin: 4px 0 0;
  line-height: 1.5;
}

/* Alert Banners */
.alert-banner {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13.5px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-banner--error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.alert-banner--success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
}

/* Form Card */
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.form-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.resend-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: opacity 150ms ease;
}

.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-input {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 11px 14px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.code-input {
  font-family: monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-input-wrapper .form-input {
  padding-right: 42px;
}

.toggle-password-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
}

.toggle-password-btn:hover {
  color: var(--color-text);
}

.form-footer {
  padding: 16px 24px;
  background: var(--color-surface-muted);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: all 150ms ease;
  border: none;
}

.btn--primary {
  background: var(--color-primary);
  color: #ffffff;
}

.btn--primary:hover {
  background: var(--color-primary-dark);
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn--secondary:hover {
  background: var(--color-border);
}
</style>
