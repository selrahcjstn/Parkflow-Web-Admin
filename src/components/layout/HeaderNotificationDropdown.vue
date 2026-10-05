<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminNotificationStore, type AdminNotification } from '@/stores/notification.store'

const router = useRouter()
const notifStore = useAdminNotificationStore()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const listContainerRef = ref<HTMLElement | null>(null)

// Pagination / Load More state
const PAGE_SIZE = 10
const visibleLimit = ref(PAGE_SIZE)
const isLoadingMore = ref(false)

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    visibleLimit.value = PAGE_SIZE
    notifStore.fetchPendingAdminNotifications()
  }
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

function parseDate(item: AdminNotification): Date {
  if (item.createdAt) {
    const d = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

interface NotificationGroup {
  label: string
  items: AdminNotification[]
}

const allSortedNotifications = computed(() => {
  return [...notifStore.notifications].sort((a, b) => {
    return parseDate(b).getTime() - parseDate(a).getTime()
  })
})

const paginatedNotifications = computed(() => {
  return allSortedNotifications.value.slice(0, visibleLimit.value)
})

const hasMoreNotifications = computed(() => {
  return allSortedNotifications.value.length > visibleLimit.value
})

const remainingCount = computed(() => {
  return Math.max(0, allSortedNotifications.value.length - visibleLimit.value)
})

function loadMore() {
  if (isLoadingMore.value || !hasMoreNotifications.value) return
  isLoadingMore.value = true
  setTimeout(() => {
    visibleLimit.value += PAGE_SIZE
    isLoadingMore.value = false
  }, 250)
}

function onListScroll(event: Event) {
  const el = event.target as HTMLElement
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    if (hasMoreNotifications.value && !isLoadingMore.value) {
      loadMore()
    }
  }
}

const groupedNotifications = computed<NotificationGroup[]>(() => {
  const list = paginatedNotifications.value
  if (list.length === 0) return []

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000

  const groupsMap = new Map<string, { label: string; order: number; items: AdminNotification[] }>()

  list.forEach((item) => {
    const date = parseDate(item)
    const itemDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

    let key: string
    let label: string
    let order: number

    if (itemDayStart === todayStart) {
      key = 'today'
      label = 'Today'
      order = 1
    } else if (itemDayStart === yesterdayStart) {
      key = 'yesterday'
      label = 'Yesterday'
      order = 2
    } else {
      const isCurrentYear = date.getFullYear() === now.getFullYear()
      const formatted = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
      })
      key = `date-${itemDayStart}`
      label = formatted
      order = 3 + (now.getTime() - itemDayStart)
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, { label, order, items: [] })
    }
    groupsMap.get(key)!.items.push(item)
  })

  return Array.from(groupsMap.values())
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ label: g.label, items: g.items }))
})

