<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
</script>

<template>
  <main
    class="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-text sm:px-6 sm:py-12"
  >
    <section
      class="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8"
      aria-labelledby="login-title"
      aria-describedby="login-description"
    >
      <div class="mb-8 flex items-center gap-3">
        <img src="/parkflow.png" alt="" class="size-12 shrink-0 object-contain" />
        <div>
          <p class="text-xl font-semibold tracking-tight">ParkFlow</p>
          <p class="mt-0.5 text-xs font-medium text-muted">Admin</p>
        </div>
      </div>
      <h1 id="login-title" class="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p id="login-description" class="mt-2 mb-7 text-sm leading-6 text-muted">
        Sign in to your ParkFlow account.
      </p>
      <LoginForm />
    </section>
  </main>
</template>
