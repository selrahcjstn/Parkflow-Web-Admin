<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Violation } from '../types'
import TablePagination from '@/components/ui/TablePagination.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import ViolationStats from '../components/ViolationStats.vue'
import ViolationFilters from '../components/ViolationFilters.vue'
import PaymentModal from '../components/PaymentModal.vue'
import api from '@/api/axios'
import { cachedViolations } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

const router = useRouter()

const violColumns: TableColumn[] = [
  { key: 'reference', label: 'Reference Code' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'owner', label: 'Owner' },
  { key: 'role', label: 'Role' },
  { key: 'type', label: 'Violation Type' },
  { key: 'fine', label: 'Penalty Fine' },
  { key: 'issuedAt', label: 'Issued At' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

// Toast type
interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning'
}

const toasts = ref<Toast[]>([])
const nextToastId = ref(1)

const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
  const id = nextToastId.value++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

const notifStore = useAdminNotificationStore()
let unsubscribeApprovalUpdates: (() => void) | null = null

const isLoading = ref(!cachedViolations.value || cachedViolations.value.length === 0)
const violations = ref<Violation[]>(cachedViolations.value || [])

const fetchViolations = async () => {
  if (!cachedViolations.value || cachedViolations.value.length === 0) {
    isLoading.value = true
  }
  try {
    const response = await api.get('/violations/history/page/1/1000')
    if (response.data && response.data.isSuccess) {
      const items = response.data.data?.items || []
      const mapped = items.map((item: any) => ({
        violationId: item.violationId,
        referenceNumber: item.referenceNumber,
        violationType: item.violationType,
        penaltyFee: item.penaltyFee,
        settlementStatus: (item.settlementStatus === 'Settled' || item.isPaid) ? 'Paid' : 'Unpaid',
        isPaid: item.settlementStatus === 'Settled' || item.isPaid,
        firstName: item.firstName,
        lastName: item.lastName,
        middleName: item.middleName,
        roleName: item.roleName,
        plateNumber: item.plateNumber,
        brand: item.brand,
        vehicleType: item.vehicleType,
        entryTime: item.entryTime,
        exitTime: item.exitTime,
        issuedAt: item.issuedAt
      }))
      violations.value = mapped
      cachedViolations.value = [...mapped]
    }
  } catch (error) {
    console.error('Error fetching violations:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchViolations()
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
    fetchViolations()
  })
})

onUnmounted(() => {
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

// Filter and Search State
const searchQuery = ref('')
const filterViolationType = ref<string>('all')
const filterStatus = ref<string>('all')

// Modals State
const isPaymentOpen = ref(false)
const activePaymentViolation = ref<Violation | null>(null)
const paymentReferenceInput = ref('')
const isProcessingPayment = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Stats computation
const totalCount = computed(() => violations.value.length)
const unpaidCount = computed(() => violations.value.filter((v) => v.settlementStatus === 'Unpaid').length)
const paidCount = computed(() => violations.value.filter((v) => v.settlementStatus === 'Paid').length)
const totalCollection = computed(() => {
  return violations.value
    .filter((v) => v.settlementStatus === 'Paid')
    .reduce((sum, v) => sum + v.penaltyFee, 0)
})

// Filter logic
const filteredViolations = computed(() => {
  return violations.value.filter((v) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesQuery =
      !q ||
      v.referenceNumber.toLowerCase().includes(q) ||
      v.plateNumber.toLowerCase().includes(q) ||
      (v.firstName && v.firstName.toLowerCase().includes(q)) ||
      (v.lastName && v.lastName.toLowerCase().includes(q)) ||
      v.violationType.toLowerCase().includes(q)

    const matchesType =
      filterViolationType.value === 'all' ||
      v.violationType.toLowerCase().includes(filterViolationType.value.toLowerCase())

    const matchesStatus =
      filterStatus.value === 'all' || v.settlementStatus === filterStatus.value

    return matchesQuery && matchesType && matchesStatus
  })
})

const paginatedViolations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredViolations.value.slice(start, end)
})

watch([searchQuery, filterViolationType, filterStatus, itemsPerPage], () => {
  currentPage.value = 1
})

const openDetails = (v: Violation) => {
  router.push(`/violations/${encodeURIComponent(v.violationId || v.referenceNumber)}`)
}

const openPaymentModal = (v: Violation) => {
  activePaymentViolation.value = v
  paymentReferenceInput.value = v.referenceNumber
  isPaymentOpen.value = true
}

