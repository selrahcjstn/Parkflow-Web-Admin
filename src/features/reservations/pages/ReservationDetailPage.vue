<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const route = useRoute()
const router = useRouter()

const reservationId = computed(() => String(route.params.id || ''))

const reservation = ref<ParkingReservationItem | null>(null)
const isLoading = ref(true)
const fetchError = ref<string | null>(null)
const reviewNotes = ref('')
const isSubmittingAction = ref(false)
const isCopied = ref(false)
const toastMessage = ref<{ message: string; type: 'success' | 'error' } | null>(null)

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = { message, type }
  setTimeout(() => {
    toastMessage.value = null
  }, 3500)
}

function copyRef(refNum?: string) {
  if (!refNum) return
  navigator.clipboard.writeText(refNum)
  isCopied.value = true
  showToast('Reference number copied to clipboard.')
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

function isReservationDone(item: ParkingReservationItem | null): boolean {
  if (!item) return false
  const rawStatus = String(item.status ?? '').toLowerCase()
  if (rawStatus === 'done' || rawStatus === 'completed' || item.status === 4) return true
  if (rawStatus === 'rejected' || rawStatus === 'cancelled' || item.status === 2 || item.status === 3) return false

  const endDateTime = parseReservationEndDateTime(item.reservationDate, item.endTime)
  if (!endDateTime) return false
  return new Date() > endDateTime
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

const effectiveStatus = computed(() => {
  if (!reservation.value) return 'Pending'
  const raw = formatStatus(reservation.value.status)
  if (raw === 'Rejected' || raw === 'Cancelled') return raw
  if (isReservationDone(reservation.value)) {
    return raw === 'Pending' ? 'Expired' : 'Done'
  }
  return raw
})

const isDoneOrExpired = computed(() => {
  return effectiveStatus.value === 'Done' || effectiveStatus.value === 'Expired'
})

function formatReservationDate(dateStr?: string): string {
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

function formatTimeSlot(start?: string, end?: string): string {
  if (!start || !end) return 'All Day Access'
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

function getNotifyEmailFromNotes(notes?: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/\[NotifyEmail:(.*?)\]/)
  return match && match[1] ? match[1].trim() : null
}

function goBack() {
  router.push('/reservations')
}

function goToPass() {
  if (!reservation.value) return
  router.push(`/reservations/${reservation.value.id}/pass`)
}

async function fetchReservationDetail() {
  isLoading.value = true
  fetchError.value = null

  try {
    // 1. Try single item endpoint
    try {
      const singleRes = await api.get(`/parking-reservations/${reservationId.value}`)
      if (singleRes.data && singleRes.data.data) {
        reservation.value = singleRes.data.data
        reviewNotes.value = reservation.value?.adminNotes || ''
        isLoading.value = false
        return
      }
    } catch {
      // Fall through to all list
    }

    // 2. Fetch list fallback
    const listRes = await api.get('/parking-reservations/admin/all')
    const list = Array.isArray(listRes.data?.data) ? listRes.data.data : Array.isArray(listRes.data) ? listRes.data : []
    const match = list.find((r: ParkingReservationItem) => String(r.id) === reservationId.value || String(r.referenceNumber) === reservationId.value)
    if (match) {
      reservation.value = match
      reviewNotes.value = match.adminNotes || ''
    } else {
      fetchError.value = 'Reservation record not found.'
    }
  } catch (err: any) {
    fetchError.value = err.response?.data?.message || err.message || 'Failed to fetch reservation details.'
  } finally {
    isLoading.value = false
  }
}

const isApproveModalOpen = ref(false)

async function handleApprove() {
  if (!reservation.value) return
  isSubmittingAction.value = true
  try {
    await api.post(`/parking-reservations/${reservation.value.id}/approve`, { notes: reviewNotes.value })
    reservation.value.status = 'Approved'
    reservation.value.adminNotes = reviewNotes.value
    showToast(`Reservation ${reservation.value.referenceNumber} approved.`)
    isApproveModalOpen.value = false
  } catch (err: any) {
    showToast(`Failed to approve: ${err.response?.data?.message || err.message}`, 'error')
  } finally {
    isSubmittingAction.value = false
  }
}

async function handleReject() {
  if (!reservation.value) return
  isSubmittingAction.value = true
  try {
    await api.post(`/parking-reservations/${reservation.value.id}/reject`, { notes: reviewNotes.value })
    reservation.value.status = 'Rejected'
    reservation.value.adminNotes = reviewNotes.value
    showToast(`Reservation ${reservation.value.referenceNumber} declined.`, 'error')
  } catch (err: any) {
    showToast(`Failed to decline: ${err.response?.data?.message || err.message}`, 'error')
  } finally {
    isSubmittingAction.value = false
  }
}

onMounted(() => {
  fetchReservationDetail()
})
</script>

<template>
  <div class="reservation-detail-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" type="button" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Reservations
      </button>

      <div class="header-main-row">
        <div class="header-titles">
          <div class="flex items-center gap-3">
            <h1 class="page-title">{{ reservation?.referenceNumber || 'Reservation Inspection' }}</h1>
            <button
              v-if="reservation?.referenceNumber"
              class="copy-btn"
              @click="copyRef(reservation.referenceNumber)"
              title="Copy Reference Number"
            >
              <svg v-if="!isCopied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
          <p class="page-subtitle">Inspect schedule parameters, applicant credentials, and review administration notes.</p>
        </div>

        <div v-if="reservation" class="header-status">
          <UiStatusText
            :variant="
              effectiveStatus === 'Approved'
                ? 'success'
                : effectiveStatus === 'Done' || effectiveStatus === 'Expired'
                ? 'neutral'
                : effectiveStatus === 'Rejected' || effectiveStatus === 'Cancelled'
                ? 'danger'
                : 'warning'
            "
            size="sm"
          >
            {{ effectiveStatus }}
          </UiStatusText>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast-banner" :class="`toast-banner--${toastMessage.type}`">
        <svg v-if="toastMessage.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ toastMessage.message }}</span>
      </div>
    </Transition>

    <!-- Skeleton Loading -->
    <div v-if="isLoading" class="skeleton-container">
      <SkeletonLoader height="140px" class="rounded-xl mb-4" />
      <SkeletonLoader height="180px" class="rounded-xl mb-4" />
      <SkeletonLoader height="140px" class="rounded-xl" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="not-found-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>Reservation Not Found</h3>
      <p>{{ fetchError }}</p>
      <button class="back-btn mt-3" @click="goBack">Return to Reservations</button>
    </div>

    <!-- Main Content -->
    <div v-else-if="reservation" class="detail-container">
      <!-- Card 1: Schedule & Timing -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Schedule Information</h3>
            <p class="card-subtitle">Reservation timing and slot specifications</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Reference Number</span>
            <span class="info-value font-mono font-semibold">{{ reservation.referenceNumber }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Reservation Date</span>
            <span class="info-value font-semibold">{{ formatReservationDate(reservation.reservationDate) }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Time Window</span>
            <span class="info-value font-semibold">{{ formatTimeSlot(reservation.startTime, reservation.endTime) }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Effective Status</span>
            <span class="info-value font-semibold">{{ effectiveStatus }}</span>
          </div>

          <div class="info-item full-width">
            <span class="info-label">Purpose / Stated Reason</span>
            <div class="reason-callout">
              {{ reservation.reason || 'No specific reason recorded.' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: Applicant & Vehicle -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Applicant & Vehicle Information</h3>
            <p class="card-subtitle">User credentials and designated campus vehicle</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Applicant Name</span>
            <span class="info-value font-semibold">{{ reservation.userFullName || 'Campus User' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Account Email</span>
            <span class="info-value font-semibold">{{ reservation.userEmail || 'N/A' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Designated Vehicle</span>
            <span class="info-value">
              <span v-if="reservation.plateNumber" class="font-mono font-bold">{{ reservation.plateNumber }}</span>
              <span v-if="reservation.brand" class="text-slate-500 ml-1.5">({{ reservation.brand }})</span>
              <span v-if="!reservation.plateNumber" class="text-slate-400">Unassigned / Campus Event</span>
            </span>
          </div>

          <div class="info-item">
            <span class="info-label">Notification Recipient</span>
            <span class="info-value">
              <span v-if="getNotifyEmailFromNotes(reservation.adminNotes)">{{ getNotifyEmailFromNotes(reservation.adminNotes) }}</span>
              <span v-else class="text-slate-400">None Specified</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Card 3: Administrative Remarks & Actions -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Administrative Notes & Actions</h3>
            <p class="card-subtitle">Review directives, recorded notes, and approval status</p>
          </div>
        </div>

        <div class="form-group mb-5">
          <label class="form-label">Review Remarks / Internal Notes</label>
          <textarea
            v-model="reviewNotes"
            rows="3"
            class="form-textarea"
            :disabled="isDoneOrExpired"
            placeholder="Enter administration notes, special access instructions, or rejection justification..."
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="actions-strip">
          <!-- Pending: Approve and Decline -->
          <template v-if="effectiveStatus === 'Pending'">
            <button
              type="button"
              class="btn-danger"
              :disabled="isSubmittingAction"
              @click="handleReject"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>{{ isSubmittingAction ? 'Processing...' : 'Decline Request' }}</span>
            </button>

            <button
              type="button"
              class="btn-success"
              :disabled="isSubmittingAction"
              @click="isApproveModalOpen = true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ isSubmittingAction ? 'Processing...' : 'Approve Pass' }}</span>
            </button>
          </template>

          <!-- Approved: View Official QR Pass -->
          <template v-else-if="effectiveStatus === 'Approved'">
            <button
              type="button"
              class="btn-primary"
              @click="goToPass"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>View Official QR Pass</span>
            </button>
          </template>

          <!-- Done / Expired Notice -->
          <div v-else-if="isDoneOrExpired" class="concluded-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span>Reservation schedule concluded. Digital entry pass is inactive.</span>
          </div>

          <!-- Declined Notice -->
          <div v-else-if="effectiveStatus === 'Rejected' || effectiveStatus === 'Cancelled'" class="declined-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Schedule request declined. Entry is not authorized.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Confirmation Modal -->
    <ConfirmModal
      :is-open="isApproveModalOpen"
      title="Approve Parking Pass"
      :message="`Are you sure you want to approve the parking pass for <strong>${reservation?.userFullName || 'this applicant'}</strong> (${reservation?.referenceNumber || ''}) on <strong>${formatReservationDate(reservation?.reservationDate || '')}</strong>? This will generate their official QR gate entry permit.`"
      confirm-text="Approve Pass"
      cancel-text="Cancel"
      variant="success"
      :is-submitting="isSubmittingAction"
      @confirm="handleApprove"
      @close="isApproveModalOpen = false"
    />
  </div>
</template>

<style scoped>
.reservation-detail-page {
  animation: fadeSlideUp 0.35s ease both;
  width: 100%;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.page-header {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 150ms ease;
  align-self: flex-start;
}

.back-btn:hover {
  color: var(--color-primary, #D22730);
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  margin: 0;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 150ms ease;
}

.copy-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Toast */
.toast-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}

.toast-banner--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
}

.toast-banner--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

/* Detail Container */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Cards */
.form-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 12px);
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.card-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-badge--blue {
  background: rgba(210, 39, 48, 0.08);
  color: var(--color-primary, #D22730);
}

.card-icon-badge--purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.card-icon-badge--orange {
  background: #fff7ed;
  color: #ea580c;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 2px 0;
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-muted, #64748b);
}

.info-value {
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.reason-callout {
  margin-top: 4px;
  padding: 12px 16px;
  background: #f8fafc;
  border-left: 3px solid var(--color-primary, #D22730);
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
}

/* Form inputs */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mb-5 {
  margin-bottom: 20px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text, #334155);
}

.form-textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text, #0f172a);
  outline: none;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.form-textarea:focus {
  border-color: var(--color-primary, #D22730);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.15);
}

.form-textarea:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

/* Actions Strip */
.actions-strip {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  background: var(--btn-primary-bg, #D22730);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-primary:hover {
  background: var(--btn-primary-hover, #B81E26);
}

.btn-success {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  background: #059669;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-success:hover:not(:disabled) {
  background: #047857;
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-danger:hover:not(:disabled) {
  background: #fee2e2;
}

.concluded-notice,
.declined-notice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
}

.concluded-notice {
  background: #f1f5f9;
  color: #64748b;
}

.declined-notice {
  background: #fef2f2;
  color: #dc2626;
}

.not-found-card {
  padding: 48px;
  text-align: center;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  color: var(--color-muted, #64748b);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  .header-main-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
