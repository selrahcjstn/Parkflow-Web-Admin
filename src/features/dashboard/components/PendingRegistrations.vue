<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { PendingRegistration } from '../types'
import api from '@/api/axios'

import { cachedRegistrations, cachedSubmissionGuids } from '../dashboardCache'

const router = useRouter()

// Store registrations in a reactive array, initialized from cache if present
const registrations = reactive<PendingRegistration[]>(cachedRegistrations.value || [])

// Helper map to keep track of actual database GUIDs mapping to indices
const submissionGuids = reactive<Record<number, string>>(cachedSubmissionGuids.value || {})

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  const p0 = parts[0]
  const p1 = parts[1]
  if (parts.length >= 2 && p0 && p1 && p0[0] && p1[0]) {
    return (p0[0] + p1[0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const pendingCount = computed(() => registrations.filter((r) => r.status === 'pending').length)

// Limit dashboard widget display to top 4 items
const displayedRegistrations = computed(() => registrations.slice(0, 4))

function goToRegistrations() {
  router.push('/registrations')
}

onMounted(async () => {
  try {
    const response = await api.get('/cor-submissions')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const submissions = response.data.data
      
      if (submissions.length > 0) {
        registrations.length = 0
        submissions.forEach((sub: any, i: number) => {
          let mappedStatus: 'pending' | 'approved' | 'rejected' = 'pending'
          if (sub.verificationStatus === 2) mappedStatus = 'approved'
          if (sub.verificationStatus === 3) mappedStatus = 'rejected'

          const regId = i + 1
          submissionGuids[regId] = sub.id

          registrations.push({
            id: regId,
            fullName: sub.fullName || `Student User ${sub.userAccountId ? sub.userAccountId.slice(0, 4).toUpperCase() : regId}`,
            email: sub.email || `student-${regId}@university.edu`,
            dateApplied: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jun 9, 2026',
            vehiclePlate: sub.vehiclePlate || 'N/A',
            vehicleType: sub.vehicleType || 'Student COR',
            status: mappedStatus
          })
        })
        cachedRegistrations.value = [...registrations]
        cachedSubmissionGuids.value = { ...submissionGuids }
      }
    }
  } catch (error) {
    console.error('Error fetching COR submissions:', error)
  }
})

async function approve(reg: PendingRegistration) {
  const guid = submissionGuids[reg.id]
  if (!guid) {
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
  const reason = window.prompt('Enter rejection reason for this registration (optional):', 'Invalid or unreadable document uploaded.')
  if (reason === null) return

  const guid = submissionGuids[reg.id]
  if (!guid) {
    reg.status = 'rejected'
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${guid}/validate`, {
      verificationStatus: 3, // Rejected
      rejectionReason: reason
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
        <span class="pending-card__subtitle">Accounts awaiting document verification</span>
      </div>
      <button class="pending-card__see-all" @click="goToRegistrations">
        View all →
      </button>
    </div>

    <div class="pending-card__list">
      <div v-if="displayedRegistrations.length === 0" class="pending-card__empty">
        No pending registrations awaiting verification.
      </div>
      <div
        v-else
        v-for="reg in displayedRegistrations"
        :key="reg.id"
        class="pending-card__row"
      >
        <!-- Column 1: User Info -->
        <div class="pending-card__col pending-card__col--user">
          <div class="pending-card__avatar">
            {{ getInitials(reg.fullName) }}
          </div>
          <div class="pending-card__info">
            <span class="pending-card__name">{{ reg.fullName }}</span>
            <span class="pending-card__email">{{ reg.email }}</span>
          </div>
        </div>

        <!-- Column 2: Date Applied -->
        <div class="pending-card__col pending-card__col--date">
          <span class="pending-card__date-label">Applied</span>
          <span class="pending-card__date-val">{{ reg.dateApplied }}</span>
        </div>

        <!-- Column 3: Vehicle Info -->
        <div class="pending-card__col pending-card__col--vehicle">
          <span class="pending-card__plate">{{ reg.vehiclePlate }}</span>
          <span class="pending-card__vehicle-type">{{ reg.vehicleType }}</span>
        </div>

        <!-- Column 4: Actions -->
        <div class="pending-card__col pending-card__col--actions">
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
  box-shadow: none !important;
}

.pending-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
}

.pending-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-card__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.2px;
}

.pending-card__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(210, 39, 48, 0.08);
  border: 1px solid rgba(210, 39, 48, 0.2);
  color: #D22730;
  font-size: 11px;
  font-weight: 700;
}

.pending-card__subtitle {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
  display: block;
}

.pending-card__see-all {
  font-size: 12px;
  font-weight: 600;
  color: #D22730;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
}

.pending-card__see-all:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.pending-card__list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pending-card__row {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) 110px 140px auto;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  transition: background 150ms ease;
}

.pending-card__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pending-card__col {
  min-width: 0;
}

.pending-card__col--user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pending-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #D22730;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
  letter-spacing: 0.5px;
}

.pending-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pending-card__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.pending-card__email {
  font-size: 11.5px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.pending-card__col--date {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.pending-card__date-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-subtle, #94a3b8);
}

.pending-card__date-val {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #475569);
  white-space: nowrap;
}

.pending-card__col--vehicle {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  white-space: nowrap;
}

.pending-card__plate {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.pending-card__vehicle-type {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: 4px;
  background: var(--color-surface-muted, #f1f5f9);
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-muted, #64748b);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.pending-card__col--actions {
  display: flex;
  justify-content: flex-end;
  white-space: nowrap;
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
  gap: 6px;
}

.pending-card__btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 150ms ease;
}

.pending-card__btn--approve {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.2);
}

.pending-card__btn--approve:hover {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.pending-card__btn--reject {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);
}

.pending-card__btn--reject:hover {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.pending-card__col--actions {
  min-width: 160px;
  width: 160px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.pending-card__result {
  font-size: 13px;
  font-weight: 600;
  padding: 0;
}

.pending-card__result--approved {
  background: transparent;
  color: #059669;
}

.pending-card__result--rejected {
  background: transparent;
  color: #dc2626;
}

.pending-fade-enter-active,
.pending-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
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
  padding: 24px 16px;
  color: var(--color-muted);
  font-size: 13px;
  background: var(--color-surface-lighter, #f8f9fb);
  border-radius: 12px;
}

@media (max-width: 768px) {
  .pending-card__row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
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
