<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ParkingLog } from '../types'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

import { cachedParkingLogs } from '../dashboardCache'

const router = useRouter()
const isLoading = ref(!cachedParkingLogs.value)
const logs = ref<ParkingLog[]>(cachedParkingLogs.value || [])

function goToParking() {
  router.push('/parking')
}

onMounted(async () => {
  if (!cachedParkingLogs.value) {
    isLoading.value = true
  }
  try {
    const response = await api.get('/parking-logs/active-sessions?parkingCapacity=150')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const activeSessions = response.data.data
      const newLogs: ParkingLog[] = activeSessions.slice(0, 5).map((session: any, i: number) => ({
        id: Number(session.sessionId) || (i + 1),
        vehiclePlate: session.plateNumber || 'N/A',
        ownerName: session.firstName && session.lastName ? `${session.firstName} ${session.lastName}` : 'Unknown Owner',
        duration: session.totalParkingHours || '0h',
        charge: `₱${(session.amount || 0).toLocaleString()}`,
        status: session.status || (session.overstayHours > 0 ? 'Overstay' : 'Parked')
      }))
      logs.value = newLogs
      cachedParkingLogs.value = newLogs
    }
  } catch (error) {
    console.error('Error fetching active parking logs:', error)
    if (!cachedParkingLogs.value) {
      logs.value = [
        { id: 1, vehiclePlate: 'ABC-1234', ownerName: 'Juan Dela Cruz', duration: '1h 45m', charge: '₱40', status: 'Parked' },
        { id: 2, vehiclePlate: 'XYZ-9876', ownerName: 'Maria Santos', duration: '2h 10m', charge: '₱60', status: 'Parked' },
        { id: 3, vehiclePlate: 'NKN-4581', ownerName: 'Christian Reyes', duration: '4h 30m', charge: '₱120', status: 'Overstay' }
      ]
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="activity-card">
    <div class="activity-card__header">
      <div class="activity-card__title-row">
        <h3 class="activity-card__title">Recent Parking Logs</h3>
      </div>
      <button class="activity-card__link" @click="goToParking">
        View all →
      </button>
    </div>

    <div class="activity-card__table-wrapper">
      <table class="activity-card__table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Owner</th>
            <th>Duration</th>
            <th>Charge</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" v-for="i in 3" :key="`skel-log-${i}`">
            <td colspan="5" style="padding: 10px 14px;">
              <SkeletonLoader variant="rect" height="32px" />
            </td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="5" class="activity-card__empty">
              No active parking logs found.
            </td>
          </tr>
          <tr v-else v-for="log in logs" :key="log.id" class="activity-card__row" @click="goToParking">
            <td>
              <div class="activity-card__vehicle">
                <span class="activity-card__plate">{{ log.vehiclePlate }}</span>
              </div>
            </td>
            <td class="activity-card__owner">{{ log.ownerName }}</td>
            <td class="activity-card__duration">{{ log.duration }}</td>
            <td class="activity-card__charge">{{ log.charge }}</td>
            <td>
              <span class="activity-card__status" :class="`activity-card__status--${log.status.toLowerCase()}`">
                {{ log.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.activity-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
  box-shadow: none !important;
}

.activity-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
}

.activity-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-card__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.2px;
}

.activity-card__link {
  font-size: 12px;
  font-weight: 600;
  color: #D22730;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity var(--transition-fast);
}

.activity-card__link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.activity-card__table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.activity-card__table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.activity-card__table thead th {
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
.activity-card__table thead th:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}
.activity-card__table thead th:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.activity-card__row {
  cursor: pointer;
  transition: background 150ms ease;
}

.activity-card__row:hover {
  background: var(--color-surface-lighter, #f8f9fb);
}

.activity-card__row td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  font-size: 13px;
  color: var(--color-text);
}

.activity-card__row td:not(:last-child) {
  padding-right: 14px;
}

.activity-card__vehicle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-card__car-icon {
  color: var(--color-muted);
  flex-shrink: 0;
}

.activity-card__plate {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 600;
  color: var(--color-text);
  font-size: 12.5px;
}

.activity-card__owner {
  color: var(--color-text);
  font-weight: 500;
}

.activity-card__duration {
  color: var(--color-muted);
  font-size: 12.5px;
}

.activity-card__charge {
  font-weight: 600;
  color: var(--color-text);
}

.activity-card__status {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
}

.activity-card__status--active,
.activity-card__status--parked {
  color: #059669;
}

.activity-card__status--completed,
.activity-card__status--exited {
  color: #64748b;
}

.activity-card__status--overstay {
  color: #dc2626;
}

.activity-card__empty {
  text-align: center;
  padding: 24px 0;
  color: var(--color-muted);
  font-size: 13px;
}

@media (max-width: 768px) {
  .activity-card__table-wrapper {
    margin: 0 -24px;
    padding: 0 24px;
  }
}
</style>
