<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiInput from '@/components/ui/UiInput.vue'
import UiButton from '@/components/ui/UiButton.vue'
import ForgotPasswordModal from './ForgotPasswordModal.vue'

const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const alertMessage = ref('')
const alertType = ref<'error' | 'success'>('error')
const isForgotPasswordOpen = ref(false)
const emailError = ref('')
const passwordError = ref('')
const emailInput = ref<InstanceType<typeof UiInput> | null>(null)
const passwordInput = ref<InstanceType<typeof UiInput> | null>(null)

function handlePasswordResetSuccess(resetEmail: string) {
  if (resetEmail) {
    email.value = resetEmail
  }
  password.value = ''
  alertType.value = 'success'
  alertMessage.value = 'Password reset successfully. Please log in with your new password.'
}

async function handleSubmit() {
  if (isLoading.value) return
  alertMessage.value = ''
  emailError.value = ''
  passwordError.value = ''

  if (!email.value.trim()) {
    emailError.value = 'Please enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    emailError.value = 'Please enter a valid email address.'
  }

  if (!password.value) {
    passwordError.value = 'Please enter your password.'
  }

  if (emailError.value || passwordError.value) {
    if (emailError.value) emailInput.value?.focus()
    else passwordInput.value?.focus()
    return
  }

  isLoading.value = true

  try {
    const trimmedEmail = email.value.trim()
    const response = await api.post('/users/login', {
      email: trimmedEmail,
      password: password.value,
    })

    if (response.data?.isSuccess) {
      const data = response.data.data
      const token = typeof data === 'string' ? data : data?.token || ''
      if (token) {
        localStorage.setItem('parkflow_token', token)
      }
      localStorage.setItem('parkflow_user_email', trimmedEmail.toLowerCase())

      // Direct response properties
      const directRole = data?.role || data?.userRole || data?.UserRole || data?.profileType
      if (directRole) {
        localStorage.setItem('parkflow_user_role', String(directRole))
      }

      const directId = data?.id || data?.userId || data?.userAccountId
      if (directId) {
        localStorage.setItem('parkflow_user_id', String(directId))
      }

      try {
        if (token && token.includes('.')) {
          const parts = token.split('.')
          if (parts[1]) {
            const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            const userId =
              payload.user_id ||
              payload.sub ||
              payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
              payload.nameid ||
              payload.id
            if (userId) {
              localStorage.setItem('parkflow_user_id', String(userId))
            }
            const role =
              payload.role ||
              payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
              payload.Role ||
              payload.userRole ||
              payload.UserRole ||
              payload.profile_type
            if (role) {
              localStorage.setItem('parkflow_user_role', String(role))
            }
          }
        }
      } catch (err) {
        console.warn('Could not extract user details from token', err)
      }

      alertType.value = 'success'
      alertMessage.value = 'Login successful! Redirecting...'
      setTimeout(() => {
        router.push('/dashboard')
      }, 600)
    } else {
      alertMessage.value = response.data?.message || 'Email or password is incorrect.'
      alertType.value = 'error'
    }
  } catch (error: unknown) {
    console.error('Login error:', error)
    const failure = isAxiosError<{ message?: string }>(error) ? error : null

    alertMessage.value =
      failure?.response?.status === 401
        ? 'Email or password is incorrect.'
        : failure?.response?.data?.message || 'Unable to sign in right now. Please try again.'
    alertType.value = 'error'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form class="space-y-5" novalidate :aria-busy="isLoading" @submit.prevent="handleSubmit">
    <p
      v-if="alertMessage"
      role="alert"
      class="rounded-button border p-3 text-sm leading-5"
      :class="
        alertType === 'error'
          ? 'border-danger/20 bg-danger-bg text-text'
          : 'border-success/20 bg-success-bg text-text'
      "
    >
      {{ alertMessage }}
    </p>
    <UiInput
      ref="emailInput"
      v-model="email"
      name="email"
      label="Email address"
      type="email"
      placeholder="Enter your email address"
      size="lg"
      autocomplete="email"
      :error="emailError"
      :disabled="isLoading"
      @update:model-value="emailError = ''"
    />
    <UiInput
      ref="passwordInput"
      v-model="password"
      name="password"
      label="Password"
      :type="showPassword ? 'text' : 'password'"
      placeholder="Enter your password"
      size="lg"
      autocomplete="current-password"
      :error="passwordError"
      :disabled="isLoading"
      @update:model-value="passwordError = ''"
    >
      <template #suffix>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-button text-muted focus-visible:outline-2 focus-visible:outline-primary"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          :aria-pressed="showPassword"
          :disabled="isLoading"
          @click="showPassword = !showPassword"
        >
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            <path v-if="showPassword" d="m3 3 18 18" />
          </svg>
        </button>
      </template>
    </UiInput>
    <div class="text-right">
      <button
        type="button"
        class="min-h-11 rounded-button text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        :disabled="isLoading"
        @click="isForgotPasswordOpen = true"
      >
        Forgot password?
      </button>
    </div>
    <UiButton type="submit" size="lg" block :loading="isLoading">{{
      isLoading ? 'Signing in…' : 'Sign In'
    }}</UiButton>
    <ForgotPasswordModal
      :is-open="isForgotPasswordOpen"
      :initial-email="email"
      @close="isForgotPasswordOpen = false"
      @success="handlePasswordResetSuccess"
    />
  </form>
</template>
