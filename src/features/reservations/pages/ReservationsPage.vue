<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import { useAdminNotificationStore } from '@/stores/notification.store'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const resColumns: TableColumn[] = [
  { key: 'reference', label: 'Reference #' },
  { key: 'creator', label: 'Creator of the reservation' },
  { key: 'schedule', label: 'Date & Time Slot' },
  { key: 'purpose', label: 'Purpose / Reason' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

const reservations = ref<ParkingReservationItem[]>([])
const isLoading = ref(true)
const fetchError = ref<string | null>(null)
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'done' | 'rejected'>('all')
const selectedDateFilter = ref<string>('')
const notificationToast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let pollTimer: number | null = null
const router = useRouter()

// Modal states
const reviewModalItem = ref<ParkingReservationItem | null>(null)
const reviewNotes = ref('')
const isSubmittingReview = ref(false)
const isCopied = ref(false)

function copyRef(refNum: string) {
  if (!refNum) return
  navigator.clipboard.writeText(refNum)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

function parseReservationEndDateTime(dateStr?: string, endTimeStr?: string): Date | null {
  if (!dateStr) return null
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  let year: number, month: number, day: number
  if (dateMatch) {
    year = parseInt(dateMatch[1]!, 10)
    month = parseInt(dateMatch[2]!, 10) - 1
    day = parseInt(dateMatch[3]!, 10)
  } else {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    year = d.getFullYear()
    month = d.getMonth()
    day = d.getDate()
  }

  let hours = 23
  let minutes = 59
  let seconds = 59

  if (endTimeStr) {
    const trimmed = endTimeStr.trim()
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1]!, 10)
      const m = parseInt(ampmMatch[2]!, 10)
      const s = ampmMatch[3] ? parseInt(ampmMatch[3]!, 10) : 0
      const isPm = ampmMatch[4]!.toUpperCase() === 'PM'
      if (isPm && h < 12) h += 12
      if (!isPm && h === 12) h = 0
      hours = h
      minutes = m
      seconds = s
    } else {
      const parts = trimmed.split(':')
      if (parts.length >= 2) {
        hours = parseInt(parts[0]!, 10) || 0
        minutes = parseInt(parts[1]!, 10) || 0
        seconds = parts[2] ? parseInt(parts[2]!, 10) || 0 : 0
      }
    }
  }

  return new Date(year, month, day, hours, minutes, seconds)
}

function isReservationDone(item: ParkingReservationItem): boolean {
  if (!item) return false
  const rawStatus = String(item.status ?? '').toLowerCase()
  if (rawStatus === 'done' || rawStatus === 'completed' || item.status === 4) return true
  // Rejected and Cancelled are explicit termination states, not concluded/done
  if (rawStatus === 'rejected' || rawStatus === 'cancelled' || item.status === 2 || item.status === 3) return false

  const endDateTime = parseReservationEndDateTime(item.reservationDate, item.endTime)
  if (!endDateTime) return false
  return new Date() > endDateTime
}

function getItemEffectiveStatus(item: ParkingReservationItem): 'Done' | 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' | 'Expired' {
  const raw = formatStatus(item.status)
  if (raw === 'Rejected' || raw === 'Cancelled') return raw as any
  if (isReservationDone(item)) {
    return raw === 'Pending' ? 'Expired' : 'Done'
  }
  return raw as any
}

function formatStatus(status: ReservationStatusType): string {
  if (status === 0 || String(status).toLowerCase() === 'pending') return 'Pending'
  if (status === 1 || String(status).toLowerCase() === 'approved') return 'Approved'
  if (status === 2 || String(status).toLowerCase() === 'rejected') return 'Rejected'
  if (status === 3 || String(status).toLowerCase() === 'cancelled') return 'Cancelled'
  if (status === 4 || String(status).toLowerCase() === 'done' || String(status).toLowerCase() === 'completed') return 'Done'
  if (String(status).toLowerCase() === 'expired') return 'Expired'
  return String(status || 'Pending')
}

function formatItemStatus(item: ParkingReservationItem): string {
  return getItemEffectiveStatus(item)
}

function getStatusKey(target: ReservationStatusType | ParkingReservationItem): string {
  if (target && typeof target === 'object' && 'reservationDate' in target) {
    return getItemEffectiveStatus(target as ParkingReservationItem).toLowerCase()
  }
  return formatStatus(target as ReservationStatusType).toLowerCase()
}

function navigateToPass(item: ParkingReservationItem | null) {
  if (!item) return
  if (getStatusKey(item) === 'done' || isReservationDone(item)) {
    showToast('Cannot open pass: this reservation schedule is already completed.', 'error')
    return
  }
  router.push(`/reservations/${item.id}/pass`)
}

function openQrPassModal(item: ParkingReservationItem) {
  navigateToPass(item)
}

// Create modal state
const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({
  reservationDate: new Date().toISOString().split('T')[0],
  startTime: '07:00',
  endTime: '23:59',
  reason: 'Campus Special Event / Administrative Schedule',
  type: 1, // 1 = Special (No Fees), 0 = Normal
  sendEmail: false,
  notifyEmail: ''
})

async function fetchReservations(silent = false) {
  if (!silent) {
    isLoading.value = true
    fetchError.value = null
  }
  try {
    const response = await api.get('/parking-reservations/admin/all')
    if (response.data && response.data.isSuccess && Array.isArray(response.data.data)) {
      reservations.value = response.data.data
      fetchError.value = null
    } else if (Array.isArray(response.data)) {
      reservations.value = response.data
      fetchError.value = null
    } else {
      reservations.value = []
    }
  } catch (error: any) {
    const status = error.response?.status
    const msg = error.response?.data?.message || error.message || 'Unknown error'
    const errText = status ? `API Error ${status}: ${msg}` : `Network Error: ${msg}`
    console.error('Reservations fetch error:', errText, error)
    // Always surface the error (even on silent poll) so it's never invisible
    fetchError.value = errText
    if (!silent) {
      reservations.value = []
    }
  } finally {
    if (!silent) {
      isLoading.value = false
    }
  }
}

let unsubscribeReservationUpdates: (() => void) | null = null
let unsubscribeApprovalUpdates: (() => void) | null = null

