<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '@/api/axios'
import UiButton from '@/components/ui/UiButton.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { formatDocUrl } from '@/utils/documentUrl'

interface RecordItem {
  id: string; userAccountId: string; subjectId: string; type: string; status: string; method?: string
  reason: string; ocrOutcome?: string; extractedFieldsJson?: string; verifiedAt?: string; reviewerId?: string
  version: number; isCurrent: boolean; createdAt: string
}
const props = defineProps<{ userId?: string }>()
const emit = defineEmits<{ changed: [] }>()
const records = ref<RecordItem[]>([])
const names = ref<Record<string, string>>({})
const documents = ref<Record<string, string>>({})
const history = ref(false)
const type = ref('All')
const message = ref('')
const busy = ref<string | null>(null)
const reason = ref<Record<string, string>>({})
const audits = ref<{ id: string; createdAt: string; actorId?: string; action: string; details: string }[]>([])
const visible = computed(() => records.value.filter(r => (!props.userId || r.userAccountId === props.userId) && (history.value || r.isCurrent) && (type.value === 'All' || r.type === type.value)))
const employeeSchedules = ref<{ id: string; name: string }[]>([])
async function queueSchedule(id: string) {
  try { await api.post(`/verification/employee-schedules/${id}/queue`); await load() }
  catch (error: any) { message.value = error.response?.data?.message || 'Could not queue employee schedule.' }
}
let interval: ReturnType<typeof setInterval> | undefined
let loading = false
async function load() {
  if (loading) return
  loading = true
  try {
    const response = await api.get('/verification/records', { params: { history: true, userId: props.userId } })
    records.value = response.data
    {
      const [users, cors] = await Promise.all([api.get('/users'), api.get('/cor-submissions')])
      const list = (r: any) => Array.isArray(r.data) ? r.data : r.data?.data || []
      const employees = new Set(list(users).filter((u: any) => ['UniversityStaff', 'NonAcademicPersonnel', 'Faculty', 2, 3].includes(u.role)).map((u: any) => u.id || u.userAccountId))
      for (const u of list(users)) names.value[u.id || u.userAccountId] = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
      for (const c of list(cors)) { documents.value[c.id] = c.corDocumentUrl; documents.value['schedule:' + c.id] = c.employeeScheduleDocumentUrl }
      employeeSchedules.value = list(cors).filter((c: any) => employees.has(c.userAccountId) && c.employeeScheduleDocumentUrl && !records.value.some(r => r.subjectId === c.id && r.type === 'Schedule' && r.isCurrent))
        .map((c: any) => ({ id: c.id, name: names.value[c.userAccountId] || 'Employee' }))
    }
  } catch (error: any) { message.value = error.response?.data?.message || 'Verification results could not be loaded.' }
  finally { loading = false }
}
async function review(record: RecordItem, status: 'Approved' | 'Rejected') {
  if (!reason.value[record.id]?.trim()) { message.value = 'Enter a review reason before saving a decision.'; return }
  busy.value = record.id; message.value = ''
  try {
    const response = await api.post(`/verification/records/${record.id}/review`, { version: record.version, status, reason: reason.value[record.id] })
    if (!response.data?.isSuccess) throw new Error(response.data?.message || 'Review failed.')
    await load(); emit('changed'); message.value = 'Decision saved.'
  } catch (error: any) { message.value = error.response?.data?.message || error.message || 'Review failed.'; await load() }
  finally { busy.value = null }
}
async function audit(recordId?: string) {
  try { audits.value = (await api.get('/verification/audit', { params: { recordId } })).data }
  catch { message.value = 'Audit history could not be loaded.' }
}
function fields(record: RecordItem) {
  try { return Object.entries(JSON.parse(record.extractedFieldsJson || '{}')).map(([key, value]) => `${key}: ${typeof value === 'object' && value !== null ? JSON.stringify(value) : value ?? 'Missing'}`).join(' · ') }
  catch { return 'Extracted fields unavailable' }
}
watch(() => props.userId, () => { records.value = []; void load() })
onMounted(() => { void load(); interval = setInterval(load, 15000) })
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <section class="space-y-4">
    <UiButton v-for="schedule in employeeSchedules" :key="schedule.id" variant="secondary" @click="queueSchedule(schedule.id)">Review schedule: {{ schedule.name }}</UiButton>
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">Verification results</h2>
      <label class="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2"><input v-model="history" type="checkbox" />Include past submissions</label>
      <select v-model="type" aria-label="Verification type" class="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm dark:text-slate-200"><option>All</option><option>Account</option><option>Cor</option><option>Schedule</option></select>
      <UiButton variant="secondary" @click="load">Refresh</UiButton>
      <UiButton v-if="!userId" variant="secondary" @click="audit()">Policy audit history</UiButton>
    </div>
    <p class="text-sm text-slate-500">Pre-verified submissions have passed information checks and still need identity or authenticity review. OR/CR and plate photos use manual Vehicle Approvals.</p>
    <p v-if="message" role="status" class="text-sm text-rose-600 dark:text-rose-400">{{ message }}</p>
    <p v-if="!visible.length" class="text-sm text-slate-500">No verification records available.</p>
    <article v-for="record in visible" :key="record.id" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-sm font-semibold text-slate-900 dark:text-white">{{ names[record.userAccountId] || record.userAccountId }} · {{ record.type === 'Cor' ? 'COR' : record.type }}</div>
        <UiBadge :variant="record.status === 'Approved' ? 'success' : record.status === 'Rejected' ? 'danger' : 'warning'">{{ record.status === 'PreVerified' ? 'Pre-verified' : record.status === 'NeedsReview' ? 'Needs review' : record.status }}{{ !record.isCurrent ? ' · Previous submission' : '' }}</UiBadge>
      </div>
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ record.reason }}</p>
      <p class="text-xs text-slate-500">{{ record.method || 'Awaiting verification' }} · {{ record.ocrOutcome || 'No OCR outcome' }} · {{ new Date(record.verifiedAt || record.createdAt).toLocaleString() }}<span v-if="record.reviewerId"> · Reviewer {{ record.reviewerId }}</span></p>
      <p v-if="record.extractedFieldsJson" class="text-xs text-slate-600 dark:text-slate-300">{{ fields(record) }}</p>
      <a v-if="record.isCurrent && documents[(record.type === 'Schedule' ? 'schedule:' : '') + record.subjectId]" :href="formatDocUrl(documents[(record.type === 'Schedule' ? 'schedule:' : '') + record.subjectId]!)" target="_blank" rel="noopener" class="text-sm text-indigo-600">Open submitted document</a>
      <div v-if="record.isCurrent" class="flex flex-wrap gap-2">
        <input v-model="reason[record.id]" :aria-label="`Review reason for ${record.type}`" placeholder="Review reason" maxlength="1000" class="flex-1 min-w-48 border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-transparent text-sm dark:text-slate-200" />
        <UiButton variant="primary" :disabled="busy !== null || record.status === 'Processing'" @click="review(record, 'Approved')">Approve</UiButton>
        <UiButton variant="danger" :disabled="busy !== null" @click="review(record, 'Rejected')">Reject</UiButton>
      </div>
      <UiButton variant="secondary" @click="audit(record.id)">View audit history</UiButton>
    </article>
    <div v-if="audits.length" class="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-3">
      <h3 class="font-semibold text-slate-900 dark:text-white">Audit history</h3>
      <p v-for="entry in audits" :key="entry.id" class="text-xs text-slate-600 dark:text-slate-300 break-words">{{ new Date(entry.createdAt).toLocaleString() }} · {{ entry.action }} · {{ entry.actorId || 'System' }} · {{ entry.details }}</p>
    </div>
  </section>
</template>
