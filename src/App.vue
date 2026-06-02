<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const alertVisible = ref(false)
const alertMsg = ref('')
const alertType = ref<'error' | 'success'>('error')

function handleLogin() {
  alertVisible.value = false

  if (!email.value.trim() || !password.value) {
    alertMsg.value = 'Please enter your email and password.'
    alertType.value = 'error'
    alertVisible.value = true
    return
  }

  // TODO: replace with real auth call
  alertMsg.value = 'Login successful! Redirecting...'
  alertType.value = 'success'
  alertVisible.value = true
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-(--color-background)">
    <div
      class="w-full max-w-sm rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-9"
    >
      <!-- Brand -->
      <div class="flex flex-col gap-1 mb-7">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-(--color-primary)"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="10" width="4" height="7" rx="1" fill="white" />
              <rect x="8" y="6" width="4" height="11" rx="1" fill="white" opacity="0.7" />
              <rect x="13" y="3" width="4" height="14" rx="1" fill="white" opacity="0.45" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-semibold tracking-tight text-(--color-text)">ParkFlow</span>
            <span class="text-xs text-(--color-muted)">Parking Management System</span>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="mb-6 pb-6 border-b border-(--color-border)">
        <h1 class="text-xl font-semibold tracking-tight mb-1 text-(--color-text)">Admin Sign In</h1>
        <p class="text-sm text-(--color-muted)">Enter your credentials to access the dashboard</p>
      </div>

      <!-- Alert -->
      <div
        v-if="alertVisible"
        class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-5 border"
        :class="
          alertType === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        "
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" class="shrink-0">
          <path
            d="M7.5 1a6.5 6.5 0 100 13A6.5 6.5 0 007.5 1zm0 9.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.25a.75.75 0 01-1.5 0v-3a.75.75 0 011.5 0v3z"
          />
        </svg>
        <span>{{ alertMsg }}</span>
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label for="email" class="block text-xs font-medium mb-1.5 text-(--color-accent)">
          Email address
        </label>
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-(--color-muted)"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
          >
            <rect x="1" y="3" width="13" height="9" rx="1.5" />
            <path d="M1 4.5l6.5 4 6.5-4" />
          </svg>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@parkflow.com"
            autocomplete="username"
            class="input-field w-full h-10 ps-9 pe-4 text-sm rounded-lg border border-(--color-border) bg-(--color-surface-lighter) text-(--color-text) outline-none transition-all duration-150"
            @keyup.enter="handleLogin"
          />
        </div>
      </div>

      <!-- Password -->
      <div class="mb-4">
        <label for="password" class="block text-xs font-medium mb-1.5 text-(--color-accent)">
          Password
        </label>
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-(--color-muted)"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
          >
            <rect x="2.5" y="6" width="10" height="7.5" rx="1.3" />
            <path d="M5 6V4.5a2.5 2.5 0 015 0V6" />
          </svg>
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            autocomplete="current-password"
            class="input-field w-full h-10 ps-9 pe-10 text-sm rounded-lg border border-(--color-border) bg-(--color-surface-lighter) text-(--color-text) outline-none transition-all duration-150"
            @keyup.enter="handleLogin"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-(--color-muted) hover:text-(--color-text) transition-colors duration-150"
            @click="showPassword = !showPassword"
          >
            <svg
              v-if="!showPassword"
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
            >
              <ellipse cx="7.5" cy="7.5" rx="1.75" ry="1.75" />
              <path
                d="M1 7.5C2.5 4 4.8 2.5 7.5 2.5S12.5 4 14 7.5c-1.5 3.5-3.8 5-6.5 5S2.5 11 1 7.5z"
              />
            </svg>
            <svg
              v-else
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
            >
              <path
                d="M2 2l11 11M6.5 5.5A3 3 0 019 7.5M4 4.2C2.3 5.2 1 7.5 1 7.5s2.3 4 6.5 4c1.2 0 2.3-.3 3.2-.8M8.5 4A6.3 6.3 0 0114 7.5S11.7 11.5 7.5 11.5"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Remember + Forgot -->
      <div class="flex items-center justify-between mt-1.5 mb-6">
        <label
          class="flex items-center gap-2 text-xs cursor-pointer select-none text-(--color-muted)"
        >
          <div class="relative w-4 h-4 shrink-0">
            <input v-model="remember" type="checkbox" class="peer sr-only" />
            <div
              class="w-4 h-4 rounded border border-(--color-border) bg-(--color-surface) peer-checked:bg-(--color-primary) peer-checked:border-(--color-primary) transition-colors duration-150"
            />
            <svg
              class="absolute inset-0 m-auto w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1.5 5l2.5 2.5 4.5-4" />
            </svg>
          </div>
          Remember me
        </label>
        <a
          href="#"
          class="text-xs font-medium text-(--color-primary) hover:opacity-75 transition-opacity"
        >
          Forgot password?
        </a>
      </div>

      <!-- Submit -->
      <button
        class="w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-lg bg-(--color-primary) hover:opacity-90 hover:-translate-y-px active:translate-y-0 transition-all duration-150 cursor-pointer"
        @click="handleLogin"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M9.5 4.5L13 7.5l-3.5 3M13 7.5H5M6 11V12a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2h1a2 2 0 012 2v1"
          />
        </svg>
        Sign In to Dashboard
      </button>

      <!-- Security note -->
      <div
        class="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-lg border border-(--color-border) bg-(--color-surface-lighter) text-xs text-(--color-muted)"
      >
        <svg
          class="shrink-0 text-(--color-success)"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M7 1.5L2 3.5v4c0 2.8 2.1 4.8 5 5.5 2.9-.7 5-2.7 5-5.5v-4L7 1.5z" />
          <path d="M4.5 7l1.8 1.8 3.2-3.2" />
        </svg>
        Secured with 256-bit SSL encryption
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-field:focus {
  border-color: var(--color-accent);
  background-color: var(--color-surface);
}

.input-field::placeholder {
  color: var(--color-muted);
  opacity: 0.5;
}

.input-field::selection {
  background-color: var(--color-surface-muted);
  color: var(--color-text);
}
</style>
