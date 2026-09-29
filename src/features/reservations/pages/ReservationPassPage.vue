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

function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return 'P'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  }
  return parts[0]![0]!.toUpperCase()
}

function getDisplayEmail(item?: ParkingReservationItem | null): string {
  if (!item) return 'N/A'
  if (item.userEmail && item.userEmail.trim()) return item.userEmail
  const ref = item.referenceNumber || 'RES'
  return `${ref.toLowerCase()}@bulsu.edu.ph`
}

function getDisplayNotes(item?: ParkingReservationItem | null): string {
  if (!item) return 'Standard system automated validation pass.'
  if (item.adminNotes && item.adminNotes.trim()) return item.adminNotes
  if (item.type === 1 || item.type === 'Special') {
    return 'Special campus parking priority pass. Authorized by BulSU Security Administration.'
  }
  return 'Approved standard visitor parking clearance. Present QR code at campus entry terminals.'
}

function getQrImageUrl(refCode: string, size: number = 320): string {
  const cleanRef = (refCode || 'PARKFLOW').trim()
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(cleanRef)}&format=svg&qzone=1&color=0f172a`
}

async function fetchReservation() {
  if (!reservationId.value) {
    fetchError.value = 'Invalid reservation reference.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  fetchError.value = null

  try {
    const response = await api.get('/reservations')
    if (response.data && response.data.isSuccess && Array.isArray(response.data.data)) {
      const items: ParkingReservationItem[] = response.data.data
      const found = items.find(
        (r) =>
          String(r.id) === reservationId.value ||
          (r.referenceNumber && r.referenceNumber.toUpperCase() === reservationId.value.toUpperCase())
      )

      if (found) {
        reservation.value = found
      } else {
        fetchError.value = `Reservation "${reservationId.value}" was not found in database records.`
      }
    } else {
      fetchError.value = 'Failed to retrieve reservations database.'
    }
  } catch (err: any) {
    console.error('Error loading reservation pass:', err)
    fetchError.value = err.response?.data?.message || 'Failed to connect to ParkFlow service.'
  } finally {
    isLoading.value = false
  }
}

function downloadQrCode() {
  if (!reservation.value) return
  const refCode = reservation.value.referenceNumber || 'PARKFLOW-PASS'
  const qrUrl = getQrImageUrl(refCode, 600)
  
  const link = document.createElement('a')
  link.href = qrUrl
  link.download = `ParkFlow-Pass-${refCode}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  showToast('QR code image download initiated!')
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
    <!-- TOP HEADER WITH BREADCRUMBS & ACTIONS -->
    <div class="pass-page-header no-print">
      <div class="header-left">
        <button class="back-nav-btn" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to Reservations Directory</span>
        </button>
        <div class="header-titles">
          <div class="breadcrumbs">
            <span class="crumb-link" @click="goBack">Reservations</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-active">Official Parking Pass</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-ref font-mono">{{ reservation?.referenceNumber || reservationId }}</span>
          </div>
          <div class="title-with-tags">
            <h1 class="page-title">Official Campus Parking Permit</h1>
            <div v-if="reservation" class="tags-group">
              <span class="type-tag" :class="`type-tag--${reservation.type === 1 || reservation.type === 'Special' ? 'special' : 'visitor'}`">
                {{ reservation.type === 1 || reservation.type === 'Special' ? 'Special Priority Pass' : 'Visitor Entry Pass' }}
              </span>
              <span class="status-tag" :class="`status-tag--${getStatusKey(reservation)}`">
                {{ getStatusKey(reservation) === 'done' ? 'Concluded' : (getStatusKey(reservation) === 'expired' ? 'Expired' : formatStatus(reservation.status)) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="header-right-actions">
        <button class="btn-action btn-action--secondary" @click="copyPassLink" title="Share direct pass link">
          <svg v-if="!isLinkCopied" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{{ isLinkCopied ? 'Link Copied' : 'Share Link' }}</span>
        </button>

        <button class="btn-action btn-action--secondary" @click="downloadQrCode" title="Download QR Image">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download QR</span>
        </button>

        <button class="btn-action btn-action--primary" @click="printPass" title="Print Digital Permit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Print Permit</span>
        </button>
      </div>
    </div>

    <!-- TOAST NOTIFICATION -->
    <Transition name="toast-fade">
      <div v-if="toastMessage" class="toast-popup" :class="`toast-popup--${toastMessage.type}`">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>{{ toastMessage.text }}</span>
      </div>
    </Transition>

    <!-- ERROR STATE -->
    <div v-if="fetchError" class="pass-error-state">
      <div class="error-card">
        <div class="error-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="error-title">Unable to Load Pass</h2>
        <p class="error-message">{{ fetchError }}</p>
        <div class="error-actions">
          <button class="action-btn action-btn--secondary" @click="goBack">Back to Directory</button>
          <button class="action-btn action-btn--primary" @click="fetchReservation">Retry</button>
        </div>
      </div>
    </div>

    <!-- SKELETON LOADING STATE -->
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

    <!-- MAIN PASS CONTENT LAYOUT -->
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
          <p class="warning-banner-desc">This parking schedule ended on {{ formatReservationDate(reservation.reservationDate) }} at {{ formatTimeSlot(reservation.startTime, reservation.endTime) }}. Gate terminal scanners will consider this pass inactive.</p>
        </div>
      </div>

      <!-- 2-COLUMN MAIN DASHBOARD GRID -->
      <div class="pass-dashboard-grid">
        
        <!-- LEFT COLUMN: THE OFFICIAL DIGITAL TICKET CARD -->
        <div class="pass-grid-col-left">
          
          <div class="pass-showcase-wrapper" id="printable-ticket">
            
            <div class="official-pass-card">
              
              <!-- Pass Top Header -->
              <div class="pass-card-header">
                <div class="university-branding">
                  <div class="university-logo-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                    </svg>
                  </div>
                  <div>
                    <span class="org-name">BULACAN STATE UNIVERSITY</span>
                    <span class="org-sub">ParkFlow Smart Gate Entry Permit</span>
                  </div>
                </div>

                <div class="pass-status-pill" :class="`pass-status-pill--${getStatusKey(reservation)}`">
                  <span class="status-dot" v-if="getStatusKey(reservation) === 'approved'"></span>
                  {{ getStatusKey(reservation) === 'done' ? 'Concluded' : (getStatusKey(reservation) === 'expired' ? 'Expired' : formatStatus(reservation.status)) }}
                </div>
              </div>

              <!-- Pass Title & Reference Code Header -->
              <div class="pass-card-title-section">
                <h2 class="pass-title-text">
                  {{ (reservation.type === 1 || reservation.type === 'Special') ? 'Special Campus Parking Pass' : 'Campus Visitor Entry Permit' }}
                </h2>
                <div class="permit-code-badge">
                  <span class="code-label">PERMIT NO:</span>
                  <span class="code-val font-mono">{{ reservation.referenceNumber }}</span>
                  <button class="copy-code-btn no-print" @click="copyRef(reservation.referenceNumber)" title="Copy permit number">
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

              <!-- QR Code Container -->
              <div class="pass-qr-container">
                <div class="qr-frame" @click="isQrZoomed = true" title="Click to enlarge QR code">
                  <img
                    :src="getQrImageUrl(reservation.referenceNumber, 320)"
                    alt="Official Entry QR Code"
                    class="qr-img"
                  />
                  <div class="qr-hover-hint no-print">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/>
                      <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                    <span>Tap to Enlarge</span>
                  </div>
                </div>
                <p class="qr-instruction-text">Present this QR code to the gate terminal scanner or guard on duty</p>
              </div>

              <!-- Essential Pass Data Grid (Non-repetitive key fields) -->
              <div class="pass-key-details-grid">
                <div class="pass-detail-cell">
                  <span class="cell-label">Pass Holder</span>
                  <span class="cell-value font-semibold">{{ reservation.userFullName || 'Campus Visitor' }}</span>
                </div>

                <div class="pass-detail-cell">
                  <span class="cell-label">Vehicle Plate</span>
                  <span class="cell-value font-mono font-bold">{{ reservation.plateNumber || 'N/A' }}</span>
                </div>

                <div class="pass-detail-cell">
                  <span class="cell-label">Authorized Date</span>
                  <span class="cell-value font-semibold">{{ formatShortDate(reservation.reservationDate) }}</span>
                </div>

                <div class="pass-detail-cell">
                  <span class="cell-label">Time Window</span>
                  <span class="cell-value font-semibold text-primary">{{ formatTimeSlot(reservation.startTime, reservation.endTime) }}</span>
                </div>
              </div>

              <!-- Pass Footer Actions -->
              <div class="pass-card-footer no-print">
                <button class="footer-btn footer-btn--download" @click="downloadQrCode">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Download QR</span>
                </button>
                <button class="footer-btn footer-btn--print" @click="printPass">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  <span>Print Pass</span>
                </button>
              </div>

            </div>

          </div>

        </div>

        <!-- RIGHT COLUMN: CLEARANCE DETAILS & PERMIT DOSSIER -->
        <div class="pass-grid-col-right no-print">
          
          <!-- Card 1: Permit Holder & Vehicle Info -->
          <div class="info-card">
            <div class="info-card-header">
              <div class="header-icon-badge header-icon-badge--red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 class="info-card-title">Applicant & Vehicle Info</h3>
                <p class="info-card-sub">Registered owner details and designated vehicle</p>
              </div>
            </div>

            <div class="info-card-body">
              <div class="holder-profile-strip">
                <div class="avatar-initials">
                  {{ getUserInitials(reservation.userFullName) }}
                </div>
                <div class="holder-text-info">
                  <h4 class="holder-name">{{ reservation.userFullName || 'Campus Visitor' }}</h4>
                  <p class="holder-email">{{ getDisplayEmail(reservation) }}</p>
                </div>
              </div>

              <div class="info-fields-grid">
                <div class="info-field">
                  <span class="field-label">Vehicle Plate & Model</span>
                  <span class="field-value font-semibold">
                    <span class="font-mono font-bold">{{ reservation.plateNumber || 'N/A' }}</span>
                    <span v-if="reservation.brand" class="text-slate-500 font-normal"> — {{ reservation.brand }}</span>
                  </span>
                </div>
                <div class="info-field">
                  <span class="field-label">Account Role</span>
                  <span class="field-value font-medium">
                    {{ (reservation.type === 1 || reservation.type === 'Special') ? 'Administrative / VIP Priority' : 'Visitor / Client Permit' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Gate Clearance & Schedule Window -->
          <div class="info-card">
            <div class="info-card-header">
              <div class="header-icon-badge header-icon-badge--amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <h3 class="info-card-title">Gate Clearance & Schedule Window</h3>
                <p class="info-card-sub">Authorized entry time and operational gate status</p>
              </div>

              <div class="live-status-pill" :class="`live-status-pill--${getScheduleStatus(reservation).tone}`">
                <span class="live-dot"></span>
                <span>{{ getScheduleStatus(reservation).label }}</span>
              </div>
            </div>

            <div class="info-card-body">
              <div class="info-fields-grid">
                <div class="info-field">
                  <span class="field-label">Permitted Date</span>
                  <span class="field-value font-bold text-base">{{ formatReservationDate(reservation.reservationDate) }}</span>
                </div>

                <div class="info-field">
                  <span class="field-label">Time Slot Window</span>
                  <span class="field-value font-bold text-base text-primary">{{ formatTimeSlot(reservation.startTime, reservation.endTime) }}</span>
                </div>

                <div class="info-field">
                  <span class="field-label">Authorized Gates</span>
                  <span class="field-value font-medium">Gate 1 (Main Entrance) & Gate 2 (Guinhawa)</span>
                </div>

                <div class="info-field">
                  <span class="field-label">Clearance Tier</span>
                  <span class="field-value font-medium">
                    {{ (reservation.type === 1 || reservation.type === 'Special') ? 'All-Zone Special Campus Clearance' : 'Designated Visitor Parking Zone' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- FULL-WIDTH SECTION: Purpose, Administrative Remarks & Security Guidelines -->
      <div class="info-card info-card--fullwidth no-print">
        <div class="info-card-header">
          <div class="header-icon-badge header-icon-badge--slate">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <h3 class="info-card-title">Purpose & Security Protocol</h3>
            <p class="info-card-sub">Approved campus entry reason, audit timestamps, and gate inspection guidelines</p>
          </div>
        </div>

        <div class="info-card-body">
          <div class="fullwidth-details-grid">
            
            <!-- Left: Stated Purpose & Timestamps -->
            <div class="details-col-left">
              <div class="reason-callout-box">
                <span class="callout-title">Stated Reason for Entry</span>
                <p class="callout-text">{{ reservation.reason }}</p>
              </div>

              <div class="timestamps-row">
                <div v-if="reservation.createdAt" class="timestamp-item">
                  <span class="timestamp-label">Submitted On:</span>
                  <span class="timestamp-val">{{ new Date(reservation.createdAt).toLocaleString() }}</span>
                </div>
                <div v-if="reservation.approvedAt" class="timestamp-item">
                  <span class="timestamp-label">Approved On:</span>
                  <span class="timestamp-val">{{ new Date(reservation.approvedAt).toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Admin Notes & Security Guidelines -->
            <div class="details-col-right">
              <div v-if="getDisplayNotes(reservation)" class="admin-notes-box">
                <span class="notes-title">Administrative Remarks</span>
                <p class="notes-text">{{ getDisplayNotes(reservation) }}</p>
              </div>

              <div class="security-protocol-box">
                <h5 class="protocol-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Gate Security Inspection Protocol
                </h5>
                <ul class="protocol-list">
                  <li>Scan the QR code at the campus gate terminal reader.</li>
                  <li>Ensure vehicle plate matches <strong class="font-mono">{{ reservation.plateNumber || 'registered vehicle' }}</strong> upon entry.</li>
                  <li>In case of scanner terminal failure, manually verify permit reference <strong class="font-mono">{{ reservation.referenceNumber }}</strong>.</li>
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
              <h3 class="zoom-modal-title">QR Gate Pass — High Resolution</h3>
              <button class="zoom-close-btn" @click="isQrZoomed = false">&times;</button>
            </div>
            <div class="zoom-modal-body">
              <img
                :src="getQrImageUrl(reservation.referenceNumber, 520)"
                alt="Enlarged Entry QR Code"
                class="zoom-qr-img"
              />
              <p class="zoom-ref-code font-mono">{{ reservation.referenceNumber }}</p>
              <p class="zoom-caption">Official BulSU Campus Parking Entry Permit</p>
            </div>
            <div class="zoom-modal-footer">
              <button class="btn-action btn-action--secondary" @click="isQrZoomed = false">Close</button>
              <button class="btn-action btn-action--primary" @click="downloadQrCode">Download Image</button>
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

/* TOP HEADER */
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
  padding: 0;
  transition: color 150ms ease;
  width: fit-content;
}

.back-nav-btn:hover {
  color: #800000;
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
  color: #800000;
}

.crumb-sep {
  opacity: 0.5;
}

.crumb-active {
  color: var(--color-text, #0f172a);
  font-weight: 600;
}

.crumb-ref {
  color: #800000;
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
}

.type-tag {
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.type-tag--special {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.type-tag--visitor {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.status-tag {
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.status-tag--approved {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.status-tag--pending {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.status-tag--done, .status-tag--expired {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.status-tag--rejected, .status-tag--cancelled {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  border: none;
}

.btn-action--secondary {
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  border: 1px solid var(--color-border, #cbd5e1);
}

.btn-action--secondary:hover {
  background: var(--color-surface-lighter, #f8fafc);
  border-color: #94a3b8;
}

.btn-action--primary {
  background: #800000;
  color: #ffffff;
}

.btn-action--primary:hover {
  background: #660000;
}

/* WARNING BANNER & TOAST */
.pass-warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 12px;
  color: #873800;
}

.warning-banner-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 2px;
}

.warning-banner-desc {
  font-size: 13px;
  margin: 0;
  line-height: 1.45;
}

.toast-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #0f172a;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

/* MAIN DASHBOARD GRID & PASS CARD */
.pass-dashboard-grid {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 28px;
  align-items: stretch;
}

@media (max-width: 1024px) {
  .pass-dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.pass-showcase-wrapper {
  height: 100%;
}

.official-pass-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.dark .official-pass-card {
  background: #1e293b;
  border-color: #334155;
}

.pass-card-header {
  background: linear-gradient(135deg, #800000 0%, #590000 100%);
  color: #ffffff;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.university-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.university-logo-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.org-name {
  display: block;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #ffffff;
}

.org-sub {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.pass-status-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
}

.pass-card-title-section {
  padding: 20px 24px 14px;
  text-align: center;
  border-bottom: 1px dashed #e2e8f0;
}

.dark .pass-card-title-section {
  border-bottom-color: #334155;
}

.pass-title-text {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  margin: 0 0 8px;
}

.permit-code-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.dark .permit-code-badge {
  background: #0f172a;
  border-color: #334155;
}

.code-label {
  color: #64748b;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.code-val {
  font-weight: 800;
  color: #800000;
}

.copy-code-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
}

.copy-code-btn:hover {
  color: #800000;
}

/* QR Container */
.pass-qr-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.qr-frame {
  position: relative;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f1f5f9;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.qr-frame:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.qr-img {
  width: 220px;
  height: 220px;
  display: block;
  object-fit: contain;
}

.qr-hover-hint {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(4px);
}

.qr-instruction-text {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-align: center;
  margin: 0;
  max-width: 260px;
  line-height: 1.4;
}

/* Key Details Grid */
.pass-key-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 16px 24px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex: 1;
}

.dark .pass-key-details-grid {
  background: #0f172a;
  border-top-color: #334155;
}

.pass-detail-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cell-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.cell-value {
  font-size: 13.5px;
  color: var(--color-text, #0f172a);
  word-break: break-word;
}

.pass-card-footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.dark .pass-card-footer {
  background: #1e293b;
  border-top-color: #334155;
}

.footer-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  border: none;
}

.footer-btn--download {
  background: #f1f5f9;
  color: #0f172a;
}

.footer-btn--download:hover {
  background: #e2e8f0;
}

.footer-btn--print {
  background: #800000;
  color: #ffffff;
}

.footer-btn--print:hover {
  background: #660000;
}

/* RIGHT COLUMN: INFORMATION CARDS */
.pass-grid-col-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.dark .info-card {
  background: #1e293b;
  border-color: #334155;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 18px;
  position: relative;
}

.dark .info-card-header {
  border-bottom-color: #334155;
}

.header-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon-badge--red {
  background: #fef2f2;
  color: #991b1b;
}

.header-icon-badge--amber {
  background: #fffbeb;
  color: #b45309;
}

.header-icon-badge--slate {
  background: #f1f5f9;
  color: #475569;
}

.info-card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 2px;
}

.info-card-sub {
  font-size: 12.5px;
  color: var(--color-text-muted, #64748b);
  margin: 0;
}

.live-status-pill {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-status-pill--active {
  background: #ecfdf5;
  color: #047857;
}

.live-status-pill--upcoming {
  background: #eff6ff;
  color: #1d4ed8;
}

.live-status-pill--concluded, .live-status-pill--rejected {
  background: #f1f5f9;
  color: #64748b;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Profile Strip */
.holder-profile-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px dashed #f1f5f9;
}

.dark .holder-profile-strip {
  border-bottom-color: #334155;
}

.avatar-initials {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #800000;
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.holder-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 2px;
}

.holder-email {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0;
}

.info-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .info-fields-grid {
    grid-template-columns: 1fr;
  }
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
}

.field-value {
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

/* FULL WIDTH DETAILS GRID */
.fullwidth-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .fullwidth-details-grid {
    grid-template-columns: 1fr;
  }
}

.details-col-left, .details-col-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reason-callout-box {
  background: #f8fafc;
  border-left: 4px solid #800000;
  padding: 14px 18px;
  border-radius: 0 10px 10px 0;
}

.dark .reason-callout-box {
  background: #0f172a;
}

.callout-title {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.callout-text {
  font-size: 14px;
  color: var(--color-text, #0f172a);
  margin: 0;
  line-height: 1.5;
}

.timestamps-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.timestamp-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timestamp-label {
  font-size: 11px;
  color: #64748b;
}

.timestamp-val {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.admin-notes-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 14px 18px;
  border-radius: 10px;
}

.notes-title {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #b45309;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.notes-text {
  font-size: 13.5px;
  color: #78350f;
  margin: 0;
  line-height: 1.45;
}

.security-protocol-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 14px 18px;
  border-radius: 10px;
}

.dark .security-protocol-box {
  background: #0f172a;
  border-color: #334155;
}

.protocol-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 8px;
}

.protocol-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: var(--color-text-muted, #64748b);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ZOOM MODAL */
.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.zoom-modal-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  max-width: 440px;
  width: 90%;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.dark .zoom-modal-card {
  background: #1e293b;
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
  color: var(--color-text, #0f172a);
  margin: 0;
}

.zoom-close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
}

.zoom-qr-img {
  width: 280px;
  height: 280px;
  margin: 0 auto 12px;
  display: block;
}

.zoom-ref-code {
  font-size: 15px;
  font-weight: 800;
  color: #800000;
  margin: 0 0 4px;
}

.zoom-caption {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 18px;
}

.zoom-modal-footer {
  display: flex;
  gap: 10px;
}

.zoom-modal-footer .btn-action {
  flex: 1;
  justify-content: center;
}

/* PRINT STYLES */
@media print {
  body {
    background: #ffffff !important;
  }

  .no-print {
    display: none !important;
  }

  .reservation-pass-page {
    padding: 0 !important;
    max-width: 100% !important;
  }

  .pass-dashboard-grid {
    display: block !important;
  }

  .official-pass-card {
    border: 2px solid #000000 !important;
    box-shadow: none !important;
    max-width: 480px !important;
    margin: 0 auto !important;
  }

  .pass-card-header {
    background: #800000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>
