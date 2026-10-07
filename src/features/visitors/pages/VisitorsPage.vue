<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api, { refreshAdminData } from '@/api/axios'
import { useAdminNotificationStore } from '@/stores/notification.store'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiTable from '@/components/ui/UiTable.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { getVehicleTypeLabel } from '@/utils/vehicleType'

type Visitor = {
  id: string
  fullName: string
  plateNumber: string
  brand: string
  vehicleType: number
  contactNumber?: string
  lastVisit?: string
  totalVisits: number
  isInside: boolean
}
type Visit = {
  id: string
  entryTime: string
  exitTime?: string
  purpose?: string
  destination?: string
  entryGuardName?: string
  exitGuardName?: string
  entryGate?: string
  exitGate?: string
  status: string
}
const route = useRoute()
const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const visitors = ref<Visitor[]>([])
const detail = ref<Visitor | null>(null)
const visits = ref<Visit[]>([])
const search = ref('')
const term = ref('')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const loading = ref(false)
const error = ref('')
let controller: AbortController | null = null
let request = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'On campus', value: 'inside' },
  { label: 'Outside campus', value: 'outside' },
]
const date = (value?: string) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}
const columns = [
  { key: 'fullName', label: 'Visitor' },
  { key: 'plateNumber', label: 'Plate number' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'lastVisit', label: 'Last visit' },
  { key: 'totalVisits', label: 'Visits' },
  { key: 'isInside', label: 'Campus status' },
  { key: 'action', label: 'Action' },
]
const historyColumns = [
  { key: 'entryTime', label: 'Entry' },
  { key: 'exitTime', label: 'Exit' },
  { key: 'purpose', label: 'Purpose / destination' },
  { key: 'gate', label: 'Gates' },
  { key: 'guards', label: 'Processed by' },
  { key: 'status', label: 'Status' },
]

async function load() {
  controller?.abort()
  const activeController = new AbortController()
  controller = activeController
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const response = await api.get(
      id.value ? '/visitors/' + encodeURIComponent(id.value) : '/visitors',
      {
        params: {
          page: page.value,
          pageSize: pageSize.value,
          ...(!id.value
            ? {
                search: term.value || undefined,
                onlyInside:
                  statusFilter.value === 'all' ? undefined : statusFilter.value === 'inside',
              }
            : {}),
        },
        signal: activeController.signal,
      },
    )
    if (current !== request) return
    if (!response.data?.isSuccess || !response.data.data) throw new Error('Visitors unavailable')
    const data = response.data.data
    if (id.value) {
      detail.value = data.visitor
      visits.value = data.visits || []
      totalCount.value = data.totalCount ?? data.visitor?.totalVisits ?? 0
    } else {
      visitors.value = data.items || []
      totalCount.value = data.totalCount || 0
    }
    const lastPage = Math.max(1, Math.ceil(totalCount.value / pageSize.value))
    if (page.value > lastPage) page.value = lastPage
  } catch {
    if (current === request && !activeController.signal.aborted)
      error.value = id.value
        ? 'Could not load this visitor record. Please try again.'
        : 'Could not load visitors. Please try again.'
  } finally {
    if (current === request) loading.value = false
  }
}
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    term.value = search.value.trim()
  }, 350)
})
function searchVisitors() {
  clearTimeout(searchTimer)
  if (term.value === search.value.trim()) void load()
  else term.value = search.value.trim()
}
watch(
  [id, page, pageSize, term, statusFilter],
  ([nextId, , size, query, status], [oldId, , oldSize, oldQuery, oldStatus]) => {
    if (nextId !== oldId) {
      detail.value = null
      visitors.value = []
      visits.value = []
      totalCount.value = 0
    }
    if (nextId !== oldId || size !== oldSize || query !== oldQuery || status !== oldStatus) {
      if (page.value !== 1) {
        page.value = 1
        return
      }
    }
    void load()
  },
)
function handleRefresh() {
  refreshAdminData()
  void load()
}
function refreshOnFocus() {
  if (!loading.value && document.visibilityState === 'visible') handleRefresh()
}
let unsubscribeApproval: (() => void) | undefined
onMounted(() => {
  void load()
  window.addEventListener('focus', refreshOnFocus)
  const notifications = useAdminNotificationStore()
  void notifications.initSignalRConnection()
  unsubscribeApproval = notifications.onApprovalUpdate(refreshOnFocus)
})
onUnmounted(() => {
  clearTimeout(searchTimer)
  unsubscribeApproval?.()
  request++
  controller?.abort()
  window.removeEventListener('focus', refreshOnFocus)
})
</script>

