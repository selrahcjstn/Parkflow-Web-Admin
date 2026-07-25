<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'

const route = useRoute()
const appStore = useAppStore()

const collapsed = computed(() => appStore.sidebarCollapsed)

const openDropdowns = ref<Record<string, boolean>>({
  client: true,
  register: true
})

const toggleDropdown = (key: string) => {
  openDropdowns.value[key] = !openDropdowns.value[key]
}

const isSubActive = (path: string) => {
  if (path.includes('?')) {
    const [basePath, queryStr] = path.split('?')
    if (route.path !== basePath) return false
    const params = new URLSearchParams(queryStr)
    for (const [key, val] of params.entries()) {
      if (route.query[key] !== val) return false
    }
    return true
  }
  return route.path === path
}

const isGroupActive = (item: NavItem) => {
  if (!item.children) return route.path === item.path
  return item.children.some((child) => isSubActive(child.path))
}

watch(
  () => route.fullPath,
  (newFullPath) => {
    if (newFullPath.startsWith('/users?role=')) {
      openDropdowns.value['client'] = true
    }
    if (newFullPath.startsWith('/registrations') || newFullPath.startsWith('/users/create')) {
      openDropdowns.value['register'] = true
    }
  },
  { immediate: true }
)

interface SubNavItem {
  label: string
  path: string
}

interface NavItem {
  key: string
  label: string
  path?: string
  icon: string
  children?: SubNavItem[]
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  {
    key: 'client',
    label: 'Client',
    icon: 'users',
    children: [
      { label: 'Student', path: '/users?role=Student' },
      { label: 'NAP', path: '/users?role=NAPA' },
      { label: 'Admin / Staff', path: '/users?role=AdminStaff' }
    ]
  },
  {
    key: 'register',
    label: 'Register',
    icon: 'register',
    children: [
      { label: 'Register Client', path: '/users/create' },
      { label: 'Register Staff / Admin', path: '/users/create-staff' },
      { label: 'Pending Registration', path: '/registrations' }
    ]
  },
  { key: 'parking', label: 'Parking', path: '/parking', icon: 'parking' },
  { key: 'collections', label: 'Collections', path: '/violations', icon: 'violations' },
  { key: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'vehicles' },
  { key: 'reports', label: 'Reports', path: '/reports', icon: 'reports' },
  { key: 'settings', label: 'Settings', path: '/settings', icon: 'settings' }
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

        <template v-for="item in navItems" :key="item.key">
          <!-- Standard Single Link -->
          <router-link
            v-if="!item.children"
            :to="item.path!"
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

            <!-- Parking icon -->
            <svg v-else-if="item.icon === 'parking'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M10 16V8h3a3 3 0 0 1 0 6h-3" />
            </svg>

            <!-- Collections Ticket icon -->
            <svg v-else-if="item.icon === 'violations'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
              <path d="M13 5v14" stroke-dasharray="2 2" />
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

            <!-- Settings icon -->
            <svg v-else-if="item.icon === 'settings'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>

            <span class="nav-label">{{ item.label }}</span>
            <span class="nav-tooltip">{{ item.label }}</span>
          </router-link>

          <!-- Dropdown Group (Client, Register) -->
          <div v-else class="nav-dropdown-group" :class="{ 'is-active': isGroupActive(item) }">
            <button
              class="nav-item nav-item--dropdown"
              :class="{ 'router-link-active': isGroupActive(item) }"
              @click="toggleDropdown(item.key)"
            >
              <!-- Users / Client Icon -->
              <svg v-if="item.icon === 'users'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="7" r="4" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <circle cx="17" cy="8" r="3" />
                <path d="M21 21v-1.5a3 3 0 0 0-2.5-2.96" />
              </svg>

              <!-- Register Icon -->
              <svg v-else-if="item.icon === 'register'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>

              <span class="nav-label">{{ item.label }}</span>

              <svg
                class="dropdown-chevron"
                :class="{ rotated: openDropdowns[item.key] }"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>

              <span class="nav-tooltip">{{ item.label }}</span>
            </button>

            <!-- Sub Nav List -->
            <div v-show="openDropdowns[item.key] && !collapsed" class="sub-nav-list">
              <router-link
                v-for="sub in item.children"
                :key="sub.path"
                :to="sub.path"
                custom
                v-slot="{ navigate }"
              >
                <a
                  class="sub-nav-item"
                  :class="{ 'is-sub-active': isSubActive(sub.path) }"
                  @click="(e) => { navigate(e); appStore.closeMobileSidebar(); }"
                >
                  <span class="sub-nav-dot"></span>
                  <span class="sub-nav-label">{{ sub.label }}</span>
                </a>
              </router-link>
            </div>
          </div>
        </template>
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
  background: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
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
  background: var(--color-primary);
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.25);
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
  color: var(--color-text);
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 11px;
  color: var(--color-muted);
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
  color: var(--color-muted);
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
  color: var(--color-sidebar-text);
  text-decoration: none;
  background: transparent;
  border: none;
  width: calc(100% - 16px);
  cursor: pointer;
  transition: all 150ms ease;
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
}

.collapsed .nav-item {
  justify-content: center;
  margin: 2px 8px;
  padding: 0;
}

.nav-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-text);
}

.nav-item.router-link-active {
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-text-active);
  font-weight: 600;
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 20px;
  width: 3px;
  background: var(--color-primary);
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
  flex: 1;
  opacity: 1;
  transition: opacity 200ms ease, width 200ms ease;
  overflow: hidden;
}

.collapsed .nav-label {
  opacity: 0;
  width: 0;
}

.dropdown-chevron {
  flex-shrink: 0;
  color: var(--color-muted);
  transition: transform 200ms ease;
}

.dropdown-chevron.rotated {
  transform: rotate(180deg);
}

.collapsed .dropdown-chevron {
  display: none;
}

/* ── Sub Navigation ─────────────────────────────── */

.sub-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 28px;
  padding-top: 2px;
  padding-bottom: 4px;
}

.sub-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  margin: 0 8px;
  border-radius: 8px;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.sub-nav-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-text);
}

.sub-nav-item.is-sub-active {
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-sidebar-active-bg);
}

.sub-nav-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-muted);
  transition: background 150ms ease;
}

.sub-nav-item.is-sub-active .sub-nav-dot {
  background: var(--color-primary);
}

/* ── Tooltip ────────────────────────────────────── */

.nav-tooltip {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease, transform 150ms ease;
  transform: translateY(-50%) translateX(-4px);
  box-shadow: var(--shadow-elevated);
  border: 1px solid var(--color-border);
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
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
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
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease, box-shadow 200ms ease;
}

.collapse-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  box-shadow: var(--shadow-soft);
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
    background: rgba(0, 0, 0, 0.3);
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
