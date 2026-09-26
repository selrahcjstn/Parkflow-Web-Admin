<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ParkingLog } from '../types'
import api from '@/api/axios'

const router = useRouter()
const logs = ref<ParkingLog[]>([])

function goToParking() {
  router.push('/parking')
}

onMounted(async () => {
  try {
    const response = await api.get('/parking-logs/active-sessions?parkingCapacity=150')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const activeSessions = response.data.data
      logs.value = activeSessions.slice(0, 5).map((session: any, i: number) => ({
        id: session.sessionId || i,
        vehiclePlate: session.plateNumber || 'N/A',
        ownerName: session.firstName && session.lastName ? `${session.firstName} ${session.lastName}` : 'Unknown Owner',
        duration: session.totalParkingHours || '0h',
        charge: `₱${(session.amount || 0).toLocaleString()}`,
        status: session.status || (session.overstayHours > 0 ? 'Overstay' : 'Parked')
      }))
    }
  } catch (error) {
    console.error('Error fetching active parking logs:', error)
    logs.value = [
      { id: 1, vehiclePlate: 'ABC-1234', ownerName: 'Juan Dela Cruz', duration: '1h 45m', charge: '₱40', status: 'Parked' },
      { id: 2, vehiclePlate: 'XYZ-9876', ownerName: 'Maria Santos', duration: '2h 10m', charge: '₱60', status: 'Parked' },
      { id: 3, vehiclePlate: 'NKN-4581', ownerName: 'Christian Reyes', duration: '4h 30m', charge: '₱120', status: 'Overstay' }
    ]
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
          <tr v-if="logs.length === 0">
            <td colspan="5" class="activity-card__empty">
              No active parking logs found.
            </td>
          </tr>
          <tr v-else v-for="log in logs" :key="log.id" class="activity-card__row" @click="goToParking">
            <td>
              <div class="activity-card__vehicle">
                <svg class="activity-card__car-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
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
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
}

.activity-card__status--active,
.activity-card__status--parked {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.activity-card__status--completed,
.activity-card__status--exited {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.activity-card__status--overstay {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
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
