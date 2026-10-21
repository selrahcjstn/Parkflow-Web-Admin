import { ref, computed, onMounted, onUnmounted } from 'vue'
import api, { refreshAdminData } from '@/api/axios'
import type { ApprovalItem, ApprovalCategory, ScheduleItem } from '../types'
import { formatDocUrl } from '@/utils/documentUrl'
import { cachedApprovals } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

export function useApprovals(categoryFilter?: ApprovalCategory) {
  const allApprovals = ref<ApprovalItem[]>(cachedApprovals.value || [])
  const isLoading = ref(cachedApprovals.value === null)
  const apiErrorNotice = ref<string | null>(null)
  const actionSuccessMsg = ref<string | null>(null)
  let unsubscribe: (() => void) | undefined
  let loading = false
  let currentRecords: any[] = []
  function status(value: unknown): ApprovalItem['status'] {
    if (value === 2 || ['Verified', 'Approved', 'Active'].includes(String(value))) return 'approved'
    return value === 3 || value === 'Rejected' ? 'rejected' : 'pending'
  }
  const list = (r: any): any[] => Array.isArray(r.data) ? r.data : r.data?.data || []
  async function fetchApprovals() {
    if (loading) return
    loading = true; apiErrorNotice.value = null
    try {
      refreshAdminData()
      const [corRes, vehicleRes, usersRes, recordsRes] = await Promise.all([
        categoryFilter === 'Vehicle' ? Promise.resolve({ data: [] }) : api.get('/cor-submissions'),
        api.get('/vehicles'), api.get('/users'),
        categoryFilter === 'Vehicle' ? Promise.resolve({ data: [] }) : api.get('/verification/records'),
      ])
      const cors = list(corRes), vehicles = list(vehicleRes), users = list(usersRes), records = list(recordsRes)
      currentRecords = records
      const record = (type: string, id: string) => records.find(r => r.type === type && r.subjectId === id)
      const result: ApprovalItem[] = []
      const base = (u: any, cor?: any, v?: any): Omit<ApprovalItem, 'id' | 'guid' | 'category' | 'status' | 'verificationStatus'> => ({
        userId: u?.id || cor?.userAccountId || v?.ownerId,
        fullName: u?.fullName || cor?.fullName || v?.ownerName || 'Registered user',
        email: u?.email || cor?.email || v?.ownerEmail || '—', role: u?.role || v?.ownerRole || 'Student',
        dateApplied: String(cor?.createdAt || v?.createdAt || u?.createdAt || '').split('T')[0] || '',
        academicTerm: cor?.academicTerm, corGuid: cor?.id, vehicleGuid: v?.id,
        vehiclePlate: v?.plateNumber || cor?.vehiclePlate || '—', vehicleType: v?.vehicleType ?? cor?.vehicleType ?? '',
        brand: v?.brand || cor?.brand || '—', corUrl: formatDocUrl(cor?.corDocumentUrl || '', ''),
        orcrUrl: formatDocUrl(v?.orcrDocumentUrl || cor?.orcrDocumentUrl || '', ''),
        motorPicUrl: formatDocUrl(v?.vehiclePictureUrl || cor?.motorPictureUrl || '', ''),
        schedules: (cor?.schedules || []).map((s: any) => ({ dayOfWeek: typeof s.dayOfWeek === 'number' ? s.dayOfWeek :
          ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(String(s.dayOfWeek).toLowerCase()),
          startTime: s.startTime, endTime: s.endTime })),
      })
      for (const u of users) {
        if (!u.personnel) continue
        const account = record('Account', u.id)
        const cor = cors.find(c => c.userAccountId === u.id)
        if (!account && !cor) continue
        const v = vehicles.find(v => v.ownerId === u.id && v.isPrimary) || vehicles.find(v => v.ownerId === u.id)
        const state = status(account?.status || u.status)
        result.push({ ...base(u, cor, v), id: 'account-' + u.id, guid: u.id, category: 'Registration', status: state,
          verificationStatus: state === 'approved' ? 2 : state === 'rejected' ? 3 : 1 })
      }
      for (const cor of cors.filter(c => c.requiresAdminReview !== false)) {
        const u = users.find(u => u.id === cor.userAccountId)
        const corState = status(record('Cor', cor.id)?.status ?? cor.verificationStatus)
        const state = corState
        result.push({ ...base(u, cor), id: cor.id, guid: cor.id, category: 'Schedule', status: state,
          verificationStatus: state === 'approved' ? 2 : state === 'rejected' ? 3 : 1 })
      }
      for (const v of vehicles) {
        const state = status(v.verificationStatus)
        result.push({ ...base(users.find(u => u.id === v.ownerId), undefined, v), id: v.id, guid: v.id, category: 'Vehicle',
          status: state, verificationStatus: state === 'approved' ? 2 : state === 'rejected' ? 3 : 1 })
      }
      allApprovals.value = result; cachedApprovals.value = [...result]
    } catch (error: any) { apiErrorNotice.value = error.response?.data?.message || 'Could not load current approval records.' }
    finally { loading = false; isLoading.value = false }
  }
  async function review(type: string, id: string, value: 'Approved' | 'Rejected', reason: string) {
    if (type === 'Vehicle') {
      const response = await api.patch(`/vehicles/${id}/validate`, { verificationStatus: value === 'Approved' ? 2 : 3, rejectionReason: reason })
      if (!response.data?.isSuccess) throw new Error(response.data?.message || 'Manual vehicle review could not be saved.')
      return
    }
    const record = currentRecords.find(r => r.type === type && r.subjectId === id)
    const response = record ? await api.post(`/verification/records/${record.id}/review`, { version: record.version, status: value, reason })
      : await api.post(`/verification/${type}/${id}/review`, { status: value, reason })
    if (!response.data?.isSuccess) throw new Error(response.data?.message || 'Review could not be saved.')
  }
  async function approveItem(item: ApprovalItem) {
    apiErrorNotice.value = null; actionSuccessMsg.value = null
    try {
      if (item.category === 'Registration') await review('Account', item.userId || item.guid, 'Approved', 'Institutional identity reviewed by an administrator.')
      else if (item.category === 'Vehicle') await review('Vehicle', item.vehicleGuid || item.guid, 'Approved', 'Ownership documents reviewed by an administrator.')
      else {
        const corRecord = currentRecords.find(r => r.type === 'Cor' && r.subjectId === (item.corGuid || item.guid))
        if (corRecord?.status !== 'Approved') {
          await review('Cor', item.corGuid || item.guid, 'Approved', 'Document authenticity reviewed by an administrator.')
          await fetchApprovals()
        }
      }
      await fetchApprovals(); actionSuccessMsg.value = 'Verification decision saved.'
    } catch (error: any) { await fetchApprovals(); apiErrorNotice.value = error.response?.data?.message || error.message || 'Approval failed. Reload and try again.' }
  }
  async function rejectItem(item: ApprovalItem, reason?: string) {
    apiErrorNotice.value = null; actionSuccessMsg.value = null
    try {
      await review(item.category === 'Registration' ? 'Account' : item.category === 'Vehicle' ? 'Vehicle' : 'Cor',
        item.category === 'Registration' ? item.userId || item.guid : item.category === 'Vehicle' ? item.vehicleGuid || item.guid : item.corGuid || item.guid,
        'Rejected', reason?.trim() || 'Submission rejected by an administrator. Please review your information and documents.')
      await fetchApprovals(); actionSuccessMsg.value = 'Rejection saved.'
    } catch (error: any) { apiErrorNotice.value = error.response?.data?.message || error.message || 'Rejection failed.' }
  }
  async function saveSchedule(_item: ApprovalItem, _schedules: ScheduleItem[]) {
    apiErrorNotice.value = 'Use Correct schedule from COR in the verification panel after checking the uploaded document.'
  }
  onMounted(() => {
    void fetchApprovals()
    const notifications = useAdminNotificationStore()
    notifications.initSignalRConnection()
    unsubscribe = notifications.onApprovalUpdate(() => { void fetchApprovals() })
  })
  onUnmounted(() => unsubscribe?.())
  const approvals = computed(() => !categoryFilter || categoryFilter === ('all' as any) ? allApprovals.value : allApprovals.value.filter(i => i.category === categoryFilter))
  return { allApprovals, approvals, isLoading, apiErrorNotice, actionSuccessMsg, fetchApprovals, approveItem, rejectItem, saveSchedule }
}
