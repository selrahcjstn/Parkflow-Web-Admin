<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import TablePagination from '@/components/ui/TablePagination.vue'

const props = defineProps<{
  items: any[]
  isLoading: boolean
}>()

const search = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)

const statusOptions = [
  { label: 'All Session Statuses', value: 'all' },
  { label: 'Active Parked (All Active)', value: 'active' },
  { label: 'Overstay / Exceeded', value: 'overstay' },
  { label: 'Completed Sessions', value: 'completed' }
]

const activityColumns: TableColumn[] = [
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'ownerName', label: 'Driver / Owner' },
  { key: 'vehicleType', label: 'Vehicle Class' },
  { key: 'entryTime', label: 'Entry Timestamp' },
  { key: 'exitTime', label: 'Exit Timestamp' },
  { key: 'duration', label: 'Duration' },
  { key: 'entryMethod', label: 'Entry Method' },
  { key: 'status', label: 'Session Status' }
]

const filteredItems = computed(() => {
  return props.items.filter((log: any) => {
    // Search query
    const q = search.value.toLowerCase().trim()
    const plate = (log.plateNumber || '').toLowerCase()
    const driver = (log.ownerName || '').toLowerCase()
    const method = (log.entryMethod || '').toLowerCase()
    const matchesSearch = !q || plate.includes(q) || driver.includes(q) || method.includes(q)

    // Status filter
    let matchesStatus = true
    if (statusFilter.value === 'active') {
      matchesStatus = log.isActive
    } else if (statusFilter.value === 'overstay') {
      matchesStatus = log.isOverstay
    } else if (statusFilter.value === 'completed') {
      matchesStatus = !log.isActive
    }

    return matchesSearch && matchesStatus
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

watch([search, statusFilter], () => {
  currentPage.value = 1
})

const getVehicleTypeLabel = (type: any): string => {
  if (type === 0 || type === '0' || type === 'Motorcycle') return 'Motorcycle'
  if (type === 1 || type === '1' || type === 'ElectricBike' || type === 'E-Bike') return 'Electric Bike'
  if (type === 2 || type === '2' || type === 'Car') return 'Car'
  return String(type || 'Unknown')
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatEntryMethod = (method: any): string => {
  if (method === 0 || method === '0' || method === 'QrCode' || method === 'QRCode') return 'QR Code'
  if (method === 1 || method === '1' || method === 'Manual') return 'Manual Entry'
  if (String(method).toLowerCase().includes('qr')) return 'QR Code'
  if (String(method).toLowerCase().includes('manual')) return 'Manual Entry'
  return 'QR Code'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Frameless Search & Filter Toolbar (No card box) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="w-full sm:w-72">
        <UiInput
          v-model="search"
          placeholder="Search plate, driver, or method..."
          size="sm"
        />
      </div>

      <div class="w-full sm:w-60">
        <UiSelect
          v-model="statusFilter"
          :options="statusOptions"
          size="sm"
        />
      </div>
    </div>

    <!-- Data Table Card -->
    <UiCard custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="activityColumns"
        :data="paginatedItems"
        :is-loading="isLoading"
        empty-text="No parking activity records found matching criteria."
      >
        <template #cell-plateNumber="{ item }">
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber || '—' }}</span>
        </template>
        <template #cell-ownerName="{ item }">
          <span class="font-medium text-slate-800 dark:text-slate-200">{{ item.ownerName || 'Guest Driver' }}</span>
        </template>
        <template #cell-vehicleType="{ item }">
          <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{{ getVehicleTypeLabel(item.vehicleType) }}</span>
        </template>
        <template #cell-entryTime="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ formatDate(item.entryTime) }}</span>
        </template>
        <template #cell-exitTime="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ item.exitTime ? formatDate(item.exitTime) : '—' }}</span>
        </template>
        <template #cell-duration="{ item }">
          <span
            class="font-medium text-xs"
            :class="item.isOverstay ? 'text-[#7B1113] font-bold' : 'text-slate-700 dark:text-slate-300'"
          >
            {{ item.duration }}
          </span>
        </template>
        <template #cell-entryMethod="{ item }">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ formatEntryMethod(item.entryMethod) }}</span>
        </template>
        <template #cell-status="{ item }">
          <UiStatusText
            :variant="item.isOverstay ? 'danger' : item.isActive ? 'info' : 'success'"
          >
            {{ item.isOverstay ? (item.isActive ? 'Overstay' : 'Overdue Exit') : item.isActive ? 'Active Parked' : 'Completed' }}
          </UiStatusText>
        </template>
      </UiTable>

      <div class="border-t border-slate-100 dark:border-slate-800 p-3">
        <TablePagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total-items="filteredItems.length"
        />
      </div>
    </UiCard>
  </div>
</template>
