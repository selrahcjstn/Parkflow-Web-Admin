<script setup lang="ts">
import { computed } from 'vue'
import type { Violation } from '../types'

const props = defineProps<{
  violation: Violation | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'settle', referenceNumber: string): void
}>()

const getStatusClass = (status: string) => {
  return status === 'Paid' ? 'status--paid' : 'status--unpaid'
}

const getFormattedName = computed(() => {
  if (!props.violation) return ''
  const middle = props.violation.middleName ? ` ${props.violation.middleName}` : ''
  return `${props.violation.firstName}${middle} ${props.violation.lastName}`
})

const getVehicleIconType = computed(() => {
  if (!props.violation) return 'Car'
  return props.violation.vehicleType
})

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen && violation" class="modal-backdrop" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Violation details</h3>
          <button class="close-btn" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Status Banner -->
          <div class="status-banner" :class="getStatusClass(violation.settlementStatus)">
            <span class="status-banner__label">Reference:</span>
            <span class="status-banner__value monospace">{{ violation.referenceNumber }}</span>
            <span class="status-pill-indicator">{{ violation.settlementStatus }}</span>
          </div>

          <!-- Violation Summary Card -->
          <div class="violation-summary">
            <div class="summary-row">
              <span class="summary-label">Violation Type</span>
              <span class="summary-value highlight">{{ violation.violationType }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Penalty Fee</span>
              <span class="summary-value price-tag">₱{{ violation.penaltyFee.toFixed(2) }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Issued At</span>
              <span class="summary-value">{{ new Date(violation.issuedAt).toLocaleString() }}</span>
            </div>
          </div>

          <!-- Vehicle Info -->
          <div class="info-section">
            <h4 class="section-title">Vehicle details</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Plate Number</span>
                <span class="detail-value plate-number">{{ violation.plateNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Brand / Model</span>
                <span class="detail-value">{{ violation.brand }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vehicle Type</span>
                <span class="detail-value">{{ violation.vehicleType }}</span>
              </div>
            </div>
          </div>

          <!-- Owner Info -->
          <div class="info-section">
            <h4 class="section-title">Owner details</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Full Name</span>
                <span class="detail-value">{{ getFormattedName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Classification</span>
                <span class="detail-value">
                  <span class="role-badge" :class="'role-badge--' + violation.roleName.toLowerCase()">
                    {{ getRoleLabel(violation.roleName) }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Timing Block -->
          <div class="info-section">
            <h4 class="section-title">Session Timing</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Gate Entry Time</span>
                <span class="detail-value">{{ new Date(violation.entryTime).toLocaleString() }}</span>
              </div>
              <div class="detail-item" v-if="violation.exitTime">
                <span class="detail-label">Gate Exit Time</span>
                <span class="detail-value">{{ new Date(violation.exitTime).toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="violation.settlementStatus === 'Unpaid'"
            class="action-btn action-btn--settle"
            @click="emit('settle', violation.referenceNumber)"
          >
            Process Payment
          </button>
          <button class="action-btn action-btn--close" @click="emit('close')">Close</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
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
  max-width: 500px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.status-banner {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status--paid {
  background: rgba(35, 165, 90, 0.12);
  color: var(--color-success);
}

.status--unpaid {
  background: rgba(248, 113, 113, 0.12);
  color: var(--color-danger);
}

.status-banner__label {
  opacity: 0.8;
}

.status-banner__value {
  flex: 1;
}

.monospace {
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.status-pill-indicator {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
  background: currentColor;
  color: var(--color-surface);
}

.violation-summary {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.summary-label {
  color: var(--color-muted);
}

.summary-value {
  font-weight: 600;
  color: var(--color-text);
}

.summary-value.highlight {
  color: var(--color-primary);
  font-weight: 700;
}

.price-tag {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.75px;
  margin: 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 6px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  color: var(--color-muted);
}

.detail-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.plate-number {
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
}

/* Badges */
.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.role-badge--admin {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-primary);
}

.role-badge--student {
  background: rgba(35, 165, 90, 0.1);
  color: var(--color-success);
}

.role-badge--guard {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.role-badge--faculty,
.role-badge--staff,
.role-badge--universitystaff,
.role-badge--nonacademicpersonnel {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.action-btn {
  padding: 10px 18px;
  border-radius: var(--radius-button);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 150ms ease;
}

.action-btn--settle {
  background: var(--color-success);
  color: #fff;
}

.action-btn--settle:hover {
  background: #1e874b;
}

.action-btn--close {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.action-btn--close:hover {
  background: var(--color-surface-lighter);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
