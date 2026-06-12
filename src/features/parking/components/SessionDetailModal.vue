<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveSession, ParkingHistoryItem } from '../types'

const props = defineProps<{
  session: ActiveSession | ParkingHistoryItem | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'exit', session: ActiveSession): void
}>()

const isActive = computed(() => {
  if (!props.session) return false
  return !('checkOutTime' in props.session)
})

const getStatusClass = (status: string) => {
  switch (status) {
    case 'Parked':
      return 'status--parked'
    case 'Exited':
      return 'status--exited'
    case 'Overstay':
      return 'status--overstay'
    default:
      return ''
  }
}

const getEntryMethod = computed(() => {
  if (!props.session) return 'QrCode'
  if ('method' in props.session) return props.session.method
  return 'QrCode' // Default for active sessions
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen && session" class="modal-backdrop" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Parking Session Info</h3>
          <button class="close-btn" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Status Alert -->
          <div class="status-banner" :class="getStatusClass(session.status)">
            <span class="status-banner__label">Status:</span>
            <span class="status-banner__value">{{ session.status }}</span>
          </div>

          <!-- Vehicle Block -->
          <div class="info-section">
            <h4 class="section-title">Vehicle details</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Plate Number</span>
                <span class="detail-value plate-number">{{ session.vehiclePlate }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Brand / Model</span>
                <span class="detail-value">{{ session.brand || 'Unknown Brand' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vehicle Type</span>
                <span class="detail-value">{{ session.vehicleType }}</span>
              </div>
            </div>
          </div>

          <!-- Owner Block -->
          <div class="info-section">
            <h4 class="section-title">Owner Information</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Name</span>
                <span class="detail-value">{{ session.ownerName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Classification</span>
                <span class="detail-value">{{ session.role }}</span>
              </div>
              <div class="detail-item" v-if="getEntryMethod">
                <span class="detail-label">Entry Method</span>
                <span class="detail-value">{{ getEntryMethod }}</span>
              </div>
            </div>
          </div>

          <!-- Session Timing Block -->
          <div class="info-section">
            <h4 class="section-title">Session Timing & Costs</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Check-in Time</span>
                <span class="detail-value">{{ new Date(session.checkInTime).toLocaleString() }}</span>
              </div>
              <div class="detail-item" v-if="!isActive">
                <span class="detail-label">Check-out Time</span>
                <span class="detail-value">{{ new Date((session as ParkingHistoryItem).checkOutTime).toLocaleString() }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duration</span>
                <span class="detail-value">{{ session.duration }}</span>
              </div>
              <div class="detail-item" v-if="isActive">
                <span class="detail-label">Entry Gate</span>
                <span class="detail-value">Gate {{ (session as ActiveSession).gate || 1 }}</span>
              </div>
              <div class="detail-item" v-else>
                <span class="detail-label">Parking Fee</span>
                <span class="detail-value cost-value">{{ (session as ParkingHistoryItem).charge }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="isActive"
            class="action-btn action-btn--exit"
            @click="emit('exit', session as ActiveSession)"
          >
            Manual Checkout
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
}

.status-banner {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status--parked {
  background: rgba(35, 165, 90, 0.12);
  color: var(--color-success);
}

.status--exited {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}

.status--overstay {
  background: rgba(248, 113, 113, 0.12);
  color: var(--color-danger);
}

.status-banner__label {
  opacity: 0.8;
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

.cost-value {
  color: var(--color-success);
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

.action-btn--exit {
  background: var(--color-danger);
  color: #fff;
}

.action-btn--exit:hover {
  background: #dc2626;
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
