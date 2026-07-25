<script setup lang="ts">
import { computed } from 'vue'
import type { Vehicle } from '../types'

const props = defineProps<{
  vehicle: Vehicle | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'togglePrimary', id: string): void
  (e: 'toggleStatus', id: string): void
}>()

const getVehicleIcon = computed(() => {
  if (!props.vehicle) return 'Car'
  return props.vehicle.vehicleType
})

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen && vehicle" class="modal-backdrop" @click="emit('close')">
        <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Vehicle details</h3>
          <button class="close-btn" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Main Card Highlight -->
          <div class="vehicle-banner" :class="'vehicle-banner--' + vehicle.status.toLowerCase()">
            <div class="banner-icon">
              <svg v-if="vehicle.vehicleType === 'Car'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
              <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5" cy="18" r="3" />
                <circle cx="19" cy="18" r="3" />
                <path d="M12 18V8h4" />
                <path d="M5 18h14" opacity="0.3" />
              </svg>
            </div>
            <div class="banner-info">
              <span class="plate-number monospace">{{ vehicle.plateNumber }}</span>
              <span class="brand-model">{{ vehicle.brand }}</span>
            </div>
            <span class="status-indicator">{{ vehicle.status }}</span>
          </div>

          <!-- General Details -->
          <div class="info-section">
            <h4 class="section-title">Registration properties</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Vehicle Type</span>
                <span class="detail-value">{{ vehicle.vehicleType === 'ElectricBike' ? 'E-Bike' : vehicle.vehicleType }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Primary Status</span>
                <span class="detail-value">
                  <span class="status-pill" :class="vehicle.isPrimary ? 'status-pill--primary' : 'status-pill--secondary'">
                    {{ vehicle.isPrimary ? 'Primary' : 'Secondary' }}
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">RFID/QR Code Hash</span>
                <span class="detail-value monospace code-text">{{ vehicle.qrCodeHash || 'QR-NOT-GENERATED' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">System Record ID</span>
                <span class="detail-value monospace mini-id">{{ vehicle.id }}</span>
              </div>
            </div>
          </div>

          <!-- Owner Details -->
          <div class="info-section">
            <h4 class="section-title">Owner Information</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Full Name</span>
                <span class="detail-value">{{ vehicle.ownerName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Classification</span>
                <span class="detail-value">
                  <span class="role-badge" :class="'role-badge--' + vehicle.ownerRole.toLowerCase()">
                    {{ getRoleLabel(vehicle.ownerRole) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            class="action-btn action-btn--secondary"
            @click="emit('toggleStatus', vehicle.id)"
          >
            {{ vehicle.status === 'Active' ? 'Suspend Vehicle' : 'Activate Vehicle' }}
          </button>
          <button
            v-if="!vehicle.isPrimary"
            class="action-btn action-btn--primary"
            @click="emit('togglePrimary', vehicle.id)"
          >
            Set as Primary
          </button>
          <button class="action-btn action-btn--close" @click="emit('close')">Close</button>
        </div>
      </div>
    </div>
  </Transition>
</Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  z-index: 9999;
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

.vehicle-banner {
  padding: 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.vehicle-banner--active {
  background: rgba(35, 165, 90, 0.12);
  color: var(--color-success);
}

.vehicle-banner--suspended {
  background: rgba(248, 113, 113, 0.12);
  color: var(--color-danger);
}

.banner-icon {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
}

.banner-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.plate-number {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--color-text);
}

.brand-model {
  font-size: 13px;
  color: var(--color-muted);
  margin-top: 2px;
}

.status-indicator {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 12px;
  background: currentColor;
  color: var(--color-surface);
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

.code-text {
  color: #818cf8;
}

.mini-id {
  font-size: 11px;
  opacity: 0.7;
}

/* Badges & Status Pills */
.status-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-pill--primary {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.status-pill--secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-muted);
}

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

.action-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.action-btn--primary:hover {
  background: #dc2626;
}

.action-btn--secondary {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.action-btn--secondary:hover {
  background: var(--color-surface-lighter);
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
