<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import { cachedViolations } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'
import type { Violation } from '../types'

const route = useRoute()
const router = useRouter()

const targetId = computed(() => decodeURIComponent(String(route.params.id || '')))

const violation = ref<Violation | null>(null)
const isLoading = ref(true)

// Toast State
interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning'
}
const toasts = ref<Toast[]>([])
let nextToastId = 1

const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
  const id = nextToastId++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

// Settlement Modal State
const isPaymentOpen = ref(false)
const isProcessingPayment = ref(false)

function getRoleLabel(role?: string): string {
  if (!role) return 'Guest'
  if (role === 'UniversityStaff') return 'Faculty Member'
  if (role === 'NonAcademicPersonnel') return 'University Staff'
  return role
}

function getFormattedName(v: Violation | null): string {
  if (!v) return 'Unknown Driver'
  const middle = v.middleName ? ` ${v.middleName}` : ''
  return `${v.firstName}${middle} ${v.lastName}`.trim() || 'Unknown Driver'
}

function getVehicleTypeLabel(type?: string | number): string {
  if (type === 0 || type === 'Motorcycle') return 'Motorcycle'
  if (type === 1 || type === 'ElectricBike') return 'E-Bike'
  if (type === 2 || type === 'Car') return 'Car'
  return String(type || 'Unknown')
}

function mapRawViolation(item: any): Violation {
  return {
    violationId: item.violationId || item.id || '',
    referenceNumber: item.referenceNumber || '',
    violationType: item.violationType || 'General Infraction',
    penaltyFee: Number(item.penaltyFee || 0),
    settlementStatus: (item.settlementStatus === 'Settled' || item.isPaid) ? 'Paid' : 'Unpaid',
    isPaid: item.settlementStatus === 'Settled' || Boolean(item.isPaid),
    firstName: item.firstName || '',
    lastName: item.lastName || '',
    middleName: item.middleName || '',
    roleName: item.roleName || item.role || 'Guest',
    plateNumber: item.plateNumber || 'N/A',
    brand: item.brand || 'Unknown',
    vehicleType: item.vehicleType || 'Car',
    entryTime: item.entryTime || '',
    exitTime: item.exitTime || undefined,
    issuedAt: item.issuedAt || new Date().toISOString()
  }
}

const fetchViolationDetail = async () => {
  const query = targetId.value.trim().toLowerCase()
  if (!query) {
    isLoading.value = false
    return
  }

  // 1. Check cachedViolations
  if (cachedViolations.value && Array.isArray(cachedViolations.value)) {
    const found = cachedViolations.value.find(
      (v: any) =>
        String(v.referenceNumber).toLowerCase() === query ||
        String(v.violationId).toLowerCase() === query ||
        String(v.plateNumber).toLowerCase() === query
    )
    if (found) {
      violation.value = found
      isLoading.value = false
      return
    }
  }

  // 2. Fallback: Fetch from API
  isLoading.value = true
  try {
    const response = await api.get('/violations/history/page/1/1000')
    if (response.data && response.data.isSuccess) {
      const items = response.data.data?.items || []
      const mapped = items.map(mapRawViolation)
      cachedViolations.value = mapped
      const match = mapped.find(
        (v: Violation) =>
          v.referenceNumber.toLowerCase() === query ||
          v.violationId.toLowerCase() === query ||
          v.plateNumber.toLowerCase() === query
      )
      if (match) {
        violation.value = match
      }
    }
  } catch (err) {
    console.error('Error fetching violation details:', err)
  } finally {
    isLoading.value = false
  }
}

const notifStore = useAdminNotificationStore()
let unsubscribeApprovalUpdates: (() => void) | null = null

onMounted(() => {
  fetchViolationDetail()
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
    fetchViolationDetail()
  })
})

