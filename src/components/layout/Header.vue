<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const pageTitle = computed(() => {
  return (route.meta?.title as string) || (route.name as string) || 'Dashboard'
})

function handleLogout() {
  localStorage.removeItem('parkflow_token')
  router.push('/login')
}
</script>

<template>
  <header class="app-header">
    <!-- Left side -->
    <div class="header-left">
      <!-- Mobile hamburger -->
      <button
        class="hamburger-btn"
        @click="appStore.toggleMobileSidebar"
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="17" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>

    <!-- Right side -->
    <div class="header-right">
      <!-- Search button -->
      <button class="header-icon-btn" aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      <!-- Notification bell -->
      <button class="header-icon-btn notification-btn" aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="notification-dot" />
      </button>

      <!-- User avatar -->
      <button class="user-avatar" aria-label="User menu" @click="handleLogout">
        <span class="avatar-initials">AD</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: rgba(43, 45, 49, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease;
}

.hamburger-btn:hover {
  background: var(--color-surface-lighter);
  color: var(--color-text);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  line-height: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease;
}

.header-icon-btn:hover {
  background: var(--color-surface-lighter);
  color: var(--color-text);
}

.notification-btn {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid rgba(43, 45, 49, 0.8);
  box-sizing: content-box;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #f87171, #ef4444);
  cursor: pointer;
  margin-left: 6px;
  transition: box-shadow 200ms ease, transform 200ms ease;
}

.user-avatar:hover {
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2);
  transform: scale(1.05);
}

.avatar-initials {
  font-size: 13px;
  font-weight: 600;
  color: white;
  line-height: 1;
  user-select: none;
}

@media (max-width: 1023px) {
  .hamburger-btn {
    display: flex;
  }
}
</style>
