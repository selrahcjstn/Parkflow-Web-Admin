<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
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
  if (
    rawStatus === 'rejected' ||
    rawStatus === 'cancelled' ||
    item.status === 2 ||
    item.status === 3
  )
    return false

  const endDateTime = parseReservationEndDateTime(item.reservationDate, item.endTime)
  if (!endDateTime) return false
  return new Date() > endDateTime
}

function formatStatus(status: ReservationStatusType): string {
  if (status === 0 || String(status).toLowerCase() === 'pending') return 'Pending'
  if (status === 1 || String(status).toLowerCase() === 'approved') return 'Approved'
  if (status === 2 || String(status).toLowerCase() === 'rejected') return 'Rejected'
  if (status === 3 || String(status).toLowerCase() === 'cancelled') return 'Cancelled'
  if (
    status === 4 ||
    String(status).toLowerCase() === 'done' ||
    String(status).toLowerCase() === 'completed'
  )
    return 'Done'
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
      year: 'numeric',
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
    const list = Array.isArray(listRes.data?.data)
      ? listRes.data.data
      : Array.isArray(listRes.data)
        ? listRes.data
        : []
    const match = list.find(
      (r: ParkingReservationItem) =>
        String(r.id) === reservationId.value || String(r.referenceNumber) === reservationId.value,
    )
    if (match) {
      reservation.value = match
      reviewNotes.value = match.adminNotes || ''
    } else {
      fetchError.value = 'Reservation record not found.'
    }
  } catch (err: any) {
    fetchError.value =
      err.response?.data?.message || err.message || 'Failed to fetch reservation details.'
  } finally {
    isLoading.value = false
  }
}

const isApproveModalOpen = ref(false)
const isRejectModalOpen = ref(false)

