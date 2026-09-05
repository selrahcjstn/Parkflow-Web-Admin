<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const reservations = ref<ParkingReservationItem[]>([])
const isLoading = ref(true)
const fetchError = ref<string | null>(null)
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const selectedDateFilter = ref<string>('')
const notificationToast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let pollTimer: number | null = null

// Modal states
const reviewModalItem = ref<ParkingReservationItem | null>(null)
const reviewNotes = ref('')
const isSubmittingReview = ref(false)

// QR Pass modal state
const qrPassModalItem = ref<ParkingReservationItem | null>(null)

function openQrPassModal(item: ParkingReservationItem) {
  qrPassModalItem.value = item
}

function closeQrPassModal() {
  qrPassModalItem.value = null
}

function printPass() {
  window.print()
}

function downloadQrCode(item: ParkingReservationItem) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(item.referenceNumber)}`
  window.open(url, '_blank')
}

// Create modal state
const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({
  reservationDate: new Date().toISOString().split('T')[0],
  startTime: '07:00',
  endTime: '17:00',
  reason: 'Campus Special Event / Administrative Schedule',
  sendEmail: false,
  notifyEmail: ''
})

function formatStatus(status: ReservationStatusType): string {
  if (status === 0 || String(status).toLowerCase() === 'pending') return 'Pending'
  if (status === 1 || String(status).toLowerCase() === 'approved') return 'Approved'
  if (status === 2 || String(status).toLowerCase() === 'rejected') return 'Rejected'
  if (status === 3 || String(status).toLowerCase() === 'cancelled') return 'Cancelled'
  return String(status || 'Pending')
}

function getStatusKey(status: ReservationStatusType): string {
  return formatStatus(status).toLowerCase()
}

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

onMounted(() => {
  fetchReservations()
  pollTimer = window.setInterval(() => {
    fetchReservations(true)
  }, 4000)
})

onUnmounted(() => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
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
const pendingCount = computed(() => reservations.value.filter(r => getStatusKey(r.status) === 'pending').length)
const approvedCount = computed(() => reservations.value.filter(r => getStatusKey(r.status) === 'approved').length)
const rejectedCount = computed(() => reservations.value.filter(r => getStatusKey(r.status) === 'rejected' || getStatusKey(r.status) === 'cancelled').length)

// Filtered list
const filteredReservations = computed(() => {
  return reservations.value.filter(item => {
    const statusKey = getStatusKey(item.status)
    
    // Tab filter
    if (selectedStatusTab.value === 'pending' && statusKey !== 'pending') return false
    if (selectedStatusTab.value === 'approved' && statusKey !== 'approved') return false
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
    const cleanDate = (dateStr.split('T')[0]) || dateStr
    const d = new Date(cleanDate)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' })
  } catch {
    return dateStr
  }
}

function formatTimeSlot(start: string, end: string): string {
  if (!start || !end) return 'All Day Pass'
  const formatTime = (t: string) => {
    const parts = t.split(':')
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
  return match ? match[1].trim() : null
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
    const payload: Record<string, any> = {
      reservationDate: createForm.value.reservationDate,
      startTime: createForm.value.startTime + ':00',
      endTime: createForm.value.endTime + ':00',
      reason: createForm.value.reason
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
      endTime: '17:00',
      reason: 'Campus Special Event / Administrative Schedule',
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
          <span class="stat-card__title">Approved Passes</span>
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
          Approved ({{ approvedCount }})
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
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Reference #</th>
            <th>Creator of the reservation</th>
            <th>Date & Time Slot</th>
            <th>Purpose / Reason</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Skeleton Loading -->
          <tr v-if="isLoading" v-for="i in 4" :key="'skel-'+i">
            <td colspan="6" style="padding: 16px;">
              <SkeletonLoader variant="rect" height="40px" />
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="filteredReservations.length === 0">
            <td colspan="6" class="empty-cell">
              <div class="empty-state">
                <div class="empty-icon-box">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 class="empty-title">No schedule reservations found</h3>
                <p class="empty-desc">There are no reservation requests matching your search query or tab filter.</p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr v-else v-for="(item, index) in filteredReservations" :key="item.id">
            <!-- Reference Number -->
            <td>
              <span class="ref-badge monospace">{{ item.referenceNumber }}</span>
            </td>

            <!-- Applicant Info -->
            <td>
              <div class="applicant-cell">
                <div class="avatar-circle" :style="{ background: getAvatarGradient(index) }">
                  {{ getInitials(item.userFullName) }}
                </div>
                <div class="applicant-meta">
                  <span class="applicant-name">{{ item.userFullName || 'Campus User' }}</span>
                  <span class="applicant-email">{{ item.userEmail || 'N/A' }}</span>
                </div>
              </div>
            </td>

            <!-- Date & Time Slot -->
            <td>
              <div class="schedule-meta">
                <span class="date-text">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {{ formatReservationDate(item.reservationDate) }}
                </span>
                <span class="time-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {{ formatTimeSlot(item.startTime, item.endTime) }}
                </span>
              </div>
            </td>

            <!-- Purpose / Reason -->
            <td>
              <span class="reason-text" :title="item.reason">{{ item.reason }}</span>
            </td>

            <!-- Status Badge -->
            <td>
              <span
                class="status-badge"
                :class="`status-badge--${getStatusKey(item.status)}`"
              >
                <span class="status-dot"></span>
                {{ formatStatus(item.status) }}
              </span>
            </td>

            <!-- Actions -->
            <td class="text-right">
              <div class="action-buttons">
                <button
                  v-if="getStatusKey(item.status) === 'pending'"
                  class="btn-action btn-approve"
                  @click="handleApprove(item)"
                  title="Approve Reservation"
                >
                  Approve
                </button>
                <button
                  v-if="getStatusKey(item.status) === 'pending'"
                  class="btn-action btn-reject"
                  @click="handleReject(item)"
                  title="Decline Reservation"
                >
                  Decline
                </button>
                <button
                  class="btn-action btn-qr-pass"
                  @click="openQrPassModal(item)"
                  title="View Official QR Pass"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  QR Pass
                </button>
                <button
                  class="btn-action btn-review"
                  @click="openReviewModal(item)"
                  title="Review Details"
                >
                  Inspect
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- REVIEW / INSPECT MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="reviewModalItem" class="modal-backdrop" @click="closeReviewModal">
          <div class="modal-card" @click.stop>
            <div class="modal-header">
              <div>
                <span class="modal-tag">Reservation Review Inspection</span>
                <h2 class="modal-title">{{ reviewModalItem.referenceNumber }}</h2>
              </div>
              <button class="close-btn" @click="closeReviewModal">&times;</button>
            </div>

            <div class="modal-body">
              <div class="info-section">
                <h4 class="section-label">Creator of the reservation</h4>
                <div class="meta-row">
                  <span class="meta-key">Full Name</span>
                  <span class="meta-val">{{ reviewModalItem.userFullName || 'Campus User' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-key">Account Email</span>
                  <span class="meta-val">{{ reviewModalItem.userEmail || 'No email provided' }}</span>
                </div>
                <div class="meta-row" v-if="getNotifyEmailFromNotes(reviewModalItem.adminNotes)">
                  <span class="meta-key">Notification Email</span>
                  <span class="meta-val text-indigo font-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;margin-right:4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {{ getNotifyEmailFromNotes(reviewModalItem.adminNotes) }}
                  </span>
                </div>
              </div>

              <div class="info-section">
                <h4 class="section-label">Requested Schedule</h4>
                <div class="meta-row">
                  <span class="meta-key">Reservation Date</span>
                  <span class="meta-val text-amber">{{ formatReservationDate(reviewModalItem.reservationDate) }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-key">Time Slot Window</span>
                  <span class="meta-val">{{ formatTimeSlot(reviewModalItem.startTime, reviewModalItem.endTime) }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-key">Stated Purpose</span>
                  <span class="meta-val">{{ reviewModalItem.reason }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-key">Current Status</span>
                  <span class="meta-val">
                    <span class="status-badge" :class="`status-badge--${getStatusKey(reviewModalItem.status)}`">
                      {{ formatStatus(reviewModalItem.status) }}
                    </span>
                  </span>
                </div>
              </div>

              <!-- Admin Review Notes input -->
              <div class="info-section">
                <label class="form-label">Admin Notes / Review Remarks</label>
                <textarea
                  v-model="reviewNotes"
                  rows="3"
                  class="form-textarea"
                  placeholder="Enter approval remarks or reason for decline..."
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="closeReviewModal">Close</button>
              <div class="footer-actions">
                <button
                  class="btn-action btn-qr-pass"
                  style="margin-right: 8px;"
                  @click="openQrPassModal(reviewModalItem); closeReviewModal();"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  View QR Pass
                </button>
                <button
                  class="btn-reject"
                  :disabled="isSubmittingReview"
                  @click="handleReject(reviewModalItem)"
                >
                  Decline Request
                </button>
                <button
                  class="btn-approve"
                  :disabled="isSubmittingReview"
                  @click="handleApprove(reviewModalItem)"
                >
                  Approve Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- DIGITAL QR PARKING PASS TICKET MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="qrPassModalItem" class="modal-backdrop" @click="closeQrPassModal">
          <div class="modal-card qr-pass-card" @click.stop>
            
            <!-- Pass Header Ticket Banner -->
            <div class="qr-pass-header">
              <div class="qr-pass-header-content">
                <div class="qr-pass-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4z"/></svg>
                  PARKFLOW OFFICIAL PARKING PERMIT
                </div>
                <h2 class="qr-pass-title">Digital Entry Pass</h2>
                <div class="qr-pass-ref-wrapper">
                  <span class="qr-pass-ref monospace">{{ qrPassModalItem.referenceNumber }}</span>
                </div>
              </div>
              <button class="close-btn qr-close-btn" @click="closeQrPassModal">&times;</button>
            </div>

            <!-- Pass Body -->
            <div class="qr-pass-body">
              <!-- QR Code Display Box -->
              <div class="qr-display-box">
                <div class="qr-code-frame">
                  <img
                    :src="`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrPassModalItem.referenceNumber)}`"
                    alt="Parking Pass QR Code"
                    class="qr-code-img"
                  />
                </div>
                <p class="qr-scan-hint">Present code to campus gate scanner or security guard</p>
              </div>

              <!-- Pass Info Ticket Details -->
              <div class="qr-pass-details">
                <div class="qr-detail-row">
                  <span class="qr-detail-label">Creator of the reservation</span>
                  <span class="qr-detail-val bold">{{ qrPassModalItem.userFullName || 'Campus Visitor / Staff' }}</span>
                </div>
                <div class="qr-detail-row" v-if="getNotifyEmailFromNotes(qrPassModalItem.adminNotes) || qrPassModalItem.userEmail">
                  <span class="qr-detail-label">Contact / Notification Email</span>
                  <span class="qr-detail-val">{{ getNotifyEmailFromNotes(qrPassModalItem.adminNotes) || qrPassModalItem.userEmail }}</span>
                </div>
                <div class="qr-detail-row">
                  <span class="qr-detail-label">Reserved Date</span>
                  <span class="qr-detail-val text-amber font-600">{{ formatReservationDate(qrPassModalItem.reservationDate) }}</span>
                </div>
                <div class="qr-detail-row">
                  <span class="qr-detail-label">Authorized Window</span>
                  <span class="qr-detail-val text-indigo font-600">{{ formatTimeSlot(qrPassModalItem.startTime, qrPassModalItem.endTime) }}</span>
                </div>
                <div class="qr-detail-row">
                  <span class="qr-detail-label">Event / Purpose</span>
                  <span class="qr-detail-val">{{ qrPassModalItem.reason }}</span>
                </div>
                <div class="qr-detail-row">
                  <span class="qr-detail-label">Pass Status</span>
                  <span class="qr-detail-val">
                    <span class="status-badge" :class="`status-badge--${getStatusKey(qrPassModalItem.status)}`">
                      {{ formatStatus(qrPassModalItem.status) }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Pass Footer Actions -->
            <div class="qr-pass-footer">
              <button class="btn-secondary" @click="closeQrPassModal">Close</button>
              <div class="footer-actions">
                <button class="btn-action btn-outline" @click="downloadQrCode(qrPassModalItem)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Get QR Image
                </button>
                <button class="btn-action btn-print" @click="printPass">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print Pass
                </button>
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
              <button class="btn-secondary" @click="showCreateModal = false">Cancel</button>
              <button
                class="btn-primary"
                :disabled="isCreating"
                @click="handleCreateReservation"
              >
                {{ isCreating ? 'Reserving...' : 'Confirm & Reserve' }}
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
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
}

.data-table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
  vertical-align: middle;
}

.ref-badge {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 700;
}

.monospace {
  font-family: monospace;
}

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.applicant-meta {
  display: flex;
  flex-direction: column;
}
.applicant-name {
  font-weight: 700;
  color: var(--color-text);
}
.applicant-email {
  font-size: 12px;
  color: var(--color-muted);
}

.schedule-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.date-text {
  font-weight: 700;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.time-text {
  font-size: 12px;
  color: var(--color-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reason-text {
  color: var(--color-text);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.status-dot {
  width: 6px;
  height: 6px;
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
  gap: 6px;
  justify-content: flex-end;
}
.btn-action {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
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

.qr-pass-card {
  max-width: 480px;
  padding: 0 !important;
  overflow: hidden;
  border-radius: 20px !important;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  background: var(--color-surface, #ffffff);
}

.qr-pass-header {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  padding: 24px 28px;
  position: relative;
  color: #ffffff;
}

.qr-pass-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #ffffff;
  margin-bottom: 8px;
}

.qr-pass-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
  color: #ffffff;
}

.qr-pass-ref-wrapper {
  margin-top: 8px;
}

.qr-pass-ref {
  font-size: 13px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 12px;
  border-radius: 6px;
  letter-spacing: 1.5px;
  color: #a5b4fc;
}

.qr-close-btn {
  position: absolute;
  top: 18px;
  right: 20px;
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 24px;
  background: none;
  border: none;
  cursor: pointer;
}

.qr-pass-body {
  padding: 24px 28px;
}

.qr-display-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--color-surface-muted, #f8fafc);
  border: 2px dashed var(--color-border, #cbd5e1);
  border-radius: 16px;
  margin-bottom: 20px;
}

.qr-code-frame {
  padding: 14px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code-img {
  width: 210px;
  height: 210px;
  display: block;
}

.qr-scan-hint {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 12px;
  margin-bottom: 0;
  text-align: center;
  font-weight: 500;
}

.qr-pass-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qr-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  font-size: 13px;
}
.qr-detail-row:last-child {
  border-bottom: none;
}

.qr-detail-label {
  color: var(--color-muted);
  font-weight: 500;
}

.qr-detail-val {
  color: var(--color-text);
  text-align: right;
}

.qr-pass-footer {
  padding: 16px 28px;
  background: var(--color-surface-muted);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-print {
  background: #4f46e5;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 150ms ease;
}
.btn-print:hover {
  background: #4338ca;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

@media print {
  body * {
    visibility: hidden;
  }
  .qr-pass-card, .qr-pass-card * {
    visibility: visible;
  }
  .qr-pass-card {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100%;
    box-shadow: none;
  }
  .qr-pass-footer, .close-btn {
    display: none !important;
  }
}
</style>
