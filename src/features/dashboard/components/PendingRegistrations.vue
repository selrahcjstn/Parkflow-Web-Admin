<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import type { PendingRegistration } from '../types'
import api from '@/api/axios'

// We store our registrations as a reactive array
const registrations = reactive<PendingRegistration[]>([])

// Helper array to keep track of actual database GUIDs mapping to indices
const submissionGuids = reactive<Record<number, string>>({})

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getGradient(index: number): string {
  return avatarGradients[index % avatarGradients.length] ?? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
}

const pendingCount = computed(() => registrations.filter((r) => r.status === 'pending').length)

onMounted(async () => {
  try {
    const response = await api.get('/cor-submissions')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const submissions = response.data.data
      
      // If there are real submissions in the backend, let's map them
      if (submissions.length > 0) {
        registrations.length = 0 // Clear mock data
        submissions.forEach((sub: any, i: number) => {
          // Map backend verification status enum
          // Pending = 1, Verified = 2, Rejected = 3
          let mappedStatus: 'pending' | 'approved' | 'rejected' = 'pending'
          if (sub.verificationStatus === 2) mappedStatus = 'approved'
          if (sub.verificationStatus === 3) mappedStatus = 'rejected'

          const regId = i + 1
          submissionGuids[regId] = sub.id

          registrations.push({
            id: regId,
            fullName: sub.fullName || `Student User ${sub.userAccountId.slice(0, 4).toUpperCase()}`,
            email: sub.email || `student-${regId}@university.edu`,
            dateApplied: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jun 9, 2026',
            vehiclePlate: sub.vehiclePlate || 'N/A',
            vehicleType: sub.vehicleType || 'Student COR',
            status: mappedStatus
          })
        })
      }
    }
  } catch (error) {
    console.error('Error fetching COR submissions:', error)
  }
})

async function approve(reg: PendingRegistration) {
  const guid = submissionGuids[reg.id]
  if (!guid) {
    // Fallback for mock data
    reg.status = 'approved'
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${guid}/validate`, {
      verificationStatus: 2 // Verified
    })
    if (response.data?.isSuccess) {
      reg.status = 'approved'
    }
  } catch (error) {
    console.error('Error approving submission:', error)
  }
}

async function reject(reg: PendingRegistration) {
  const guid = submissionGuids[reg.id]
  if (!guid) {
    // Fallback for mock data
    reg.status = 'rejected'
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${guid}/validate`, {
      verificationStatus: 3 // Rejected
    })
    if (response.data?.isSuccess) {
      reg.status = 'rejected'
    }
  } catch (error) {
    console.error('Error rejecting submission:', error)
  }
}
</script>

<template>
  <div class="pending-card">
    <div class="pending-card__header">
      <div class="pending-card__header-left">
        <div class="pending-card__title-row">
          <h3 class="pending-card__title">Pending Registrations</h3>
          <span v-if="pendingCount > 0" class="pending-card__count">{{ pendingCount }}</span>
        </div>
        <span class="pending-card__subtitle">Accounts awaiting verification</span>
      </div>
    </div>

    <div class="pending-card__list">
      <div v-if="registrations.length === 0" class="pending-card__empty">
        No pending registrations found.
      </div>
      <div
        v-else
        v-for="(reg, index) in registrations"
        :key="reg.id"
        class="pending-card__row"
        :class="{
          'pending-card__row--approved': reg.status === 'approved',
          'pending-card__row--rejected': reg.status === 'rejected',
        }"
      >
        <div class="pending-card__left">
          <div class="pending-card__avatar" :style="{ background: getGradient(index) }">
            {{ getInitials(reg.fullName) }}
          </div>
          <div class="pending-card__info">
            <span class="pending-card__name">{{ reg.fullName }}</span>
            <span class="pending-card__email">{{ reg.email }}</span>
          </div>
        </div>

        <div class="pending-card__middle">
          <span class="pending-card__date">{{ reg.dateApplied }}</span>
          <div class="pending-card__vehicle-info">
            <span class="pending-card__plate">{{ reg.vehiclePlate }}</span>
            <span class="pending-card__vehicle-type">{{ reg.vehicleType }}</span>
          </div>
        </div>

        <div class="pending-card__right">
          <Transition name="pending-fade" mode="out-in">
            <div v-if="reg.status === 'pending'" class="pending-card__actions" key="actions">
              <button class="pending-card__btn pending-card__btn--approve" @click="approve(reg)">
                Approve
              </button>
              <button class="pending-card__btn pending-card__btn--reject" @click="reject(reg)">
                Reject
              </button>
            </div>
            <span v-else-if="reg.status === 'approved'" class="pending-card__result pending-card__result--approved" key="approved">
              ✓ Approved
            </span>
            <span v-else class="pending-card__result pending-card__result--rejected" key="rejected">
              ✗ Rejected
            </span>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
}

.pending-card__header {
  margin-bottom: 8px;
}

.pending-card__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pending-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.pending-card__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 20px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.pending-card__subtitle {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
  display: block;
}

.pending-card__list {
  margin-top: 16px;
}

.pending-card__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  border-left: 3px solid transparent;
  transition: background 150ms ease, border-left-color 300ms ease;
  border-radius: 4px;
  margin-left: -16px;
  margin-right: -16px;
  padding-left: 16px;
}

.pending-card__row:last-child {
  border-bottom: none;
}

.pending-card__row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.pending-card__row--approved {
  border-left-color: #23a55a;
}

.pending-card__row--rejected {
  border-left-color: #f87171;
}

.pending-card__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.pending-card__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  user-select: none;
}

.pending-card__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pending-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-card__email {
  font-size: 12px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-card__middle {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex-shrink: 0;
}

.pending-card__date {
  font-size: 12px;
  color: var(--color-muted);
}

.pending-card__vehicle-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-card__plate {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.pending-card__vehicle-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 500;
}

.pending-card__right {
  flex-shrink: 0;
  min-width: 140px;
  display: flex;
  justify-content: flex-end;
}

.pending-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-card__btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 150ms ease;
}

.pending-card__btn--approve {
  background: rgba(35, 165, 90, 0.12);
  color: #23a55a;
}

.pending-card__btn--approve:hover {
  background: rgba(35, 165, 90, 0.25);
}

.pending-card__btn--reject {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

.pending-card__btn--reject:hover {
  background: rgba(248, 113, 113, 0.25);
}

.pending-card__result {
  font-size: 13px;
  font-weight: 600;
}

.pending-card__result--approved {
  color: #23a55a;
}

.pending-card__result--rejected {
  color: #f87171;
}

/* Transition for button to status text */
.pending-fade-enter-active,
.pending-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pending-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.pending-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.pending-card__empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--color-muted);
  font-size: 14px;
}

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .pending-card__row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .pending-card__left {
    width: 100%;
  }

  .pending-card__middle {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .pending-card__right {
    width: 100%;
    justify-content: flex-start;
    min-width: 0;
  }
}
</style>
