<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'
import { useAdminNotificationStore } from '@/stores/notification.store'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiTable from '@/components/ui/UiTable.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

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
const id = computed(() => typeof route.params.id === 'string' ? route.params.id : '')

const visitors = ref<Visitor[]>([])
const detail = ref<Visitor | null>(null)
const visits = ref<Visit[]>([])
const search = ref('')
const term = ref('')
const statusFilter = ref<'all' | 'inside' | 'outside'>('all')
const page = ref(1)
const hasMore = ref(false)
const totalCount = ref(0)
const loading = ref(false)
const error = ref('')

let controller: AbortController | null = null
let request = 0

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Currently Inside', value: 'inside' },
  { label: 'Outside Campus', value: 'outside' },
]

const date = (value?: string) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—'

const getVehicleTypeLabel = (type: number) => {
  switch (type) {
    case 0: return 'Motorcycle'
    case 1: return 'Electric Bike'
    case 2: return 'Car'
    default: return 'Vehicle'
  }
}

const columns = [
  { key: 'fullName', label: 'Visitor Name' },
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'contactNumber', label: 'Contact' },
  { key: 'lastVisit', label: 'Last Visit' },
  { key: 'totalVisits', label: 'Total Visits' },
  { key: 'isInside', label: 'Status' },
  { key: 'action', label: 'Action' },
]

const historyColumns = [
  { key: 'entryTime', label: 'Entry Time' },
  { key: 'exitTime', label: 'Exit Time' },
  { key: 'gate', label: 'Gates' },
  { key: 'guards', label: 'Processed By' },
  { key: 'status', label: 'Status' },
]

async function load() {
  controller?.abort()
  controller = new AbortController()
  const current = ++request
  loading.value = true
  error.value = ''

  try {
    const params: Record<string, any> = {
      page: page.value,
      pageSize: 20,
      search: term.value,
    }

    if (statusFilter.value === 'inside') {
      params.onlyInside = true
    } else if (statusFilter.value === 'outside') {
      params.onlyInside = false
    }

    const response = await api.get(id.value ? '/visitors/' + encodeURIComponent(id.value) : '/visitors', {
      params,
      signal: controller.signal,
    })

    if (current !== request) return
    if (!response.data?.isSuccess) throw new Error('Unable to load visitors.')

    const data = response.data.data
    if (id.value) {
      detail.value = data.visitor
      visits.value = data.visits || []
    } else {
      visitors.value = data.items || []
      totalCount.value = data.totalCount || 0
      hasMore.value = data.hasMore
    }
  } catch {
    if (current === request && !controller?.signal.aborted) {
      error.value = 'Unable to load records. Please try Refresh.'
    }
  } finally {
    if (current === request) loading.value = false
  }
}

function searchVisitors() {
  page.value = 1
  term.value = search.value.trim()
  void load()
}

watch(statusFilter, () => {
  page.value = 1
  void load()
})

watch(id, () => {
  page.value = 1
  detail.value = null
  visits.value = []
  void load()
})

function changePage(delta: number) {
  page.value += delta
  void load()
}

function refreshOnFocus() {
  if (!loading.value) void load()
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
  unsubscribeApproval?.()
  request++
  controller?.abort()
  window.removeEventListener('focus', refreshOnFocus)
})
</script>

