<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { cachedReservations } from '@/stores/appCache'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const route = useRoute()
const router = useRouter()
const reservationId = computed(() => String(route.params.id || ''))

const reservation = ref<ParkingReservationItem | null>(null)
const isLoading = ref(true)
const fetchError = ref<string | null>(null)
const isQrZoomed = ref(false)

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

function parseReservationStartDateTime(dateStr?: string, startTimeStr?: string): Date | null {
  if (!dateStr) return null
  return parseReservationEndDateTime(dateStr, startTimeStr)
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

function getScheduleStatus(item: ParkingReservationItem | null): { label: string; color: string } {
  if (!item) return { label: 'Unknown', color: '#64748b' }
  const rawStatus = String(item.status ?? '').toLowerCase()
  if (rawStatus === 'rejected' || item.status === 2) return { label: 'Rejected', color: '#dc2626' }
  if (rawStatus === 'cancelled' || item.status === 3) return { label: 'Cancelled', color: '#dc2626' }

  if (isReservationDone(item)) {
    return { label: 'Concluded', color: '#64748b' }
  }

  const now = new Date()
  const start = parseReservationStartDateTime(item.reservationDate, item.startTime)
  if (start && now < start) {
    return { label: 'Upcoming', color: '#d97706' }
  }

  return { label: 'Active & Valid', color: '#059669' }
}

function formatStatus(status?: ReservationStatusType): string {
  if (status === 0 || String(status).toLowerCase() === 'pending') return 'Pending'
  if (status === 1 || String(status).toLowerCase() === 'approved') return 'Approved'
  if (status === 2 || String(status).toLowerCase() === 'rejected') return 'Rejected'
  if (status === 3 || String(status).toLowerCase() === 'cancelled') return 'Cancelled'
  if (status === 4 || String(status).toLowerCase() === 'done' || String(status).toLowerCase() === 'completed') return 'Completed'
  if (String(status).toLowerCase() === 'expired') return 'Expired'
  return String(status || 'Pending')
}

function getStatusColor(status?: ReservationStatusType | ParkingReservationItem): string {
  if (status && typeof status === 'object' && 'reservationDate' in status) {
    if (isReservationDone(status as ParkingReservationItem)) {
      return '#64748b'
    }
    const raw = formatStatus(status.status)
    if (raw === 'Approved') return '#059669'
    if (raw === 'Rejected' || raw === 'Cancelled') return '#dc2626'
    return '#d97706'
  }
  const str = formatStatus(status as ReservationStatusType)
  if (str === 'Approved') return '#059669'
  if (str === 'Rejected' || str === 'Cancelled') return '#dc2626'
  return '#d97706'
}

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
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function formatTimeSlot(start?: string, end?: string): string {
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
  return `${formatTime(start)} – ${formatTime(end)}`
}

function getDisplayEmail(item?: ParkingReservationItem | null): string {
  if (!item) return 'N/A'
  if (item.userEmail && item.userEmail.trim()) return item.userEmail
  const ref = item.referenceNumber || 'RES'
  return `${ref.toLowerCase()}@bulsu.edu.ph`
}

function getDisplayNotes(item?: ParkingReservationItem | null): string {
  if (!item) return ''
  if (item.adminNotes && item.adminNotes.trim()) return item.adminNotes
  return 'Standard campus parking clearance pass.'
}

function getQrImageUrl(refCode: string, size: number = 320): string {
  const cleanRef = (refCode || 'PARKFLOW').trim()
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(cleanRef)}&format=svg&qzone=1&color=1e293b`
}

async function fetchReservation() {
  if (!reservationId.value) {
    fetchError.value = 'Invalid reservation reference.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  fetchError.value = null

  // Check cache first
  if (cachedReservations.value && Array.isArray(cachedReservations.value)) {
    const cached = cachedReservations.value.find(
      (r: any) =>
        String(r.id) === reservationId.value ||
        (r.referenceNumber && r.referenceNumber.toUpperCase() === reservationId.value.toUpperCase())
    )
    if (cached) {
      reservation.value = cached as any
    }
  }

  try {
    const response = await api.get('/parking-reservations/admin/all')
    const rawData = response.data
    const items = Array.isArray(rawData)
      ? rawData
      : (rawData?.isSuccess && Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.data) ? rawData.data : null))

    if (items && items.length > 0) {
      const found = items.find(
        (r: any) =>
          String(r.id) === reservationId.value ||
          (r.referenceNumber && r.referenceNumber.toUpperCase() === reservationId.value.toUpperCase())
      )

      if (found) {
        reservation.value = found
        fetchError.value = null
        return
      }
    }

    // Try fetching directly by ID if GUID
    if (reservationId.value.includes('-') && reservationId.value.length >= 30) {
      try {
        const singleRes = await api.get(`/parking-reservations/${reservationId.value}`)
        if (singleRes.data && (singleRes.data.isSuccess || singleRes.status === 200)) {
          const item = singleRes.data.data || singleRes.data
          if (item) {
            reservation.value = item
            fetchError.value = null
            return
          }
        }
      } catch {}
    }

    if (!reservation.value) {
      fetchError.value = `Reservation "${reservationId.value}" was not found in records.`
    }
  } catch (err: any) {
    console.error('Error loading reservation pass:', err)
    if (!reservation.value) {
      const status = err.response?.status
      const msg = err.response?.data?.message || err.message || 'Failed to connect to service.'
      fetchError.value = status ? `API Error ${status}: ${msg}` : msg
    }
  } finally {
    isLoading.value = false
  }
}

function printPass() {
  window.print()
}

function goBack() {
  router.push('/reservations')
}

onMounted(() => {
  fetchReservation()
})
</script>

<template>
  <div class="reservation-pass-page">
    <!-- Top Header & Breadcrumbs & Action Buttons -->
    <div class="page-header no-print">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Reservations Directory
        </button>

        <div class="header-titles">
          <div class="breadcrumbs">
            <span class="crumb-link" @click="goBack">Reservations</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-active">Official Parking Pass</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-ref font-mono">{{ reservation?.referenceNumber || reservationId }}</span>
          </div>
          <h1 class="page-title">Official Parking Pass</h1>
          <p class="page-subtitle">Inspect clearance pass validity, terminal scan code, and gate authorization record.</p>
        </div>
      </div>

      <div class="header-actions">
        <button class="action-btn action-btn--primary" @click="printPass">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Print Pass</span>
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="fetchError" class="not-found-card no-print">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{{ fetchError }}</p>
      <button class="back-btn" @click="goBack">Return to directory</button>
    </div>

    <!-- Skeleton Loading -->
    <div v-else-if="isLoading" class="loading-container no-print">
      <div class="skeleton-card">
        <SkeletonLoader height="180px" borderRadius="12px" />
      </div>
      <div class="skeleton-card" style="margin-top: 20px;">
        <SkeletonLoader height="220px" borderRadius="12px" />
      </div>
    </div>

    <!-- Main Desktop Layout (Zero Repetition, Clean Light Professional) -->
    <div v-else-if="reservation" class="pass-content-layout">

      <!-- Concluded or Expired Notice Banner -->
      <div v-if="isReservationDone(reservation)" class="notice-banner no-print">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <strong class="notice-title">Schedule Concluded</strong>
          <span class="notice-desc">This parking schedule has ended. Gate terminal scanners will register this pass as completed.</span>
        </div>
      </div>

      <!-- CARD 1: Pass Clearance & QR Terminal Code -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">Pass Clearance &amp; QR Terminal Code</h3>
            <p class="card-subtitle">Official permit credentials and gate optical scanning code</p>
          </div>
        </div>

        <div class="qr-overview-row">
          <!-- Left side: Clearance details -->
          <div class="qr-details-side">
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Permit Reference</span>
                <span class="detail-value font-mono font-bold text-base text-slate-800">
                  {{ reservation.referenceNumber }}
                </span>
              </div>

              <div class="detail-item">
                <span class="detail-label">Pass Type</span>
                <span class="detail-value font-semibold">
                  Official Parking Pass
                </span>
              </div>

              <div class="detail-item">
                <span class="detail-label">Clearance Status</span>
                <span class="detail-value font-bold" :style="{ color: getStatusColor(reservation) }">
                  {{ isReservationDone(reservation) ? 'Concluded' : formatStatus(reservation.status) }}
                </span>
              </div>

              <div class="detail-item">
                <span class="detail-label">Schedule Validity</span>
                <span class="detail-value font-semibold" :style="{ color: getScheduleStatus(reservation).color }">
                  {{ getScheduleStatus(reservation).label }}
                </span>
              </div>

              <div class="detail-item detail-item--full">
                <span class="detail-label">Authorized Entry Terminals</span>
                <span class="detail-value">Gate 1 (Main Entrance) &amp; Gate 2 (Guinhawa)</span>
              </div>
            </div>
          </div>

          <!-- Right side: QR Code Box -->
          <div class="qr-code-side">
            <div class="qr-frame" @click="isQrZoomed = true" title="Click to enlarge">
              <img
                :src="getQrImageUrl(reservation.referenceNumber, 280)"
                alt="Entry QR Code"
                class="qr-img"
              />
              <div class="qr-zoom-hint no-print">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <span>Enlarge</span>
              </div>
            </div>
            <span class="qr-caption no-print">Scan at campus optical reader terminal</span>
          </div>
        </div>
      </div>

      <!-- CARD 2: Schedule Window -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Schedule Window</h3>
            <p class="card-subtitle">Permitted date and time duration for campus parking access</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Permitted Date</span>
            <span class="detail-value font-semibold">
              {{ formatReservationDate(reservation.reservationDate) }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Authorized Time Slot</span>
            <span class="detail-value font-semibold text-slate-800">
              {{ formatTimeSlot(reservation.startTime, reservation.endTime) }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Clearance Tier</span>
            <span class="detail-value">
              Designated Campus Zone
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Gate Policy</span>
            <span class="detail-value">Single Authorized Session</span>
          </div>
        </div>
      </div>

      <!-- CARD 3: Applicant & Vehicle Record -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Applicant &amp; Vehicle</h3>
            <p class="card-subtitle">Registered holder identification and designated vehicle details</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Pass Holder Name</span>
            <span class="detail-value font-semibold">
              {{ reservation.userFullName || 'Campus Visitor' }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Contact Email</span>
            <span class="detail-value font-mono">
              {{ getDisplayEmail(reservation) }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Designated Vehicle Plate</span>
            <span class="detail-value font-mono font-bold text-slate-800">
              {{ reservation.plateNumber || 'N/A' }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Vehicle Brand &amp; Model</span>
            <span class="detail-value">
              {{ reservation.brand || '—' }}
            </span>
          </div>
        </div>
      </div>

      <!-- CARD 4: Purpose, Remarks & Audit History -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--slate">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Purpose &amp; Audit History</h3>
            <p class="card-subtitle">Stated entry purpose, audit timestamps, and security inspection notes</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item detail-item--full" v-if="reservation.reason">
            <span class="detail-label">Stated Purpose of Campus Entry</span>
            <div class="text-callout-box">
              <p class="text-callout-body">{{ reservation.reason }}</p>
            </div>
          </div>

          <div class="detail-item" v-if="reservation.createdAt">
            <span class="detail-label">Submitted On</span>
            <span class="detail-value">
              {{ new Date(reservation.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }}
            </span>
          </div>

          <div class="detail-item" v-if="reservation.approvedAt">
            <span class="detail-label">Approved On</span>
            <span class="detail-value">
              {{ new Date(reservation.approvedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }}
            </span>
          </div>

          <div class="detail-item detail-item--full" v-if="getDisplayNotes(reservation)">
            <span class="detail-label">Administrative Remarks</span>
            <div class="remarks-box">
              <p class="remarks-text">{{ getDisplayNotes(reservation) }}</p>
            </div>
          </div>

          <div class="detail-item detail-item--full">
            <span class="detail-label">Gate Verification Protocol</span>
            <div class="protocol-box">
              <ol class="protocol-list">
                <li>Driver presents digital pass or QR printout at gate terminal scanner.</li>
                <li>Security officer confirms physical plate matches <strong class="font-mono">{{ reservation.plateNumber || 'registered plate' }}</strong>.</li>
                <li>In case of reader downtime, guard verifies reference <strong class="font-mono">{{ reservation.referenceNumber }}</strong> in Guard Station terminal.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Fullscreen QR Zoom Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isQrZoomed && reservation" class="zoom-modal-backdrop" @click="isQrZoomed = false">
          <div class="zoom-modal-card" @click.stop>
            <div class="zoom-modal-header">
              <h3 class="zoom-modal-title">Gate Optical Scan Code</h3>
              <button class="zoom-close-btn" @click="isQrZoomed = false">&times;</button>
            </div>
            <img
              :src="getQrImageUrl(reservation.referenceNumber, 480)"
              alt="QR Code"
              class="zoom-qr-img"
            />
            <p class="zoom-ref-code font-mono">{{ reservation.referenceNumber }}</p>
            <div class="zoom-modal-footer">
              <button class="action-btn action-btn--primary" @click="isQrZoomed = false">
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.reservation-pass-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  width: fit-content;
}

.back-btn:hover {
  color: var(--color-primary, #7B1113);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-muted, #64748b);
}

.crumb-link {
  cursor: pointer;
  transition: color 150ms ease;
}

.crumb-link:hover {
  color: var(--color-text, #1e293b);
}

.crumb-sep {
  opacity: 0.5;
}

.crumb-active {
  color: var(--color-text, #1e293b);
  font-weight: 600;
}

.crumb-ref {
  color: var(--color-primary, #7B1113);
  font-weight: 700;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #1e293b);
  margin: 0;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: var(--radius-button, 8px);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text, #1e293b);
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.action-btn--primary {
  background: var(--btn-primary-bg, #7B1113);
  border-color: var(--btn-primary-bg, #7B1113);
  color: #ffffff;
}

.action-btn--primary:hover {
  background: var(--btn-primary-hover, #6C0F11);
}

/* Skeletons & Not Found */
.loading-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
}

.not-found-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-muted, #64748b);
  font-size: 14px;
}

/* Notice Banner */
.notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-card, 16px);
  color: #64748b;
}

.notice-title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #1e293b);
}

.notice-desc {
  font-size: 13px;
}

/* Main Content Layout */
.pass-content-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Form Card (Desktop Web Admin Pattern matching VehicleDetailPage and EditUserPage) */
.form-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  margin-bottom: 20px;
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
  background: rgba(123, 17, 19, 0.08);
  color: var(--color-primary, #7B1113);
}

.card-icon-badge--purple {
  background: rgba(147, 51, 234, 0.1);
  color: #9333ea;
}

.card-icon-badge--orange {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.card-icon-badge--slate {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #1e293b);
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-muted, #64748b);
  margin: 2px 0 0 0;
}

/* Card 1: QR Overview Row */
.qr-overview-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
}

@media (max-width: 768px) {
  .qr-overview-row {
    flex-direction: column-reverse;
  }
}

.qr-details-side {
  flex: 1;
}

.qr-code-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.qr-frame {
  position: relative;
  width: 170px;
  height: 170px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 150ms ease;
}

.qr-frame:hover {
  transform: scale(1.02);
}

.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.qr-zoom-hint {
  position: absolute;
  inset: 0;
  background: rgba(30, 41, 59, 0.7);
  border-radius: 10px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 150ms ease;
}

.qr-frame:hover .qr-zoom-hint {
  opacity: 1;
}

.qr-caption {
  font-size: 11.5px;
  color: var(--color-muted, #64748b);
  margin-top: 8px;
  text-align: center;
}

/* Details Grid */
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 32px;
}

@media (max-width: 640px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item--full {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
}

.detail-value {
  font-size: 14.5px;
  color: var(--color-text, #1e293b);
}

/* Callout Boxes */
.text-callout-box {
  background: #f8fafc;
  border-left: 3px solid var(--color-primary, #7B1113);
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  margin-top: 4px;
}

.text-callout-body {
  font-size: 13.5px;
  color: var(--color-text, #1e293b);
  margin: 0;
  line-height: 1.5;
}

.remarks-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 4px;
}

.remarks-text {
  font-size: 13px;
  color: #78350f;
  margin: 0;
  line-height: 1.45;
}

.protocol-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 18px;
  margin-top: 4px;
}

.protocol-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text, #1e293b);
  line-height: 1.45;
}

/* Fullscreen Zoom Modal */
.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 16px;
}

.zoom-modal-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15);
}

.zoom-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.zoom-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #1e293b);
  margin: 0;
}

.zoom-close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}

.zoom-qr-img {
  width: 260px;
  height: 260px;
  margin: 0 auto 12px;
  display: block;
}

.zoom-ref-code {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-primary, #7B1113);
  margin: 0 0 16px;
}

.zoom-modal-footer {
  display: flex;
  gap: 10px;
}

.zoom-modal-footer .action-btn {
  flex: 1;
  justify-content: center;
}

/* Print Styles */
@media print {
  .no-print {
    display: none !important;
  }

  .reservation-pass-page {
    padding: 0 !important;
  }

  .form-card {
    border: 1px solid #000000 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    margin-bottom: 20px;
  }
}
</style>
