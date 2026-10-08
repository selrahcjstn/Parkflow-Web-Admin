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
  { label: 'All Statuses', value: 'all' },
  { label: 'Approved Only', value: 'approved' },
  { label: 'Pending Only', value: 'pending' },
  { label: 'Rejected Only', value: 'rejected' }
]

const vehicleColumns: TableColumn[] = [
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'brandModel', label: 'Brand & Model' },
  { key: 'vehicleType', label: 'Vehicle Class' },
  { key: 'ownerName', label: 'Registered Owner' },
  { key: 'ownerRole', label: 'Classification' },
  { key: 'verificationStatus', label: 'Approval Status' }
]

const getVerificationStatus = (status: any): { label: string; variant: 'success' | 'warning' | 'danger' } => {
  if (status === 2 || status === '2' || status === 'Verified' || status === 'Approved') {
    return { label: 'Approved', variant: 'success' }
  }
  if (status === 3 || status === '3' || status === 'Rejected') {
    return { label: 'Rejected', variant: 'danger' }
  }
  return { label: 'Pending', variant: 'warning' }
}

const filteredItems = computed(() => {
  return props.items.filter((veh: any) => {
    // Search query
    const q = search.value.toLowerCase().trim()
    const plate = (veh.plateNumber || '').toLowerCase()
    const brand = (veh.brand || '').toLowerCase()
    const model = (veh.model || '').toLowerCase()
    const owner = (veh.ownerName || veh.ownerFullName || veh.fullName || '').toLowerCase()
    const matchesSearch = !q || plate.includes(q) || brand.includes(q) || model.includes(q) || owner.includes(q)

    // Status filter
    const statusObj = getVerificationStatus(veh.verificationStatus)
    const matchesStatus = statusFilter.value === 'all' ||
      statusObj.label.toLowerCase() === statusFilter.value.toLowerCase()

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

const formatRole = (role: string) => {
  if (!role) return 'Driver'
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'University Staff'
  if (role === 'Student') return 'Student'
  if (role === 'Visitor') return 'Visitor'
  return role
}
</script>

<template>
  <div class="space-y-4">
    <!-- Frameless Search & Filter Toolbar (No card box) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="w-full sm:w-72">
        <UiInput
          v-model="search"
          placeholder="Search plate, brand, or owner..."
          size="sm"
        />
      </div>

      <div class="w-full sm:w-56">
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
        :columns="vehicleColumns"
        :data="paginatedItems"
        :is-loading="isLoading"
        empty-text="No registered vehicles found matching criteria."
      >
        <template #cell-plateNumber="{ item }">
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber || '—' }}</span>
        </template>
        <template #cell-brandModel="{ item }">
          <span class="font-medium text-slate-800 dark:text-slate-200">
            {{ (item.brand || '') + (item.model ? ' ' + item.model : '') || '—' }}
          </span>
        </template>
        <template #cell-vehicleType="{ item }">
          <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{{ getVehicleTypeLabel(item.vehicleType) }}</span>
        </template>
        <template #cell-ownerName="{ item }">
          <span class="font-medium text-slate-800 dark:text-slate-200">{{ item.ownerName || item.ownerFullName || item.fullName || 'Unassigned' }}</span>
        </template>
        <template #cell-ownerRole="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400 font-medium">{{ formatRole(item.ownerRole) }}</span>
        </template>
        <template #cell-verificationStatus="{ item }">
          <UiStatusText
            :variant="getVerificationStatus(item.verificationStatus).variant"
          >
            {{ getVerificationStatus(item.verificationStatus).label }}
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
