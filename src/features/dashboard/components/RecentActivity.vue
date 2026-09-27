<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ParkingLog } from '../types'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import WidgetHeader from '@/components/ui/WidgetHeader.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'

const activityColumns: TableColumn[] = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'owner', label: 'Owner' },
  { key: 'duration', label: 'Duration' },
  { key: 'charge', label: 'Charge' },
  { key: 'status', label: 'Status' }
]

import { cachedParkingLogs } from '@/stores/appCache'

const router = useRouter()
const isLoading = ref(!cachedParkingLogs.value)
const logs = ref<ParkingLog[]>(cachedParkingLogs.value || [])

function goToParking() {
  router.push('/parking')
}

function getStatusVariant(status: string) {
  const s = status.toLowerCase()
  if (s === 'parked' || s === 'active') return 'success'
  if (s === 'overstay') return 'danger'
  return 'neutral'
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
  <UiCard>
    <WidgetHeader
      title="Recent Parking Logs"
      action-text="View all"
      @action="goToParking"
    />

    <div class="mt-4">
      <UiTable
        :columns="activityColumns"
        :data="logs"
        :is-loading="isLoading"
        empty-text="No active parking logs found."
        @row-click="goToParking"
      >
        <template #cell-vehicle="{ item }">
          <span class="font-mono font-semibold text-slate-900 dark:text-white text-xs">
            {{ item.vehiclePlate }}
          </span>
        </template>

        <template #cell-owner="{ item }">
          <span class="font-medium text-slate-900 dark:text-slate-200 text-xs">{{ item.ownerName }}</span>
        </template>

        <template #cell-duration="{ item }">
          <span class="text-slate-500 dark:text-slate-400 font-medium text-xs">{{ item.duration }}</span>
        </template>

        <template #cell-charge="{ item }">
          <span class="font-bold text-slate-900 dark:text-white text-xs">{{ item.charge }}</span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText :variant="getStatusVariant(item.status)" size="xs">
            {{ item.status }}
          </UiStatusText>
        </template>
      </UiTable>
    </div>
  </UiCard>
</template>
