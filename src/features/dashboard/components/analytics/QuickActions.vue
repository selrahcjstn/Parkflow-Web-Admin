<script setup lang="ts">
import DashIcon, { type DashIconName } from './DashIcon.vue'

const actions: Array<{ label: string; to: string; icon: DashIconName }> = [
  { label: 'Manage users', to: '/users', icon: 'users' },
  { label: 'Vehicle approvals', to: '/vehicles?status=pending', icon: 'car' },
  { label: 'Manage visitors', to: '/visitors', icon: 'user-check' },
  { label: 'Parking records', to: '/parking', icon: 'parking' },
  { label: 'Settings', to: '/settings', icon: 'settings' },
]
</script>

<template>
  <section class="rounded-card border border-border bg-surface p-4 sm:p-5">
    <h2 class="m-0 mb-3 text-[15px] font-semibold text-text">Quick actions</h2>
    <nav aria-label="Quick actions" class="grid grid-cols-1 gap-1.5">
      <RouterLink
        v-for="action in actions"
        :key="action.to"
        :to="action.to"
        class="group flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-[#D22730]"
      >
        <span class="flex size-8 items-center justify-center rounded-lg bg-surface-muted text-text-secondary transition-colors group-hover:bg-[#D22730]/10 group-hover:text-[#D22730]"><DashIcon :name="action.icon" :size="16" /></span>
        <span class="flex-1">{{ action.label }}</span>
        <DashIcon name="arrow-right" :size="14" class="text-subtle" />
      </RouterLink>
    </nav>
  </section>
</template>
