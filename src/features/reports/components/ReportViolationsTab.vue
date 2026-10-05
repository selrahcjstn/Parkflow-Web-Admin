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
  { label: 'All Settlement Statuses', value: 'all' },
  { label: 'Settled / Paid Only', value: 'paid' },
  { label: 'Unpaid Citations Only', value: 'unpaid' }
]

const violationsColumns: TableColumn[] = [
  { key: 'referenceNumber', label: 'Citation Ref' },
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'driver', label: 'Driver / Owner' },
  { key: 'violationType', label: 'Infraction Type' },
  { key: 'penaltyFee', label: 'Penalty Fee' },
  { key: 'settlementStatus', label: 'Settlement Status' },
  { key: 'issuedAt', label: 'Date Issued' }
]

const filteredItems = computed(() => {
  return props.items.filter((v: any) => {
    // Search query
    const q = search.value.toLowerCase().trim()
    const matchesSearch = !q ||
      (v.referenceNumber && v.referenceNumber.toLowerCase().includes(q)) ||
      (v.plateNumber && v.plateNumber.toLowerCase().includes(q)) ||
      (v.violationType && v.violationType.toLowerCase().includes(q)) ||
      (v.firstName && v.firstName.toLowerCase().includes(q)) ||
      (v.lastName && v.lastName.toLowerCase().includes(q))

    // Status filter
    const isPaid = v.settlementStatus === 'Settled' || v.settlementStatus === 'Paid' || v.isPaid
    let matchesStatus = true
    if (statusFilter.value === 'paid') {
      matchesStatus = isPaid
    } else if (statusFilter.value === 'unpaid') {
      matchesStatus = !isPaid
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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Frameless Search & Filter Toolbar (No card box) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="w-full sm:w-72">
        <UiInput
          v-model="search"
          placeholder="Search reference, plate, or driver..."
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
        :columns="violationsColumns"
        :data="paginatedItems"
        :is-loading="isLoading"
        empty-text="No infraction citations recorded matching criteria."
      >
        <template #cell-referenceNumber="{ item }">
          <span class="font-mono font-bold text-[#7B1113]">{{ item.referenceNumber || 'N/A' }}</span>
        </template>
        <template #cell-plateNumber="{ item }">
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber || '—' }}</span>
        </template>
        <template #cell-driver="{ item }">
          <span class="font-medium text-slate-800 dark:text-slate-200">
            {{ (item.firstName || '') + ' ' + (item.lastName || '') || item.ownerName || 'Driver' }}
          </span>
        </template>
        <template #cell-violationType="{ item }">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ item.violationType || 'General Violation' }}</span>
        </template>
        <template #cell-penaltyFee="{ item }">
          <span class="font-bold text-slate-900 dark:text-white">₱{{ Number(item.penaltyFee || 0).toFixed(2) }}</span>
        </template>
        <template #cell-settlementStatus="{ item }">
          <UiStatusText
            :variant="item.settlementStatus === 'Settled' || item.settlementStatus === 'Paid' || item.isPaid ? 'success' : 'danger'"
          >
            {{ item.settlementStatus === 'Settled' || item.settlementStatus === 'Paid' || item.isPaid ? 'Paid' : 'Unpaid' }}
          </UiStatusText>
        </template>
        <template #cell-issuedAt="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ formatDate(item.issuedAt || item.createdAt) }}</span>
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