async function handleApprove() {
  if (!reservation.value) return
  isSubmittingAction.value = true
  try {
    await api.post(`/parking-reservations/${reservation.value.id}/approve`, {
      notes: reviewNotes.value,
    })
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
    await api.post(`/parking-reservations/${reservation.value.id}/reject`, {
      notes: reviewNotes.value,
    })
    reservation.value.status = 'Rejected'
    reservation.value.adminNotes = reviewNotes.value
    showToast(`Reservation ${reservation.value.referenceNumber} declined.`, 'error')
    isRejectModalOpen.value = false
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="space-y-3">
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        type="button"
        @click="goBack"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Reservations
      </button>

      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div class="min-w-0 space-y-1">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold tracking-tight text-text">
              {{ reservation?.referenceNumber || 'Reservation Inspection' }}
            </h1>
            <button
              v-if="reservation?.referenceNumber"
              class="inline-flex min-h-10 items-center gap-2 rounded-button border border-border px-3 text-sm text-muted hover:bg-surface-lighter"
              @click="copyRef(reservation.referenceNumber)"
              title="Copy Reference Number"
            >
              <svg
                v-if="!isCopied"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg
                v-else
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
          <p class="text-sm leading-6 text-muted">
            Inspect schedule parameters, applicant credentials, and review administration notes.
          </p>
        </div>

        <div v-if="reservation" class="pt-2">
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
      <div
        v-if="toastMessage"
        class="flex items-center gap-3 rounded-button border border-border bg-surface p-4 text-sm text-text"
        :class="
          toastMessage.type === 'success'
            ? 'border-success/20 text-success'
            : 'border-danger/20 text-danger'
        "
      >
        <svg
          v-if="toastMessage.type === 'success'"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ toastMessage.message }}</span>
      </div>
    </Transition>

    <!-- Skeleton Loading -->
    <div v-if="isLoading" class="space-y-5">
      <SkeletonLoader variant="rect" height="140px" class="rounded-xl mb-4" />
      <SkeletonLoader variant="rect" height="180px" class="rounded-xl mb-4" />
      <SkeletonLoader variant="rect" height="140px" class="rounded-xl" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="fetchError"
      class="flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-6 py-12 text-center text-muted"
    >
      <svg
        width="42"
        height="42"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>Reservation Not Found</h3>
      <p>{{ fetchError }}</p>
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary mt-3"
        @click="goBack"
      >
        Return to Reservations
      </button>
    </div>

    <!-- Main Content -->
    <div v-else-if="reservation" class="space-y-6">
      <!-- Card 1: Schedule & Timing -->
      <UiCard custom-class="p-6">
        <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-text">Schedule Information</h3>
            <p class="mt-1 text-sm leading-5 text-muted">
              Reservation timing and slot specifications
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Reference Number</span>
            <span class="block break-words text-sm text-text font-mono font-semibold">{{
              reservation.referenceNumber
            }}</span>
          </div>

          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Reservation Date</span>
            <span class="block break-words text-sm text-text font-semibold">{{
              formatReservationDate(reservation.reservationDate)
            }}</span>
          </div>

          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Time Window</span>
            <span class="block break-words text-sm text-text font-semibold">{{
              formatTimeSlot(reservation.startTime, reservation.endTime)
            }}</span>
          </div>

          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Effective Status</span>
            <span class="block break-words text-sm text-text font-semibold">{{
              effectiveStatus
            }}</span>
          </div>

          <div class="min-w-0 space-y-1 sm:col-span-2">
            <span class="block text-sm text-muted">Purpose / Stated Reason</span>
            <div
              class="rounded-button bg-surface-lighter p-4 text-sm leading-6 text-text-secondary"
            >
              {{ reservation.reason || 'No specific reason recorded.' }}
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Card 2: Applicant & Vehicle -->
      <UiCard custom-class="p-6">
        <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-text">Applicant & Vehicle Information</h3>
            <p class="mt-1 text-sm leading-5 text-muted">
              User credentials and designated campus vehicle
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Applicant Name</span>
            <span class="block break-words text-sm text-text font-semibold">{{
              reservation.userFullName || 'Campus User'
            }}</span>
          </div>

          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Account Email</span>
            <span class="block break-words text-sm text-text font-semibold">{{
              reservation.userEmail || 'N/A'
            }}</span>
          </div>

          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Designated Vehicle</span>
            <span class="block break-words text-sm font-medium text-text">
              <span v-if="reservation.plateNumber" class="font-mono font-bold">{{
                reservation.plateNumber
              }}</span>
              <span v-if="reservation.brand" class="text-muted ml-1.5"
                >({{ reservation.brand }})</span
              >
              <span v-if="!reservation.plateNumber" class="text-subtle"
                >Unassigned / Campus Event</span
              >
            </span>
          </div>

          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Notification Recipient</span>
            <span class="block break-words text-sm font-medium text-text">
              <span v-if="getNotifyEmailFromNotes(reservation.adminNotes)">{{
                getNotifyEmailFromNotes(reservation.adminNotes)
              }}</span>
              <span v-else class="text-subtle">None Specified</span>
            </span>
          </div>
        </div>
      </UiCard>

      <!-- Card 3: Administrative Remarks & Actions -->
      <UiCard custom-class="p-6">
        <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-text">Administrative Notes & Actions</h3>
            <p class="mt-1 text-sm leading-5 text-muted">
              Review directives, recorded notes, and approval status
            </p>
          </div>
        </div>

        <div class="space-y-2 mb-5">
          <label class="block text-sm font-medium text-text">Review Remarks / Internal Notes</label>
          <textarea
            v-model="reviewNotes"
            rows="3"
            class="w-full rounded-button border border-border bg-surface p-3 text-sm text-text focus:outline-2 focus:outline-primary"
            :disabled="isDoneOrExpired"
            placeholder="Enter administration notes, special access instructions, or rejection justification..."
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <!-- Pending: Approve and Decline -->
          <template v-if="effectiveStatus === 'Pending'">
            <UiButton
              type="button"
              variant="danger"
              :disabled="isSubmittingAction"
              @click="isRejectModalOpen = true"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>{{ isSubmittingAction ? 'Processing...' : 'Decline Request' }}</span>
            </UiButton>

            <UiButton
              type="button"
              variant="primary"
              :disabled="isSubmittingAction"
              @click="isApproveModalOpen = true"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ isSubmittingAction ? 'Processing...' : 'Approve Pass' }}</span>
            </UiButton>
          </template>

          <!-- Approved: View Official QR Pass -->
          <template v-else-if="effectiveStatus === 'Approved'">
            <UiButton type="button" variant="primary" @click="goToPass">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>View Official QR Pass</span>
            </UiButton>
          </template>

          <!-- Done / Expired Notice -->
          <div
            v-else-if="isDoneOrExpired"
            class="flex items-start gap-3 rounded-button bg-surface-lighter p-4 text-sm text-muted"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span>Reservation schedule concluded. Digital entry pass is inactive.</span>
          </div>

          <!-- Declined Notice -->
          <div
            v-else-if="effectiveStatus === 'Rejected' || effectiveStatus === 'Cancelled'"
            class="flex items-start gap-3 rounded-button bg-danger-bg p-4 text-sm text-danger"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Schedule request declined. Entry is not authorized.</span>
          </div>
        </div>
      </UiCard>
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

    <!-- Reject Confirmation Modal -->
    <ConfirmModal
      :is-open="isRejectModalOpen"
      title="Decline Parking Reservation"
      :message="`Are you sure you want to decline the parking reservation request for <strong>${reservation?.userFullName || 'this applicant'}</strong> (${reservation?.referenceNumber || ''}) on <strong>${formatReservationDate(reservation?.reservationDate || '')}</strong>?`"
      confirm-text="Decline Request"
      cancel-text="Cancel"
      variant="danger"
      :is-submitting="isSubmittingAction"
      @confirm="handleReject"
      @close="isRejectModalOpen = false"
    />
  </div>
</template>