<template>
  <div class="space-y-6 text-[var(--color-text)]">
    <RouterLink v-if="id" to="/visitors" class="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline">
      ← Back to Visitors Directory
    </RouterLink>

    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ id ? 'Visitor Profile & History' : 'Visitors Directory' }}</h1>
        <p class="mt-1 text-sm text-[var(--color-muted)]">
          {{ id ? 'View reusable visitor information and complete campus visit history.' : 'Monitor guest campus visitors, active visit sessions, and vehicle records.' }}
        </p>
      </div>

      <div v-if="!id && totalCount > 0" class="flex items-center gap-2">
        <span class="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {{ totalCount }} Total Registered Visitors
        </span>
      </div>
    </header>

    <!-- Search & Filters -->
    <form v-if="!id" class="flex flex-wrap items-end gap-3" @submit.prevent="searchVisitors">
      <div class="w-full sm:max-w-xs">
        <label for="visitor-search" class="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Search Name, Plate, Brand</label>
        <UiInput id="visitor-search" v-model="search" placeholder="Search by name or plate..." />
      </div>

      <div class="w-full sm:w-48">
        <label for="status-filter" class="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Campus Status</label>
        <UiSelect id="status-filter" v-model="statusFilter" :options="statusOptions" />
      </div>

      <UiButton type="submit" :disabled="loading">Search</UiButton>
      <UiButton variant="outline" :loading="loading" @click="load">Refresh</UiButton>
    </form>

    <p v-if="error" role="alert" class="rounded-lg bg-rose-500/10 p-3 text-sm text-[var(--color-danger)]">{{ error }}</p>

    <!-- VISITOR DETAIL CARD -->
    <UiCard v-if="id && detail" custom-class="p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold">{{ detail.fullName }}</h2>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              :class="detail.isInside ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'"
            >
              {{ detail.isInside ? 'Currently Inside Campus' : 'Outside Campus' }}
            </span>
          </div>
          <p class="mt-1 text-xs text-[var(--color-muted)]">Reusable Visitor Profile</p>
        </div>
      </div>

      <dl class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 border-t border-[var(--color-border)] pt-5">
        <div>
          <dt class="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Plate Number</dt>
          <dd class="mt-1 font-bold text-base text-[var(--color-text)]">{{ detail.plateNumber }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Vehicle & Type</dt>
          <dd class="mt-1 font-medium text-sm text-[var(--color-text)]">{{ detail.brand }} · {{ getVehicleTypeLabel(detail.vehicleType) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Contact Number</dt>
          <dd class="mt-1 font-medium text-sm text-[var(--color-text)]">{{ detail.contactNumber || 'None provided' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Total Campus Visits</dt>
          <dd class="mt-1 font-bold text-sm text-[var(--color-text)]">{{ detail.totalVisits }} visits</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Last Visit Date</dt>
          <dd class="mt-1 text-sm text-[var(--color-text)]">{{ date(detail.lastVisit) }}</dd>
        </div>
      </dl>
    </UiCard>

    <!-- DIRECTORY TABLE / VISIT HISTORY TABLE -->
    <UiCard>
      <div v-if="id" class="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 class="font-bold text-base">Visit History (Newest First)</h2>
        <span class="text-xs text-[var(--color-muted)]">{{ visits.length }} recorded session(s)</span>
      </div>

      <!-- Visitor Directory Table -->
      <UiTable v-if="!id" :columns="columns" :data="visitors" :is-loading="loading && !visitors.length" empty-text="No visitors found.">
        <template #cell-fullName="{ item }">
          <span class="font-bold text-[var(--color-text)]">{{ item.fullName }}</span>
        </template>
        <template #cell-plateNumber="{ item }">
          <span class="font-mono font-bold text-sm">{{ item.plateNumber }}</span>
        </template>
        <template #cell-vehicle="{ item }">
          <span class="text-sm">{{ item.brand }} <span class="text-xs text-[var(--color-muted)]">({{ getVehicleTypeLabel(item.vehicleType) }})</span></span>
        </template>
        <template #cell-contactNumber="{ item }">
          <span class="text-sm">{{ item.contactNumber || '—' }}</span>
        </template>
        <template #cell-lastVisit="{ item }">
          <span class="text-xs">{{ date(item.lastVisit) }}</span>
        </template>
        <template #cell-totalVisits="{ item }">
          <span class="font-semibold text-xs">{{ item.totalVisits }}</span>
        </template>
        <template #cell-isInside="{ item }">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
            :class="item.isInside ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'"
          >
            {{ item.isInside ? 'Inside' : 'Outside' }}
          </span>
        </template>
        <template #cell-action="{ item }">
          <RouterLink :to="'/visitors/' + item.id" class="inline-flex min-h-11 items-center font-semibold text-xs text-[var(--color-primary)] hover:underline">
            View Details →
          </RouterLink>
        </template>
      </UiTable>

      <!-- Visitor History Detail Table -->
      <UiTable v-else :columns="historyColumns" :data="visits" :is-loading="loading && !visits.length" empty-text="No visits recorded for this visitor.">
        <template #cell-entryTime="{ item }">
          <span class="text-xs font-medium">{{ date(item.entryTime) }}</span>
        </template>
        <template #cell-exitTime="{ item }">
          <span class="text-xs" :class="item.exitTime ? '' : 'font-bold text-emerald-600 dark:text-emerald-400'">
            {{ item.exitTime ? date(item.exitTime) : 'Currently Inside' }}
          </span>
        </template>
        <template #cell-gate="{ item }">
          <span class="text-xs text-[var(--color-muted)]">{{ item.entryGate || 'Gate 1' }}{{ item.exitGate ? ' → ' + item.exitGate : '' }}</span>
        </template>
        <template #cell-guards="{ item }">
          <span class="text-xs text-[var(--color-muted)]">{{ item.entryGuardName || 'Security' }}</span>
        </template>
        <template #cell-status="{ item }">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
            :class="item.status === 'Inside' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-500/15 text-slate-600'"
          >
            {{ item.status }}
          </span>
        </template>
      </UiTable>

      <div v-if="!id" class="flex items-center justify-between gap-3 border-t border-[var(--color-border)] p-4">
        <UiButton variant="outline" :disabled="page === 1 || loading" @click="changePage(-1)">Previous</UiButton>
        <span class="text-xs text-[var(--color-muted)] font-medium">Page {{ page }}</span>
        <UiButton variant="outline" :disabled="!hasMore || loading" @click="changePage(1)">Next</UiButton>
      </div>
    </UiCard>
  </div>
</template>
