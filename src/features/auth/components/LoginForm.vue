<script setup lang="ts">
import { ref } from 'vue'
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

  if (!email.value.trim()) {
    alertMessage.value = 'Please enter your email address.'
    alertType.value = 'error'
    return
  }

  if (!password.value) {
    alertMessage.value = 'Please enter your password.'
    alertType.value = 'error'
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
      const token = typeof data === 'string' ? data : (data?.token || '')
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
            const userId = payload.user_id || payload.sub || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.id
            if (userId) {
              localStorage.setItem('parkflow_user_id', String(userId))
            }
            const role = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.Role || payload.userRole || payload.UserRole || payload.profile_type
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
      alertMessage.value = response.data?.message || 'Invalid email or password.'
      alertType.value = 'error'
    }
  } catch (error: any) {
    console.error('Login error:', error)
    
    alertMessage.value = error.response?.data?.message || 'Connection error. Please check if backend API is running.'
    alertType.value = 'error'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <p v-if="alertMessage" role="alert" class="rounded-button border border-border bg-surface p-3 text-sm"
       :class="alertType === 'error' ? 'text-(--color-danger)' : 'text-(--color-success)'">{{ alertMessage }}</p>
    <UiInput v-model="email" label="Email address" type="email" placeholder="Enter your email address"
      size="lg" autocomplete="email" :disabled="isLoading" />
    <UiInput v-model="password" label="Password" :type="showPassword ? 'text' : 'password'"
      placeholder="Enter your password" size="lg" autocomplete="current-password" :disabled="isLoading">
      <template #suffix>
        <button type="button" class="flex size-11 items-center justify-center rounded-button text-muted focus-visible:outline-2 focus-visible:outline-primary"
          :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword"
          @click="showPassword = !showPassword">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </template>
    </UiInput>
    <div class="text-right">
      <button type="button" class="min-h-11 text-sm font-medium text-primary hover:underline"
        :disabled="isLoading" @click="isForgotPasswordOpen = true">Forgot password?</button>
    </div>
    <UiButton type="submit" size="lg" block :loading="isLoading">{{ isLoading ? 'Signing in…' : 'Sign In' }}</UiButton>
    <ForgotPasswordModal :is-open="isForgotPasswordOpen" :initial-email="email"
      @close="isForgotPasswordOpen = false" @success="handlePasswordResetSuccess" />
  </form>
</template>
