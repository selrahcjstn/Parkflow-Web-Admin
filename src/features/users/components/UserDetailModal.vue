<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { UserWithDetails } from '../types'

const router = useRouter()

const props = defineProps<{
  user: UserWithDetails | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updateStatus', userId: string, newStatus: 'Suspended' | 'Active'): void
}>()

const handleChangePassword = () => {
  if (!props.user) return
  emit('close')
  router.push({
    path: '/users/change-password',
    query: {
      email: props.user.email,
      name: `${props.user.firstName} ${props.user.lastName}`,
      role: props.user.role
    }
  })
}

const getInitials = (user: UserWithDetails) => {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
}

const statusClass = computed(() => {
  if (!props.user) return ''
  const status = props.user.status
  if (status === 'Active') return 'user-detail__status--active'
  if (status === 'PendingVerification') return 'user-detail__status--pending'
  if (status === 'Suspended') return 'user-detail__status--suspended'
  return ''
})

const corStatusClass = computed(() => {
  if (!props.user) return ''
  const status = props.user.corVerificationStatus
  if (status === 'Verified') return 'user-detail__status--verified'
  if (status === 'Pending') return 'user-detail__status--pending'
  if (status === 'Rejected' || status === 'NotSubmitted') return 'user-detail__status--suspended'
  return ''
})

const formatStatus = (status: string) => {
  if (status === 'PendingVerification') return 'Pending Verification'
  return status
}

