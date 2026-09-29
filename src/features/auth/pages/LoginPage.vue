<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import LoginForm from '../components/LoginForm.vue'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
    <div class="w-full max-w-md space-y-6">
      <!-- Branding Header -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D22730] shadow-lg shadow-[#D22730]/25">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" opacity="0.7" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" opacity="0.45" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ParkFlow</h1>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Parking Management System</p>
        </div>
      </div>

      <!-- Main Login Card -->
      <UiCard custom-class="p-6 sm:p-8">
        <div class="mb-6 text-center">
          <h2 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">Admin Sign In</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your credentials to access the admin portal
          </p>
        </div>

        <LoginForm />
      </UiCard>

      <!-- Security note footer -->
      <div class="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <span>Secured with 256-bit SSL encryption</span>
      </div>
    </div>
  </div>
</template>
