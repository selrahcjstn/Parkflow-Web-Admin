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
  <section aria-labelledby="quick-actions-heading">
    <h2 id="quick-actions-heading" class="m-0 mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">Quick actions</h2>
    <nav aria-label="Quick actions" class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
      <RouterLink
        v-for="action in actions"
        :key="action.to"
        :to="action.to"
        class="group flex min-h-12 items-center gap-3 rounded-card border border-border bg-surface px-3 py-2.5 text-[13.5px] font-medium text-text transition-colors hover:border-[#D22730]/40 focus-visible:outline-2 focus-visible:outline-[#D22730]"
      >
        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-secondary transition-colors group-hover:bg-[#D22730]/10 group-hover:text-[#D22730]"><DashIcon :name="action.icon" :size="16" /></span>
        <span class="min-w-0 flex-1 truncate">{{ action.label }}</span>
        <DashIcon name="arrow-right" :size="14" class="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
      </RouterLink>
    </nav>
  </section>
</template>
