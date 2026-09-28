<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const route = useRoute()
const router = useRouter()
const reservationId = computed(() => String(route.params.id || ''))

const reservation = ref<ParkingReservationItem | null>(null)
const isLoading = ref(true)
const fetchError = ref<string | null>(null)
const isCopied = ref(false)
const isLinkCopied = ref(false)
const isQrZoomed = ref(false)
const toastMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null)

function showToast(text: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = { text, type }
  setTimeout(() => {
    toastMessage.value = null
  }, 3500)
}

function copyRef(refNum?: string) {
  if (!refNum) return
  navigator.clipboard.writeText(refNum)
  isCopied.value = true
  showToast('Permit reference number copied to clipboard!')
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

function copyPassLink() {
  navigator.clipboard.writeText(window.location.href)
  isLinkCopied.value = true
  showToast('Pass URL link copied to clipboard!')
  setTimeout(() => {
    isLinkCopied.value = false
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

function parseReservationStartDateTime(dateStr?: string, startTimeStr?: string): Date | null {
  if (!dateStr) return null
  const end = parseReservationEndDateTime(dateStr, startTimeStr)
  return end
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

function getScheduleStatus(item: ParkingReservationItem | null): { label: string; tone: 'active' | 'upcoming' | 'concluded' | 'rejected' } {
  if (!item) return { label: 'Unknown', tone: 'concluded' }
  const rawStatus = String(item.status ?? '').toLowerCase()
  if (rawStatus === 'rejected' || item.status === 2) return { label: 'Application Declined', tone: 'rejected' }
  if (rawStatus === 'cancelled' || item.status === 3) return { label: 'Reservation Cancelled', tone: 'rejected' }
  
  if (isReservationDone(item)) {
    return { label: 'Schedule Concluded', tone: 'concluded' }
  }

  const now = new Date()
  const start = parseReservationStartDateTime(item.reservationDate, item.startTime)
  if (start && now < start) {
    return { label: 'Upcoming Schedule', tone: 'upcoming' }
  }

  return { label: 'Active & Valid for Entry', tone: 'active' }
}

function formatStatus(status?: ReservationStatusType): string {
  if (status === 0 || String(status).toLowerCase() === 'pending') return 'Pending'
  if (status === 1 || String(status).toLowerCase() === 'approved') return 'Approved'
  if (status === 2 || String(status).toLowerCase() === 'rejected') return 'Rejected'
  if (status === 3 || String(status).toLowerCase() === 'cancelled') return 'Cancelled'
  if (status === 4 || String(status).toLowerCase() === 'done' || String(status).toLowerCase() === 'completed') return 'Done'
  if (String(status).toLowerCase() === 'expired') return 'Expired'
  return String(status || 'Pending')
}

function getStatusKey(target?: ReservationStatusType | ParkingReservationItem): string {
  if (target && typeof target === 'object' && 'reservationDate' in target) {
    if (isReservationDone(target as ParkingReservationItem)) {
      const raw = formatStatus(target.status)
      return raw === 'Pending' ? 'expired' : 'done'
    }
    return formatStatus(target.status).toLowerCase()
  }
  return formatStatus(target as ReservationStatusType).toLowerCase()
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

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

function getDisplayEmail(item: ParkingReservationItem | null): string {
  if (!item) return 'user@bulsu.edu.ph'
  if (item.adminNotes && item.adminNotes.includes('[NotifyEmail:')) {
    const match = item.adminNotes.match(/\[NotifyEmail:(.*?)\]/)
    if (match && match[1]) return match[1].trim()
  }
  return item.userEmail || 'user@bulsu.edu.ph'
}

function getDisplayNotes(item: ParkingReservationItem | null): string {
  if (!item || !item.adminNotes) return 'No administrative remarks recorded.'
  return item.adminNotes.replace(/\[NotifyEmail:.*?\]/g, '').trim() || 'No administrative remarks recorded.'
}

function getUserInitials(name?: string): string {
  if (!name) return 'PF'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getQrImageUrl(refNum?: string, size = 340): string {
  if (!refNum) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(refNum)}`
}

function downloadQrCode() {
  if (!reservation.value?.referenceNumber) return
  const url = getQrImageUrl(reservation.value.referenceNumber, 800)
  window.open(url, '_blank')
}

function printPass() {
  window.print()
}

function goBack() {
  router.push('/reservations')
}

async function fetchReservation() {
  if (!reservationId.value) {
    fetchError.value = 'Invalid reservation ID.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  fetchError.value = null

  try {
    const response = await api.get(`/parking-reservations/${reservationId.value}`)
    if (response.data && response.data.isSuccess && response.data.data) {
      reservation.value = response.data.data
    } else if (response.data && response.data.data) {
      reservation.value = response.data.data
    } else if (response.data && response.data.referenceNumber) {
      reservation.value = response.data
    } else {
      fetchError.value = 'Reservation pass data not found.'
    }
  } catch (err: any) {
    console.error('Error fetching reservation pass:', err)
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || 'Failed to load reservation'
    fetchError.value = status === 404 ? 'Reservation record not found.' : `API Error: ${msg}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchReservation()
})
</script>

<template>
  <div class="reservation-pass-page">
    
    <!-- Top Action / Breadcrumbs Header (hidden on print) -->
    <div class="pass-page-header no-print">
      <div class="header-left">
        <button class="back-nav-btn" @click="goBack" title="Back to Reservations list">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Reservations Directory</span>
        </button>

        <div class="header-titles">
          <div class="breadcrumbs">
            <span class="crumb-link" @click="goBack">Reservations</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-active">Clearance Pass</span>
            <span class="crumb-sep" v-if="reservation">/</span>
            <span class="crumb-ref monospace" v-if="reservation">{{ reservation.referenceNumber }}</span>
          </div>

          <div class="title-with-tags">
            <h1 class="page-title">Campus Parking Clearance Pass</h1>
            
            <div class="tags-group" v-if="reservation">
              <!-- Reference Number Badge with Copy -->
              <div class="ref-pill" @click="copyRef(reservation.referenceNumber)" title="Click to copy permit reference number">
                <span class="ref-pill-label">REF:</span>
                <span class="ref-pill-code monospace">{{ reservation.referenceNumber }}</span>
                <svg v-if="!isCopied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <!-- Status Badge -->
              <span class="status-badge" :class="`status-badge--${getStatusKey(reservation)}`">
                <span class="status-dot" v-if="getStatusKey(reservation) === 'approved'"></span>
                {{ getStatusKey(reservation) === 'done' ? 'Concluded' : (getStatusKey(reservation) === 'expired' ? 'Expired' : formatStatus(reservation.status)) }}
              </span>

              <!-- Type Badge -->
              <span class="type-badge" :class="(reservation.type === 1 || reservation.type === 'Special') ? 'type-badge--special' : 'type-badge--normal'">
                {{ (reservation.type === 1 || reservation.type === 'Special') ? 'Special Permit (Fee Exempt)' : 'Standard Visitor Pass' }}
              </span>
            </div>
          </div>
          <p class="page-subtitle">Official Vehicle Entry Clearance Certificate • Office of Security & Safety</p>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="header-actions" v-if="reservation">
        <button class="action-btn action-btn--secondary" @click="copyPassLink" title="Copy shareable link to this pass">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span>{{ isLinkCopied ? 'Link Copied!' : 'Share Pass' }}</span>
        </button>

        <button class="action-btn action-btn--secondary" @click="downloadQrCode" title="Download High-Res QR image">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download QR</span>
        </button>

        <button class="action-btn action-btn--primary" @click="printPass" title="Print Official Permit Pass">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Print Official Pass</span>
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast-alert" :class="`toast--${toastMessage.type}`">
        <svg v-if="toastMessage.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ toastMessage.text }}</span>
      </div>
    </Transition>

    <!-- Error State -->
    <div v-if="fetchError" class="pass-error-container no-print">
      <div class="pass-error-card">
        <div class="error-icon-circle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="error-title">Unable to Load Pass</h2>
        <p class="error-message">{{ fetchError }}</p>
        <div class="error-actions">
          <button class="action-btn action-btn--secondary" @click="goBack">Back to Reservations</button>
          <button class="action-btn action-btn--primary" @click="fetchReservation">Retry</button>
        </div>
      </div>
    </div>

    <!-- Skeleton Loading State (Full Page Grid) -->
    <div v-else-if="isLoading" class="pass-loading-grid no-print">
      <div class="skeleton-col-left">
        <SkeletonLoader height="520px" borderRadius="18px" />
      </div>
      <div class="skeleton-col-right">
        <SkeletonLoader height="160px" borderRadius="16px" />
        <SkeletonLoader height="160px" borderRadius="16px" />
        <SkeletonLoader height="160px" borderRadius="16px" />
      </div>
    </div>

    <!-- EXPANDED FULL-PAGE MAIN CONTENT AREA -->
    <div v-else-if="reservation" class="pass-fullpage-layout">

      <!-- Inactive / Concluded Pass Warning Banner -->
      <div v-if="isReservationDone(reservation)" class="pass-warning-banner no-print">
        <div class="warning-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <strong class="warning-banner-title">Reservation Schedule Concluded / Expired</strong>
          <p class="warning-banner-desc">This parking schedule ended on {{ formatReservationDate(reservation.reservationDate) }} at {{ formatTimeSlot(reservation.startTime, reservation.endTime) }}. The gate access QR code is now considered inactive by campus security gate terminals.</p>
        </div>
      </div>

      <!-- 2-COLUMN EXPANSIVE DASHBOARD GRID -->
      <div class="pass-dashboard-grid">
        
        <!-- LEFT COLUMN: THE DIGITAL PASS CARD SHOWCASE -->
        <div class="pass-grid-col-left">
          
          <div class="pass-showcase-wrapper" id="printable-ticket">
            
            <!-- BulSU Digital Keycard Card -->
            <div class="qr-ticket-card">
              
              <!-- Ticket Header (BulSU Crimson Gradient) -->
              <div class="qr-ticket-header">
                <div class="qr-ticket-header-top">
                  <div class="qr-brand-badge">
                    <div class="qr-brand-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                      </svg>
                    </div>
                    <div class="qr-brand-text">
                      <span class="qr-brand-org">BULACAN STATE UNIVERSITY</span>
                      <span class="qr-brand-sub">ParkFlow Security & Gate Access Pass</span>
                    </div>
                  </div>

                  <span class="qr-header-chip no-print">ENTRY PERMIT</span>
                </div>

                <div class="qr-ticket-header-mid">
                  <div class="qr-pass-title-row">
                    <h2 class="qr-ticket-pass-name">
                      {{ (reservation.type === 1 || reservation.type === 'Special') ? 'Special Campus Parking Pass' : 'Campus Visitor Entry Permit' }}
                    </h2>
                    <span class="qr-ticket-status-pill" :class="`qr-ticket-status-pill--${getStatusKey(reservation)}`">
                      <span class="status-pulse-dot" v-if="getStatusKey(reservation) === 'approved'"></span>
                      {{ getStatusKey(reservation) === 'done' ? 'Concluded' : (getStatusKey(reservation) === 'expired' ? 'Expired' : formatStatus(reservation.status)) }}
                    </span>
                  </div>

                  <div class="qr-ticket-ref-bar">
                    <span class="qr-ticket-ref-label">PERMIT NO.</span>
                    <div class="qr-ticket-ref-code">
                      <span class="monospace">{{ reservation.referenceNumber }}</span>
                      <button class="qr-ticket-copy-btn no-print" @click="copyRef(reservation.referenceNumber)" title="Copy permit number">
                        <svg v-if="!isCopied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ticket Notch Divider (Boarding Pass Punchout Effect) -->
              <div class="ticket-notch-divider">
                <div class="ticket-notch ticket-notch--left"></div>
                <div class="ticket-dashed-line"></div>
                <div class="ticket-notch ticket-notch--right"></div>
              </div>

              <!-- Ticket Body -->
              <div class="qr-ticket-body">
                
                <!-- QR Hero Section with Alignment Corners -->
                <div class="qr-code-showcase">
                  <div class="qr-box-wrapper" @click="isQrZoomed = true" title="Click to view full-resolution QR code">
                    <div class="qr-corner qr-corner--tl"></div>
                    <div class="qr-corner qr-corner--tr"></div>
                    <div class="qr-corner qr-corner--bl"></div>
                    <div class="qr-corner qr-corner--br"></div>
                    
                    <img
                      :src="getQrImageUrl(reservation.referenceNumber, 320)"
                      alt="Digital Pass QR Code"
                      class="qr-code-matrix"
                    />

                    <div class="qr-zoom-badge no-print">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <line x1="11" y1="8" x2="11" y2="14"/>
                        <line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                      <span>Enlarge QR</span>
                    </div>
                  </div>
                  
                  <div class="qr-instructions">
                    <div class="qr-gate-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                      </svg>
                      <span>Valid at Campus Gate Readers</span>
                    </div>
                    <p class="qr-subtext">Scan at terminal or show to security guard on duty</p>
                  </div>
                </div>

                <!-- Compact Summary Strip on Ticket -->
                <div class="qr-mini-specs">
                  <div class="mini-spec-row">
                    <span class="mini-spec-label">HOLDER:</span>
                    <span class="mini-spec-value font-600">{{ reservation.userFullName || 'Campus Visitor' }}</span>
                  </div>
                  <div class="mini-spec-row">
                    <span class="mini-spec-label">DATE:</span>
                    <span class="mini-spec-value text-amber font-600">{{ formatShortDate(reservation.reservationDate) }}</span>
                  </div>
                  <div class="mini-spec-row">
                    <span class="mini-spec-label">WINDOW:</span>
                    <span class="mini-spec-value text-primary font-600">{{ formatTimeSlot(reservation.startTime, reservation.endTime) }}</span>
                  </div>
                  <div class="mini-spec-row" v-if="reservation.plateNumber">
                    <span class="mini-spec-label">PLATE:</span>
                    <span class="mini-spec-value font-600">{{ reservation.plateNumber }}</span>
                  </div>
                </div>

                <!-- Barcode Simulation for Authentic Paper/Digital Pass Look -->
                <div class="qr-barcode-strip">
                  <div class="barcode-lines"></div>
                  <span class="barcode-digits monospace">{{ reservation.referenceNumber }}</span>
                </div>

              </div>

              <!-- Ticket Action Footer (hidden on print) -->
              <div class="qr-ticket-footer no-print">
                <button class="btn-ticket-download" @click="downloadQrCode" title="Download High-Res QR">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download QR
                </button>
                <button class="btn-ticket-print" @click="printPass" title="Print Digital Permit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Print Pass
                </button>
              </div>

            </div>

          </div>

        </div>

        <!-- RIGHT COLUMN: EXPANDED CLEARANCE & PROFILE DOSSIER -->
        <div class="pass-grid-col-right no-print">
          
          <!-- Card 1: Pass Holder & Beneficiary Profile -->
          <div class="dossier-card">
            <div class="dossier-header">
              <div class="dossier-header-left">
                <div class="dossier-icon-box dossier-icon--crimson">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h3 class="dossier-title">Pass Holder & Beneficiary Profile</h3>
                  <p class="dossier-subtitle">Verified applicant identity & clearance contact information</p>
                </div>
              </div>
            </div>

            <div class="dossier-body">
              <div class="user-hero-row">
                <div class="user-avatar-badge">
                  {{ getUserInitials(reservation.userFullName) }}
                </div>
                <div class="user-hero-info">
                  <h4 class="user-hero-name">{{ reservation.userFullName || 'Campus Visitor / Guest' }}</h4>
                  <div class="user-meta-chips">
                    <span class="user-email-chip">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {{ getDisplayEmail(reservation) }}
                    </span>
                    <span class="user-role-chip">
                      {{ (reservation.type === 1 || reservation.type === 'Special') ? 'Administrative / VIP' : 'Client / Visitor' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="dossier-specs-grid">
                <div class="dossier-spec-item">
                  <span class="spec-label">User Account ID</span>
                  <span class="spec-value monospace">{{ reservation.userId || 'System Admin Generated' }}</span>
                </div>
                <div class="dossier-spec-item">
                  <span class="spec-label">Notification Email</span>
                  <span class="spec-value">{{ getDisplayEmail(reservation) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Authorized Schedule & Gate Access Window -->
          <div class="dossier-card">
            <div class="dossier-header">
              <div class="dossier-header-left">
                <div class="dossier-icon-box dossier-icon--amber">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <h3 class="dossier-title">Authorized Schedule & Access Window</h3>
                  <p class="dossier-subtitle">Approved campus entry date, time slot, and operational security status</p>
                </div>
              </div>

              <!-- Live Validity Indicator -->
              <div class="validity-indicator" :class="`validity-indicator--${getScheduleStatus(reservation).tone}`">
                <span class="validity-dot"></span>
                <span>{{ getScheduleStatus(reservation).label }}</span>
              </div>
            </div>

            <div class="dossier-body">
              <div class="dossier-specs-grid">
                <div class="dossier-spec-item">
                  <span class="spec-label">Authorized Date</span>
                  <span class="spec-value font-700 text-lg">{{ formatReservationDate(reservation.reservationDate) }}</span>
                  <span class="spec-hint">Single-Day Campus Clearance</span>
                </div>

                <div class="dossier-spec-item">
                  <span class="spec-label">Access Time Slot</span>
                  <span class="spec-value font-700 text-lg text-primary">{{ formatTimeSlot(reservation.startTime, reservation.endTime) }}</span>
                  <span class="spec-hint">Strict Gate Security Window</span>
                </div>

                <div class="dossier-spec-item">
                  <span class="spec-label">Permitted Campus Gates</span>
                  <span class="spec-value">Gate 1 (Main Entrance) & Gate 2 (Guinhawa)</span>
                  <span class="spec-hint">Security scanners synchronized</span>
                </div>

                <div class="dossier-spec-item">
                  <span class="spec-label">Pass Clearance Level</span>
                  <span class="spec-value font-600">
                    {{ (reservation.type === 1 || reservation.type === 'Special') ? 'All-Zone Special Priority Access' : 'Designated Visitor Parking Areas' }}
                  </span>
                  <span class="spec-hint">Exempt from standard visitor overstay clamps</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Vehicle & Equipment Specification -->
          <div class="dossier-card">
            <div class="dossier-header">
              <div class="dossier-header-left">
                <div class="dossier-icon-box dossier-icon--blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <h3 class="dossier-title">Registered Vehicle & Equipment</h3>
                  <p class="dossier-subtitle">Designated vehicle authorized to enter under this pass</p>
                </div>
              </div>
            </div>

            <div class="dossier-body">
              <div class="vehicle-banner-row">
                <div class="license-plate-badge">
                  <span class="plate-reg">PHILIPPINES</span>
                  <span class="plate-num monospace">{{ reservation.plateNumber || 'TBA / VISITOR' }}</span>
                </div>

                <div class="vehicle-meta-info">
                  <div class="vehicle-title">
                    {{ reservation.brand || 'Designated Vehicle' }}
                  </div>
                  <div class="vehicle-sub" v-if="(reservation as any)?.vehicleQrCodeHash">
                    <span class="monospace text-xs text-muted">Vehicle Tag: {{ (reservation as any)?.vehicleQrCodeHash }}</span>
                  </div>
                  <div class="vehicle-sub" v-else>
                    <span class="text-xs text-muted">Authorized by Security Administration for guest / staff entry</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- FULL-WIDTH MAXIMIZED CARD: Purpose, Administrative Remarks & Security Protocol -->
      <div class="dossier-card dossier-card--fullwidth no-print">
        <div class="dossier-header">
          <div class="dossier-header-left">
            <div class="dossier-icon-box dossier-icon--slate">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h3 class="dossier-title">Purpose & Administrative Remarks</h3>
              <p class="dossier-subtitle">Approved campus justification, clearance audit details, and gate inspection protocol</p>
            </div>
          </div>
        </div>

        <div class="dossier-body">
          <div class="fullwidth-admin-grid">
            
            <!-- Left Column: Stated Purpose & Metadata -->
            <div class="admin-purpose-col">
              <div class="purpose-quote-box">
                <span class="purpose-quote-label">STATED PURPOSE / REASON FOR ENTRY</span>
                <p class="purpose-quote-text">"{{ reservation.reason }}"</p>
              </div>

              <div class="purpose-meta-strip">
                <div class="meta-item">
                  <span class="meta-label">Pass Clearance Level</span>
                  <span class="meta-value font-600">
                    {{ (reservation.type === 1 || reservation.type === 'Special') ? 'Special Administrative Clearance (Fee Exempt)' : 'Standard Visitor Entry Clearance' }}
                  </span>
                </div>
                <div class="meta-item" v-if="reservation.createdAt">
                  <span class="meta-label">Submitted On</span>
                  <span class="meta-value">{{ new Date(reservation.createdAt).toLocaleString() }}</span>
                </div>
                <div class="meta-item" v-if="reservation.approvedAt">
                  <span class="meta-label">Approved On</span>
                  <span class="meta-value">{{ new Date(reservation.approvedAt).toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Administrative Notes & Gate Guard Protocol -->
            <div class="admin-details-col">
              <div class="admin-remarks-card">
                <span class="spec-label">Administrative Notes & Remarks</span>
                <p class="remarks-content italic-text">{{ getDisplayNotes(reservation) }}</p>
              </div>

              <!-- Guard Checklist Guidelines -->
              <div class="guard-checklist-box">
                <h5 class="guard-checklist-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Gate Guard Inspection Protocol
                </h5>
                <ul class="guard-checklist-items">
                  <li>Scan the QR code using the ParkFlow terminal handheld scanner at campus gate.</li>
                  <li>Verify plate number matches vehicle on approach.</li>
                  <li>In case of scanner terminal failure, verify reference number <strong>{{ reservation.referenceNumber }}</strong> manually.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>

    <!-- FULLSCREEN QR ZOOM MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isQrZoomed && reservation" class="zoom-modal-backdrop" @click="isQrZoomed = false">
          <div class="zoom-modal-card" @click.stop>
            <div class="zoom-modal-header">
              <h3 class="zoom-modal-title">QR Gate Pass - High Resolution</h3>
              <button class="zoom-close-btn" @click="isQrZoomed = false">&times;</button>
            </div>
            <div class="zoom-modal-body">
              <img
                :src="getQrImageUrl(reservation.referenceNumber, 520)"
                alt="Enlarged QR Code"
                class="zoom-qr-img"
              />
              <p class="zoom-ref-code monospace">{{ reservation.referenceNumber }}</p>
              <p class="zoom-caption">Authorized for BulSU Campus Vehicle Gate Scanning</p>
            </div>
            <div class="zoom-modal-footer">
              <button class="action-btn action-btn--secondary" @click="isQrZoomed = false">Close</button>
              <button class="action-btn action-btn--primary" @click="downloadQrCode">Download Image</button>
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
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 8px 24px 60px;
}

/* ==========================================================================
   TOP HEADER & ACTIONS
   ========================================================================== */
.pass-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.back-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
  transition: color 150ms ease;
  width: fit-content;
}

.back-nav-btn:hover {
  color: #d22730;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.crumb-link {
  cursor: pointer;
  transition: color 150ms ease;
}

.crumb-link:hover {
  color: #d22730;
}

.crumb-sep {
  opacity: 0.5;
}

.crumb-active {
  color: var(--color-text, #0f172a);
  font-weight: 600;
}

.crumb-ref {
  color: #d22730;
  font-weight: 700;
}

.title-with-tags {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  margin: 0;
  letter-spacing: -0.5px;
}

.tags-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ref-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.ref-pill:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.ref-pill-label {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.5px;
}

.ref-pill-code {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.status-badge--approved {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.status-badge--pending {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.status-badge--rejected,
.status-badge--cancelled {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.status-badge--done,
.status-badge--expired {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #059669;
  animation: pulse-dot 1.8s infinite;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.type-badge--special {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.type-badge--normal {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.action-btn--secondary {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #cbd5e1);
  color: var(--color-text, #334155);
}

.action-btn--secondary:hover {
  background: var(--color-surface-hover, #f8fafc);
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.action-btn--primary {
  background: linear-gradient(135deg, #d22730 0%, #b01e26 100%);
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.28);
}

.action-btn--primary:hover {
  box-shadow: 0 6px 16px rgba(210, 39, 48, 0.42);
  transform: translateY(-1px);
}

/* Warning Banner */
.pass-warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 5px solid #f59e0b;
  padding: 14px 20px;
  border-radius: 12px;
  color: #92400e;
  width: 100%;
}

.warning-banner-icon {
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-banner-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #b45309;
}

.warning-banner-desc {
  font-size: 13px;
  margin: 4px 0 0;
  line-height: 1.5;
  color: #92400e;
}

/* Toast */
.toast-alert {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  z-index: 9999;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.toast--success {
  background: #065f46;
  color: #ffffff;
}

.toast--error {
  background: #991b1b;
  color: #ffffff;
}

/* Error Card */
.pass-error-container {
  display: flex;
  justify-content: center;
  padding: 40px 16px;
}

.pass-error-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  padding: 36px 28px;
  max-width: 440px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
}

.error-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  margin: 0;
}

.error-message {
  font-size: 13.5px;
  color: var(--color-text-muted, #64748b);
  margin: 0;
}

.error-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* Loading */
.pass-loading-grid {
  display: grid;
  grid-template-columns: 440px 1fr;
  gap: 24px;
  width: 100%;
}

.skeleton-col-left,
.skeleton-col-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ==========================================================================
   2-COLUMN FULL-PAGE EXPANSIVE DASHBOARD GRID
   ========================================================================== */
.pass-fullpage-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.pass-dashboard-grid {
  display: grid;
  grid-template-columns: 440px 1fr;
  gap: 24px;
  width: 100%;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .pass-dashboard-grid {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}

/* ==========================================================================
   LEFT COLUMN: TICKET CARD SHOWCASE (MAXIMIZED VERTICAL HEIGHT)
   ========================================================================== */
.pass-grid-col-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.pass-showcase-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.qr-ticket-card {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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

.qr-header-chip {
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #ffffff;
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
  font-size: 17px;
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

.qr-ticket-status-pill--done,
.qr-ticket-status-pill--expired {
  background: #64748b;
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

/* Notch Divider */
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
  background: var(--color-background, #f1f5f9);
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
  padding: 18px 24px 22px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
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
  width: 220px;
  height: 220px;
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

/* Mini specs on pass */
.qr-mini-specs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 10px 14px;
}

.mini-spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
}

.mini-spec-label {
  font-size: 9.5px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.6px;
}

.mini-spec-value {
  color: #0f172a;
}

/* Barcode */
.qr-barcode-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 2px;
  border-top: 1px dashed #e2e8f0;
}

.barcode-lines {
  height: 22px;
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
  padding: 14px 20px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
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
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
  flex: 1;
  justify-content: center;
}

.btn-ticket-download:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-ticket-print {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: linear-gradient(135deg, #d22730 0%, #b01e26 100%);
  border: none;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(210, 39, 48, 0.25);
  transition: all 150ms ease;
  flex: 1;
  justify-content: center;
}

.btn-ticket-print:hover {
  box-shadow: 0 6px 14px rgba(210, 39, 48, 0.4);
}

/* ==========================================================================
   RIGHT COLUMN: EXPANDED DOSSIER CARDS
   ========================================================================== */
.pass-grid-col-right {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dossier-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.dossier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
}

.dossier-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dossier-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dossier-icon--crimson {
  background: #fee2e2;
  color: #dc2626;
}

.dossier-icon--amber {
  background: #fef3c7;
  color: #d97706;
}

.dossier-icon--blue {
  background: #e0f2fe;
  color: #0284c7;
}

.dossier-icon--slate {
  background: #f1f5f9;
  color: #475569;
}

.dossier-title {
  font-size: 15.5px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  margin: 0;
}

.dossier-subtitle {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  margin: 2px 0 0;
}

.validity-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.validity-indicator--active {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.validity-indicator--upcoming {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.validity-indicator--concluded {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.validity-indicator--rejected {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.validity-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.dossier-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* User hero row */
.user-hero-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 14px 18px;
}

.user-avatar-badge {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #d22730 0%, #8b131a 100%);
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.25);
  flex-shrink: 0;
}

.user-hero-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-hero-name {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.user-meta-chips {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-email-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #64748b;
}

.user-role-chip {
  display: inline-flex;
  align-items: center;
  background: #e2e8f0;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

/* Specs Grid */
.dossier-specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 640px) {
  .dossier-specs-grid {
    grid-template-columns: 1fr;
  }
}

.dossier-spec-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 12px 14px;
}

.spec-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #94a3b8;
  text-transform: uppercase;
}

.spec-value {
  font-size: 13.5px;
  color: #0f172a;
  font-weight: 600;
}

.spec-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.text-lg {
  font-size: 15px;
}

.font-700 {
  font-weight: 700;
}

.font-600 {
  font-weight: 600;
}

.text-amber {
  color: #d97706;
}

.text-primary {
  color: #0284c7;
}

.italic-text {
  font-style: italic;
  color: #475569;
}

/* Vehicle banner row */
.vehicle-banner-row {
  display: flex;
  align-items: center;
  gap: 18px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 14px 18px;
}

.license-plate-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  background: #ffffff;
  border: 2px solid #0f172a;
  border-radius: 6px;
  padding: 4px 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.plate-reg {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #64748b;
}

.plate-num {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #0f172a;
  line-height: 1.2;
}

.vehicle-meta-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vehicle-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.vehicle-sub {
  font-size: 12px;
  color: #64748b;
}

/* Purpose Quote Box */
.purpose-quote-box {
  background: #f8fafc;
  border-left: 4px solid #d22730;
  border-radius: 8px;
  padding: 14px 18px;
}

.purpose-quote-label {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #d22730;
  display: block;
  margin-bottom: 4px;
}

.purpose-quote-text {
  font-size: 14px;
  color: #1e293b;
  margin: 0;
  line-height: 1.5;
  font-weight: 500;
}

/* Guard Checklist Box */
.guard-checklist-box {
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 12px 16px;
}

.guard-checklist-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #991b1b;
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.guard-checklist-items {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #7f1d1d;
  line-height: 1.5;
}

/* Zoom Modal */
.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.zoom-modal-card {
  background: #ffffff;
  border-radius: 20px;
  max-width: 440px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
}

.zoom-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.zoom-modal-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.zoom-close-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}

.zoom-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  gap: 10px;
}

.zoom-qr-img {
  width: 280px;
  height: 280px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.zoom-ref-code {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #0f172a;
  background: #f1f5f9;
  padding: 4px 14px;
  border-radius: 6px;
}

.zoom-caption {
  font-size: 11.5px;
  color: #64748b;
  margin: 0;
  text-align: center;
}

.zoom-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

/* ==========================================================================
   FULL-WIDTH MAXIMIZED CARD STYLES
   ========================================================================== */
.dossier-card--fullwidth {
  width: 100%;
}

.fullwidth-admin-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 24px;
  width: 100%;
}

@media (max-width: 900px) {
  .fullwidth-admin-grid {
    grid-template-columns: 1fr;
  }
}

.admin-purpose-col,
.admin-details-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.purpose-meta-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 14px 18px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-label {
  font-size: 10.5px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.meta-value {
  color: #0f172a;
}

.admin-remarks-card {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.remarks-content {
  font-size: 13.5px;
  color: #334155;
  margin: 0;
  line-height: 1.5;
}

/* ==========================================================================
   PRINT STYLES FOR OFFICIAL PASS
   ========================================================================== */
@media print {
  body * {
    visibility: hidden;
  }
  .no-print {
    display: none !important;
  }
  #printable-ticket,
  #printable-ticket * {
    visibility: visible;
  }
  #printable-ticket {
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
  .ticket-notch {
    background: #ffffff !important;
  }
}
</style>