const formatCorStatus = (status: string) => {
  if (status === 'NotSubmitted') return 'Not Submitted'
  return status
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen && user" class="modal-backdrop" @click="emit('close')">
        <div class="modal-content" @click.stop>
        <!-- Header -->
        <div class="modal-header">
          <h3 class="modal-title">User Details</h3>
          <button class="close-btn" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <!-- Scrollable Body -->
        <div class="modal-body">
          <!-- User Profile Card -->
          <div class="profile-card">
            <div class="profile-card__avatar">
              <img v-if="user.profilePictureUrl" :src="user.profilePictureUrl" :alt="user.fullName" />
              <span v-else>{{ getInitials(user) }}</span>
            </div>
            <div class="profile-card__info">
              <h4 class="profile-card__name">{{ user.fullName }}</h4>
              <span class="profile-card__role-badge">{{ user.role }}</span>
            </div>
          </div>

          <!-- Account Details -->
          <div class="detail-section">
            <h5 class="section-title">Account Information</h5>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Email Address</span>
                <span class="detail-value">{{ user.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">{{ user.phoneNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Auth Provider</span>
                <span class="detail-value">{{ user.authProvider }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Account Status</span>
                <span class="detail-value" :class="statusClass">{{ formatStatus(user.status) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">COR Verification Status</span>
                <span class="detail-value" :class="corStatusClass">{{ formatCorStatus(user.corVerificationStatus) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date Registered</span>
                <span class="detail-value">{{ new Date(user.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }}</span>
              </div>
            </div>
          </div>

          <!-- Role Details -->
          <div v-if="user.student || user.personnel || user.guard" class="detail-section">
            <h5 class="section-title">Classification Details</h5>
            
            <!-- Student Details -->
            <div v-if="user.student" class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Student Number</span>
                <span class="detail-value">{{ user.student.studentNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Course</span>
                <span class="detail-value">{{ user.student.course }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Section</span>
                <span class="detail-value">{{ user.student.section }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Year Level</span>
                <span class="detail-value">{{ user.student.yearLevel }}</span>
              </div>
            </div>

            <!-- Personnel Details -->
            <div v-if="user.personnel" class="details-grid">
              <div class="detail-item">
                <span class="detail-label">ID Card Number</span>
                <span class="detail-value">{{ user.personnel.idCardNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Department</span>
                <span class="detail-value">{{ user.personnel.department }}</span>
              </div>
            </div>

            <!-- Guard Details -->
            <div v-if="user.guard" class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Assigned Gate</span>
                <span class="detail-value">Gate {{ user.guard.assignedGate }}</span>
              </div>
            </div>
          </div>

          <!-- Vehicle Details -->
          <div class="detail-section">
            <h5 class="section-title">Registered Vehicles</h5>
            <div v-if="user.vehicles.length === 0" class="no-data">
              No vehicles registered to this account.
            </div>
            <div v-else class="vehicles-list">
              <div v-for="vehicle in user.vehicles" :key="vehicle.plateNumber" class="vehicle-card">
                <div class="vehicle-card__left">
                  <div class="vehicle-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0" />
                      <circle cx="7.5" cy="16.5" r="2.5" />
                      <circle cx="16.5" cy="16.5" r="2.5" />
                    </svg>
                  </div>
                  <div class="vehicle-info">
                    <span class="vehicle-plate">{{ vehicle.plateNumber }}</span>
                    <span class="vehicle-brand">{{ vehicle.brand }}</span>
                  </div>
                </div>
                <div class="vehicle-card__right">
                  <span class="vehicle-badge">{{ vehicle.vehicleType }}</span>
                  <span v-if="vehicle.isPrimary" class="primary-badge">Primary</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="modal-footer">
          <div class="action-buttons">
            <button
              class="action-btn action-btn--password"
              @click="handleChangePassword"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change Password
            </button>
            <button
              v-if="user.status !== 'Suspended'"
              class="action-btn action-btn--suspend"
              @click="emit('updateStatus', user.id, 'Suspended')"
            >
              Suspend Account
            </button>
            <button
              v-if="user.status === 'Suspended'"
              class="action-btn action-btn--unsuspend"
              @click="emit('updateStatus', user.id, 'Active')"
            >
              Unsuspend Account
            </button>
            <button class="action-btn action-btn--close" @click="emit('close')">
              Close View
            </button>
          </div>
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
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
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
  max-width: 580px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface-muted);
  padding: 16px;
  border-radius: 12px;
}

.profile-card__avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), #fb7185);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
}

.profile-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-card__name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.profile-card__role-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.75px;
  margin: 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: var(--color-muted);
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.user-detail__status--active,
.user-detail__status--verified {
  color: var(--color-success);
}

.user-detail__status--pending {
  color: var(--color-warning);
}

.user-detail__status--suspended {
  color: var(--color-danger);
}

.no-data {
  text-align: center;
  padding: 16px;
  color: var(--color-muted);
  font-size: 13px;
  background: var(--color-surface-muted);
  border-radius: 8px;
}

.vehicles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vehicle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-surface-lighter);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.vehicle-card__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vehicle-icon {
  background: var(--color-surface-muted);
  color: var(--color-muted);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vehicle-info {
  display: flex;
  flex-direction: column;
}

.vehicle-plate {
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.vehicle-brand {
  font-size: 12px;
  color: var(--color-muted);
}

.vehicle-card__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vehicle-badge {
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface-muted);
  color: var(--color-muted);
  padding: 2px 8px;
  border-radius: 6px;
}

.primary-badge {
  font-size: 11px;
  font-weight: 600;
  background: rgba(35, 165, 90, 0.12);
  color: var(--color-success);
  padding: 2px 8px;
  border-radius: 6px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: var(--radius-button);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 150ms ease;
}

.action-btn--password {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.action-btn--password:hover {
  background: var(--color-border);
  color: var(--color-primary);
}

.action-btn--approve {
  background: var(--color-success);
  color: #fff;
}

.action-btn--approve:hover {
  background: #1e874b;
}

.action-btn--suspend {
  background: var(--color-danger);
  color: #fff;
}

.action-btn--suspend:hover {
  background: #dc2626;
}

.action-btn--unsuspend {
  background: var(--color-success);
  color: #fff;
}

.action-btn--unsuspend:hover {
  background: #1e874b;
}

.action-btn--close {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.action-btn--close:hover {
  background: var(--color-surface-lighter);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
