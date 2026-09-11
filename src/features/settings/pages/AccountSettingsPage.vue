<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  getAccountSettings,
  type AccountSettingsModel,
  type SecurityPayload,
  updateAccountSettings
} from '../accountSettings.service'

interface FormErrors {
  fullName?: string
  email?: string
  phone?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

const settings = ref<AccountSettingsModel | null>(null)
const initialSnapshot = ref('')
const isLoading = ref(true)
const isSaving = ref(false)

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const formErrors = ref<FormErrors>({})
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Filipino', value: 'fil' }
]

const timezoneOptions = [
  'Asia/Manila',
  'UTC',
  'Asia/Singapore',
  'Asia/Tokyo',
  'America/Los_Angeles',
  'Europe/London'
]

const themeOptions = [
  { label: 'System Default', value: 'system' },
  { label: 'Light', value: 'light' }
]

const hasUnsavedChanges = computed(() => {
  if (!settings.value) return false
  const currentSnapshot = JSON.stringify(settings.value)
  const hasPasswordInput = Boolean(currentPassword.value || newPassword.value || confirmPassword.value)
  return currentSnapshot !== initialSnapshot.value || hasPasswordInput
})

const avatarInitials = computed(() => {
  const name = settings.value?.profile.fullName || 'Admin'
  const segments = name.trim().split(/\s+/)
  if (segments.length >= 2) {
    return `${segments[0]?.[0] || ''}${segments[1]?.[0] || ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const passwordStrengthHint = computed(() => {
  const value = newPassword.value
  if (!value) return 'Use at least 8 characters with upper/lowercase and a number.'

  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1

  if (score <= 2) return 'Password strength: Weak'
  if (score === 3) return 'Password strength: Fair'
  return 'Password strength: Strong'
})

function showToast(message: string, type: 'success' | 'error') {
  toast.value = { message, type }
  window.setTimeout(() => {
    toast.value = null
  }, 3500)
}

function clearSecurityFields() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

function validateForm(): boolean {
  const nextErrors: FormErrors = {}

  const profile = settings.value?.profile
  if (!profile) return false

  if (!profile.fullName.trim()) {
    nextErrors.fullName = 'Full name is required.'
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!profile.email.trim()) {
    nextErrors.email = 'Email address is required.'
  } else if (!emailPattern.test(profile.email.trim())) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (profile.phone && !/^[+\d\s()-]{7,20}$/.test(profile.phone)) {
    nextErrors.phone = 'Enter a valid contact number.'
  }

  const hasPasswordChangeInput = Boolean(currentPassword.value || newPassword.value || confirmPassword.value)
  if (hasPasswordChangeInput) {
    if (!currentPassword.value) nextErrors.currentPassword = 'Current password is required.'
    if (!newPassword.value) {
      nextErrors.newPassword = 'New password is required.'
    } else if (newPassword.value.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters.'
    }

    if (!confirmPassword.value) {
      nextErrors.confirmPassword = 'Please confirm your new password.'
    } else if (confirmPassword.value !== newPassword.value) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }
  }

  formErrors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

async function loadPage() {
  isLoading.value = true
  settings.value = await getAccountSettings()
  initialSnapshot.value = JSON.stringify(settings.value)
  isLoading.value = false
}

async function handleSave() {
  if (!settings.value || isSaving.value) return
  if (!validateForm()) return

  isSaving.value = true

  const securityPayload: SecurityPayload | null = newPassword.value
    ? {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    }
    : null

  const result = await updateAccountSettings(settings.value, securityPayload)

  isSaving.value = false

  if (result.usedFallback && result.passwordSkipped) {
    showToast('Profile and preferences saved locally. Password update endpoint is not available yet.', 'error')
  } else if (result.usedFallback) {
    showToast('Changes saved locally while account settings endpoint is unavailable.', 'success')
  } else {
    showToast('Account settings updated successfully.', 'success')
  }

  clearSecurityFields()
  initialSnapshot.value = JSON.stringify(settings.value)
}

function handleCancel() {
  if (!settings.value) return
  if (hasUnsavedChanges.value && !window.confirm('Discard unsaved account settings changes?')) {
    return
  }

  settings.value = JSON.parse(initialSnapshot.value) as AccountSettingsModel
  clearSecurityFields()
  formErrors.value = {}
}

onBeforeRouteLeave((_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    const shouldLeave = window.confirm('You have unsaved changes. Leave this page anyway?')
    next(shouldLeave)
    return
  }
  next()
})

onMounted(() => {
  loadPage()
})
</script>

<template>
  <div class="account-settings-page">
    <Transition name="toast-fade">
      <div v-if="toast" class="toast" :class="`toast--${toast.type}`">
        {{ toast.message }}
      </div>
    </Transition>

    <div class="page-header">
      <div>
        <h1 class="page-title">Account Settings</h1>
        <p class="page-subtitle">Update your profile, security credentials, and personal preferences.</p>
      </div>
      <span v-if="hasUnsavedChanges" class="unsaved-pill">Unsaved changes</span>
    </div>

    <div v-if="isLoading" class="loading-card">Loading account settings...</div>

    <template v-else-if="settings">
      <section class="settings-card">
        <div class="section-header">
          <h2 class="section-title">Profile Information</h2>
        </div>

        <div class="profile-grid">
          <div class="avatar-panel">
            <div class="avatar" :style="settings.profile.avatarUrl ? { backgroundImage: `url(${settings.profile.avatarUrl})` } : {}">
              <span v-if="!settings.profile.avatarUrl">{{ avatarInitials }}</span>
            </div>
            <p class="avatar-help">Paste an avatar image URL to update your profile photo.</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input v-model="settings.profile.fullName" class="form-input" :disabled="isSaving" type="text" placeholder="Full name" />
              <span v-if="formErrors.fullName" class="field-error">{{ formErrors.fullName }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="settings.profile.email" class="form-input" :disabled="isSaving" type="email" placeholder="name@example.com" />
              <span v-if="formErrors.email" class="field-error">{{ formErrors.email }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Phone</label>
              <input v-model="settings.profile.phone" class="form-input" :disabled="isSaving" type="text" placeholder="+63 9xx xxx xxxx" />
              <span v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Avatar URL</label>
              <input v-model="settings.profile.avatarUrl" class="form-input" :disabled="isSaving" type="url" placeholder="https://..." />
            </div>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <div class="section-header">
          <h2 class="section-title">Security</h2>
        </div>

        <div class="form-grid form-grid--three">
          <div class="form-group">
            <label class="form-label">Current Password</label>
            <div class="password-wrap">
              <input v-model="currentPassword" class="form-input" :disabled="isSaving" :type="showCurrentPassword ? 'text' : 'password'" />
              <button class="toggle-btn" type="button" :disabled="isSaving" @click="showCurrentPassword = !showCurrentPassword">{{ showCurrentPassword ? 'Hide' : 'Show' }}</button>
            </div>
            <span v-if="formErrors.currentPassword" class="field-error">{{ formErrors.currentPassword }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">New Password</label>
            <div class="password-wrap">
              <input v-model="newPassword" class="form-input" :disabled="isSaving" :type="showNewPassword ? 'text' : 'password'" />
              <button class="toggle-btn" type="button" :disabled="isSaving" @click="showNewPassword = !showNewPassword">{{ showNewPassword ? 'Hide' : 'Show' }}</button>
            </div>
            <span class="form-help">{{ passwordStrengthHint }}</span>
            <span v-if="formErrors.newPassword" class="field-error">{{ formErrors.newPassword }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <div class="password-wrap">
              <input v-model="confirmPassword" class="form-input" :disabled="isSaving" :type="showConfirmPassword ? 'text' : 'password'" />
              <button class="toggle-btn" type="button" :disabled="isSaving" @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? 'Hide' : 'Show' }}</button>
            </div>
            <span v-if="formErrors.confirmPassword" class="field-error">{{ formErrors.confirmPassword }}</span>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <div class="section-header">
          <h2 class="section-title">Preferences</h2>
        </div>

        <div class="toggles-grid">
          <label class="toggle-row">
            <span>
              <strong>Email notifications</strong>
              <small>Receive updates for approvals and important actions.</small>
            </span>
            <input v-model="settings.preferences.emailNotifications" :disabled="isSaving" type="checkbox" />
          </label>

          <label class="toggle-row">
            <span>
              <strong>Security alerts</strong>
              <small>Get notified when security-related activity is detected.</small>
            </span>
            <input v-model="settings.preferences.securityAlerts" :disabled="isSaving" type="checkbox" />
          </label>

          <label class="toggle-row">
            <span>
              <strong>Product updates</strong>
              <small>Receive occasional release and feature announcements.</small>
            </span>
            <input v-model="settings.preferences.productUpdates" :disabled="isSaving" type="checkbox" />
          </label>
        </div>

        <div class="form-grid form-grid--three">
          <div class="form-group">
            <label class="form-label">Language</label>
            <select v-model="settings.preferences.language" class="form-input" :disabled="isSaving">
              <option v-for="option in languageOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Timezone</label>
            <select v-model="settings.preferences.timezone" class="form-input" :disabled="isSaving">
              <option v-for="option in timezoneOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Theme</label>
            <select v-model="settings.preferences.theme" class="form-input" :disabled="isSaving">
              <option v-for="option in themeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <span class="form-help">Theme switching is prepared for when additional app themes are enabled.</span>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <div class="section-header">
          <h2 class="section-title">Access Summary</h2>
        </div>

        <div class="access-role">{{ settings.access.role }}</div>
        <ul class="access-list">
          <li v-for="permission in settings.access.permissions" :key="permission">{{ permission }}</li>
        </ul>
      </section>

      <div class="action-row">
        <button class="btn btn--secondary" type="button" :disabled="isSaving || !hasUnsavedChanges" @click="handleCancel">Cancel</button>
        <button class="btn btn--primary" type="button" :disabled="isSaving || !hasUnsavedChanges" @click="handleSave">
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.account-settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-muted);
}

.unsaved-pill {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
}

.loading-card,
.settings-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-soft);
}

.loading-card {
  color: var(--color-muted);
  font-size: 14px;
}

.section-header {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.profile-grid {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 20px;
}

.avatar-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  background: linear-gradient(135deg, #d22730, #a81d24);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
}

.avatar-help {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-input {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  padding: 0 12px;
  box-sizing: border-box;
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-help {
  color: var(--color-muted);
  font-size: 11px;
}

.field-error {
  color: var(--color-danger);
  font-size: 12px;
}

.password-wrap {
  position: relative;
}

.password-wrap .form-input {
  padding-right: 58px;
}

.toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.toggles-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-muted);
}

.toggle-row strong {
  display: block;
  font-size: 13px;
  color: var(--color-text);
}

.toggle-row small {
  display: block;
  font-size: 11px;
  color: var(--color-muted);
  margin-top: 2px;
}

.access-role {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}

.access-list {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-secondary);
  display: grid;
  gap: 6px;
}

.action-row {
  position: sticky;
  bottom: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  height: 40px;
  padding: 0 16px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--secondary {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.toast {
  position: fixed;
  top: 22px;
  right: 24px;
  z-index: 10000;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  box-shadow: var(--shadow-dropdown);
}

.toast--success {
  background: var(--color-success);
}

.toast--error {
  background: var(--color-danger);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1024px) {
  .profile-grid,
  .form-grid,
  .form-grid--three {
    grid-template-columns: 1fr;
  }

  .avatar {
    width: 84px;
    height: 84px;
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-row {
    position: static;
  }
}
</style>