const handlePaymentSubmit = async () => {
  const refCode = activePaymentViolation.value
    ? (activePaymentViolation.value.referenceNumber || activePaymentViolation.value.plateNumber)
    : paymentReferenceInput.value.trim()

  if (!refCode) {
    showToast('Please enter a valid violation reference number.', 'warning')
    return
  }

  isProcessingPayment.value = true
  try {
    const target = violations.value.find(
      (v) => v.referenceNumber === refCode || (activePaymentViolation.value && v.violationId === activePaymentViolation.value.violationId)
    )
    const refToSettle = activePaymentViolation.value?.referenceNumber || target?.referenceNumber || refCode

    const response = await api.post('/violations/process-payment', {
      referenceNumber: refToSettle
    })

    if (response.data && (response.data.isSuccess || response.status === 200)) {
      const receipt = response.data.data
      const amountText = receipt?.penaltyFee != null ? ` ₱${Number(receipt.penaltyFee).toFixed(2)} received.` : ''
      showToast(`Violation ${refToSettle} settled successfully!${amountText}`, 'success')

      // Update local state
      if (target) {
        target.settlementStatus = 'Paid'
        target.isPaid = true
      }
      if (activePaymentViolation.value) {
        activePaymentViolation.value.settlementStatus = 'Paid'
        activePaymentViolation.value.isPaid = true
      }

      // Update cache
      if (cachedViolations.value) {
        const idx = cachedViolations.value.findIndex(
          (v: any) => v.referenceNumber === refToSettle || (target && v.violationId === target.violationId)
        )
        if (idx !== -1) {
          cachedViolations.value[idx].settlementStatus = 'Paid'
          cachedViolations.value[idx].isPaid = true
          cachedViolations.value = [...cachedViolations.value]
        }
      }

      isPaymentOpen.value = false
      activePaymentViolation.value = null
      paymentReferenceInput.value = ''
      await fetchViolations()
    } else {
      showToast(response.data?.message || 'Failed to settle violation.', 'warning')
    }
  } catch (error: any) {
    console.error('Error settling violation:', error)
    showToast(error.response?.data?.message || 'Failed to settle violation payment.', 'warning')
  } finally {
    isProcessingPayment.value = false
  }
}

const getRoleLabel = (role?: string) => {
  if (!role) return 'Visitor'
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
          Collections & Violation Logs
        </h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-0 max-w-2xl">
          Track overstay citations, campus parking infractions, and process penalty settlements.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          size="md"
          :loading="isLoading"
          @click="fetchViolations"
          title="Refresh Data"
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
      </div>
    </div>

    <!-- Stats Grid Component -->
    <ViolationStats
      :is-loading="isLoading"
      :total-count="totalCount"
      :unpaid-count="unpaidCount"
      :paid-count="paidCount"
      :total-collection="totalCollection"
    />

    <!-- Filters Bar Component -->
    <ViolationFilters
      v-model:search-query="searchQuery"
      v-model:filter-violation-type="filterViolationType"
      v-model:filter-status="filterStatus"
    />

    <!-- Table Container -->
    <UiCard custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="violColumns"
        :data="paginatedViolations"
        :is-loading="isLoading"
        empty-text="No violation records found."
        @row-click="openDetails"
      >
        <template #cell-reference="{ item }">
          <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">
            {{ item.referenceNumber }}
          </span>
        </template>

        <template #cell-vehicle="{ item }">
          <div class="flex flex-col">
            <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">{{ item.plateNumber }}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ item.brand || 'Unknown' }}</span>
          </div>
        </template>

        <template #cell-owner="{ item }">
          <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ item.firstName }} {{ item.lastName }}</span>
        </template>

        <template #cell-role="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">
            {{ getRoleLabel(item.roleName) }}
          </span>
        </template>

        <template #cell-type="{ item }">
          <span class="text-xs text-slate-700 dark:text-slate-300">{{ item.violationType }}</span>
        </template>

        <template #cell-fine="{ item }">
          <span class="font-bold text-slate-900 dark:text-white text-xs">₱{{ item.penaltyFee.toFixed(2) }}</span>
        </template>

        <template #cell-issuedAt="{ item }">
          <div class="flex flex-col">
            <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ new Date(item.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
            <span class="text-[11px] text-slate-400">{{ new Date(item.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</span>
          </div>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText
            :variant="item.settlementStatus === 'Paid' ? 'success' : 'danger'"
            size="xs"
          >
            {{ item.settlementStatus }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="inline-flex items-center gap-1" @click.stop>
            <button
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
              title="View Details"
              @click="openDetails(item)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
            <button
              v-if="item.settlementStatus === 'Unpaid'"
              type="button"
              class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer border-none bg-transparent"
              title="Process Settlement"
              @click="openPaymentModal(item)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        </template>
      </UiTable>

      <TablePagination
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :total-items="filteredViolations.length"
      />
    </UiCard>

    <!-- Quick Settlement Modal Component -->
    <PaymentModal
      :is-open="isPaymentOpen"
      :violation="activePaymentViolation"
      :reference-input="paymentReferenceInput"
      :is-processing="isProcessingPayment"
      @update:reference-input="paymentReferenceInput = $event"
      @close="isPaymentOpen = false"
      @submit="handlePaymentSubmit"
    />

    <!-- Toast Notifications -->
    <div class="fixed bottom-7 right-7 z-50 flex flex-col gap-2.5 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="px-4.5 py-3 rounded-xl text-sm font-semibold backdrop-blur-md shadow-lg pointer-events-auto max-w-xs transition-all"
          :class="[
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          ]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
