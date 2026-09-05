<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminNotificationStore, type AdminNotification } from '@/stores/notification.store'

const router = useRouter()
const notifStore = useAdminNotificationStore()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const selectedFilter = ref<'all' | 'pending' | 'alerts' | 'activity'>('all')

const filteredNotifications = computed(() => {
  const list = notifStore.notifications
  if (selectedFilter.value === 'pending') {
    return list.filter((n) => n.type === 'schedule_pending' || n.type === 'vehicle_pending' || n.type === 'feedback_pending' || n.type === 'reservation_pending')
  }
  if (selectedFilter.value === 'alerts') {
    return list.filter((n) => n.type === 'violation_issued' || n.priority === 'high')
  }
  if (selectedFilter.value === 'activity') {
    return list.filter((n) => n.type === 'session_activity' || n.type === 'payment_processed' || n.type === 'system')
  }
  return list
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    notifStore.fetchPendingAdminNotifications()
  }
}

function closeDropdown() {
  isOpen.value = false
}

function handleNotificationClick(item: AdminNotification) {
  notifStore.markAsRead(item.id)
  isOpen.value = false
  if (item.actionUrl) {
    router.push(item.actionUrl)
  }
}

function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  notifStore.initSignalRConnection()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<template>
  <div class="notification-dropdown-wrap" ref="dropdownRef">
    <!-- Notification Bell Button -->
    <button
      class="header-icon-btn notification-btn"
      :class="{ active: isOpen }"
      aria-label="Notifications"
      @click="toggleDropdown"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="notifStore.unreadCount > 0" class="notification-badge">
        {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <Transition name="dropdown-slide">
      <div v-if="isOpen" class="notif-panel">
        <!-- Header -->
        <div class="notif-header">
          <div class="notif-header-title">
            <h3>Admin Notifications</h3>
            <span v-if="notifStore.unreadCount > 0" class="unread-pill">{{ notifStore.unreadCount }} New</span>
          </div>

          <button
            v-if="notifStore.unreadCount > 0"
            class="mark-all-btn"
            @click="notifStore.markAllAsRead"
          >
            Mark all read
          </button>
        </div>

        <!-- Filter Tabs -->
        <div class="notif-tabs">
          <button
            class="tab-btn"
            :class="{ active: selectedFilter === 'all' }"
            @click="selectedFilter = 'all'"
          >
            All ({{ notifStore.notifications.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: selectedFilter === 'pending' }"
            @click="selectedFilter = 'pending'"
          >
            Tasks
          </button>
          <button
            class="tab-btn"
            :class="{ active: selectedFilter === 'alerts' }"
            @click="selectedFilter = 'alerts'"
          >
            Alerts
          </button>
          <button
            class="tab-btn"
            :class="{ active: selectedFilter === 'activity' }"
            @click="selectedFilter = 'activity'"
          >
            Gate Logs
          </button>
        </div>

        <!-- Notification List -->
        <div class="notif-list">
          <div v-if="filteredNotifications.length === 0" class="empty-notif">
            <div class="empty-icon">🔔</div>
            <p>No admin notifications right now</p>
            <span class="empty-sub">All system verification tasks are clear!</span>
          </div>

          <div
            v-for="item in filteredNotifications"
            :key="item.id"
            class="notif-item"
            :class="{ unread: item.isUnread }"
            @click="handleNotificationClick(item)"
          >
            <!-- Type Icon Box -->
            <div class="item-icon-wrap" :class="`icon--${item.type}`">
              <!-- Schedule Pending -->
              <svg v-if="item.type === 'schedule_pending'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>

              <!-- Vehicle Pending -->
              <svg v-else-if="item.type === 'vehicle_pending'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 16H9m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0M1 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 16l2.1-6.3A2 2 0 0 1 9 8.4h6a2 2 0 0 1 1.9 1.3L19 16"/>
              </svg>

              <!-- Feedback Inquiry -->
              <svg v-else-if="item.type === 'feedback_pending'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>

              <!-- Reservation Pending -->
              <svg v-else-if="item.type === 'reservation_pending'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>

              <!-- Violation Alert -->
              <svg v-else-if="item.type === 'violation_issued'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="10.29 3.86 1.82 18 12 21 22.18 18 13.71 3.86 10.29 3.86"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>

              <!-- Gate Session Activity -->
              <svg v-else-if="item.type === 'session_activity'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>
              </svg>

              <!-- System Notice -->
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="item-content">
              <div class="item-top">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-time">{{ item.timestamp }}</span>
              </div>
              <p class="item-msg">{{ item.message }}</p>

              <div class="item-actions">
                <span class="action-btn">{{ item.actionLabel }} &rarr;</span>
                <span v-if="item.isUnread" class="unread-dot"></span>
              </div>
            </div>

            <!-- Delete / Dismiss button -->
            <button
              class="dismiss-btn"
              title="Dismiss"
              @click.stop="notifStore.removeNotification(item.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="notif-footer">
          <div class="signalr-status">
            <span class="status-dot" :class="{ live: notifStore.isSignalRConnected }"></span>
            {{ notifStore.isSignalRConnected ? 'Live Gate Hub Connected' : 'Syncing Admin Data' }}
          </div>

          <button class="refresh-btn" @click="notifStore.fetchPendingAdminNotifications">
            ↻ Refresh
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notification-dropdown-wrap {
  position: relative;
}

.notification-btn {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--color-primary, #d22730);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(210, 39, 48, 0.4);
}

.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
  z-index: 500;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 520px;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-muted, #f1f5f9);
}

.notif-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-header-title h3 {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.unread-pill {
  font-size: 11px;
  font-weight: 800;
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-primary, #d22730);
  padding: 2px 8px;
  border-radius: 10px;
}

.mark-all-btn {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary, #d22730);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.mark-all-btn:hover {
  background: var(--color-surface-muted, #f8fafc);
}

.notif-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-surface-muted, #f8fafc);
  border-bottom: 1px solid var(--color-border-muted, #f1f5f9);
}

.tab-btn {
  flex: 1;
  padding: 5px 8px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--color-surface, #ffffff);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.notif-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-notif {
  text-align: center;
  padding: 36px 16px;
  color: var(--color-muted);
}

.empty-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.empty-notif p {
  font-size: 13.5px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--color-text);
}

.empty-sub {
  font-size: 11.5px;
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background 0.2s ease;
}

.notif-item:hover {
  background: var(--color-surface-muted, #f8fafc);
}

.notif-item.unread {
  background: rgba(59, 130, 246, 0.04);
}

.item-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.icon--schedule_pending { background: #dbeafe; color: #2563eb; }
.icon--vehicle_pending { background: #d1fae5; color: #059669; }
.icon--feedback_pending { background: #fef3c7; color: #d97706; }
.icon--reservation_pending { background: #e0e7ff; color: #4f46e5; }
.icon--violation_issued { background: #ffe4e6; color: #e11d48; }
.icon--session_activity { background: #f3e8ff; color: #7c3aed; }
.icon--payment_processed { background: #ecfdf5; color: #10b981; }

.item-content {
  flex: 1;
  min-width: 0;
}

.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.item-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  font-size: 10.5px;
  color: var(--color-muted);
  flex-shrink: 0;
}

.item-msg {
  font-size: 11.5px;
  color: var(--color-muted);
  line-height: 1.4;
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.action-btn {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary, #d22730);
}

.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2563eb;
}

.dismiss-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.notif-item:hover .dismiss-btn {
  opacity: 0.8;
}

.dismiss-btn:hover {
  opacity: 1 !important;
  background: rgba(0, 0, 0, 0.08);
}

.notif-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-surface-muted, #f8fafc);
  border-top: 1px solid var(--color-border-muted, #f1f5f9);
  font-size: 11px;
}

.signalr-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
}

.status-dot.live {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.refresh-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn:hover {
  color: var(--color-text);
}

/* Slide Transition */
.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
</style>
