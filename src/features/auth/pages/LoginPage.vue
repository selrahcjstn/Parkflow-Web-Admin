<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-text">
    <section class="w-full max-w-sm" aria-labelledby="login-title">
      <img src="/parkflow.png" alt="ParkFlow" class="mb-8 h-14 w-14 object-contain" />
      <h1 id="login-title" class="text-2xl font-semibold">Welcome back</h1>
      <p class="mt-2 mb-8 text-sm text-muted">Sign in to your ParkFlow account.</p>
      <LoginForm />
    </section>
  </main>
</template>