onUnmounted(() => {
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

function goBack() {
  router.push('/violations')
}

// Payment Settlement Action
const openPaymentModal = () => {
  isPaymentOpen.value = true
}

const handlePaymentSubmit = async () => {
  if (!violation.value) return
  const refToSettle = violation.value.referenceNumber || violation.value.plateNumber

  isProcessingPayment.value = true
  try {
    const response = await api.post('/violations/process-payment', {
      referenceNumber: refToSettle
    })

    if (response.data && (response.data.isSuccess || response.status === 200)) {
      const receipt = response.data.data
      const amountText = receipt?.penaltyFee != null ? ` ₱${Number(receipt.penaltyFee).toFixed(2)} received.` : ''
      showToast(`Violation ${refToSettle} settled successfully!${amountText}`, 'success')

      // Update local state
      violation.value.settlementStatus = 'Paid'
      violation.value.isPaid = true

      // Update cache
      if (cachedViolations.value) {
        const idx = cachedViolations.value.findIndex(
          (v: any) => v.referenceNumber === refToSettle || v.violationId === violation.value?.violationId
        )
        if (idx !== -1) {
          cachedViolations.value[idx].settlementStatus = 'Paid'
          cachedViolations.value[idx].isPaid = true
          cachedViolations.value = [...cachedViolations.value]
        }
      }

      isPaymentOpen.value = false
      await fetchViolationDetail()
    } else {
      showToast(response.data?.message || 'Failed to process settlement.', 'warning')
    }
  } catch (error: any) {
    console.error('Error processing settlement:', error)
    showToast(error.response?.data?.message || 'Failed to settle violation payment.', 'warning')
  } finally {
    isProcessingPayment.value = false
  }
}
</script>

<template>
  <div class="violation-detail-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Collections Log
      </button>
      <div class="header-content">
        <div class="header-titles">
          <h1 class="page-title">Collection Ticket Details</h1>
          <p class="page-subtitle">Inspect violation infraction records, penalty fee breakdown, driver identity, and payment settlement.</p>
        </div>
        <div class="header-actions">
          <UiButton
            variant="secondary"
            size="md"
            :loading="isLoading"
            @click="fetchViolationDetail"
            title="Refresh Ticket"
          >
            <template #prefix>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </template>
            Refresh
          </UiButton>
          <button
            v-if="violation && violation.settlementStatus === 'Unpaid'"
            class="settle-action-btn"
            @click="openPaymentModal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Settle Collection
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="loading-container">
      <div class="skeleton-card">
        <div class="skeleton skeleton-hero" />
        <div class="skeleton skeleton-line" style="width: 40%; margin-top: 16px;" />
        <div class="skeleton skeleton-line" style="width: 60%; margin-top: 10px;" />
      </div>
      <div class="skeleton-card" style="margin-top: 20px;">
        <div class="skeleton skeleton-line" style="width: 80%;" />
        <div class="skeleton skeleton-line" style="width: 60%; margin-top: 10px;" />
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!violation" class="not-found-card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>Collection ticket record not found.</p>
      <button class="back-btn" @click="goBack">Go back to Collections Log</button>
    </div>

    <!-- Content -->
    <div v-else class="detail-container">

      <!-- HERO TICKET BANNER CARD -->
      <div class="hero-ticket-card" :class="'hero-ticket--' + violation.settlementStatus.toLowerCase()">
        <div class="hero-left">
          <div class="hero-ref-badge">
            <span class="hero-ref-label">Reference Number</span>
            <span class="hero-ref-code font-mono">{{ violation.referenceNumber }}</span>
          </div>
          <div class="hero-infraction-meta">
            <span class="hero-infraction-type">{{ violation.violationType }}</span>
            <span class="hero-dot">•</span>
            <span class="hero-vehicle">Plate: <strong class="font-mono text-slate-900 dark:text-white">{{ violation.plateNumber }}</strong> ({{ violation.brand }})</span>
            <span class="hero-dot">•</span>
            <span class="hero-driver">Driver: {{ getFormattedName(violation) }}</span>
          </div>
        </div>

        <div class="hero-right">
          <div class="hero-status-box">
            <span class="hero-status-label">Settlement Status</span>
            <div class="hero-status-tag">
              <UiStatusText :variant="violation.settlementStatus === 'Paid' ? 'success' : 'danger'" size="sm">
                {{ violation.settlementStatus }}
              </UiStatusText>
            </div>
          </div>
          <div class="hero-fine-box">
            <span class="hero-fine-label">Penalty Amount</span>
            <span class="hero-fine-value">₱{{ violation.penaltyFee.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 2-COLUMN MAIN DETAILS GRID -->
      <div class="details-cards-layout">

        <!-- CARD 1: Infraction & Violation Details -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Infraction &amp; Ticket Specifics</h3>
              <p class="card-subtitle">Violation classification, reference identifier, and penalty fee</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Reference Number</span>
              <span class="detail-value font-mono font-bold">{{ violation.referenceNumber }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Infraction Category</span>
              <span class="detail-value font-semibold text-indigo-600 dark:text-indigo-400">{{ violation.violationType }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Penalty Fee</span>
              <span class="detail-value font-mono text-lg font-bold text-slate-900 dark:text-white">₱{{ violation.penaltyFee.toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date &amp; Time Issued</span>
              <span class="detail-value font-medium">
                {{ new Date(violation.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }},
                {{ new Date(violation.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Settlement Clearance</span>
              <span class="detail-value">
                <UiStatusText :variant="violation.settlementStatus === 'Paid' ? 'success' : 'danger'" size="xs">
                  {{ violation.settlementStatus }}
                </UiStatusText>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Ticket Record ID</span>
              <span class="detail-value font-mono text-xs text-slate-500">{{ violation.violationId || violation.referenceNumber }}</span>
            </div>
          </div>
        </div>

        <!-- CARD 2: Vehicle & Session Details -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Vehicle &amp; Parking Session</h3>
              <p class="card-subtitle">Vehicle plate identification and gate timeline</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Plate Number</span>
              <span class="detail-value font-mono font-bold">{{ violation.plateNumber }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Brand &amp; Model</span>
              <span class="detail-value">{{ violation.brand || 'Unknown' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Vehicle Type</span>
              <span class="detail-value">{{ getVehicleTypeLabel(violation.vehicleType) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Campus Entry Time</span>
              <span class="detail-value">
                {{ violation.entryTime ? `${new Date(violation.entryTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${new Date(violation.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A' }}
              </span>
            </div>
            <div class="detail-item" v-if="violation.exitTime">
              <span class="detail-label">Campus Exit Time</span>
              <span class="detail-value">
                {{ new Date(violation.exitTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}, {{ new Date(violation.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
            <div class="detail-item" v-else>
              <span class="detail-label">Parking Exit Status</span>
              <span class="detail-value text-emerald-600 font-medium">Inside Campus / Active</span>
            </div>
          </div>
        </div>

        <!-- CARD 3: Offender & Driver Profile -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Offender &amp; Driver Profile</h3>
              <p class="card-subtitle">Registered owner, university role, and classification tier</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Driver Full Name</span>
              <span class="detail-value font-bold">{{ getFormattedName(violation) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Campus Classification</span>
              <span class="detail-value">{{ getRoleLabel(violation.roleName) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Account Clearance</span>
              <span class="detail-value" :class="violation.settlementStatus === 'Paid' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'">
                {{ violation.settlementStatus === 'Paid' ? 'Account Good Standing' : 'Settlement Pending' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Campus Membership</span>
              <span class="detail-value font-medium">{{ violation.roleName === 'Guest' ? 'Guest Visitor' : 'Authorized Campus Member' }}</span>
            </div>
          </div>
        </div>

        <!-- CARD 4: Settlement & Audit Information -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Settlement &amp; Audit Processing</h3>
              <p class="card-subtitle">Payment recording, penalty settlement, and desk receipt</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Settlement Status</span>
              <span
                class="detail-value font-bold"
                :class="violation.settlementStatus === 'Paid' ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ violation.settlementStatus === 'Paid' ? 'Settled & Paid' : 'Awaiting Payment' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Amount Payable</span>
              <span class="detail-value font-mono font-bold text-lg text-slate-900 dark:text-white">₱{{ violation.penaltyFee.toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Payment Channel</span>
              <span class="detail-value">Security Desk / Cashier Settlement</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Settlement Action</span>
              <span v-if="violation.settlementStatus === 'Paid'" class="detail-value text-emerald-600 font-semibold">
                Cleared &amp; Completed
              </span>
              <span v-else class="detail-value">
                <button class="inline-settle-link" @click="openPaymentModal">Process Payment &rarr;</button>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Quick Settlement Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isPaymentOpen && violation" class="modal-backdrop" @click="isPaymentOpen = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">Settle Collection Ticket</h3>
              <button class="close-btn" @click="isPaymentOpen = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form @submit.prevent="handlePaymentSubmit">
              <div class="modal-body">
                <div class="payment-details-card">
                  <div class="pay-row">
                    <span class="pay-label">Ticket Reference</span>
                    <span class="pay-val font-mono font-bold">{{ violation.referenceNumber }}</span>
                  </div>
                  <div class="pay-row">
                    <span class="pay-label">Infraction Type</span>
                    <span class="pay-val font-semibold text-indigo-600 dark:text-indigo-400">{{ violation.violationType }}</span>
                  </div>
                  <div class="pay-row">
                    <span class="pay-label">Vehicle Plate</span>
                    <span class="pay-val font-mono">{{ violation.plateNumber }}</span>
                  </div>
                  <div class="pay-row">
                    <span class="pay-label">Driver Name</span>
                    <span class="pay-val">{{ getFormattedName(violation) }}</span>
                  </div>
                  <div class="pay-row border-top">
                    <span class="pay-label">Penalty Amount</span>
                    <span class="pay-val font-mono text-xl font-extrabold text-emerald-600">₱{{ violation.penaltyFee.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="cancel-btn" @click="isPaymentOpen = false" :disabled="isProcessingPayment">Cancel</button>
                <button type="submit" class="submit-btn" :disabled="isProcessingPayment">
                  {{ isProcessingPayment ? 'Processing...' : 'Receive Settlement' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <TransitionGroup name="toast-fade">
        <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="'toast--' + toast.type">
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.violation-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.page-header {
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
  color: var(--color-primary, #D22730);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-muted, #64748b);
  width: 38px;
  height: 38px;
  border-radius: var(--radius-button, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
}

.refresh-btn:hover {
  background: var(--color-surface-lighter, #f8fafc);
  color: var(--color-text, #1e293b);
}

.settle-action-btn {
  background: var(--color-success, #059669);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-button, 8px);
  padding: 9px 18px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
  transition: all 150ms ease;
}

.settle-action-btn:hover {
  background: #047857;
  transform: translateY(-1px);
}

/* ── Hero Ticket Card ── */
.hero-ticket-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

@media (max-width: 768px) {
  .hero-ticket-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-ref-badge {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.hero-ref-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
}

.hero-ref-code {
  font-size: 26px;
  font-weight: 900;
  color: var(--color-text, #1e293b);
  letter-spacing: 0.5px;
}

.hero-infraction-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-muted, #64748b);
  font-weight: 500;
  flex-wrap: wrap;
}

.hero-infraction-type {
  font-weight: 700;
  color: var(--color-primary, #D22730);
}

.hero-dot {
  opacity: 0.5;
}

.hero-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.hero-status-box,
.hero-fine-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

@media (max-width: 768px) {
  .hero-right {
    width: 100%;
    justify-content: space-between;
  }
  .hero-status-box,
  .hero-fine-box {
    align-items: flex-start;
  }
}

.hero-status-label,
.hero-fine-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
}

.hero-fine-value {
  font-size: 22px;
  font-weight: 900;
  font-family: monospace;
  color: var(--color-text, #1e293b);
}

/* ── Details Grid Layout ── */
.details-cards-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 960px) {
  .details-cards-layout {
    grid-template-columns: 1fr;
  }
}

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

.card-icon-badge--blue   { background: rgba(210, 39, 48, 0.08);  color: var(--color-primary, #D22730); }
.card-icon-badge--purple { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.card-icon-badge--orange { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.card-icon-badge--green  { background: rgba(5, 150, 105, 0.1);  color: #059669; }

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

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
}

@media (max-width: 540px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
  font-weight: 600;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.inline-settle-link {
  background: none;
  border: none;
  color: #059669;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.inline-settle-link:hover {
  color: #047857;
}

/* ── Loading Skeleton ── */
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

.skeleton {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

.skeleton-hero { height: 120px; width: 100%; border-radius: 10px; }
.skeleton-line { height: 16px; }

@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* ── Not found ── */
.not-found-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 24px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  color: var(--color-muted, #64748b);
  text-align: center;
}
.not-found-card p { font-size: 15px; font-weight: 600; margin: 0; }

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text, #1e293b);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted, #64748b);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 24px;
}

.payment-details-card {
  background: var(--color-surface-lighter, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
}

.pay-row.border-top {
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 12px;
  margin-top: 4px;
}

.pay-label {
  color: var(--color-muted, #64748b);
  font-weight: 500;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text, #1e293b);
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn {
  background: #059669;
  color: #ffffff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:disabled, .cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Toast Notifications ── */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-item {
  padding: 12px 20px;
  border-radius: var(--radius-button, 8px);
  font-size: 13px;
  font-weight: 600;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast--success { background: #059669; }
.toast--warning { background: #d97706; }
.toast--info    { background: #2563eb; }

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
