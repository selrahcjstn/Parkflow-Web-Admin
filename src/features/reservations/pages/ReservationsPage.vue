<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const reservations = ref<ParkingReservationItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const selectedDateFilter = ref<string>('')
const notificationToast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

// Modal states
const reviewModalItem = ref<ParkingReservationItem | null>(null)
const reviewNotes = ref('')
const isSubmittingReview = ref(false)

// Create modal state
const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({
  reservationDate: new Date().toISOString().split('T')[0],
  startTime: '07:00',
  endTime: '17:00',
  reason: 'Campus Special Event / Administrative Schedule'
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

async function fetchReservations() {
  isLoading.value = true
  try {
    const response = await api.get('/parking-reservations/admin/all')
    if (response.data && response.data.isSuccess && Array.isArray(response.data.data)) {
      reservations.value = response.data.data
    } else if (Array.isArray(response.data)) {
      reservations.value = response.data
    } else {
      reservations.value = []
    }
  } catch (error) {
    console.error('API reservations fetch error:', error)
    reservations.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchReservations()
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
  isCreating.value = true
  try {
    const payload = {
      reservationDate: createForm.value.reservationDate,
      startTime: createForm.value.startTime + ':00',
      endTime: createForm.value.endTime + ':00',
      reason: createForm.value.reason
    }
    const response = await api.post('/parking-reservations', payload)
    if (response.data && response.data.data) {
      reservations.value.unshift(response.data.data)
    } else {
      await fetchReservations()
    }
    showToast('Schedule reservation created & reserved successfully.')
    showCreateModal.value = false
  } catch (error: any) {
    showToast('Failed to create reservation: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="reservations-page">
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
            <th>Applicant Details</th>
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
                <h4 class="section-label">Applicant Details</h4>
                <div class="meta-row">
                  <span class="meta-key">Full Name</span>
                  <span class="meta-val">{{ reviewModalItem.userFullName || 'Campus User' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-key">Email Address</span>
                  <span class="meta-val">{{ reviewModalItem.userEmail || 'N/A' }}</span>
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
</style>
