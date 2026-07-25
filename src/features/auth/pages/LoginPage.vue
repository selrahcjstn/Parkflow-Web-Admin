<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isLoading = ref(false)
const alertMessage = ref('')
const alertType = ref<'error' | 'success'>('error')

async function handleSubmit() {
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
    const response = await api.post('/users/login', {
      email: email.value,
      password: password.value,
    })

    if (response.data?.isSuccess) {
      const token = response.data.data.token
      localStorage.setItem('parkflow_token', token)
      localStorage.setItem('parkflow_user_email', email.value.toLowerCase().trim())
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
  <div class="flex min-h-screen items-center justify-center px-4" style="background: var(--color-background)">
    <div class="w-full max-w-md">
      <!-- Branding -->
      <div class="mb-8 flex flex-col items-center gap-3">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl"
          style="background: var(--color-primary)"
        >
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" opacity="0.7" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" opacity="0.45" />
          </svg>
        </div>
        <div class="text-center">
          <h1 class="text-2xl font-bold" style="color: var(--color-text)">ParkFlow</h1>
          <p class="mt-1 text-sm" style="color: var(--color-muted)">Parking Management System</p>
        </div>
      </div>

      <!-- Card -->
      <div
        class="rounded-2xl border p-8"
        style="background: var(--color-surface); border-color: var(--color-border); box-shadow: var(--shadow-card);"
      >
        <!-- Header -->
        <div class="mb-6 text-center">
          <h2 class="text-xl font-semibold" style="color: var(--color-text)">Admin Sign In</h2>
          <p class="mt-1 text-sm" style="color: var(--color-muted)">
            Enter your credentials to access the dashboard
          </p>
        </div>

        <!-- Alert -->
        <div
          v-if="alertMessage"
          class="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          :style="{
            background: alertType === 'error' ? 'var(--color-primary-light)' : 'rgba(16,185,129,0.1)',
            color: alertType === 'error' ? 'var(--color-primary)' : 'var(--color-success)',
            border: `1px solid ${alertType === 'error' ? 'rgba(210,39,48,0.2)' : 'rgba(16,185,129,0.2)'}`
          }"
        >
          <svg v-if="alertType === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{{ alertMessage }}</span>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <!-- Email -->
          <div>
            <label class="mb-1.5 block text-sm font-medium" style="color: var(--color-text)">
              Email Address
            </label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
              </span>
              <input
                v-model="email"
                type="email"
                placeholder="admin@parkflow.com"
                class="login-input"
                autocomplete="email"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="mb-1.5 block text-sm font-medium" style="color: var(--color-text)">
              Password
            </label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="3" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <circle cx="12" cy="16" r="1.5" />
                </svg>
              </span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                class="login-input"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Remember / Forgot -->
          <div class="flex items-center justify-between">
            <label class="flex cursor-pointer items-center gap-2 text-sm" style="color: var(--color-text)">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="login-checkbox"
              />
              Remember me
            </label>
            <a
              href="#"
              class="text-sm font-medium transition-colors hover:underline"
              style="color: var(--color-primary)"
            >
              Forgot password?
            </a>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isLoading"
            class="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            :style="{
              background: isLoading ? 'var(--color-primary-dark)' : 'var(--color-primary)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? '0.7' : '1'
            }"
          >
            <svg
              v-if="isLoading"
              class="animate-spin"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1" />
            </svg>
            <span>{{ isLoading ? 'Signing in...' : 'Sign In to Dashboard' }}</span>
          </button>
        </form>
      </div>

      <!-- Security note -->
      <div class="mt-5 flex items-center justify-center gap-1.5 text-xs" style="color: var(--color-muted)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <span>Secured with 256-bit SSL encryption</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  display: flex;
  align-items: center;
  color: var(--color-muted);
  pointer-events: none;
}

.login-input {
  width: 100%;
  height: 48px;
  padding: 0 14px 0 44px;
  border-radius: var(--radius-button);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.login-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.login-input::placeholder {
  color: var(--color-muted);
}

.toggle-password {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: color 200ms ease, background 200ms ease;
}

.toggle-password:hover {
  color: var(--color-text);
  background: var(--color-surface-muted);
}

.login-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  accent-color: var(--color-primary);
  cursor: pointer;
}
</style>
