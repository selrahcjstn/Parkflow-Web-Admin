<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Vehicle } from '../types'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import VehicleFilters from '../components/VehicleFilters.vue'
import api, { refreshAdminData } from '@/api/axios'
import { cachedVehicleApprovals, cachedVehicles } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

const router = useRouter()

const vehicleColumns: TableColumn[] = [
  { key: 'vehicle', label: 'Plate Number' },
  { key: 'vehicleType', label: 'Vehicle Type' },
  { key: 'brand', label: 'Brand & Model' },
  { key: 'owner', label: 'Owner Name' },
  { key: 'role', label: 'Role' },
  { key: 'vstatus', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' },
]

// Toast type
interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning'
}

const toasts = ref<Toast[]>([])
const nextToastId = ref(1)

const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
  const id = nextToastId.value++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

const notifStore = useAdminNotificationStore()
let unsubscribeApprovalUpdates: (() => void) | null = null

const isLoading = ref(cachedVehicles.value === null)

// Vehicles list with reactive cache
const vehicles = ref<Vehicle[]>(cachedVehicles.value || [])

const fetchVehicles = async () => {
  if (cachedVehicles.value === null) {
    isLoading.value = true
  }
  try {
    const response = await api.get('/vehicles')
    const rawData = response.data
    const items = Array.isArray(rawData)
      ? rawData
      : rawData?.isSuccess && Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.data)
          ? rawData.data
          : null

    if (items) {
      cachedVehicleApprovals.value = items
      const mapped = items.map((v: any, index: number) => {
        const rawId = v.id ?? v.vehicleId ?? v.guid ?? v.vehicleGuid
        const safeId = rawId ? String(rawId) : `veh-${index + 1}`
        return {
          id: safeId,
          rawId: rawId ? String(rawId) : undefined,
          plateNumber: v.plateNumber || 'N/A',
          brand: v.brand || 'N/A',
          qrCodeHash: v.qrCodeHash || `QR-${safeId.slice(0, 6).toUpperCase()}`,
          vehicleType:
            v.vehicleType === 0
              ? 'Motorcycle'
              : v.vehicleType === 1
                ? 'ElectricBike'
                : v.vehicleType === 2
                  ? 'Car'
                  : v.vehicleType || 'Motorcycle',
          status: 'Active',
          isPrimary: Boolean(v.isPrimary),
          ownerName: cleanOwnerName(
            v.ownerName || v.ownerFullName || v.fullName || v.ownerEmail || 'Unassigned',
          ),
          ownerRole: v.ownerRole || 'Student',
          verificationStatus:
            typeof v.verificationStatus === 'number'
              ? v.verificationStatus
              : v.verificationStatus === 'Approved' || v.verificationStatus === 'Verified'
                ? 2
                : v.verificationStatus === 'Rejected'
                  ? 3
                  : 1,
        }
      })
      vehicles.value = mapped
      cachedVehicles.value = [...mapped]
    }
  } catch (error) {
    console.error('Error fetching vehicles:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchVehicles()
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
    fetchVehicles()
  })
})

onUnmounted(() => {
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

// Clean & Format helpers
function cleanOwnerName(name?: string) {
  if (!name || !name.trim()) return 'Unassigned'
  const parts = name.split(/\s+/).filter(Boolean)
  const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index)
  return uniqueParts.join(' ')
}

// Search & Filters State
const searchQuery = ref('')
const filterType = ref<string>('all')

// Stats computations
const totalCount = computed(() => vehicles.value.length)
const carsCount = computed(() => vehicles.value.filter((v) => v.vehicleType === 'Car').length)
const motoCount = computed(
  () => vehicles.value.filter((v) => v.vehicleType === 'Motorcycle').length,
)
const ebikesCount = computed(
  () => vehicles.value.filter((v) => v.vehicleType === 'ElectricBike').length,
)

// Filtered Vehicles
const filteredVehicles = computed(() => {
  return vehicles.value.filter((vehicle) => {
    const matchesSearch =
      vehicle.plateNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      vehicle.ownerName.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesType = filterType.value === 'all' || vehicle.vehicleType === filterType.value

    return matchesSearch && matchesType
  })
})

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

watch([searchQuery, filterType], () => {
  currentPage.value = 1
})

const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredVehicles.value.slice(start, start + itemsPerPage.value)
})

// Delete confirmation state
const vehicleToDelete = ref<Vehicle | null>(null)
const isDeleteConfirmOpen = ref(false)
const isDeletingVehicle = ref(false)

const openDeleteConfirm = (vehicle: Vehicle) => {
  vehicleToDelete.value = vehicle
  isDeleteConfirmOpen.value = true
}

const confirmDeleteVehicle = async () => {
  if (!vehicleToDelete.value || isDeletingVehicle.value) return
  const target = vehicleToDelete.value
  const targetId = target.rawId || target.id
  isDeletingVehicle.value = true
  try {
    const response = await api.delete(`/vehicles/${encodeURIComponent(targetId)}`)
    if (response.data?.isSuccess === false)
      throw new Error(response.data.message || 'Could not remove vehicle.')
    vehicles.value = vehicles.value.filter((vehicle) => vehicle.id !== target.id)
    cachedVehicles.value = [...vehicles.value]
    isDeleteConfirmOpen.value = false
    vehicleToDelete.value = null
    showToast(`Vehicle ${target.plateNumber} removed.`, 'success')
  } catch (error: any) {
    showToast(
      error.response?.data?.message ||
        error.message ||
        'Could not remove vehicle. Please try again.',
      'warning',
    )
  } finally {
    isDeletingVehicle.value = false
  }
}

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty Member'
  if (role === 'NonAcademicPersonnel') return 'University Staff'
  return role
}

