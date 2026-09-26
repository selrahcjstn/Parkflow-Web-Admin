<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { PendingRegistration } from '../types'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

import { cachedRegistrations, cachedSubmissionGuids } from '../dashboardCache'

const router = useRouter()
const isLoading = ref(!cachedRegistrations.value)

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

// Only pending registrations
const pendingRegistrations = computed(() => registrations.filter((r) => r.status === 'pending'))
const pendingCount = computed(() => pendingRegistrations.value.length)

// Limit dashboard widget display to top 4 pending items
const displayedRegistrations = computed(() => pendingRegistrations.value.slice(0, 4))

function goToRegistrations() {
  router.push('/registrations')
}

onMounted(async () => {
  if (!cachedRegistrations.value) {
    isLoading.value = true
  }
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
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="pending-card">
    <div class="pending-card__header">
      <div class="pending-card__title-row">
        <h3 class="pending-card__title">Pending Registrations</h3>
        <span v-if="pendingCount > 0" class="pending-card__count">{{ pendingCount }}</span>
      </div>
      <button class="pending-card__link" @click="goToRegistrations">
        View all →
      </button>
    </div>

    <div class="pending-card__table-wrapper">
      <table class="pending-card__table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Date Applied</th>
            <th>Vehicle</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" v-for="i in 3" :key="`skel-reg-${i}`">
            <td colspan="4" style="padding: 10px 14px;">
              <SkeletonLoader variant="rect" height="32px" />
            </td>
          </tr>
          <tr v-else-if="displayedRegistrations.length === 0">
            <td colspan="4" class="pending-card__empty">
              No pending registrations awaiting verification.
            </td>
          </tr>
          <tr
            v-else
            v-for="reg in displayedRegistrations"
            :key="reg.id"
            class="pending-card__row"
            @click="goToRegistrations"
          >
            <td>
              <div class="pending-card__user">
                <div class="pending-card__avatar">
                  {{ getInitials(reg.fullName) }}
                </div>
                <div class="pending-card__user-info">
                  <span class="pending-card__name">{{ reg.fullName }}</span>
                  <span class="pending-card__email">{{ reg.email }}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="pending-card__date">{{ reg.dateApplied }}</span>
            </td>
            <td>
              <div class="pending-card__vehicle">
                <span class="pending-card__plate">{{ reg.vehiclePlate }}</span>
                <span class="pending-card__vehicle-type">{{ reg.vehicleType }}</span>
              </div>
            </td>
            <td class="text-right">
              <button class="pending-card__btn-review" @click.stop="goToRegistrations">
                Review
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(210, 39, 48, 0.1);
  color: #D22730;
}

.pending-card__link {
  font-size: 12px;
  font-weight: 600;
  color: #D22730;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity var(--transition-fast, 150ms ease);
}

.pending-card__link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.pending-card__table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pending-card__table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.pending-card__table thead th {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-muted);
  text-align: left;
  padding: 10px 14px;
  background: var(--color-surface-lighter, #f8f9fb);
  border-bottom: none;
}

.pending-card__table thead th.text-right {
  text-align: right;
}

.pending-card__table thead th:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.pending-card__table thead th:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.pending-card__row {
  cursor: pointer;
  transition: background 150ms ease;
}

.pending-card__row:hover {
  background: var(--color-surface-lighter, #f8f9fb);
}

.pending-card__row td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  font-size: 13px;
  color: var(--color-text);
  vertical-align: middle;
}

.pending-card__row td.text-right {
  text-align: right;
}

.pending-card__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pending-card__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #4f46e5;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pending-card__user-info {
  display: flex;
  flex-direction: column;
}

.pending-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.pending-card__email {
  font-size: 11.5px;
  color: var(--color-muted);
}

.pending-card__date {
  font-size: 12.5px;
  color: var(--color-text);
  font-weight: 500;
}

.pending-card__vehicle {
  display: flex;
  flex-direction: column;
}

.pending-card__plate {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text);
}

.pending-card__vehicle-type {
  font-size: 11.5px;
  color: var(--color-muted);
}

.pending-card__btn-review {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.pending-card__row:hover .pending-card__btn-review,
.pending-card__btn-review:hover {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #ffffff;
}

.pending-card__empty {
  text-align: center;
  padding: 24px 0;
  color: var(--color-muted);
  font-size: 13px;
}

@media (max-width: 768px) {
  .pending-card__table-wrapper {
    margin: 0 -24px;
    padding: 0 24px;
  }
}
</style>