onMounted(() => {
  const notifStore = useAdminNotificationStore()
  notifStore.initSignalRConnection()

  const handleLiveUpdate = (data: any) => {
    console.log('[ReservationsPage] Live reservation update received via SignalR -> refreshing...', data)
    fetchReservations(true)
  }

  unsubscribeReservationUpdates = notifStore.onReservationUpdate(handleLiveUpdate)
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(handleLiveUpdate)

  fetchReservations()

  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchReservations(true)
    }
  }, 60000)
})

onUnmounted(() => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
  }
  if (unsubscribeReservationUpdates) {
    unsubscribeReservationUpdates()
  }
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

function showToast(message: string, type: 'success' | 'error' = 'success') {
  notificationToast.value = { message, type }
  setTimeout(() => {
    notificationToast.value = null
  }, 4000)
}

// Stats computations
const totalCount = computed(() => reservations.value.length)
const pendingCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'pending').length)
const approvedCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'approved').length)
const doneCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'done' || getStatusKey(r) === 'expired').length)
const rejectedCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'rejected' || getStatusKey(r) === 'cancelled').length)

// Filtered list
const filteredReservations = computed(() => {
  return reservations.value.filter(item => {
    const statusKey = getStatusKey(item)
    
    // Tab filter
    if (selectedStatusTab.value === 'pending' && statusKey !== 'pending') return false
    if (selectedStatusTab.value === 'approved' && statusKey !== 'approved') return false
    if (selectedStatusTab.value === 'done' && statusKey !== 'done' && statusKey !== 'expired') return false
    if (selectedStatusTab.value === 'rejected' && statusKey !== 'rejected' && statusKey !== 'cancelled') return false

    // Date filter
    if (selectedDateFilter.value) {
      const itemDate = item.reservationDate ? item.reservationDate.split('T')[0] : ''
      if (itemDate !== selectedDateFilter.value) return false
    }

    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchRef = (item.referenceNumber || '').toLowerCase().includes(q)
      const matchName = (item.userFullName || '').toLowerCase().includes(q)
      const matchEmail = (item.userEmail || '').toLowerCase().includes(q)
      const matchReason = (item.reason || '').toLowerCase().includes(q)
      if (!matchRef && !matchName && !matchEmail && !matchReason) return false
    }

    return true
  })
})

function formatReservationDate(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    let d: Date
    if (typeof dateStr === 'string') {
      const clean = dateStr.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        d = new Date(`${clean}T00:00:00Z`)
      } else {
        d = new Date(clean)
      }
    } else {
      d = dateStr
    }
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function formatTimeSlot(start: string, end: string): string {
  if (!start || !end) return 'All Day Pass'
  const formatTime = (t: string) => {
    if (!t) return ''
    if (/^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$/i.test(t.trim())) return t.trim()
    const parts = t.trim().split(':')
    let h = parseInt(parts[0] || '0', 10)
    const m = parts[1] || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
  }
  return `${formatTime(start)} - ${formatTime(end)}`
}

function getInitials(name: string): string {
  if (!name) return 'PF'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)'
]

function getAvatarGradient(index: number): string {
  return avatarGradients[index % avatarGradients.length]!
}

function getNotifyEmailFromNotes(notes?: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/\[NotifyEmail:(.*?)\]/)
  return (match && match[1]) ? match[1].trim() : null
}

function getDisplayEmail(item: ParkingReservationItem): string {
  const notify = getNotifyEmailFromNotes(item.adminNotes)
  if (notify) return notify
  return item.userEmail || 'N/A'
}

function openReviewModal(item: ParkingReservationItem) {
  reviewModalItem.value = item
  reviewNotes.value = item.adminNotes || ''
}

function closeReviewModal() {
  reviewModalItem.value = null
  reviewNotes.value = ''
}

async function handleApprove(item: ParkingReservationItem) {
  isSubmittingReview.value = true
  try {
    await api.post(`/parking-reservations/${item.id}/approve`, { notes: reviewNotes.value })
    item.status = 'Approved'
    item.adminNotes = reviewNotes.value
    showToast(`Reservation ${item.referenceNumber} approved successfully.`)
    closeReviewModal()
  } catch (error: any) {
    showToast(`Failed to approve reservation: ${error.response?.data?.message || error.message}`, 'error')
  } finally {
    isSubmittingReview.value = false
  }
}

async function handleReject(item: ParkingReservationItem) {
  isSubmittingReview.value = true
  try {
    await api.post(`/parking-reservations/${item.id}/reject`, { notes: reviewNotes.value })
    item.status = 'Rejected'
    item.adminNotes = reviewNotes.value
    showToast(`Reservation ${item.referenceNumber} rejected.`, 'error')
    closeReviewModal()
  } catch (error: any) {
    showToast(`Failed to reject reservation: ${error.response?.data?.message || error.message}`, 'error')
  } finally {
    isSubmittingReview.value = false
  }
}

