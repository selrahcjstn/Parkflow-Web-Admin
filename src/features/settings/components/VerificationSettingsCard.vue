<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/api/axios'
import UiButton from '@/components/ui/UiButton.vue'
import { isSuperAdminUser } from '@/utils/auth'

interface Policy {
  id: number; accountAutomaticApproval: boolean; corAutomaticApproval: boolean
  vehicleAutomaticApproval: boolean; scheduleAutomaticApproval: boolean
  academicYear: string; semester: string; maxScheduleHoursPerDay: number; version: number
}
const policy = ref<Policy | null>(null)
const canEdit = computed(() => isSuperAdminUser())
const busy = ref(false)
const message = ref('')
const fields = [
  { key: 'accountAutomaticApproval', label: 'Account automatic approval' },
  { key: 'corAutomaticApproval', label: 'COR automatic approval' },
] as const
async function load() {
  try { policy.value = (await api.get('/verification/policies')).data }
  catch { message.value = 'Approval policies could not be loaded. Try refreshing.' }
}
async function save() {
  if (!policy.value || !canEdit.value) return
  busy.value = true; message.value = ''
  try {
    const response = await api.put('/verification/policies', policy.value)
    if (!response.data?.isSuccess) throw new Error(response.data?.message || 'Policies could not be saved.')
    await load(); message.value = 'Approval policies saved. The change is recorded in the audit history.'
  } catch (error: any) { message.value = error.response?.data?.message || error.message || 'Policies could not be saved.' }
  finally { busy.value = false }
}
onMounted(load)
</script>

<template>
  <section class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
    <div>
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">Verification &amp; Approval Settings</h2>
      <p class="text-sm text-slate-500 mt-2">Account and COR approval require trusted institutional identity or document authenticity. Matching OCR text alone goes to admin review. OR/CR and plate photos are reviewed manually in Vehicle Approvals.</p>
      <p v-if="!canEdit" class="text-sm text-slate-500 mt-2">You can view these policies. Only the Super Admin can change them.</p>
    </div>
    <fieldset v-if="policy" :disabled="!canEdit || busy" class="space-y-4">
      <label v-for="field in fields" :key="field.key" class="flex items-center justify-between gap-4 text-sm text-slate-700 dark:text-slate-200">
        <span>{{ field.label }}</span>
        <input v-model="policy[field.key]" type="checkbox" class="w-5 h-5 accent-indigo-600" />
      </label>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="text-sm text-slate-600 dark:text-slate-300">Academic year
          <input v-model="policy.academicYear" placeholder="YYYY-YYYY" maxlength="20" class="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent p-2" />
        </label>
        <label class="text-sm text-slate-600 dark:text-slate-300">Semester
          <select v-model="policy.semester" class="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2">
            <option value="">Select semester</option><option>1st Semester</option><option>2nd Semester</option><option>Summer</option>
          </select>
        </label>
      </div>
    </fieldset>
    <p v-if="message" role="status" class="text-sm text-slate-600 dark:text-slate-300">{{ message }}</p>
    <UiButton v-if="canEdit && policy" variant="primary" :disabled="busy" @click="save">{{ busy ? 'Saving…' : 'Save approval policies' }}</UiButton>
  </section>
</template>
