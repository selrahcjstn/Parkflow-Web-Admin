<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  getAccountSettings,
  type AccountSettingsModel,
  type SecurityPayload,
  updateAccountSettings
} from '../accountSettings.service'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import AdminProfileCard from '../components/AdminProfileCard.vue'
import AdminSecurityCard from '../components/AdminSecurityCard.vue'
import AdminPreferencesCard from '../components/AdminPreferencesCard.vue'

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

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const formErrors = ref<FormErrors>({})
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

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

  const securityPayload: SecurityPayload | null = currentPassword.value
    ? {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      }
    : null

  const result = await updateAccountSettings(settings.value, securityPayload)

  isSaving.value = false

  if (result.passwordSkipped) {
    showToast('Profile updated, but password update failed.', 'error')
  } else {
    showToast('Account profile and preferences updated successfully.', 'success')
  }

  clearSecurityFields()
  formErrors.value = {}
  initialSnapshot.value = JSON.stringify(settings.value)
}

function handleReset() {
  if (!initialSnapshot.value) return
  settings.value = JSON.parse(initialSnapshot.value)
  clearSecurityFields()
  formErrors.value = {}
}

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this page?')
    if (!confirmLeave) {
      next(false)
      return
    }
  }
  next()
})

onMounted(() => {
  loadPage()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Toast Notification -->
    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Account Settings
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal profile, credentials, and notification preferences.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          :disabled="!hasUnsavedChanges || isSaving"
          @click="handleReset"
        >
          Discard
        </UiButton>
        <UiButton
          variant="primary"
          :loading="isSaving"
          :disabled="!hasUnsavedChanges"
          @click="handleSave"
        >
          Save Changes
        </UiButton>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="space-y-6">
      <SkeletonLoader variant="rect" height="240px" style="border-radius: 16px;" />
      <SkeletonLoader variant="rect" height="240px" style="border-radius: 16px;" />
    </div>

    <!-- Main Content -->
    <div v-else-if="settings" class="space-y-6 max-w-4xl">
      <!-- 1. Profile Card -->
      <AdminProfileCard
        :profile="settings.profile"
        :access="settings.access"
        :avatar-initials="avatarInitials"
        :form-errors="formErrors"
      />

      <!-- 2. Security Card -->
      <AdminSecurityCard
        v-model:current-password="currentPassword"
        v-model:new-password="newPassword"
        v-model:confirm-password="confirmPassword"
        :form-errors="formErrors"
        :password-strength-hint="passwordStrengthHint"
      />

      <!-- 3. Preferences Card -->
      <AdminPreferencesCard
        :preferences="settings.preferences"
      />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
