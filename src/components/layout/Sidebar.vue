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
  section?: boolean
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { key: 'divider-1', label: 'User Management', icon: '', section: true },
  {
    key: 'client',
    label: 'Clients',
    icon: 'users',
    children: [
      { label: 'Students', path: '/users?role=Student' },
      { label: 'NAP', path: '/users?role=NAPA' },
      { label: 'Admin / Staff', path: '/users?role=AdminStaff' }
    ]
  },
  {
    key: 'register',
    label: 'Registration',
    icon: 'register',
    children: [
      { label: 'Register Client', path: '/users/create' },
      { label: 'Register Staff / Admin', path: '/users/create-staff' },
      { label: 'Pending Registrations', path: '/registrations' },
      { label: 'Schedule Approvals', path: '/schedule-approvals' },
      { label: 'Vehicle Approvals', path: '/vehicle-approvals' }
    ]
  },
  { key: 'divider-2', label: 'Operations', icon: '', section: true },
  { key: 'parking', label: 'Parking', path: '/parking', icon: 'parking' },
  { key: 'reservations', label: 'Reservations', path: '/reservations', icon: 'calendar' },
  { key: 'collections', label: 'Collections', path: '/violations', icon: 'violations' },
  { key: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'vehicles' },
  { key: 'divider-3', label: 'System', icon: '', section: true },
  { key: 'reports', label: 'Reports', path: '/reports', icon: 'reports' },
  { key: 'settings', label: 'Settings', path: '/settings', icon: 'settings' }
]

const userEmail = computed(() => localStorage.getItem('parkflow_user_email') || 'admin@parkflow.com')
const isSuperAdmin = computed(() => {
  const email = userEmail.value.toLowerCase().trim()
  return email.includes('superadmin') || email === 'superadmin@parkflow.com' || !email
})

const filteredNavItems = computed(() => {
  return navItems.map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(sub => {
          if (sub.path === '/users/create-staff' && !isSuperAdmin.value) {
            return false
          }
          if (sub.path === '/users?role=AdminStaff' && !isSuperAdmin.value) {
            return false
          }
          return true
        })
      }
    }
    return item
  })
})

const userInitials = computed(() => {
  const email = userEmail.value
  const local = email.split('@')[0] || 'A'
  const parts = local.split(/[._-]/)
  const p0 = parts[0] || ''
  const p1 = parts[1] || ''
  if (p0 && p1) return (p0.charAt(0) + p1.charAt(0)).toUpperCase()
  return local.slice(0, 2).toUpperCase()
})
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
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="10" width="4" height="7" rx="1" fill="white" />
            <rect x="8" y="6" width="4" height="11" rx="1" fill="white" opacity="0.75" />
            <rect x="13" y="3" width="4" height="14" rx="1" fill="white" opacity="0.45" />
          </svg>
        </div>
        <div class="logo-text">
          <div class="logo-wordmark">
            <span class="logo-title">ParkFlow</span>
            <span class="logo-badge">ADMIN</span>
          </div>
          <span class="logo-subtitle">Parking Management System</span>
        </div>
      </div>

      <!-- Nav section -->
      <nav class="sidebar-nav">
        <template v-for="item in filteredNavItems" :key="item.key">

          <!-- Section Divider Label -->
          <div v-if="item.section" class="nav-section-group">
            <span class="nav-section-label">{{ item.label }}</span>
          </div>

          <!-- Standard Single Link -->
          <router-link
            v-else-if="!item.children"
            :to="item.path!"
            class="nav-item"
            @click="appStore.closeMobileSidebar"
          >
            <!-- Dashboard icon -->
            <div class="nav-icon-wrap">
              <svg v-if="item.icon === 'dashboard'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <!-- Parking icon -->
              <svg v-else-if="item.icon === 'parking'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M10 16V8h3a3 3 0 0 1 0 6h-3" />
              </svg>
              <!-- Calendar / Reservations icon -->
              <svg v-else-if="item.icon === 'calendar'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <!-- Collections icon -->
              <svg v-else-if="item.icon === 'violations'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                <path d="M13 5v14" stroke-dasharray="2 2" />
              </svg>
              <!-- Vehicles icon -->
              <svg v-else-if="item.icon === 'vehicles'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 17h14" />
                <path d="M6 11l1.5-4.5a1 1 0 0 1 .95-.5h7.1a1 1 0 0 1 .95.5L18 11" />
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              <!-- Reports icon -->
              <svg v-else-if="item.icon === 'reports'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="12" width="4" height="8" rx="1" />
                <rect x="10" y="8" width="4" height="12" rx="1" />
                <rect x="17" y="4" width="4" height="16" rx="1" />
              </svg>
              <!-- Settings icon -->
              <svg v-else-if="item.icon === 'settings'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
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
              <div class="nav-icon-wrap">
                <!-- Users / Client Icon -->
                <svg v-if="item.icon === 'users'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <circle cx="17" cy="8" r="3" />
                  <path d="M21 21v-1.5a3 3 0 0 0-2.5-2.96" />
                </svg>
                <!-- Register Icon -->
                <svg v-else-if="item.icon === 'register'" class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </div>
              <span class="nav-label">{{ item.label }}</span>
              <svg
                class="dropdown-chevron"
                :class="{ rotated: openDropdowns[item.key] }"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
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
                  <span class="sub-nav-dot" />
                  <span class="sub-nav-label">{{ sub.label }}</span>
                </a>
              </router-link>
            </div>
          </div>
        </template>
      </nav>

      <!-- User mini-profile at bottom -->
      <div class="sidebar-user">
        <div class="user-avatar-mini">{{ userInitials }}</div>
        <div class="user-info">
          <span class="user-role">{{ isSuperAdmin ? 'Super Administrator' : 'Administrator' }}</span>
          <span class="user-email">{{ userEmail }}</span>
        </div>
      </div>

      <!-- Collapse toggle -->
      <button class="collapse-toggle" @click="appStore.toggleSidebar" :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        <svg
          class="collapse-chevron"
          :class="{ rotated: collapsed }"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
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
  width: 264px;
  z-index: 40;
  transition: width var(--transition-smooth);
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
  border-right: 1px solid var(--color-sidebar-border);
  box-shadow: var(--shadow-sidebar);
  overflow: hidden;
  z-index: 41;
}