const getVehicleTypeLabel = (type: string) => {
  if (type === 'Car') return 'Car'
  if (type === 'Motorcycle') return 'Motorcycle'
  if (type === 'ElectricBike') return 'E-Bike'
  return type
}
function handleRefresh() {
  refreshAdminData()
  void fetchVehicles()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Toast Notifications -->
    <TransitionGroup
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="
          toast.type === 'warning'
            ? 'bg-amber-600'
            : toast.type === 'info'
              ? 'bg-blue-600'
              : 'bg-emerald-600'
        "
      >
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Registered Vehicle Directory
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inspect active vehicle plate records, pass statuses, and owner profiles across campus
          gates.
        </p>
      </div>

      <div class="flex items-center gap-3"></div>
    </div>

    <!-- Stats Grid -->

    <!-- Filters Bar (Frameless / Borderless) -->
    <div class="flex flex-col items-stretch gap-3 xl:flex-row xl:items-end">
      <div class="min-w-0 flex-1">
        <VehicleFilters v-model:search-query="searchQuery" v-model:filter-type="filterType" />
      </div>
      <UiButton variant="secondary" :loading="isLoading" @click="handleRefresh">
        <template #prefix>
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </template>
        Refresh
      </UiButton>
    </div>

    <!-- Vehicles Table Card -->
    <UiCard custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="vehicleColumns"
        :data="paginatedVehicles"
        :is-loading="isLoading"
        :loading-rows="6"
        empty-text="No registered vehicles found matching your criteria."
      >
        <template #cell-vehicle="{ item }">
          <div class="flex items-center gap-3">
            <div
              class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0"
            >
              <svg
                v-if="item.vehicleType === 'Car'"
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
              <svg
                v-else-if="item.vehicleType === 'Motorcycle'"
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="5" cy="18" r="3" />
                <circle cx="19" cy="18" r="3" />
                <path d="M12 18V8h4" />
                <path d="M5 18h14" opacity="0.3" />
              </svg>
              <svg
                v-else
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="6" cy="19" r="3" />
                <circle cx="17" cy="19" r="3" />
                <path d="M17 19h-7V10h4" />
                <path d="M12 10L9 7h4" />
              </svg>
            </div>
            <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">{{
              item.plateNumber
            }}</span>
          </div>
        </template>

        <template #cell-vehicleType="{ item }">
          <span class="text-xs text-slate-700 dark:text-slate-300 font-medium">{{
            getVehicleTypeLabel(item.vehicleType)
          }}</span>
        </template>

        <template #cell-brand="{ item }">
          <span class="text-xs text-slate-700 dark:text-slate-300">{{ item.brand }}</span>
        </template>

        <template #cell-owner="{ item }">
          <span
            class="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[160px] inline-block"
            :title="item.ownerName"
          >
            {{ item.ownerName }}
          </span>
        </template>

        <template #cell-role="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{
            getRoleLabel(item.ownerRole)
          }}</span>
        </template>

        <template #cell-vstatus="{ item }">
          <span
            v-if="item.verificationStatus === 2"
            class="text-xs font-bold text-emerald-600 dark:text-emerald-400"
          >
            Approved
          </span>
          <span
            v-else-if="item.verificationStatus === 3"
            class="text-xs font-bold text-rose-600 dark:text-rose-400"
          >
            Rejected
          </span>
          <span v-else class="text-xs font-bold text-amber-600 dark:text-amber-400"> Pending </span>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center justify-end gap-1.5" @click.stop>
            <button
              class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer border-none"
              @click="router.push('/vehicles/' + item.id)"
              title="Inspect Vehicle Details"
            >
              Inspect
            </button>
            <button
              class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
              @click="openDeleteConfirm(item)"
              title="Delete Vehicle"
            >
              Delete
            </button>
          </div>
        </template>
      </UiTable>

      <TablePagination
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :total-items="filteredVehicles.length"
      />
    </UiCard>

    <!-- Delete Confirmation Modal using Reusable ConfirmModal -->
    <ConfirmModal
      :is-open="isDeleteConfirmOpen"
      title="Delete Registered Vehicle?"
      :message="`Are you sure you want to delete vehicle <strong class='font-mono text-slate-900 dark:text-white font-bold'>${vehicleToDelete?.plateNumber}</strong> (${vehicleToDelete?.brand || ''}) belonging to <strong>${vehicleToDelete?.ownerName}</strong>? This action cannot be undone.`"
      confirm-text="Yes, Delete Vehicle"
      cancel-text="Cancel"
      variant="danger"
      :is-submitting="isDeletingVehicle"
      @confirm="confirmDeleteVehicle"
      @close="isDeleteConfirmOpen = false"
    />
  </div>
</template>
