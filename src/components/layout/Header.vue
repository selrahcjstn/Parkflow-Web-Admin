<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const pageTitle = computed(() => {
  if (route.path === '/users') {
    const role = route.query.role as string
    if (role === 'Student') return 'Students'
    if (role === 'NAPA' || role === 'NonAcademicPersonnel') return 'NAP & Faculty'
    if (role === 'AdminStaff' || role === 'Guard' || role === 'Admin') return 'Staff & Admin'
    return 'Clients'
  }
  return (route.meta?.title as string) || (route.name as string) || 'Dashboard'
})

// Profile dropdown state
const dropdownOpen = ref(false)
const showLogoutConfirm = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// User info from localStorage
const userEmail = computed(() => localStorage.getItem('parkflow_user_email') || 'admin@parkflow.com')
const isSuperAdmin = computed(() => {
  const email = userEmail.value.toLowerCase().trim()
  return email.includes('superadmin') || email === 'superadmin@parkflow.com' || !email
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

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function closeDropdown() {
  dropdownOpen.value = false
}

function openLogoutConfirm() {
  dropdownOpen.value = false
  showLogoutConfirm.value = true
}

function cancelLogout() {
  showLogoutConfirm.value = false
}

function confirmLogout() {
  localStorage.removeItem('parkflow_token')
  localStorage.removeItem('parkflow_user_email')
  showLogoutConfirm.value = false
  router.push('/login')
}

function handleGoToSettings() {
  dropdownOpen.value = false
  router.push('/settings')
}

// Close dropdown on outside click
function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="17" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div class="header-title-wrap">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
    </div>

    <!-- Right side -->
    <div class="header-right">
      <!-- Notification bell -->
      <button class="header-icon-btn notification-btn" aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="notification-dot" />
      </button>

      <!-- Profile dropdown -->
      <div class="profile-dropdown-wrap" ref="dropdownRef">
        <button
          class="user-avatar"
          :class="{ active: dropdownOpen }"
          aria-label="User menu"
          @click="toggleDropdown"
        >
          <span class="avatar-initials">{{ userInitials }}</span>
          <svg class="avatar-chevron" :class="{ rotated: dropdownOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <!-- Dropdown panel -->
        <Transition name="dropdown-slide">
          <div v-if="dropdownOpen" class="dropdown-panel">
            <!-- User info header -->
            <div class="dropdown-header">
              <div class="dropdown-avatar">{{ userInitials }}</div>
              <div class="dropdown-user-info">
                <span class="dropdown-role">{{ isSuperAdmin ? 'Super Administrator' : 'Administrator' }}</span>
                <span class="dropdown-email">{{ userEmail }}</span>
              </div>
            </div>

            <div class="dropdown-divider" />

            <!-- Menu items -->
            <div class="dropdown-menu">
              <button class="dropdown-item" @click="handleGoToSettings">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Account Settings
              </button>

              <div class="dropdown-divider" />

              <button class="dropdown-item dropdown-item--danger" @click="openLogoutConfirm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>

  <!-- Logout Confirmation Dialog -->
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="showLogoutConfirm" class="logout-backdrop" @click.self="cancelLogout">
        <div class="logout-card">
          <!-- Icon -->
          <div class="logout-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <h2 class="logout-title">Sign out of ParkFlow?</h2>
          <p class="logout-desc">You will be returned to the login screen. Any unsaved changes will be lost.</p>
          <div class="logout-actions">
            <button class="logout-btn logout-btn--cancel" @click="cancelLogout">Cancel</button>
            <button class="logout-btn logout-btn--confirm" @click="confirmLogout">Yes, Sign Out</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  background: var(--color-header-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
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
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}

.hamburger-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.header-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.page-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1;
  letter-spacing: -0.2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}

.header-icon-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.notification-btn {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
}

/* ── Profile Dropdown Wrap ──────────────────────── */

.profile-dropdown-wrap {
  position: relative;
  margin-left: 6px;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 10px 0 4px;
  border-radius: 20px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
}

.user-avatar:hover,
.user-avatar.active {
  border-color: rgba(210, 39, 48, 0.35);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.08);
}

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #D22730, #A81D24);
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
  user-select: none;
  flex-shrink: 0;
}

.avatar-chevron {
  color: var(--color-muted);
  transition: transform var(--transition-base);
  flex-shrink: 0;
}

.avatar-chevron.rotated {
  transform: rotate(180deg);
}

/* ── Dropdown Panel ─────────────────────────────── */

.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 260px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-dropdown);
  overflow: hidden;
  z-index: 200;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.dropdown-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #D22730, #A81D24);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.dropdown-user-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.dropdown-role {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.dropdown-email {
  font-size: 11.5px;
  color: var(--color-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border-muted);
  margin: 0;
}

.dropdown-menu {
  padding: 6px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.dropdown-item--danger {
  color: var(--color-danger);
}

.dropdown-item--danger:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

/* ── Dropdown slide animation ───────────────────── */

.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: opacity 160ms ease, transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

/* ── Logout Confirmation ────────────────────────── */

.logout-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.logout-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 32px 28px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: var(--shadow-modal);
  animation: confirmPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes confirmPop {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.logout-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--color-danger-bg);
  color: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
}

.logout-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0 0 10px;
  letter-spacing: -0.2px;
}

.logout-desc {
  font-size: 13.5px;
  color: var(--color-muted);
  margin: 0 0 28px;
  line-height: 1.6;
}

.logout-actions {
  display: flex;
  gap: 10px;
}

.logout-btn {
  flex: 1;
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background var(--transition-base), box-shadow var(--transition-base);
}

.logout-btn--cancel {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.logout-btn--cancel:hover {
  background: var(--color-border);
}

.logout-btn--confirm {
  background: var(--color-danger);
  color: #fff;
}

.logout-btn--confirm:hover {
  background: #dc2626;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
}

/* ── Confirm fade animation ─────────────────────── */

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 200ms ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

/* ── Mobile ─────────────────────────────────────── */

@media (max-width: 1023px) {
  .hamburger-btn {
    display: flex;
  }
}
</style>