<template>
  <div class="space-y-6 text-text">
    <RouterLink
      v-if="id"
      to="/visitors"
      class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary"
    >
      ← Back to Visitors
    </RouterLink>
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ id ? 'Visitor Record Details' : 'Visitors' }}
        </h1>
        <p class="mt-1 text-sm leading-6 text-muted">
          {{
            id
              ? 'Saved visitor information and campus visit history.'
              : 'Visitor records, vehicles, and campus entry and exit history.'
          }}
        </p>
      </div>
      <UiButton v-if="id" variant="secondary" :loading="loading" @click="handleRefresh">
        <template #prefix>
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5" />
          </svg>
        </template>
        Refresh
      </UiButton>
    </header>

    <form
      v-if="!id"
      class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end"
      @submit.prevent="searchVisitors"
    >
      <div class="min-w-0 flex-1 sm:max-w-md">
        <UiInput
          v-model="search"
          label="Search"
          placeholder="Search name, plate, or brand…"
          clearable
        />
      </div>
      <div class="min-w-0 sm:ml-auto sm:w-52 sm:shrink-0">
        <UiSelect v-model="statusFilter" label="Campus status" :options="statusOptions" />
      </div>
      <UiButton variant="secondary" :loading="loading" @click="handleRefresh">
        <template #prefix>
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5" />
          </svg>
        </template>
        Refresh
      </UiButton>
    </form>

    <div
      v-if="error"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-3 rounded-button border border-danger/20 bg-danger-bg p-4 text-sm text-danger"
    >
      <span>{{ error }}</span>
      <UiButton variant="secondary" :loading="loading" @click="handleRefresh">Try again</UiButton>
    </div>
    <UiCard v-if="id && loading && !detail">
      <SkeletonLoader variant="rect" height="120px" />
    </UiCard>
    <UiCard v-else-if="id && detail">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="break-words text-xl font-semibold">{{ detail.fullName }}</h2>
          <p class="mt-1 text-sm text-muted">Saved details are reused on return visits.</p>
        </div>
        <UiStatusText :variant="detail.isInside ? 'success' : 'neutral'">{{
          detail.isInside ? 'On campus' : 'Outside campus'
        }}</UiStatusText>
      </div>
      <dl class="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="field in [
            { label: 'Plate number', value: detail.plateNumber },
            {
              label: 'Vehicle',
              value: detail.brand + ' · ' + getVehicleTypeLabel(detail.vehicleType),
            },
            { label: 'Contact number', value: detail.contactNumber || 'Not provided' },
            { label: 'Total visits', value: detail.totalVisits },
            { label: 'Last visit', value: date(detail.lastVisit) },
          ]"
          :key="field.label"
        >
          <dt class="text-sm text-muted">{{ field.label }}</dt>
          <dd class="mt-1 break-words text-sm font-medium">{{ field.value }}</dd>
        </div>
      </dl>
    </UiCard>

    <UiCard v-if="!id || detail || loading" custom-class="p-0 overflow-hidden">
      <div v-if="id" class="border-b border-border px-5 py-4">
        <h2 class="text-base font-semibold">Visit history</h2>
        <p class="mt-1 text-sm text-muted">Most recent visits first.</p>
      </div>
      <UiTable
        v-if="!id"
        :columns="columns"
        :data="visitors"
        :is-loading="loading"
        empty-text="No visitors match your search."
      >
        <template #cell-fullName="{ item }"
          ><span class="font-semibold text-text">{{ item.fullName }}</span></template
        >
        <template #cell-plateNumber="{ item }"
          ><span class="font-semibold text-text">{{ item.plateNumber }}</span></template
        >
        <template #cell-vehicle="{ item }">
          <div class="text-text">{{ item.brand }}</div>
          <div class="mt-1 text-muted">{{ getVehicleTypeLabel(item.vehicleType) }}</div>
        </template>
        <template #cell-contactNumber="{ item }">{{ item.contactNumber || '—' }}</template>
        <template #cell-lastVisit="{ item }">{{ date(item.lastVisit) }}</template>
        <template #cell-isInside="{ item }">
          <UiStatusText :variant="item.isInside ? 'success' : 'neutral'">{{
            item.isInside ? 'On campus' : 'Outside campus'
          }}</UiStatusText>
        </template>
        <template #cell-action="{ item }">
          <RouterLink
            :to="'/visitors/' + item.id"
            class="inline-flex min-h-10 items-center font-semibold text-primary hover:underline"
            :aria-label="'View visitor record for ' + item.fullName"
            >View details</RouterLink
          >
        </template>
      </UiTable>
      <UiTable
        v-else
        :columns="historyColumns"
        :data="visits"
        :is-loading="loading"
        empty-text="No campus visits recorded."
      >
        <template #cell-entryTime="{ item }">{{ date(item.entryTime) }}</template>
        <template #cell-exitTime="{ item }">
          <span :class="item.status === 'Inside' ? 'text-success' : 'text-text'">{{
            item.exitTime ? date(item.exitTime) : item.status === 'Inside' ? 'On campus' : '—'
          }}</span>
        </template>
        <template #cell-purpose="{ item }">
          <div>{{ item.purpose || '—' }}</div>
          <div v-if="item.destination" class="mt-1 text-muted">{{ item.destination }}</div>
        </template>
        <template #cell-gate="{ item }">
          <div>Entry: {{ item.entryGate || 'Not recorded' }}</div>
          <div v-if="item.exitTime" class="mt-1 text-muted">
            Exit: {{ item.exitGate || 'Not recorded' }}
          </div>
        </template>
        <template #cell-guards="{ item }">
          <div>Entry: {{ item.entryGuardName || 'Not recorded' }}</div>
          <div v-if="item.exitTime" class="mt-1 text-muted">
            Exit: {{ item.exitGuardName || 'Not recorded' }}
          </div>
        </template>
        <template #cell-status="{ item }">
          <UiStatusText :variant="item.status === 'Inside' ? 'success' : 'neutral'">{{
            item.status === 'Inside'
              ? 'On campus'
              : item.status === 'Cancelled'
                ? 'Cancelled'
                : 'Completed'
          }}</UiStatusText>
        </template>
      </UiTable>
      <TablePagination
        v-model:current-page="page"
        v-model:items-per-page="pageSize"
        :total-items="totalCount"
        :disabled="loading"
      />
    </UiCard>
  </div>
</template>
