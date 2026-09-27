<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { PendingRegistration } from '../types'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import WidgetHeader from '@/components/ui/WidgetHeader.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'

const pendingColumns: TableColumn[] = [
  { key: 'applicant', label: 'Applicant' },
  { key: 'dateApplied', label: 'Date Applied' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'action', label: 'Action', align: 'right' }
]
import { cachedRegistrations, cachedSubmissionGuids } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

const router = useRouter()
const isLoading = ref(!cachedRegistrations.value)

const registrations = reactive<PendingRegistration[]>(cachedRegistrations.value || [])
const submissionGuids = reactive<Record<number, string>>(cachedSubmissionGuids.value || {})

const pendingRegistrations = computed(() => registrations.filter((r) => r.status === 'pending'))
const pendingCount = computed(() => pendingRegistrations.value.length)
const displayedRegistrations = computed(() => pendingRegistrations.value.slice(0, 4))

function goToRegistrations() {
  router.push('/registrations')
}

async function fetchPendingRegistrations() {
  if (registrations.length === 0) {
    isLoading.value = true
  }
  try {
    const response = await api.get('/cor-submissions')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const submissions = response.data.data
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
  } catch (error) {
    console.error('Error fetching COR submissions:', error)
  } finally {
    isLoading.value = false
  }
}

let autoSyncTimer: ReturnType<typeof setInterval> | null = null
let unsubscribeApprovalUpdates: (() => void) | null = null

onMounted(() => {
  const notifStore = useAdminNotificationStore()
  notifStore.initSignalRConnection()
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
    console.log('[PendingRegistrations] Live update received via SignalR -> refreshing...')
    fetchPendingRegistrations()
  })

  fetchPendingRegistrations()

  autoSyncTimer = setInterval(() => {
    if (!notifStore.isSignalRConnected) {
      fetchPendingRegistrations()
    }
  }, 120000)
})

onUnmounted(() => {
  if (autoSyncTimer) clearInterval(autoSyncTimer)
  if (unsubscribeApprovalUpdates) unsubscribeApprovalUpdates()
})
</script>

<template>
  <UiCard>
    <WidgetHeader
      title="Pending Registrations"
      :count="pendingCount"
      action-text="View all"
      @action="goToRegistrations"
    />

    <div class="mt-4">
      <UiTable
        :columns="pendingColumns"
        :data="displayedRegistrations"
        :is-loading="isLoading"
        empty-text="No pending registrations awaiting verification."
        @row-click="goToRegistrations"
      >
        <template #cell-applicant="{ item }">
          <div class="flex items-center gap-3">
            <UiAvatar :name="item.fullName" size="sm" />
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-slate-900 dark:text-white text-xs leading-snug truncate">
                {{ item.fullName }}
              </span>
              <span class="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                {{ item.email }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-dateApplied="{ item }">
          <span class="font-medium text-slate-700 dark:text-slate-300 text-xs">{{ item.dateApplied }}</span>
        </template>

        <template #cell-vehicle="{ item }">
          <div class="flex flex-col">
            <span class="font-mono font-semibold text-slate-900 dark:text-white text-[12.5px]">
              {{ item.vehiclePlate }}
            </span>
            <span class="text-[11.5px] text-slate-500 dark:text-slate-400">
              {{ item.vehicleType }}
            </span>
          </div>
        </template>

        <template #cell-action="{ item }">
          <button
            type="button"
            @click.stop="goToRegistrations"
            class="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold cursor-pointer hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-all shadow-xs"
          >
            Review
          </button>
        </template>
      </UiTable>
    </div>
  </UiCard>
</template>
