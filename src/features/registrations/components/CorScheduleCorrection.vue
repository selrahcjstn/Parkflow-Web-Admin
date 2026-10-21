<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/axios'
import UiButton from '@/components/ui/UiButton.vue'
import { formatDocUrl } from '@/utils/documentUrl'
type WeekDay = { dayOfWeek: number; hasClasses: boolean | null; startTime: string | null; endTime: string | null }
const props = defineProps<{ recordId: string; version: number; fieldsJson: string; documentUrl?: string; unavailable?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const editing = ref(false), checked = ref(false), busy = ref(false), reason = ref(''), message = ref('')
const week = ref<WeekDay[]>([]), editVersion = ref(0)
const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function fields() { try { return JSON.parse(props.fieldsJson) } catch { return {} } }
function start() {
  const data = fields()
  const raw = data.Schedules || []
  week.value = [1, 2, 3, 4, 5, 6, 0].map(day => {
    const corrected = data.AdminWeek?.find((d: any) => d.DayOfWeek === day)
    if (corrected) return { dayOfWeek: day, hasClasses: corrected.HasClasses, startTime: corrected.StartTime?.slice(0, 5) || null, endTime: corrected.EndTime?.slice(0, 5) || null }
    const sessions = raw.filter((s: any) => Number(s.Day) === day)
    return { dayOfWeek: day, hasClasses: sessions.length ? true : data.ScheduleIssues?.length ? null : false,
      startTime: sessions.length ? sessions.map((s: any) => s.Start).sort()[0]?.slice(0, 5) : null,
      endTime: sessions.length ? sessions.map((s: any) => s.End).sort().at(-1)?.slice(0, 5) : null }
  })
  editVersion.value = props.version; checked.value = false; reason.value = ''; message.value = ''; editing.value = true
}
async function save() {
  if (!checked.value || !reason.value.trim()) { message.value = 'Check the COR and provide a reason.'; return }
  busy.value = true; message.value = ''
  try {
    const response = await api.post(`/verification/records/${props.recordId}/cor-schedule`, {
      version: editVersion.value, corReviewed: checked.value, reason: reason.value.trim(),
      week: week.value.map(d => ({ ...d, startTime: d.hasClasses === true ? d.startTime : null, endTime: d.hasClasses === true ? d.endTime : null }))
    })
    if (!response.data?.isSuccess) throw new Error(response.data?.message || 'Correction failed.')
    editing.value = false; emit('changed'); message.value = 'Schedule corrected. Existing approval checks still apply.'
  } catch (error: any) { message.value = error.response?.data?.message || error.message || 'Correction failed. Refresh before trying again.' }
  finally { busy.value = false }
}
</script>
<template>
  <div class="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
    <p v-if="fields().ScheduleReviewRequested" role="status" class="text-sm text-amber-700 dark:text-amber-300">Student requested schedule review: {{ fields().ScheduleReviewReason }}</p>
    <p class="text-sm text-slate-600 dark:text-slate-300">Check the uploaded COR before correcting the daily earliest start and latest end. A correction does not approve the account or documents.</p>
    <a v-if="documentUrl" :href="formatDocUrl(documentUrl)" target="_blank" rel="noopener" class="text-sm text-indigo-600">Open COR for schedule review</a>
    <UiButton v-if="!editing" variant="secondary" :disabled="unavailable || !documentUrl" @click="start">Correct schedule from COR</UiButton>
    <form v-else class="space-y-3" @submit.prevent="save">
      <fieldset :disabled="busy" class="space-y-3">
        <div v-for="day in week" :key="day.dayOfWeek" class="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <span class="w-24">{{ names[day.dayOfWeek] }}</span>
          <select v-model="day.hasClasses" :aria-label="`${names[day.dayOfWeek]} classes`" class="rounded-lg border p-2 bg-white dark:bg-slate-900">
            <option :value="null">Needs review</option><option :value="true">Classes</option><option :value="false">No Classes</option>
          </select>
          <template v-if="day.hasClasses === true">
            <input v-model="day.startTime" type="time" required :aria-label="`${names[day.dayOfWeek]} earliest start`" class="rounded-lg border p-2 bg-transparent" />
            <input v-model="day.endTime" type="time" required :aria-label="`${names[day.dayOfWeek]} latest end`" class="rounded-lg border p-2 bg-transparent" />
          </template>
        </div>
        <label class="flex gap-2 text-sm text-slate-700 dark:text-slate-200"><input v-model="checked" type="checkbox" required />I checked this uploaded COR and verified all seven days.</label>
        <input v-model="reason" required maxlength="1000" aria-label="Schedule correction reason" placeholder="Schedule correction reason" class="w-full rounded-lg border p-2 bg-transparent text-sm dark:text-slate-200" />
        <div class="flex gap-2"><UiButton type="submit" variant="primary" :disabled="!checked || !reason.trim() || week.some(d => d.hasClasses === null)">Save COR correction</UiButton><UiButton type="button" variant="secondary" @click="editing = false">Cancel</UiButton></div>
      </fieldset>
    </form>
    <p v-if="message" role="status" class="text-sm text-rose-600 dark:text-rose-400">{{ message }}</p>
  </div>
</template>