function formatRelativeTime(item: AdminNotification): string {
  const date = parseDate(item)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 45) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24 && date.getDate() === now.getDate()) return `${diffHour}h ago`

  const isYesterday = (diffHour < 48 && date.getDate() === now.getDate() - 1)
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (isYesterday) {
    return `Yesterday at ${timeStr}`
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`
}

function getTypeBg(type: string): string {
  switch (type) {
    case 'schedule_pending':
      return 'bg-blue-600 text-white'
    case 'vehicle_pending':
      return 'bg-emerald-600 text-white'
    case 'feedback_pending':
      return 'bg-amber-500 text-white'
    case 'reservation_pending':
      return 'bg-purple-600 text-white'
    case 'violation_issued':
      return 'bg-[#7B1113] text-white'
    case 'session_activity':
      return 'bg-sky-600 text-white'
    case 'payment_processed':
      return 'bg-teal-600 text-white'
    default:
      return 'bg-slate-700 text-white'
  }
}
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <!-- Notification Bell Button -->
    <button
      type="button"
      class="relative flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
      :class="{ 'ring-2 ring-[#7B1113]/20 border-[#7B1113] text-[#7B1113]': isOpen }"
      aria-label="Notifications"
      @click="toggleDropdown"
    >
      <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span
        v-if="notifStore.unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#7B1113] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow-sm leading-none pointer-events-none"
      >
        {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
      </span>
    </button>

    <!-- Facebook-Style Notification Dropdown Panel -->
    <Transition name="dropdown-slide">
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-2 w-[390px] sm:w-[410px] max-w-[calc(100vw-24px)] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white">
          <div class="flex items-center gap-2">
            <h3 class="text-base font-extrabold text-slate-900 tracking-tight m-0">Notifications</h3>
            <span
              v-if="notifStore.unreadCount > 0"
              class="text-[11px] font-bold text-[#7B1113] bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-full"
            >
              {{ notifStore.unreadCount }} new
            </span>
          </div>

          <button
            v-if="notifStore.unreadCount > 0"
            type="button"
            class="text-xs font-semibold text-[#7B1113] hover:text-[#b91c1c] transition-colors cursor-pointer bg-transparent border-none p-1"
            @click="notifStore.markAllAsRead"
          >
            Mark all as read
          </button>
        </div>

        <!-- Notification Feed with Infinite Scroll & Pagination (Grouped by Date) -->
        <div
          ref="listContainerRef"
          class="max-h-[480px] overflow-y-auto divide-y divide-slate-100/80"
          @scroll="onListScroll"
        >
          <!-- Empty State -->
          <div v-if="notifStore.notifications.length === 0" class="py-14 px-4 text-center flex flex-col items-center justify-center gap-2">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
              🔔
            </div>
            <p class="text-sm font-bold text-slate-800 m-0">No notifications yet</p>
            <span class="text-xs text-slate-400 max-w-xs">You're all caught up! New alerts and approval submissions will appear here.</span>
          </div>

          <!-- Grouped Items -->
          <div v-for="group in groupedNotifications" :key="group.label" class="flex flex-col">
            <!-- Section Header (Today, Yesterday, Date) -->
            <div class="px-4 py-2 bg-slate-50/95 border-b border-slate-100 text-[11.5px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
              {{ group.label }}
            </div>

            <!-- Items within Group -->
            <div
              v-for="item in group.items"
              :key="item.id"
              class="group relative flex items-start gap-3.5 px-4 py-3 transition-colors cursor-pointer"
              :class="item.isUnread ? 'bg-red-50/35 hover:bg-red-50/60' : 'bg-white hover:bg-slate-50'"
              @click="handleNotificationClick(item)"
            >
              <!-- Icon Circle Avatar -->
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5"
                :class="getTypeBg(item.type)"
              >
                <!-- Schedule Pending -->
                <svg v-if="item.type === 'schedule_pending'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>

                <!-- Vehicle Pending -->
                <svg v-else-if="item.type === 'vehicle_pending'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 16H9m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0M1 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 16l2.1-6.3A2 2 0 0 1 9 8.4h6a2 2 0 0 1 1.9 1.3L19 16"/>
                </svg>

                <!-- Feedback Inquiry -->
                <svg v-else-if="item.type === 'feedback_pending'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>

                <!-- Reservation Pending -->
                <svg v-else-if="item.type === 'reservation_pending'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>

                <!-- Violation Alert -->
                <svg v-else-if="item.type === 'violation_issued'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="10.29 3.86 1.82 18 12 21 22.18 18 13.71 3.86 10.29 3.86"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>

                <!-- Session Activity -->
                <svg v-else-if="item.type === 'session_activity'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>
                </svg>

                <!-- Payment Processed -->
                <svg v-else-if="item.type === 'payment_processed'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>

                <!-- Default / System Notice -->
                <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>

              <!-- Message Body -->
              <div class="flex-1 min-w-0 pr-1">
                <p class="text-xs text-slate-800 leading-snug m-0">
                  <span class="font-bold text-slate-900">{{ item.title }}</span>: {{ item.message }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-[11px]"
                    :class="item.isUnread ? 'text-[#7B1113] font-bold' : 'text-slate-500 font-medium'"
                  >
                    {{ formatRelativeTime(item) }}
                  </span>
                  <span v-if="item.actionLabel" class="text-[11px] font-semibold text-blue-600 hover:underline">
                    {{ item.actionLabel }} &rarr;
                  </span>
                </div>
              </div>

              <!-- Right Actions: Unread indicator -->
              <div class="flex items-center flex-shrink-0 self-center">
                <span
                  v-if="item.isUnread"
                  class="w-2.5 h-2.5 rounded-full bg-[#7B1113]"
                  title="Unread"
                ></span>
              </div>
            </div>
          </div>

          <!-- Pagination / Load More Footer inside Scroll -->
          <div v-if="hasMoreNotifications" class="p-3 text-center bg-slate-50/60">
            <button
              type="button"
              class="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              :class="{ 'opacity-60 pointer-events-none': isLoadingMore }"
              @click="loadMore"
            >
              <svg
                v-if="isLoadingMore"
                class="w-3.5 h-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
              </svg>
              <span>{{ isLoadingMore ? 'Loading earlier notifications...' : `Load earlier notifications (${remainingCount} more)` }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
