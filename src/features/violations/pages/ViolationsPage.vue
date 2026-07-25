<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Violation } from '../types'
import ViolationDetailModal from '../components/ViolationDetailModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/api/axios'

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

const isLoading = ref(false)

// Violations list
const violations = ref<Violation[]>([
  {
    violationId: 'vio-1',
    referenceNumber: 'VIO-20260612-A8E2',
    violationType: 'Overstay Limit',
    penaltyFee: 500.0,
    settlementStatus: 'Unpaid',
    isPaid: false,
    firstName: 'Maria',
    lastName: 'Santos',
    roleName: 'Student',
    plateNumber: 'XYZ 5678',
    brand: 'Honda Click 125i',
    vehicleType: 'Motorcycle',
    entryTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    violationId: 'vio-2',
    referenceNumber: 'VIO-20260611-C4F1',
    violationType: 'Unauthorized Parking',
    penaltyFee: 1000.0,
    settlementStatus: 'Unpaid',
    isPaid: false,
    firstName: 'Elena',
    lastName: 'Cruz',
    roleName: 'Staff',
    plateNumber: 'JKL 7890',
    brand: 'Yamaha Mio',
    vehicleType: 'Motorcycle',
    entryTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  }
])

const fetchViolations = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/violations/history/page/1/1000')
    if (response.data && response.data.isSuccess) {
      const items = response.data.data?.items || []
      if (items.length > 0) {
        violations.value = items.map((item: any) => ({
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
      }
    }
  } catch (error) {
    console.error('Error fetching violations:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchViolations()
})

// Filter and Search State
const searchQuery = ref('')
const filterViolationType = ref<string>('all')
const filterStatus = ref<string>('all')

// Modals State
const selectedViolation = ref<Violation | null>(null)
const isDetailOpen = ref(false)
const isPaymentOpen = ref(false)
const activePaymentViolation = ref<Violation | null>(null)
const paymentReferenceInput = ref('')

// Stats computation
const totalCount = computed(() => violations.value.length)
const unpaidCount = computed(() => violations.value.filter((v) => v.settlementStatus === 'Unpaid').length)
const paidCount = computed(() => violations.value.filter((v) => v.settlementStatus === 'Paid').length)
const totalCollection = computed(() => {
  return violations.value
    .filter((v) => v.settlementStatus === 'Paid')
    .reduce((sum, v) => sum + v.penaltyFee, 0)
})

const stats = computed(() => [
  {
    title: 'Total Violations',
    value: String(totalCount.value),
    subtitle: 'All logged violations',
    icon: 'total',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)'
  },
  {
    title: 'Unpaid Accounts',
    value: String(unpaidCount.value),
    subtitle: 'Awaiting settlement',
    icon: 'unpaid',
    gradient: 'linear-gradient(135deg, #d22730, #f87171)'
  },
  {
    title: 'Paid Settlements',
    value: String(paidCount.value),
    subtitle: 'Cleared/Paid violations',
    icon: 'paid',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)'
  },
  {
    title: 'Total Collections',
    value: `₱${totalCollection.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    subtitle: 'Revenue from penalties',
    icon: 'collection',
    gradient: 'linear-gradient(135deg, #fdb813, #fbbf24)'
  }
])

// Filtered Violations list
const filteredViolations = computed(() => {
  return violations.value.filter((v) => {
    const fullName = `${v.firstName} ${v.lastName}`.toLowerCase()
    const matchesSearch =
      v.referenceNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      fullName.includes(searchQuery.value.toLowerCase())

    const matchesType = filterViolationType.value === 'all' || v.violationType === filterViolationType.value
    const matchesStatus = filterStatus.value === 'all' || v.settlementStatus === filterStatus.value

    return matchesSearch && matchesType && matchesStatus
  })
})

const openDetails = (violation: Violation) => {
  selectedViolation.value = violation
  isDetailOpen.value = true
}

const openPaymentModal = (violation?: Violation) => {
  if (violation) {
    activePaymentViolation.value = violation
    paymentReferenceInput.value = violation.referenceNumber
  } else {
    activePaymentViolation.value = null
    paymentReferenceInput.value = ''
  }
  isPaymentOpen.value = true
}

const handleSettleTrigger = (refNumber: string) => {
  isDetailOpen.value = false
  const vio = violations.value.find((v) => v.referenceNumber === refNumber)
  if (vio) {
    openPaymentModal(vio)
  }
}

const handlePaymentSubmit = () => {
  let refToSettle = paymentReferenceInput.value.trim().toUpperCase()
  
  if (activePaymentViolation.value) {
    refToSettle = activePaymentViolation.value.referenceNumber
  }

  const index = violations.value.findIndex(
    (v) => v.referenceNumber.toUpperCase() === refToSettle
  )

  if (index === -1) {
    showToast(`Violation reference number "${refToSettle}" not found!`, 'warning')
    return
  }

  const violation = violations.value[index]
  if (!violation) {
    showToast(`Violation reference number "${refToSettle}" not found!`, 'warning')
    return
  }

  if (violation.settlementStatus === 'Paid') {
    showToast(`Violation "${refToSettle}" is already settled/paid!`, 'info')
    isPaymentOpen.value = false
    return
  }

  // Settle it
  violation.settlementStatus = 'Paid'
  violation.isPaid = true
  violation.exitTime = new Date().toISOString() // Mock exit settlement time

  isPaymentOpen.value = false
  showToast(`Violation ${refToSettle} settled successfully! ₱${violation.penaltyFee.toFixed(2)} received.`, 'success')
}

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}
</script>

<template>
  <div class="violations-view">
    <!-- Header -->
    <div class="violations-header">
      <div class="violations-header__left">
        <h1 class="violations-title">Collections Log</h1>
        <p class="violations-subtitle">Track collection tickets, penalty fees, and process reference code payments.</p>
      </div>
      <button class="settle-btn" @click="openPaymentModal()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Settle Collection
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.title" class="stat-card">
        <div v-if="isLoading">
          <SkeletonLoader variant="rect" height="100px" style="width: 100%; border-radius: var(--radius-card);" />
        </div>
        <template v-else>
          <div class="stat-card__left">
            <span class="stat-card__value">{{ stat.value }}</span>
            <span class="stat-card__title">{{ stat.title }}</span>
            <span class="stat-card__subtitle">{{ stat.subtitle }}</span>
          </div>
          <div class="stat-card__icon" :style="{ background: stat.gradient }">
            <!-- Total Icon -->
            <svg v-if="stat.icon === 'total'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <!-- Unpaid Icon -->
            <svg v-if="stat.icon === 'unpaid'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <!-- Paid Icon -->
            <svg v-if="stat.icon === 'paid'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <!-- Collection Icon -->
            <svg v-if="stat.icon === 'collection'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </template>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <!-- Search Input -->
      <div class="search-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search reference, plate, owner name..." class="search-input" />
      </div>

      <div class="filters-group">
        <!-- Violation Type Filter -->
        <div class="select-wrapper">
          <select v-model="filterViolationType" class="filter-select">
            <option value="all">All Violation Types</option>
            <option value="Overstay Limit">Overstay Limit</option>
            <option value="Unauthorized Parking">Unauthorized Parking</option>
            <option value="Expired Permit">Expired Permit</option>
          </select>
        </div>

        <!-- Settlement Status Filter -->
        <div class="select-wrapper">
          <select v-model="filterStatus" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Violations Table -->
    <div class="table-card">
      <div class="table-responsive">
        <table class="violations-table">
          <thead>
            <tr>
              <th>Reference Code</th>
              <th>Vehicle</th>
              <th>Owner / Role</th>
              <th>Violation Type</th>
              <th>Penalty Fine</th>
              <th>Issued At</th>
              <th>Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="8">
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
              </td>
            </tr>
            <tr v-else-if="filteredViolations.length === 0">
              <td colspan="8" class="empty-state">No violation tickets found.</td>
            </tr>
            <tr
              v-else
              v-for="violation in filteredViolations"
              :key="violation.violationId"
              class="violation-row"
              @click="openDetails(violation)"
            >
              <td>
                <span class="ref-code monospace">{{ violation.referenceNumber }}</span>
              </td>
              <td>
                <div class="vehicle-cell">
                  <span class="plate-number">{{ violation.plateNumber }}</span>
                  <span class="vehicle-brand">{{ violation.brand }}</span>
                </div>
              </td>
              <td>
                <div class="owner-cell">
                  <span class="owner-name">{{ violation.firstName }} {{ violation.lastName }}</span>
                  <span class="role-badge" :class="'role-badge--' + violation.roleName.toLowerCase()">
                    {{ getRoleLabel(violation.roleName) }}
                  </span>
                </div>
              </td>
              <td>
                <span class="violation-type-text">{{ violation.violationType }}</span>
              </td>
              <td>
                <span class="fine-price">₱{{ violation.penaltyFee.toFixed(2) }}</span>
              </td>
              <td>
                <span class="time-text">{{ new Date(violation.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                <span class="date-sub">{{ new Date(violation.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</span>
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="violation.settlementStatus === 'Paid' ? 'status-pill--paid' : 'status-pill--unpaid'"
                >
                  {{ violation.settlementStatus }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <div class="actions-group">
                  <button class="action-icon-btn" title="View Details" @click="openDetails(violation)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </button>
                  <button
                    v-if="violation.settlementStatus === 'Unpaid'"
                    class="action-icon-btn action-icon-btn--settle"
                    title="Process Settlement"
                    @click="openPaymentModal(violation)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <ViolationDetailModal
      :violation="selectedViolation"
      :is-open="isDetailOpen"
      @close="isDetailOpen = false"
      @settle="handleSettleTrigger"
    />

    <!-- Quick Settlement Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isPaymentOpen" class="modal-backdrop" @click="isPaymentOpen = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">Settle Violation Fine</h3>
              <button class="close-btn" @click="isPaymentOpen = false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form @submit.prevent="handlePaymentSubmit">
              <div class="modal-body">
                <div v-if="!activePaymentViolation" class="form-group">
                  <label for="payReference">Reference Code</label>
                  <input
                    id="payReference"
                    v-model="paymentReferenceInput"
                    type="text"
                    placeholder="VIO-YYYYMMDD-XXXX"
                    class="form-input"
                    required
                  />
                  <span class="help-text">Verify reference code printed on the ticket receipt.</span>
                </div>
                <div v-else class="payment-details-card">
                  <div class="pay-row">
                    <span class="pay-label">Ticket Reference</span>
                    <span class="pay-val monospace">{{ activePaymentViolation.referenceNumber }}</span>
                  </div>
                  <div class="pay-row">
                    <span class="pay-label">Violation Type</span>
                    <span class="pay-val highlight">{{ activePaymentViolation.violationType }}</span>
                  </div>
                  <div class="pay-row">
                    <span class="pay-label">Owner Name</span>
                    <span class="pay-val">{{ activePaymentViolation.firstName }} {{ activePaymentViolation.lastName }}</span>
                  </div>
                  <div class="pay-row border-top">
                    <span class="pay-label">Amount Charged</span>
                    <span class="pay-val price-label">₱{{ activePaymentViolation.penaltyFee.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="cancel-btn" @click="isPaymentOpen = false">Cancel</button>
                <button type="submit" class="submit-btn">Receive Settlement</button>
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
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg v-else-if="toast.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <span class="toast-msg">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.violations-view {
  animation: fadeSlideUp 0.4s ease both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.violations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.violations-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.violations-subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0 0;
}

.settle-btn {
  background: var(--color-success);
  color: #fff;
  border: none;
  border-radius: var(--radius-button);
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  transition: background 150ms ease, transform 150ms ease;
}

.settle-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-soft);
  transition: transform 200ms ease, box-shadow 200ms ease;
  min-height: 84px; /* Ensure skeleton height matches */
  box-sizing: border-box;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.stat-card__left {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-card__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.stat-card__subtitle {
  font-size: 11px;
  color: var(--color-muted);
  opacity: 0.8;
  margin-top: 2px;
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

/* Filters Bar */
.filters-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
  }
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 420px;
}

@media (max-width: 768px) {
  .search-wrapper {
    max-width: 100%;
  }
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 14px 10px 42px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.filters-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.select-wrapper {
  position: relative;
}

.filter-select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 36px 10px 14px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  transition: border-color 150ms ease;
  height: 38px;
  box-sizing: border-box;
}

.filter-select:hover {
  border-color: var(--color-muted);
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

.violations-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.violations-table th {
  padding: 16px 24px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-muted);
  letter-spacing: 1px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-lighter);
}

.violation-row {
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 150ms ease;
  background: var(--color-surface);
}

.violation-row:hover {
  background: var(--color-surface-lighter);
}

.violation-row:last-child {
  border-bottom: none;
}

.violations-table td {
  padding: 16px 24px;
  vertical-align: middle;
}

.ref-code {
  font-weight: 700;
  color: var(--color-text);
  font-size: 13px;
  letter-spacing: 0.5px;
}

.monospace {
  font-family: monospace;
}

.violation-type-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.fine-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
}

/* Vehicle Cell */
.vehicle-cell {
  display: flex;
  flex-direction: column;
  min-width: 140px;
}

.plate-number {
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.vehicle-brand {
  font-size: 11px;
  color: var(--color-muted);
  margin-top: 2px;
}

/* Owner Cell */
.owner-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.owner-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* Time text */
.time-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  display: block;
}

.date-sub {
  font-size: 11px;
  color: var(--color-muted);
  display: block;
  margin-top: 2px;
}

/* Badges */
.role-badge {
  align-self: flex-start;
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge--admin {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.role-badge--student {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.role-badge--guard {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

.role-badge--faculty,
.role-badge--staff,
.role-badge--universitystaff,
.role-badge--nonacademicpersonnel {
  background: rgba(253, 184, 19, 0.1);
  color: var(--color-warning);
}

/* Status pills */
.status-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.status-pill--paid {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-pill--unpaid {
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-danger);
}

/* Actions */
.actions-header {
  text-align: right;
}

.actions-cell {
  text-align: right;
}

.actions-group {
  display: inline-flex;
  gap: 8px;
}

.action-icon-btn {
  background: var(--color-surface-lighter);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
}

.action-icon-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.action-icon-btn--settle {
  border-color: rgba(16, 185, 129, 0.2);
  color: var(--color-success);
}

.action-icon-btn--settle:hover {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.empty-state {
  text-align: center;
  padding: 48px !important;
  color: var(--color-muted);
  font-size: 14px;
}

/* Modal styles for Quick Payment */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  width: 100%;
  max-width: 460px;
  box-shadow: var(--shadow-modal);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 90vw;
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.close-btn:hover {
  background: var(--color-surface-lighter);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.help-text {
  font-size: 11px;
  color: var(--color-muted);
}

.payment-details-card {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.pay-row.border-top {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
  margin-top: 4px;
}

.pay-label {
  color: var(--color-muted);
}

.pay-val {
  font-weight: 600;
  color: var(--color-text);
}

.pay-val.highlight {
  color: var(--color-primary);
  font-weight: 700;
}

.price-label {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-success);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: var(--color-surface-muted);
  border: none;
  color: var(--color-text);
  padding: 10px 18px;
  border-radius: var(--radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.cancel-btn:hover {
  background: var(--color-surface-lighter);
}

.submit-btn {
  background: var(--color-success);
  border: none;
  color: #fff;
  padding: 10px 18px;
  border-radius: var(--radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.submit-btn:hover {
  background: #059669;
}

/* Toast styling */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 150;
  max-width: 360px;
}

.toast-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-elevated);
  box-sizing: border-box;
}

.toast--success {
  border-left: 4px solid var(--color-success);
}

.toast--success .toast-icon {
  color: var(--color-success);
}

.toast--warning {
  border-left: 4px solid var(--color-warning);
}

.toast--warning .toast-icon {
  color: var(--color-warning);
}

.toast--info {
  border-left: 4px solid var(--color-info);
}

.toast--info .toast-icon {
  color: var(--color-info);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-msg {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

/* Fade transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-leave-active {
  transition: all 0.2s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
