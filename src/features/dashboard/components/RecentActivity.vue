<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ParkingLog } from '../types'
import api from '@/api/axios'

const logs = ref<ParkingLog[]>([])

onMounted(async () => {
  try {
    const response = await api.get('/parking-logs/active-sessions?parkingCapacity=150')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const activeSessions = response.data.data
      logs.value = activeSessions.slice(0, 6).map((session: any, i: number) => ({
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
  }
})
</script>

<template>
  <div class="activity-card">
    <div class="activity-card__header">
      <h3 class="activity-card__title">Recent Parking Logs</h3>
      <a href="#" class="activity-card__link">View All →</a>
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
          <tr v-else v-for="log in logs" :key="log.id" class="activity-card__row">
            <td>
              <div class="activity-card__vehicle">
                <svg class="activity-card__car-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 10.5L4.5 5.5C4.8 4.6 5.6 4 6.5 4H13.5C14.4 4 15.2 4.6 15.5 5.5L17 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="2" y="10.5" width="16" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="5.5" cy="13" r="1" fill="currentColor"/>
                  <circle cx="14.5" cy="13" r="1" fill="currentColor"/>
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
}

.activity-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.activity-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.activity-card__link {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  transition: text-decoration 150ms ease;
}

.activity-card__link:hover {
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
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-muted);
  text-align: left;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.activity-card__row {
  transition: background 150ms ease;
}

.activity-card__row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.activity-card__row td {
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 13px;
  color: var(--color-text);
}

.activity-card__row td:not(:last-child) {
  padding-right: 16px;
}

.activity-card__vehicle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-card__car-icon {
  width: 18px;
  height: 18px;
  color: var(--color-muted);
  flex-shrink: 0;
}

.activity-card__plate {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-weight: 600;
  color: var(--color-text);
  font-size: 13px;
}

.activity-card__owner {
  color: var(--color-text);
}

.activity-card__space {
  color: var(--color-muted);
  font-weight: 500;
}

.activity-card__time {
  color: var(--color-muted);
  font-size: 12px;
}

.activity-card__status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.activity-card__status--active,
.activity-card__status--parked {
  background: rgba(35, 165, 90, 0.12);
  color: #23a55a;
}

.activity-card__status--completed,
.activity-card__status--exited {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}

.activity-card__status--overstay {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

.activity-card__empty {
  text-align: center;
  padding: 32px 0;
  color: var(--color-muted);
  font-size: 14px;
}

@media (max-width: 768px) {
  .activity-card__table-wrapper {
    margin: 0 -24px;
    padding: 0 24px;
  }
}
</style>