async function handleCreateReservation() {
  if (!createForm.value.reservationDate) {
    showToast('Please select a reservation date.', 'error')
    return
  }
  if (createForm.value.sendEmail && !createForm.value.notifyEmail.trim()) {
    showToast('Please enter a notification email address.', 'error')
    return
  }
  isCreating.value = true
  try {
    const endTimeVal = createForm.value.type === 1 ? '23:59:59' : (createForm.value.endTime.includes(':') && createForm.value.endTime.split(':').length === 2 ? createForm.value.endTime + ':00' : createForm.value.endTime)
    const payload: Record<string, any> = {
      reservationDate: createForm.value.reservationDate,
      startTime: createForm.value.startTime.includes(':') && createForm.value.startTime.split(':').length === 2 ? createForm.value.startTime + ':00' : createForm.value.startTime,
      endTime: endTimeVal,
      reason: createForm.value.reason,
      type: createForm.value.type
    }
    if (createForm.value.sendEmail && createForm.value.notifyEmail.trim()) {
      payload.notifyEmail = createForm.value.notifyEmail.trim()
    }
    const response = await api.post('/parking-reservations', payload)
    if (response.data && response.data.data) {
      reservations.value.unshift(response.data.data)
    } else {
      await fetchReservations()
    }
    const emailMsg = createForm.value.sendEmail ? ' Notification email sent.' : ''
    showToast('Schedule reservation created & reserved successfully.' + emailMsg)
    showCreateModal.value = false
    // reset form
    createForm.value = {
      reservationDate: new Date().toISOString().split('T')[0],
      startTime: '07:00',
      endTime: '23:59',
      reason: 'Campus Special Event / Administrative Schedule',
      type: 1,
      sendEmail: false,
      notifyEmail: ''
    }
  } catch (error: any) {
    showToast('Failed to create reservation: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="reservations-page">
    <!-- API Error Banner -->
    <div v-if="fetchError" class="error-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <strong>Failed to load reservations</strong>
        <span style="margin-left: 8px; opacity: 0.85;">{{ fetchError }}</span>
      </div>
      <button class="error-retry-btn" @click="fetchReservations()">Retry</button>
    </div>
    <!-- Notification Toast -->
    <Transition name="toast">
      <div v-if="notificationToast" class="toast-notification" :class="`toast--${notificationToast.type}`">
        <svg v-if="notificationToast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>{{ notificationToast.message }}</span>
      </div>
    </Transition>

    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header__left">
        <h1 class="page-title">Parking Reservations & Schedule Management</h1>
        <p class="page-subtitle">
          Review user parking schedule requests, approve special date passes, and reserve parking slots for campus events.
        </p>
      </div>
      <div class="page-header__right">
        <button class="btn-primary" @click="showCreateModal = true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Reserve Special Schedule
        </button>
      </div>
    </div>

    <!-- Stats Cards Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__left">
          <span class="stat-card__value">{{ totalCount }}</span>
          <span class="stat-card__title">Total Requests</span>
        </div>
        <div class="stat-card__icon" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__left">
          <span class="stat-card__value text-amber">{{ pendingCount }}</span>
          <span class="stat-card__title">Pending Review</span>
        </div>
        <div class="stat-card__icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__left">
          <span class="stat-card__value text-emerald">{{ approvedCount }}</span>
          <span class="stat-card__title">Active Passes</span>
        </div>
        <div class="stat-card__icon" style="background: linear-gradient(135deg, #10b981, #059669);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__left">
          <span class="stat-card__value text-slate-500 dark:text-slate-300">{{ doneCount }}</span>
          <span class="stat-card__title">Done / Concluded</span>
        </div>
        <div class="stat-card__icon" style="background: linear-gradient(135deg, #64748b, #475569);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__left">
          <span class="stat-card__value text-rose">{{ rejectedCount }}</span>
          <span class="stat-card__title">Declined / Cancelled</span>
        </div>
        <div class="stat-card__icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Controls Bar: Filter Tabs + Search + Date Filter -->
    <div class="controls-card">
      <!-- Status Filter Tabs -->
      <div class="filter-tabs">
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': selectedStatusTab === 'all' }"
          @click="selectedStatusTab = 'all'"
        >
          All Requests ({{ totalCount }})
        </button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': selectedStatusTab === 'pending' }"
          @click="selectedStatusTab = 'pending'"
        >
          Pending ({{ pendingCount }})
        </button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': selectedStatusTab === 'approved' }"
          @click="selectedStatusTab = 'approved'"
        >
          Active Passes ({{ approvedCount }})
        </button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': selectedStatusTab === 'done' }"
          @click="selectedStatusTab = 'done'"
        >
          Done ({{ doneCount }})
        </button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn--active': selectedStatusTab === 'rejected' }"
          @click="selectedStatusTab = 'rejected'"
        >
          Declined / Cancelled ({{ rejectedCount }})
        </button>
      </div>

      <!-- Right Inputs -->
      <div class="filter-inputs">
        <!-- Date Picker Filter -->
        <div class="date-filter-wrap">
          <input
            type="date"
            v-model="selectedDateFilter"
            class="input-date"
            title="Filter by reservation date"
          />
          <button v-if="selectedDateFilter" class="clear-date-btn" @click="selectedDateFilter = ''" title="Clear date filter">
            &times;
          </button>
        </div>

        <!-- Search input -->
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search ref #, applicant, email..."
            class="input-search"
          />
        </div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container p-0 overflow-hidden">
      <UiTable
        :columns="resColumns"
        :data="filteredReservations"
        :is-loading="isLoading"
        empty-text="No schedule reservations found matching your criteria."
      >
        <template #cell-reference="{ item }">
          <div class="flex items-center gap-2">
            <span class="ref-badge monospace font-mono font-bold text-slate-900 dark:text-white text-xs">{{ item.referenceNumber }}</span>
            <span v-if="item.type === 1 || item.type === 'Special'" class="special-pass-chip text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded">
              ★ Special Pass
            </span>
          </div>
        </template>

        <template #cell-creator="{ item, index }">
          <div class="applicant-cell flex items-center gap-3">
            <div class="avatar-circle w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs" :style="{ background: getAvatarGradient(index) }">
              {{ getInitials(item.userFullName) }}
            </div>
            <div class="applicant-meta flex flex-col">
              <span class="applicant-name font-semibold text-slate-900 dark:text-white text-xs">{{ item.userFullName || 'Campus User' }}</span>
              <span class="applicant-email text-[11px] text-slate-500 dark:text-slate-400">{{ item.userEmail || 'N/A' }}</span>
              <span class="applicant-receiver-badge text-[10px] text-blue-600 dark:text-blue-400 font-medium" v-if="getNotifyEmailFromNotes(item.adminNotes)">
                Recipient: {{ getNotifyEmailFromNotes(item.adminNotes) }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-schedule="{ item }">
          <div class="schedule-meta flex flex-col">
            <span class="date-text font-semibold text-slate-900 dark:text-white text-xs">
              {{ formatReservationDate(item.reservationDate) }}
            </span>
            <span class="time-text text-[11px] text-slate-500 dark:text-slate-400">
              {{ formatTimeSlot(item.startTime, item.endTime) }}
            </span>
          </div>
        </template>

        <template #cell-purpose="{ item }">
          <span class="reason-text text-xs text-slate-700 dark:text-slate-300" :title="item.reason">{{ item.reason }}</span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText
            :variant="
              getStatusKey(item) === 'approved'
                ? 'success'
                : getStatusKey(item) === 'done' || getStatusKey(item) === 'expired'
                ? 'neutral'
                : getStatusKey(item) === 'rejected' || getStatusKey(item) === 'cancelled'
                ? 'danger'
                : 'warning'
            "
            size="xs"
          >
            {{ formatItemStatus(item) }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="action-buttons flex items-center justify-end gap-1.5" @click.stop>
            <button
              v-if="getStatusKey(item) === 'pending'"
              class="btn-action btn-approve px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors cursor-pointer border-none"
              @click="handleApprove(item)"
              title="Approve Reservation"
            >
              Approve
            </button>
            <button
              v-if="getStatusKey(item) === 'pending'"
              class="btn-action btn-reject px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200/80"
              @click="handleReject(item)"
              title="Decline Reservation"
            >
              Decline
            </button>
            <button
              v-if="getStatusKey(item) === 'approved'"
              class="btn-action btn-qr-pass px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200/80"
              @click="navigateToPass(item)"
              title="View Official QR Pass"
            >
              QR Pass
            </button>
            <span
              v-if="getStatusKey(item) === 'done'"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 px-2 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800/80"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Concluded
            </span>
            <span
              v-else-if="getStatusKey(item) === 'expired'"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 px-2 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800/80"
            >
              Expired
            </span>
            <button
              class="btn-action btn-review px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer border-none"
              @click="openReviewModal(item)"
              title="Inspect Details"
            >
              Inspect
            </button>
          </div>
        </template>
      </UiTable>
    </div>

    <!-- REVIEW / INSPECT MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="reviewModalItem" class="modal-backdrop" @click="closeReviewModal">
          <div class="modal-card inspect-modal-card" @click.stop>
            
            <!-- Modern Accent Bar with BulSU Red / Status Glow -->
            <div
              class="inspect-top-glow"
              :class="`inspect-top-glow--${getStatusKey(reviewModalItem)}`"
            ></div>

            <!-- Modern Header with Reference, Type & Status -->
            <div class="inspect-header">
              <div class="inspect-header-left">
                <div class="inspect-tag-cluster">
                  <div class="inspect-type-pill" :class="{ 'inspect-type-pill--special': reviewModalItem.type === 1 || reviewModalItem.type === 'Special' }">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4z"/>
                    </svg>
                    <span>{{ (reviewModalItem.type === 1 || reviewModalItem.type === 'Special') ? 'Special Campus Pass' : 'Standard Reservation' }}</span>
                  </div>
                  <span v-if="getStatusKey(reviewModalItem) === 'done'" class="inspect-done-pill">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Schedule Concluded
                  </span>
                  <span v-else-if="getStatusKey(reviewModalItem) === 'expired'" class="inspect-done-pill">
                    Expired Request
                  </span>
                </div>
                <div class="inspect-ref-row">
                  <h2 class="inspect-title">{{ reviewModalItem.referenceNumber }}</h2>
                  <button class="inspect-copy-btn" @click="copyRef(reviewModalItem.referenceNumber)" title="Copy Reference Number">
                    <svg v-if="!isCopied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
                  </button>
                </div>
              </div>
              <div class="inspect-header-right">
                <span class="status-badge status-badge--large" :class="`status-badge--${getStatusKey(reviewModalItem)}`">
                  <span class="status-dot"></span>
                  {{ formatItemStatus(reviewModalItem) }}
                </span>
                <button class="close-btn inspect-close-btn" @click="closeReviewModal" title="Close">&times;</button>
              </div>
            </div>

            <!-- Status Context Banner -->
            <div
              class="inspect-context-banner"
              :class="`inspect-context-banner--${getStatusKey(reviewModalItem)}`"
            >
              <div class="inspect-context-icon">
                <svg v-if="getStatusKey(reviewModalItem) === 'done'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <svg v-else-if="getStatusKey(reviewModalItem) === 'approved'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <svg v-else-if="getStatusKey(reviewModalItem) === 'pending'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div class="inspect-context-text">
                <span class="inspect-context-title">
                  {{
                    getStatusKey(reviewModalItem) === 'done'
                      ? 'Reservation Schedule Completed'
                      : getStatusKey(reviewModalItem) === 'expired'
                      ? 'Reservation Schedule Expired'
                      : getStatusKey(reviewModalItem) === 'approved'
                      ? 'Active Approved Reservation'
                      : getStatusKey(reviewModalItem) === 'pending'
                      ? 'Awaiting Administrative Review'
                      : 'Reservation Request Declined / Cancelled'
                  }}
                </span>
                <span class="inspect-context-desc">
                  {{
                    getStatusKey(reviewModalItem) === 'done'
                      ? 'This reservation time window has elapsed. The digital QR pass is inactive and entry privileges are closed.'
                      : getStatusKey(reviewModalItem) === 'expired'
                      ? 'The requested date and time has passed without approval.'
                      : getStatusKey(reviewModalItem) === 'approved'
                      ? 'Pass is active and verified for entry on the scheduled date and time window.'
                      : getStatusKey(reviewModalItem) === 'pending'
                      ? 'Review the requested schedule, applicant information, and purpose before approving or declining.'
                      : 'This schedule request is not permitted for campus gate entry.'
                  }}
                </span>
              </div>
            </div>

            <!-- Modal Body with Structured Bento Cards -->
            <div class="inspect-body">
              
              <!-- 1. Applicant & Vehicle Bento Card -->
              <div class="inspect-card inspect-applicant-card">
                <div class="inspect-card-header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Applicant & Access Details</span>
                </div>
                
                <div class="inspect-user-row">
                  <div class="inspect-avatar" :style="{ background: getAvatarGradient(0) }">
                    {{ getInitials(reviewModalItem.userFullName || 'Campus User') }}
                  </div>
                  <div class="inspect-user-details">
                    <div class="flex items-center gap-2">
                      <h3 class="inspect-user-name">{{ reviewModalItem.userFullName || 'Campus User' }}</h3>
                      <span class="inspect-role-pill">Applicant</span>
                    </div>
                    <p class="inspect-user-email">{{ reviewModalItem.userEmail || 'N/A' }}</p>
                  </div>

                  <!-- Designated Vehicle badge on right -->
                  <div v-if="reviewModalItem.plateNumber" class="inspect-vehicle-chip">
                    <span class="inspect-vehicle-chip-label">DESIGNATED VEHICLE</span>
                    <span class="inspect-vehicle-chip-plate monospace">{{ reviewModalItem.plateNumber }}</span>
                    <span v-if="reviewModalItem.brand" class="inspect-vehicle-chip-brand">{{ reviewModalItem.brand }}</span>
                  </div>
                  <div v-else class="inspect-vehicle-chip inspect-vehicle-chip--none">
                    <span class="inspect-vehicle-chip-label">DESIGNATED VEHICLE</span>
                    <span class="inspect-vehicle-chip-plate">Unassigned / Event</span>
                  </div>
                </div>

                <!-- Recipient Alert Banner if Special pass has dedicated receiver email -->
                <div v-if="getNotifyEmailFromNotes(reviewModalItem.adminNotes)" class="inspect-notify-card">
                  <div class="inspect-notify-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div class="inspect-notify-text">
                    <span class="inspect-notify-label">Direct Notification Email</span>
                    <span class="inspect-notify-val">{{ getNotifyEmailFromNotes(reviewModalItem.adminNotes) }}</span>
                  </div>
                </div>
              </div>

              <!-- 2. Schedule & Details Grid Card -->
              <div class="inspect-card">
                <div class="inspect-card-header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Requested Schedule & Purpose</span>
                </div>
                
                <div class="inspect-grid">
                  <div class="inspect-grid-item">
                    <span class="inspect-grid-label">Reservation Date</span>
                    <div class="inspect-grid-val text-amber font-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                      </svg>
                      {{ formatReservationDate(reviewModalItem.reservationDate) }}
                    </div>
                  </div>

                  <div class="inspect-grid-item">
                    <span class="inspect-grid-label">Time Window</span>
                    <div class="inspect-grid-val text-primary font-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {{ formatTimeSlot(reviewModalItem.startTime, reviewModalItem.endTime) }}
                    </div>
                  </div>

                  <div class="inspect-grid-item inspect-grid-item--full">
                    <span class="inspect-grid-label">Purpose / Stated Reason</span>
                    <div class="inspect-reason-box">
                      <svg class="inspect-quote-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                      </svg>
                      <span>{{ reviewModalItem.reason }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. Admin Remarks Section -->
              <div class="inspect-card">
                <div class="inspect-card-header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>Admin Review Remarks / Notes</span>
                </div>
                <textarea
                  v-model="reviewNotes"
                  rows="2"
                  class="inspect-textarea"
                  :placeholder="getStatusKey(reviewModalItem) === 'done' ? 'No remarks recorded for this completed reservation.' : 'Enter remarks, instructions, or decline rationale (optional)...'"
                  :disabled="getStatusKey(reviewModalItem) === 'done' || getStatusKey(reviewModalItem) === 'expired'"
                ></textarea>
              </div>

            </div>

            <!-- Modal Footer Actions -->
            <div class="inspect-footer">
              <button class="btn-inspect-close" @click="closeReviewModal">Close</button>
              
              <div class="inspect-footer-actions">
                <!-- If Done: show completed notice, NO QR pass button! -->
                <div
                  v-if="getStatusKey(reviewModalItem) === 'done' || getStatusKey(reviewModalItem) === 'expired'"
                  class="inspect-done-status-badge"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                  <span>Reservation Concluded • Pass Inactive</span>
                </div>

                <!-- If Approved & Not Done: show View QR Pass button -->
                <button
                  v-else-if="getStatusKey(reviewModalItem) === 'approved'"
                  class="btn-inspect-qr"
                  @click="navigateToPass(reviewModalItem); closeReviewModal();"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  View QR Pass
                </button>

                <!-- If Pending: show Decline and Approve buttons -->
                <template v-else-if="getStatusKey(reviewModalItem) === 'pending'">
                  <button
                    class="btn-inspect-decline"
                    :disabled="isSubmittingReview"
                    @click="handleReject(reviewModalItem)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Decline Request
                  </button>
                  <button
                    class="btn-inspect-approve"
                    :disabled="isSubmittingReview"
                    @click="handleApprove(reviewModalItem)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Approve Pass
                  </button>
                </template>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- CREATE SPECIAL SCHEDULE RESERVATION MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateModal" class="modal-backdrop" @click="showCreateModal = false">
          <div class="modal-card" @click.stop style="max-width: 520px;">
            <div class="modal-header">
              <div>
                <span class="modal-tag">System Schedule Reserve</span>
                <h2 class="modal-title">Reserve Special Schedule</h2>
              </div>
              <button class="close-btn" @click="showCreateModal = false">&times;</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Reservation Date</label>
                <input
                  type="date"
                  v-model="createForm.reservationDate"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Reservation Type</label>
                <select v-model.number="createForm.type" class="form-select">
                  <option :value="1">Special Pass (Admin Pass)</option>
                  <option :value="0">Normal (Standard Pass)</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Start Time</label>
                  <input
                    type="time"
                    v-model="createForm.startTime"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">End Time</label>
                  <input
                    type="time"
                    v-model="createForm.endTime"
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Event / Pass Purpose</label>
                <textarea
                  v-model="createForm.reason"
                  rows="3"
                  class="form-textarea"
                  placeholder="Describe the campus event or special pass reason..."
                ></textarea>
              </div>

              <!-- Email Notification Toggle -->
              <div class="notify-toggle-section">
                <div class="notify-toggle-row">
                  <div class="notify-toggle-info">
                    <span class="notify-toggle-label">Send Email Notification</span>
                    <span class="notify-toggle-desc">Notify a recipient about this special schedule via email</span>
                  </div>
                  <button
                    type="button"
                    class="toggle-switch"
                    :class="{ 'toggle-switch--on': createForm.sendEmail }"
                    @click="createForm.sendEmail = !createForm.sendEmail"
                    :aria-checked="createForm.sendEmail"
                    role="switch"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>

                <Transition name="slide-down">
                  <div v-if="createForm.sendEmail" class="notify-email-field">
                    <label class="form-label">Recipient Email Address</label>
                    <input
                      v-model="createForm.notifyEmail"
                      type="email"
                      class="form-input"
                      placeholder="e.g. student@university.edu"
                      autocomplete="off"
                    />
                    <p class="notify-hint">A special schedule notice will be sent to this email after reservation is created.</p>
                  </div>
                </Transition>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-modal-cancel" @click="showCreateModal = false">Cancel</button>
              <button
                class="btn-modal-submit"
                :disabled="isCreating"
                @click="handleCreateReservation"
              >
                <svg v-if="!isCreating" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>{{ isCreating ? 'Reserving Schedule...' : 'Confirm & Reserve' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.reservations-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Toast */
.toast-notification {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
}
.toast--success {
  background: rgba(16, 185, 129, 0.95);
  color: #ffffff;
}
.toast--error {
  background: rgba(239, 68, 68, 0.95);
  color: #ffffff;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 10px;
  color: #ef4444;
  font-size: 13px;
}
.error-retry-btn {
  margin-left: auto;
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.error-retry-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  background: var(--color-primary);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 150ms ease;
}
.btn-primary:hover {
  opacity: 0.9;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card, 12px);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  display: block;
}
.text-amber { color: #f59e0b; }
.text-emerald { color: #10b981; }
.text-rose { color: #ef4444; }

.stat-card__title {
  font-size: 13px;
  color: var(--color-muted);
  font-weight: 600;
}

.stat-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

/* Controls */
.controls-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 6px;
}

.tab-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}
.tab-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}
.tab-btn--active {
  background: rgba(220, 38, 38, 0.12);
  color: var(--color-primary);
  border-color: rgba(220, 38, 38, 0.3);
}

.filter-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-filter-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-date {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 12px;
  outline: none;
}
.clear-date-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 16px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-muted);
}
.input-search {
  padding: 8px 12px 8px 34px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 13px;
  width: 240px;
  outline: none;
}
.input-search:focus {
  border-color: var(--color-primary);
}

/* Table */
.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 12px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
  vertical-align: middle;
}

.data-table tbody tr {
  cursor: pointer;
  transition: background 150ms ease;
}

.data-table tbody tr:hover {
  background: var(--color-surface-lighter, #f8f9fb);
}

.ref-badge {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 700;
  white-space: nowrap;
  display: inline-block;
}

.monospace {
  font-family: monospace;
}

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 800;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.applicant-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.applicant-name {
  font-weight: 700;
  color: var(--color-text);
  font-size: 13px;
}
.applicant-email {
  font-size: 11px;
  color: var(--color-muted);
  word-break: break-all;
}

.schedule-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  white-space: nowrap;
}
.date-text {
  font-weight: 700;
  color: var(--color-text);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.time-text {
  font-size: 11px;
  color: var(--color-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.reason-text {
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  display: block;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.status-badge--pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.status-badge--approved {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.status-badge--rejected,
.status-badge--cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
  white-space: nowrap;
}
.btn-action {
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity 150ms ease;
}
.btn-approve {
  background: #10b981;
  color: #ffffff;
}
.btn-reject {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
}
.btn-review {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.empty-cell {
  padding: 48px 24px;
  text-align: center;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  margin-bottom: 4px;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 600px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 18px 24px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
  margin: 2px 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 4px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.meta-key {
  color: var(--color-muted);
}
.meta-val {
  font-weight: 700;
  color: var(--color-text);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
}
.form-input, .form-textarea {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
}
.form-input:focus, .form-textarea:focus {
  border-color: var(--color-primary);
}

/* Email Notification Toggle */
.notify-toggle-section {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--color-surface-muted);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.notify-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.notify-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.notify-toggle-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}
.notify-toggle-desc {
  font-size: 12px;
  color: var(--color-muted);
}
.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: var(--color-border);
  border: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 200ms ease;
  padding: 0;
}
.toggle-switch--on {
  background: var(--color-primary);
}
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: transform 200ms ease;
  display: block;
}
.toggle-switch--on .toggle-knob {
  transform: translateX(20px);
}
.notify-email-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.notify-hint {
  font-size: 11px;
  color: var(--color-muted);
  margin: 0;
}

/* slide-down transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 200ms ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 120px;
}

.applicant-receiver-badge {
  font-size: 11px;
  color: #6366f1;
  font-weight: 600;
  display: block;
  margin-top: 2px;
}

.modal-footer {
  padding: 16px 24px;
  background: var(--color-surface-muted);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-secondary {
  padding: 10px 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

/* Polished Modal Action Buttons */
.btn-modal-cancel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-cancel:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border-color: var(--color-muted);
}

.btn-modal-qr {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #6366f1;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-qr:hover {
  background: #6366f1;
  color: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.btn-modal-decline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-decline:hover:not(:disabled) {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
  transform: translateY(-1px);
}

.btn-modal-decline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-modal-approve {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-approve:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45);
  transform: translateY(-1px);
}

.btn-modal-approve:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-modal-outline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-outline:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-muted);
  transform: translateY(-1px);
}

.btn-modal-print {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-print:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
  transform: translateY(-1px);
}

.btn-modal-submit {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary, #d22730) 0%, #b01e26 100%);
  border: none;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(210, 39, 48, 0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-modal-submit:hover:not(:disabled) {
  box-shadow: 0 6px 18px rgba(210, 39, 48, 0.45);
  transform: translateY(-1px);
}

.btn-modal-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-right {
  text-align: right;
}

/* QR Pass Styling */
.btn-qr-pass {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #6366f1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}
.btn-qr-pass:hover {
  background: #6366f1;
  border-color: #6366f1;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* Helper Typography & Text Utilities */
.font-normal { font-weight: 400; }
.font-500 { font-weight: 500; }
.font-600 { font-weight: 600; }
.font-700 { font-weight: 700; }
.text-primary { color: var(--color-primary, #d22730); }
.text-muted { color: var(--color-muted, #64748b); }
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.special-pass-chip {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 6px;
  border-radius: 6px;
  margin-top: 4px;
  width: fit-content;
}

/* ==========================================================================
   REVIEW / INSPECT MODAL (BulSU Red Accent & Dark Slate Modern Structure)
   ========================================================================== */
.inspect-modal-card {
  max-width: 660px !important;
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 65px -15px rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  position: relative;
}

.inspect-top-glow {
  height: 4px;
  width: 100%;
  background: linear-gradient(90deg, #d22730 0%, #ef4444 50%, #f59e0b 100%);
}

.inspect-top-glow--done,
.inspect-top-glow--expired {
  background: linear-gradient(90deg, #64748b 0%, #94a3b8 100%);
}

.inspect-top-glow--approved {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.inspect-top-glow--pending {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.inspect-top-glow--rejected,
.inspect-top-glow--cancelled {
  background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
}

.inspect-header {
  padding: 18px 24px 14px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.inspect-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inspect-tag-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.inspect-type-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 3px 10px;
  border-radius: 20px;
  width: fit-content;
}

.inspect-type-pill--special {
  color: var(--color-primary, #d22730);
  background: rgba(210, 39, 48, 0.08);
  border-color: rgba(210, 39, 48, 0.25);
}

.inspect-done-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  background: rgba(100, 116, 139, 0.12);
  border: 1px solid rgba(100, 116, 139, 0.25);
  padding: 3px 10px;
  border-radius: 20px;
}

.inspect-ref-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.inspect-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.inspect-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  cursor: pointer;
  transition: all 150ms ease;
}

.inspect-copy-btn:hover {
  color: var(--color-text);
  border-color: var(--color-muted);
  transform: translateY(-1px);
}

.inspect-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge--large {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge--done,
.status-badge--expired {
  background: rgba(100, 116, 139, 0.15);
  color: #64748b;
}

.inspect-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-muted);
  font-size: 22px;
  cursor: pointer;
  transition: all 150ms ease;
  line-height: 1;
}

.inspect-close-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

/* Status Context Banner */
.inspect-context-banner {
  padding: 10px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.inspect-context-banner--done,
.inspect-context-banner--expired {
  background: rgba(100, 116, 139, 0.08);
  border-bottom-color: rgba(100, 116, 139, 0.2);
}
.inspect-context-banner--done .inspect-context-icon,
.inspect-context-banner--done .inspect-context-title,
.inspect-context-banner--expired .inspect-context-icon,
.inspect-context-banner--expired .inspect-context-title {
  color: #64748b;
}

.inspect-context-banner--approved {
  background: rgba(16, 185, 129, 0.08);
  border-bottom-color: rgba(16, 185, 129, 0.2);
}
.inspect-context-banner--approved .inspect-context-icon,
.inspect-context-banner--approved .inspect-context-title {
  color: #10b981;
}

.inspect-context-banner--pending {
  background: rgba(245, 158, 11, 0.08);
  border-bottom-color: rgba(245, 158, 11, 0.2);
}
.inspect-context-banner--pending .inspect-context-icon,
.inspect-context-banner--pending .inspect-context-title {
  color: #f59e0b;
}

.inspect-context-banner--rejected,
.inspect-context-banner--cancelled {
  background: rgba(239, 68, 68, 0.08);
  border-bottom-color: rgba(239, 68, 68, 0.2);
}
.inspect-context-banner--rejected .inspect-context-icon,
.inspect-context-banner--rejected .inspect-context-title,
.inspect-context-banner--cancelled .inspect-context-icon,
.inspect-context-banner--cancelled .inspect-context-title {
  color: #ef4444;
}

.inspect-context-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.inspect-context-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.inspect-context-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.inspect-context-desc {
  font-size: 11.5px;
  color: var(--color-muted);
  line-height: 1.4;
}

.inspect-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(85vh - 160px);
  overflow-y: auto;
}

.inspect-card {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inspect-applicant-card {
  position: relative;
}

.inspect-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-muted);
}

.inspect-user-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.inspect-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #ffffff;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.inspect-user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.inspect-user-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.inspect-role-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.inspect-vehicle-chip {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.inspect-vehicle-chip-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--color-muted);
  letter-spacing: 0.5px;
}

.inspect-vehicle-chip-plate {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text);
}

.inspect-vehicle-chip-brand {
  font-size: 11px;
  color: var(--color-muted);
  font-weight: 500;
}

.inspect-vehicle-chip--none {
  opacity: 0.7;
}

.inspect-user-email {
  font-size: 12px;
  color: var(--color-muted);
  margin: 2px 0 0;
  word-break: break-all;
}

.inspect-notify-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  margin-top: 4px;
}

.inspect-notify-icon {
  color: #6366f1;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.inspect-notify-text {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  min-width: 0;
}

.inspect-notify-label {
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.inspect-notify-val {
  font-weight: 600;
  color: var(--color-text);
  word-break: break-all;
}

.inspect-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.inspect-grid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inspect-grid-item--full {
  grid-column: 1 / -1;
}

.inspect-grid-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.inspect-grid-val {
  font-size: 13px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.inspect-quote-icon {
  color: var(--color-primary, #d22730);
  opacity: 0.6;
  flex-shrink: 0;
  margin-top: 2px;
}

.inspect-reason-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.inspect-textarea {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  padding: 10px 12px;
  resize: vertical;
  outline: none;
  transition: border-color 150ms ease;
  font-family: inherit;
}

.inspect-textarea:focus {
  border-color: var(--color-primary, #d22730);
}

.inspect-footer {
  padding: 16px 24px;
  background: var(--color-surface-muted);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.inspect-footer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.inspect-done-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 8px;
  background: rgba(100, 116, 139, 0.12);
  border: 1px solid rgba(100, 116, 139, 0.25);
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
}

.btn-inspect-close {
  padding: 8px 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-inspect-close:hover {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-muted);
}

.btn-inspect-qr {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #6366f1;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-inspect-qr:hover {
  background: #6366f1;
  color: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
}

.btn-inspect-decline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-inspect-decline:hover:not(:disabled) {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  transform: translateY(-1px);
}

.btn-inspect-decline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-inspect-approve {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all 150ms ease;
}

.btn-inspect-approve:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.45);
  transform: translateY(-1px);
}

.btn-inspect-approve:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ==========================================================================
   DIGITAL QR PARKING PASS TICKET MODAL (Boarding Pass / BulSU Crimson)
   ========================================================================== */
.qr-ticket-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 480px;
  perspective: 1000px;
}

.qr-ticket-card {
  width: 100%;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  color: #0f172a;
}

.qr-ticket-header {
  background: linear-gradient(135deg, #d22730 0%, #8b131a 100%);
  padding: 22px 24px 18px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
}

.qr-ticket-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qr-brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qr-brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.qr-brand-text {
  display: flex;
  flex-direction: column;
}

.qr-brand-org {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.8px;
  color: #ffffff;
  text-transform: uppercase;
  line-height: 1.2;
}

.qr-brand-sub {
  font-size: 9.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.4px;
}

.qr-ticket-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #ffffff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms ease;
}

.qr-ticket-close-btn:hover {
  background: rgba(0, 0, 0, 0.4);
}

.qr-ticket-header-mid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qr-pass-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.qr-ticket-pass-name {
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.3px;
}

.qr-ticket-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.qr-ticket-status-pill--approved {
  background: #10b981;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

.qr-ticket-status-pill--pending {
  background: #f59e0b;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.qr-ticket-status-pill--rejected,
.qr-ticket-status-pill--cancelled {
  background: #ef4444;
  color: #ffffff;
}

.status-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  display: inline-block;
  animation: pulse-dot 1.8s infinite;
}

@keyframes pulse-dot {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.qr-ticket-ref-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: 7px 12px;
}

.qr-ticket-ref-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
}

.qr-ticket-ref-code {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1px;
}

.qr-ticket-copy-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
}

.qr-ticket-copy-btn:hover {
  color: #ffffff;
}

/* Perforated Notch Divider */
.ticket-notch-divider {
  position: relative;
  height: 24px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ticket-notch {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-overlay, #0b0f19);
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.ticket-notch--left {
  left: -12px;
}

.ticket-notch--right {
  right: -12px;
}

.ticket-dashed-line {
  width: calc(100% - 36px);
  border-bottom: 2px dashed #e2e8f0;
  height: 1px;
}

/* Ticket Body */
.qr-ticket-body {
  padding: 14px 24px 20px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qr-code-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-box-wrapper {
  position: relative;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.qr-box-wrapper:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}

/* Viewfinder corner accents */
.qr-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: #d22730;
  border-style: solid;
  pointer-events: none;
}

.qr-corner--tl {
  top: 6px;
  left: 6px;
  border-width: 3px 0 0 3px;
  border-top-left-radius: 6px;
}

.qr-corner--tr {
  top: 6px;
  right: 6px;
  border-width: 3px 3px 0 0;
  border-top-right-radius: 6px;
}

.qr-corner--bl {
  bottom: 6px;
  left: 6px;
  border-width: 0 0 3px 3px;
  border-bottom-left-radius: 6px;
}

.qr-corner--br {
  bottom: 6px;
  right: 6px;
  border-width: 0 3px 3px 0;
  border-bottom-right-radius: 6px;
}

.qr-code-matrix {
  width: 190px;
  height: 190px;
  display: block;
  border-radius: 8px;
  background: #ffffff;
}

.qr-zoom-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.qr-instructions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.qr-gate-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(210, 39, 48, 0.08);
  color: #d22730;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.qr-subtext {
  font-size: 11px;
  color: #64748b;
  margin: 0;
}

/* 2x2 Specs Grid */
.qr-specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.qr-spec-card {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.qr-spec-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #94a3b8;
  text-transform: uppercase;
}

.qr-spec-val {
  font-size: 12px;
  color: #0f172a;
  line-height: 1.3;
}

.qr-spec-sub {
  font-size: 10.5px;
  color: #64748b;
  margin-top: 1px;
}

/* Barcode strip simulation */
.qr-barcode-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 2px;
  border-top: 1px dashed #e2e8f0;
}

.barcode-lines {
  height: 24px;
  width: 80%;
  background: repeating-linear-gradient(
    90deg,
    #0f172a,
    #0f172a 2px,
    transparent 2px,
    transparent 4px,
    #0f172a 4px,
    #0f172a 7px,
    transparent 7px,
    transparent 9px,
    #0f172a 9px,
    #0f172a 10px,
    transparent 10px,
    transparent 13px
  );
  opacity: 0.7;
}

.barcode-digits {
  font-size: 11px;
  letter-spacing: 3px;
  color: #64748b;
  font-weight: 700;
}

/* Ticket Footer */
.qr-ticket-footer {
  padding: 14px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.btn-ticket-close {
  padding: 8px 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-ticket-close:hover {
  background: #ffffff;
  color: #0f172a;
  border-color: #94a3b8;
}

.ticket-action-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-ticket-download {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-ticket-download:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.btn-ticket-print {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #d22730 0%, #b01e26 100%);
  border: none;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.3);
  transition: all 150ms ease;
}

.btn-ticket-print:hover {
  box-shadow: 0 6px 16px rgba(210, 39, 48, 0.45);
  transform: translateY(-1px);
}

/* ==========================================================================
   PRINT STYLES FOR OFFICIAL PASS
   ========================================================================== */
@media print {
  body * {
    visibility: hidden;
  }
  .qr-ticket-card,
  .qr-ticket-card * {
    visibility: visible;
  }
  .qr-ticket-card {
    position: absolute;
    left: 50%;
    top: 20px;
    transform: translateX(-50%);
    width: 440px;
    max-width: 440px;
    box-shadow: none !important;
    border: 1px solid #cbd5e1 !important;
    background: #ffffff !important;
    color: #000000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .qr-ticket-footer,
  .qr-ticket-close-btn,
  .qr-zoom-badge {
    display: none !important;
  }
}

/* QR Code Zoom Modal with Backdrop Blur */
.qr-code-frame {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.qr-code-frame:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.qr-zoom-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  opacity: 0.9;
}

.qr-fullscreen-zoom-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.qr-zoom-modal-card {
  position: relative;
  background: #ffffff;
  padding: 32px;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 380px;
  width: 100%;
  animation: qrZoomPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes qrZoomPop {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.qr-zoom-close-btn {
  position: absolute;
  top: 14px;
  right: 18px;
  background: rgba(0, 0, 0, 0.06);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 22px;
  line-height: 1;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.qr-zoom-close-btn:hover {
  background: rgba(0, 0, 0, 0.12);
  color: #0f172a;
}

.qr-zoom-img-wrapper {
  padding: 16px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.qr-zoomed-img {
  width: 260px;
  height: 260px;
  display: block;
}

.qr-zoom-ref-text {
  font-family: monospace;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 16px 0 2px;
  letter-spacing: 0.5px;
}

.qr-zoom-hint-text {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}
</style>
