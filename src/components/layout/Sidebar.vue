<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'

const route = useRoute()
const appStore = useAppStore()

const collapsed = computed(() => appStore.sidebarCollapsed)

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Registrations', path: '/registrations', icon: 'registrations' },
  { label: 'Clients', path: '/users', icon: 'users' },
  { label: 'Parking', path: '/parking', icon: 'parking' },
  { label: 'Violations', path: '/violations', icon: 'violations' },
  { label: 'Vehicles', path: '/vehicles', icon: 'vehicles' },
  { label: 'Reports', path: '/reports', icon: 'reports' }
]
</script>

<template>
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': appStore.sidebarMobileOpen }">
    <!-- Mobile backdrop -->
    <Transition name="backdrop">
      <div
        v-if="appStore.sidebarMobileOpen"
        class="sidebar-backdrop"
        @click="appStore.closeMobileSidebar"
      />
    </Transition>

    <!-- Sidebar content -->
    <div class="sidebar-inner">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" opacity="0.7" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" opacity="0.45" />
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-title">ParkFlow</span>
          <span class="logo-subtitle">Admin Panel</span>
        </div>
      </div>

      <!-- Nav section -->
      <nav class="sidebar-nav">
        <span class="nav-section-label">MENU</span>

        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          @click="appStore.closeMobileSidebar"
        >
          <!-- Dashboard icon -->
          <svg v-if="item.icon === 'dashboard'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
          </svg>

          <!-- Registrations icon -->
          <svg v-else-if="item.icon === 'registrations'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>

          <!-- Users icon -->
          <svg v-else-if="item.icon === 'users'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            <circle cx="17" cy="8" r="3" />
            <path d="M21 21v-1.5a3 3 0 0 0-2.5-2.96" />
          </svg>

          <!-- Parking icon -->
          <svg v-else-if="item.icon === 'parking'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M10 16V8h3a3 3 0 0 1 0 6h-3" />
          </svg>

          <!-- Violations icon -->
          <svg v-else-if="item.icon === 'violations'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
          </svg>

          <!-- Vehicles icon -->
          <svg v-else-if="item.icon === 'vehicles'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 17h14" />
            <path d="M6 11l1.5-4.5a1 1 0 0 1 .95-.5h7.1a1 1 0 0 1 .95.5L18 11" />
            <rect x="3" y="11" width="18" height="6" rx="2" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </svg>

          <!-- Reports icon -->
          <svg v-else-if="item.icon === 'reports'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="12" width="4" height="8" rx="1" />
            <rect x="10" y="8" width="4" height="12" rx="1" />
            <rect x="17" y="4" width="4" height="16" rx="1" />
          </svg>

          <span class="nav-label">{{ item.label }}</span>

          <!-- Tooltip for collapsed state -->
          <span class="nav-tooltip">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Collapse toggle -->
      <button class="collapse-toggle" @click="appStore.toggleSidebar" :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        <svg
          class="collapse-chevron"
          :class="{ rotated: collapsed }"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 260px;
  z-index: 40;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-backdrop {
  display: none;
}

.sidebar-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #111318;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  z-index: 41;
}

/* ── Logo ───────────────────────────────────────── */

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  min-height: 78px;
}

.collapsed .sidebar-logo {
  justify-content: center;
  padding: 20px 0;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 10px;
  background: #f87171;
  box-shadow: 0 4px 12px rgba(248, 113, 113, 0.3);
}

.logo-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 200ms ease, width 200ms ease;
}

.collapsed .logo-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  color: #f2f3f5;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 11px;
  color: #71717a;
  line-height: 1.3;
}

/* ── Navigation ─────────────────────────────────── */

.sidebar-nav {
  flex: 1;
  padding-top: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav::-webkit-scrollbar {
  width: 0;
}

.nav-section-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: #71717a;
  padding-left: 20px;
  margin-top: 8px;
  margin-bottom: 8px;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  transition: opacity 200ms ease;
}

.collapsed .nav-section-label {
  opacity: 0;
  height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 42px;
  padding: 0 12px;
  margin: 2px 8px;
  border-radius: 10px;
  color: #b5bac1;
  text-decoration: none;
  transition: all 150ms ease;
  overflow: hidden;
  white-space: nowrap;
}

.collapsed .nav-item {
  justify-content: center;
  margin: 2px 8px;
  padding: 0;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f2f3f5;
}

.nav-item.router-link-active {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 20px;
  width: 3px;
  background: #f87171;
  border-radius: 0 4px 4px 0;
}

.collapsed .nav-item.router-link-active::before {
  left: 0;
}

.nav-icon {
  min-width: 20px;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  opacity: 1;
  transition: opacity 200ms ease, width 200ms ease;
  overflow: hidden;
}

.collapsed .nav-label {
  opacity: 0;
  width: 0;
}

/* ── Tooltip ────────────────────────────────────── */

.nav-tooltip {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  border-radius: 8px;
  background: #1e1f22;
  color: #f2f3f5;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease, transform 150ms ease;
  transform: translateY(-50%) translateX(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 100;
}

.nav-tooltip::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: #1e1f22;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.collapsed .nav-item:hover .nav-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* ── Collapse toggle ────────────────────────────── */

.collapse-toggle {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #b5bac1;
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease;
}

.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f2f3f5;
}

.collapse-chevron {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.collapse-chevron.rotated {
  transform: rotate(180deg);
}

/* ── Backdrop transition ────────────────────────── */

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 300ms ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

/* ── Mobile ─────────────────────────────────────── */

@media (max-width: 1023px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
    width: 260px !important;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 39;
  }

  .collapse-toggle {
    display: none;
  }

  .nav-label {
    opacity: 1 !important;
    width: auto !important;
  }

  .nav-section-label {
    opacity: 1 !important;
    height: auto !important;
    margin-top: 8px !important;
    margin-bottom: 8px !important;
    padding-left: 20px !important;
  }

  .logo-text {
    opacity: 1 !important;
    width: auto !important;
  }

  .sidebar-logo {
    justify-content: flex-start !important;
    padding: 20px 16px !important;
  }

  .nav-item {
    justify-content: flex-start !important;
    padding: 0 12px !important;
  }

  .nav-tooltip {
    display: none;
  }
}
</style>
