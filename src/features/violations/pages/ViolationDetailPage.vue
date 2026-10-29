<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
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
  if (role === 'UniversityStaff') return 'Faculty'
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
    settlementStatus: item.settlementStatus === 'Settled' || item.isPaid ? 'Paid' : 'Unpaid',
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
    issuedAt: item.issuedAt || new Date().toISOString(),
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
        String(v.plateNumber).toLowerCase() === query,
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
          v.plateNumber.toLowerCase() === query,
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
      referenceNumber: refToSettle,
    })

    if (response.data && (response.data.isSuccess || response.status === 200)) {
      const receipt = response.data.data
      const amountText =
        receipt?.penaltyFee != null ? ` ₱${Number(receipt.penaltyFee).toFixed(2)} received.` : ''
      showToast(`Violation ${refToSettle} settled successfully!${amountText}`, 'success')

      // Update local state
      violation.value.settlementStatus = 'Paid'
      violation.value.isPaid = true

      // Update cache
      if (cachedViolations.value) {
        const idx = cachedViolations.value.findIndex(
          (v: any) =>
            v.referenceNumber === refToSettle || v.violationId === violation.value?.violationId,
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="space-y-3">
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
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
        Back to Collections Log
      </button>
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div class="min-w-0 space-y-1">
          <h1 class="text-2xl font-bold tracking-tight text-text">Collection Ticket Details</h1>
          <p class="text-sm leading-6 text-muted">
            Inspect violation infraction records, penalty fee breakdown, driver identity, and
            payment settlement.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton
            variant="secondary"
            size="md"
            :loading="isLoading"
            @click="fetchViolationDetail"
            title="Refresh Ticket"
          >
            <template #prefix>
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </template>
            Refresh
          </UiButton>
          <UiButton
            v-if="violation && violation.settlementStatus === 'Unpaid'"
            variant="primary"
            @click="openPaymentModal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Settle Collection
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="space-y-5" role="status" aria-label="Loading record">
      <SkeletonLoader variant="rect" height="128px" class="rounded-card" />
      <div class="grid gap-6 xl:grid-cols-2">
        <SkeletonLoader variant="rect" height="220px" class="rounded-card" />
        <SkeletonLoader variant="rect" height="220px" class="rounded-card" />
      </div>
    </div>

    <!-- Not Found -->
    <div
      v-else-if="!violation"
      class="flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-6 py-12 text-center text-muted"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>Collection ticket record not found.</p>
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        @click="goBack"
      >
        Go back to Collections Log
      </button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- HERO TICKET BANNER CARD -->
      <div
        class="flex flex-col justify-between gap-6 rounded-card border border-border bg-surface p-6 sm:flex-row"
      >
        <div class="min-w-0 space-y-3">
          <div class="space-y-1">
            <span class="block text-sm text-muted">Reference Number</span>
            <span class="block break-all text-xl font-bold text-text font-mono">{{
              violation.referenceNumber
            }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span class="font-medium text-text">{{ violation.violationType }}</span>
            <span class="text-subtle">•</span>
            <span class="text-muted"
              >Plate: <strong class="font-mono text-text">{{ violation.plateNumber }}</strong> ({{
                violation.brand
              }})</span
            >
            <span class="text-subtle">•</span>
            <span class="text-muted">Driver: {{ getFormattedName(violation) }}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-8 sm:shrink-0">
          <div class="space-y-2">
            <span class="block text-sm text-muted">Settlement Status</span>
            <div class="pt-1">
              <UiStatusText
                :variant="violation.settlementStatus === 'Paid' ? 'success' : 'danger'"
                size="sm"
              >
                {{ violation.settlementStatus }}
              </UiStatusText>
            </div>
          </div>
          <div class="space-y-2">
            <span class="block text-sm text-muted">Penalty Amount</span>
            <span class="block text-xl font-semibold text-text"
              >₱{{ violation.penaltyFee.toFixed(2) }}</span
            >
          </div>
        </div>
      </div>

      <!-- 2-COLUMN MAIN DETAILS GRID -->
      <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <!-- CARD 1: Infraction & Violation Details -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Infraction &amp; Ticket Specifics</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Violation classification, reference identifier, and penalty fee
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Reference Number</span>
              <span class="block break-words text-sm font-medium text-text font-mono font-bold">{{
                violation.referenceNumber
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Infraction Category</span>
              <span class="block break-words text-sm font-semibold text-primary">{{
                violation.violationType
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Penalty Fee</span>
              <span
                class="block break-words text-sm font-medium text-text font-mono text-lg font-bold"
                >₱{{ violation.penaltyFee.toFixed(2) }}</span
              >
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Date &amp; Time Issued</span>
              <span class="block break-words text-sm font-medium text-text">
                {{
                  new Date(violation.issuedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }},
                {{
                  new Date(violation.issuedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Settlement Clearance</span>
              <span class="block break-words text-sm font-medium text-text">
                <UiStatusText
                  :variant="violation.settlementStatus === 'Paid' ? 'success' : 'danger'"
                  size="xs"
                >
                  {{ violation.settlementStatus }}
                </UiStatusText>
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Ticket Record ID</span>
              <span class="block break-words text-sm font-medium font-mono text-xs text-muted">{{
                violation.violationId || violation.referenceNumber
              }}</span>
            </div>
          </div>
        </UiCard>

        <!-- CARD 2: Vehicle & Session Details -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Vehicle &amp; Parking Session</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Vehicle plate identification and gate timeline
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Plate Number</span>
              <span class="block break-words text-sm font-medium text-text font-mono font-bold">{{
                violation.plateNumber
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Brand &amp; Model</span>
              <span class="block break-words text-sm font-medium text-text">{{
                violation.brand || 'Unknown'
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Vehicle Type</span>
              <span class="block break-words text-sm font-medium text-text">{{
                getVehicleTypeLabel(violation.vehicleType)
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Campus Entry Time</span>
              <span class="block break-words text-sm font-medium text-text">
                {{
                  violation.entryTime
                    ? `${new Date(violation.entryTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${new Date(violation.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'N/A'
                }}
              </span>
            </div>
            <div class="min-w-0 space-y-1" v-if="violation.exitTime">
              <span class="block text-sm text-muted">Campus Exit Time</span>
              <span class="block break-words text-sm font-medium text-text">
                {{
                  new Date(violation.exitTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }},
                {{
                  new Date(violation.exitTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              </span>
            </div>
            <div class="min-w-0 space-y-1" v-else>
              <span class="block text-sm text-muted">Parking Exit Status</span>
              <span class="block break-words text-sm font-medium text-success"
                >Inside Campus / Active</span
              >
            </div>
          </div>
        </UiCard>

        <!-- CARD 3: Offender & Driver Profile -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
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
              <h3 class="text-base font-semibold text-text">Offender &amp; Driver Profile</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Registered owner, university role, and classification tier
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Driver Full Name</span>
              <span class="block break-words text-sm font-medium text-text font-bold">{{
                getFormattedName(violation)
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Campus Classification</span>
              <span class="block break-words text-sm font-medium text-text">{{
                getRoleLabel(violation.roleName)
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Account Clearance</span>
              <span
                class="block break-words text-sm font-medium text-text"
                :class="
                  violation.settlementStatus === 'Paid'
                    ? 'text-success font-semibold'
                    : 'text-warning font-semibold'
                "
              >
                {{
                  violation.settlementStatus === 'Paid'
                    ? 'Account Good Standing'
                    : 'Settlement Pending'
                }}
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Campus Membership</span>
              <span class="block break-words text-sm font-medium text-text">{{
                violation.roleName === 'Guest' ? 'Guest Visitor' : 'Authorized Campus Member'
              }}</span>
            </div>
          </div>
        </UiCard>

        <!-- CARD 4: Settlement & Audit Information -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Settlement &amp; Audit Processing</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Payment recording, penalty settlement, and desk receipt
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Settlement Status</span>
              <span
                class="block break-words text-sm font-medium text-text font-bold"
                :class="violation.settlementStatus === 'Paid' ? 'text-success' : 'text-danger'"
              >
                {{ violation.settlementStatus === 'Paid' ? 'Settled & Paid' : 'Awaiting Payment' }}
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Amount Payable</span>
              <span
                class="block break-words text-sm font-medium text-text font-mono font-bold text-lg"
                >₱{{ violation.penaltyFee.toFixed(2) }}</span
              >
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Payment Channel</span>
              <span class="block break-words text-sm font-medium text-text"
                >Security Desk / Cashier Settlement</span
              >
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Settlement Action</span>
              <span
                v-if="violation.settlementStatus === 'Paid'"
                class="block break-words text-sm text-success font-semibold"
              >
                Cleared &amp; Completed
              </span>
              <span v-else class="block break-words text-sm font-medium text-text">
                <button
                  class="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  @click="openPaymentModal"
                >
                  Process Payment &rarr;
                </button>
              </span>
            </div>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Quick Settlement Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isPaymentOpen && violation"
          class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5"
          @click="isPaymentOpen = false"
        >
          <div
            class="w-full max-w-lg overflow-hidden rounded-card border border-border bg-surface shadow-modal"
            @click.stop
          >
            <div class="flex items-center justify-between gap-4 border-b border-border p-5">
              <h3 class="text-lg font-semibold text-text">Settle Collection Ticket</h3>
              <button
                class="flex size-10 items-center justify-center rounded-button text-2xl text-muted hover:bg-surface-muted"
                @click="isPaymentOpen = false"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form @submit.prevent="handlePaymentSubmit">
              <div class="p-5">
                <div class="space-y-4 rounded-button bg-surface-lighter p-4">
                  <div class="flex flex-wrap justify-between gap-3">
                    <span class="text-sm text-muted">Ticket Reference</span>
                    <span class="text-sm font-semibold text-text font-mono font-bold">{{
                      violation.referenceNumber
                    }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span class="text-sm text-muted">Infraction Type</span>
                    <span class="text-sm font-semibold text-primary">{{
                      violation.violationType
                    }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span class="text-sm text-muted">Vehicle Plate</span>
                    <span class="text-sm font-semibold text-text font-mono">{{
                      violation.plateNumber
                    }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span class="text-sm text-muted">Driver Name</span>
                    <span class="text-sm font-semibold text-text">{{
                      getFormattedName(violation)
                    }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                    <span class="text-sm text-muted">Penalty Amount</span>
                    <span
                      class="text-sm font-semibold font-mono text-xl font-extrabold text-success"
                      >₱{{ violation.penaltyFee.toFixed(2) }}</span
                    >
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-3 border-t border-border p-5">
                <UiButton
                  type="button"
                  variant="secondary"
                  @click="isPaymentOpen = false"
                  :disabled="isProcessingPayment"
                  >Cancel</UiButton
                >
                <UiButton type="submit" variant="primary" :disabled="isProcessingPayment">
                  {{ isProcessingPayment ? 'Processing...' : 'Receive Settlement' }}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast Notifications -->
    <div class="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-3">
      <TransitionGroup name="toast-fade">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="rounded-button border border-border bg-surface p-4 text-sm text-text shadow-soft"
          :class="
            toast.type === 'success'
              ? 'border-success/20 text-success'
              : 'border-warning/20 text-warning'
          "
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