/* ── Logo ───────────────────────────────────────── */

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px 16px;
  min-height: 72px;
  border-bottom: 1px solid var(--color-sidebar-divider);
  flex-shrink: 0;
}

.collapsed .sidebar-logo {
  justify-content: center;
  padding: 18px 0 16px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #D22730, #A81D24);
  box-shadow: 0 4px 14px rgba(210, 39, 48, 0.28);
  flex-shrink: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  white-space: nowrap;
  opacity: 1;
  transition: opacity var(--transition-base), width var(--transition-base);
}

.collapsed .logo-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.logo-wordmark {
  display: flex;
  align-items: center;
  gap: 7px;
}

.logo-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
  letter-spacing: -0.3px;
}

.logo-badge {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid rgba(210, 39, 48, 0.2);
  letter-spacing: 0.8px;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.4;
}

.logo-subtitle {
  font-size: 10px;
  color: var(--color-subtle);
  line-height: 1;
  letter-spacing: 0.1px;
}

/* ── Navigation ─────────────────────────────────── */

.sidebar-nav {
  flex: 1;
  padding: 8px 0 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav::-webkit-scrollbar {
  width: 0;
}

/* Section group separator */
.nav-section-group {
  padding: 16px 16px 4px;
  overflow: hidden;
  opacity: 1;
  transition: opacity var(--transition-base);
}

.collapsed .nav-section-group {
  padding: 8px 0;
  pointer-events: none;
}

.nav-section-label {
  display: block;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--color-sidebar-section-label);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity var(--transition-base);
}

.collapsed .nav-section-label {
  opacity: 0;
  height: 0;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  margin: 1px 8px;
  border-radius: 10px;
  color: var(--color-sidebar-text);
  text-decoration: none;
  background: transparent;
  border: none;
  width: calc(100% - 16px);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
}

.collapsed .nav-item {
  justify-content: center;
  margin: 1px 8px;
  padding: 0;
}

.nav-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-text-secondary);
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
  height: 22px;
  width: 3px;
  background: var(--color-primary);
  border-radius: 0 3px 3px 0;
}

/* Icon wrapper */
.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.nav-item.router-link-active .nav-icon-wrap {
  background: var(--color-primary-light);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 13.5px;
  font-weight: 500;
  flex: 1;
  opacity: 1;
  transition: opacity var(--transition-base), width var(--transition-base);
  overflow: hidden;
}

.collapsed .nav-label {
  opacity: 0;
  width: 0;
}

.dropdown-chevron {
  flex-shrink: 0;
  color: var(--color-subtle);
  transition: transform var(--transition-base);
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
  gap: 1px;
  padding-left: 20px;
  padding-top: 2px;
  padding-bottom: 2px;
}

.sub-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  margin: 0 8px;
  border-radius: 8px;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.sub-nav-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-text-secondary);
}

.sub-nav-item.is-sub-active {
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-sidebar-active-bg);
}

.sub-nav-dot {
  width: 5px;
  height: 5px;
  min-width: 5px;
  border-radius: 50%;
  background: var(--color-subtle);
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.sub-nav-item.is-sub-active .sub-nav-dot {
  background: var(--color-primary);
  transform: scale(1.3);
}

/* ── Tooltip ────────────────────────────────────── */

.nav-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--color-text);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  z-index: 100;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.18);
}

.nav-tooltip::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: var(--color-text);
}

.collapsed .nav-item:hover .nav-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* ── User mini-profile ──────────────────────────── */

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--color-sidebar-divider);
  flex-shrink: 0;
  overflow: hidden;
  min-height: 60px;
}

.collapsed .sidebar-user {
  justify-content: center;
  padding: 12px 0;
}

.user-avatar-mini {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), #fb7185);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  white-space: nowrap;
  opacity: 1;
  transition: opacity var(--transition-base), width var(--transition-base);
}

.collapsed .user-info {
  opacity: 0;
  width: 0;
}

.user-role {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.user-email {
  font-size: 10.5px;
  color: var(--color-subtle);
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Collapse toggle ────────────────────────────── */

.collapse-toggle {
  position: absolute;
  bottom: 70px;
  right: -14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
  box-shadow: var(--shadow-soft);
  z-index: 50;
}

.collapse-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
}

.collapse-chevron {
  transition: transform var(--transition-smooth);
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
    transition: transform var(--transition-smooth);
    width: 264px !important;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
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
  }

  .logo-text {
    opacity: 1 !important;
    width: auto !important;
  }

  .sidebar-logo {
    justify-content: flex-start !important;
    padding: 18px 16px 16px !important;
  }

  .nav-item {
    justify-content: flex-start !important;
    padding: 0 12px !important;
  }

  .nav-tooltip {
    display: none;
  }

  .user-info {
    opacity: 1 !important;
    width: auto !important;
  }

  .sidebar-user {
    justify-content: flex-start !important;
    padding: 12px 14px !important;
  }
}
</style>
