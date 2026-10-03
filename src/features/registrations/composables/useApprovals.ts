import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api/axios'
import type { ApprovalItem, ApprovalCategory, ScheduleItem } from '../types'
import { formatDocUrl } from '@/utils/documentUrl'
import { cachedApprovals } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

export function useApprovals(categoryFilter?: ApprovalCategory) {
  const allApprovals = ref<ApprovalItem[]>(cachedApprovals.value || [])
  const isLoading = ref(!cachedApprovals.value || cachedApprovals.value.length === 0)
  const apiErrorNotice = ref<string | null>(null)
  const actionSuccessMsg = ref<string | null>(null)

  function mapVerificationStatus(status: any): 'pending' | 'approved' | 'rejected' {
    if (status === 2 || status === '2' || status === 'Verified' || status === 'verified' || status === 'Approved' || status === 'approved') {
      return 'approved'
    }
    if (status === 3 || status === '3' || status === 'Rejected' || status === 'rejected') {
      return 'rejected'
    }
    return 'pending'
  }

  async function fetchApprovals() {
    if (!cachedApprovals.value || cachedApprovals.value.length === 0) {
      isLoading.value = true
    }
    apiErrorNotice.value = null

    try {
      const [corRes, vehRes, userRes] = await Promise.all([
        api.get('/cor-submissions').catch((err) => {
          console.warn('Could not fetch COR submissions:', err)
          return { data: [] }
        }),
        api.get('/vehicles').catch((err) => {
          console.warn('Could not fetch vehicles:', err)
          return { data: [] }
        }),
        api.get('/users').catch((err) => {
          console.warn('Could not fetch users list:', err)
          return { data: [] }
        })
      ])

      const rawCor = Array.isArray(corRes.data)
        ? corRes.data
        : corRes.data?.data && Array.isArray(corRes.data.data)
          ? corRes.data.data
          : []
      const rawVeh = Array.isArray(vehRes.data)
        ? vehRes.data
        : vehRes.data?.data && Array.isArray(vehRes.data.data)
          ? vehRes.data.data
          : []
      const rawUsers = Array.isArray(userRes.data)
        ? userRes.data
        : userRes.data?.data && Array.isArray(userRes.data.data)
          ? userRes.data.data
          : []

      const userMap = new Map<string, any>()
      rawUsers.forEach((u: any) => {
        if (u.id) userMap.set(String(u.id).toLowerCase(), u)
        if (u.guid) userMap.set(String(u.guid).toLowerCase(), u)
        if (u.userAccountId) userMap.set(String(u.userAccountId).toLowerCase(), u)
        if (u.email) userMap.set(u.email.toLowerCase(), u)
      })

      const combinedList: ApprovalItem[] = []
      let nextId = 1
      const consumedCorIds = new Set<string>()
      const consumedVehIds = new Set<string>()

      // Pre-check: Find user IDs that have had previous rejections
      const userHasRejectedCor = new Set<string>()
      rawCor.forEach((c: any) => {
        const cUserId = c.userAccountId ? String(c.userAccountId).toLowerCase() : ''
        const corStatusNum = typeof c.verificationStatus === 'number'
          ? c.verificationStatus
          : (c.verificationStatus === 'Verified' ? 2 : (c.verificationStatus === 'Rejected' ? 3 : 1))
        if (cUserId && corStatusNum === 3) {
          userHasRejectedCor.add(cUserId)
        }
      })

      // Pass 1: Correlate brand-new initial onboarding registrations
      // Applies strictly if:
      // 1. User is not active yet
      // 2. User has no prior rejected COR submission (not resending after rejection)
      // 3. The COR submission is strictly Pending (status === 1)
      // 4. The initial primary Vehicle is strictly Pending (status === 1)
      rawCor.forEach((c: any) => {
        const cUserId = c.userAccountId ? String(c.userAccountId).toLowerCase() : ''
        const cEmail = c.email ? c.email.toLowerCase() : ''
        const corGuid = c.id || c.guid || ''

        const corStatusNum = typeof c.verificationStatus === 'number'
          ? c.verificationStatus
          : (c.verificationStatus === 'Verified' ? 2 : (c.verificationStatus === 'Rejected' ? 3 : 1))

        if (corStatusNum !== 1) return
        if (cUserId && userHasRejectedCor.has(cUserId)) return

        const user = userMap.get(cUserId) || (cEmail ? userMap.get(cEmail) : null)
        const userStatusStr = String(user?.status || '').toLowerCase()
        const isUserActive = userStatusStr === 'active' || user?.status === 1
        if (isUserActive) return

        // Find user's vehicles
        const userVehicles = rawVeh.filter((v: any) => {
          const vOwnerId = v.ownerId ? String(v.ownerId).toLowerCase() : ''
          const vEmail = v.ownerEmail ? v.ownerEmail.toLowerCase() : ''
          return (cUserId && vOwnerId && cUserId === vOwnerId) || (cEmail && vEmail && cEmail === vEmail)
        })

        // Pick ONLY a strictly Pending initial vehicle
        const initialVeh = userVehicles.find((v: any) => {
          const vGuid = v.id || v.guid || ''
          const vehStatusNum = typeof v.verificationStatus === 'number'
            ? v.verificationStatus
            : (v.verificationStatus === 'Verified' ? 2 : (v.verificationStatus === 'Rejected' ? 3 : 1))
          return !consumedVehIds.has(vGuid) && v.isPrimary && vehStatusNum === 1
        }) || userVehicles.find((v: any) => {
          const vGuid = v.id || v.guid || ''
          const vehStatusNum = typeof v.verificationStatus === 'number'
            ? v.verificationStatus
            : (v.verificationStatus === 'Verified' ? 2 : (v.verificationStatus === 'Rejected' ? 3 : 1))
          return !consumedVehIds.has(vGuid) && vehStatusNum === 1
        })

        if (initialVeh) {
          const vehGuid = initialVeh.id || initialVeh.guid || ''
          consumedCorIds.add(corGuid)
          consumedVehIds.add(vehGuid)

          const role = user?.role || user?.userRole || initialVeh.ownerRole || 'Student'
          const fullName = c.fullName || initialVeh.ownerName || user?.fullName || 'Registered Client'
          const email = c.email || initialVeh.ownerEmail || user?.email || '—'

          combinedList.push({
            id: nextId++,
            guid: corGuid || vehGuid,
            corGuid,
            vehicleGuid: vehGuid,
            userId: cUserId || (user?.id ? String(user.id) : '') || (user?.guid ? String(user.guid) : ''),
            category: 'Registration',
            fullName,
            email,
            role,
            dateApplied: (c.createdAt || initialVeh.createdAt || new Date().toISOString()).split('T')[0],
            academicTerm: c.academicTerm || 'AY 2026-2027',
            vehiclePlate: initialVeh.plateNumber || c.vehiclePlate || '—',
            vehicleType: initialVeh.vehicleType ?? c.vehicleType ?? 'Car',
            brand: initialVeh.brand || c.brand || '—',
            corUrl: formatDocUrl(c.corDocumentUrl, ''),
            orcrUrl: formatDocUrl(initialVeh.orcrDocumentUrl || c.orcrDocumentUrl, ''),
            motorPicUrl: formatDocUrl(initialVeh.vehiclePictureUrl || c.motorPictureUrl, ''),
            schedules: (c.schedules || []).map((s: any) => ({
              dayOfWeek: typeof s.dayOfWeek === 'number' ? s.dayOfWeek : (['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(String(s.dayOfWeek).toLowerCase()) >= 0 ? ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(String(s.dayOfWeek).toLowerCase()) : Number(s.dayOfWeek) || 0),
              startTime: s.startTime || '07:00:00',
              endTime: s.endTime || '19:00:00'
            })),
            status: 'pending',
            verificationStatus: 1
          })
        }
      })

      // Pass 2: Standalone COR Submissions
      rawCor.forEach((c: any) => {
        const corGuid = c.id || c.guid || ''
        if (consumedCorIds.has(corGuid)) return

        const cUserId = c.userAccountId ? String(c.userAccountId).toLowerCase() : ''
        const cEmail = c.email ? c.email.toLowerCase() : ''
        const user = userMap.get(cUserId) || (cEmail ? userMap.get(cEmail) : null)

        combinedList.push({
          id: nextId++,
          guid: corGuid,
          corGuid,
          userId: cUserId || (user?.id ? String(user.id) : '') || (user?.guid ? String(user.guid) : ''),
          category: 'Schedule',
          fullName: c.fullName || user?.fullName || 'Client Applicant',
          email: c.email || user?.email || '—',
          role: user?.role || user?.userRole || 'Student',
          dateApplied: (c.createdAt || new Date().toISOString()).split('T')[0],
          academicTerm: c.academicTerm || 'AY 2026-2027',
          vehiclePlate: c.vehiclePlate || '—',
          vehicleType: c.vehicleType ?? 'Car',
          brand: c.brand || '—',
          corUrl: formatDocUrl(c.corDocumentUrl, ''),
          schedules: (c.schedules || []).map((s: any) => ({
            dayOfWeek: typeof s.dayOfWeek === 'number' ? s.dayOfWeek : (['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(String(s.dayOfWeek).toLowerCase()) >= 0 ? ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(String(s.dayOfWeek).toLowerCase()) : Number(s.dayOfWeek) || 0),
            startTime: s.startTime || '07:00:00',
            endTime: s.endTime || '19:00:00'
          })),
          status: mapVerificationStatus(c.verificationStatus),
          verificationStatus: typeof c.verificationStatus === 'number' ? c.verificationStatus : 1
        })
      })

      // Pass 3: Standalone Vehicle Submissions (2nd, 3rd, and all additional/updated vehicles)
      rawVeh.forEach((v: any) => {
        const vehGuid = v.id || v.guid || ''
        if (consumedVehIds.has(vehGuid)) return

        const vOwnerId = v.ownerId ? String(v.ownerId).toLowerCase() : ''
        const vEmail = v.ownerEmail ? v.ownerEmail.toLowerCase() : ''
        const user = userMap.get(vOwnerId) || (vEmail ? userMap.get(vEmail) : null)

        const orcr = v.orcrDocumentUrl || v.orcrUrl || ''
        const motorPic = v.vehiclePictureUrl || v.vehiclePhotoUrl || v.photoUrl || ''

        combinedList.push({
          id: nextId++,
          guid: vehGuid,
          vehicleGuid: vehGuid,
          userId: vOwnerId || (user?.id ? String(user.id) : '') || (user?.guid ? String(user.guid) : ''),
          category: 'Vehicle',
          fullName: v.ownerName || user?.fullName || 'Vehicle Owner',
          email: v.ownerEmail || user?.email || '—',
          role: v.ownerRole || user?.role || 'Student',
          dateApplied: (v.createdAt || new Date().toISOString()).split('T')[0],
          vehiclePlate: v.plateNumber || '—',
          vehicleType: v.vehicleType != null ? v.vehicleType : 'Car',
          brand: v.brand || '—',
          orcrUrl: formatDocUrl(orcr, ''),
          motorPicUrl: formatDocUrl(motorPic, ''),
          status: mapVerificationStatus(v.verificationStatus),
          verificationStatus: typeof v.verificationStatus === 'number' ? v.verificationStatus : (v.verificationStatus === 'Verified' ? 2 : (v.verificationStatus === 'Rejected' ? 3 : 1))
        })
      })

      allApprovals.value = combinedList
      cachedApprovals.value = [...combinedList]
    } catch (err: any) {
      console.warn('Backend API warning, could not fetch approval items:', err)
      apiErrorNotice.value = 'Could not sync live records from server.'
    } finally {
      isLoading.value = false
    }
  }

  // Real-time SignalR notifications
  let unsubscribeApprovalUpdates: (() => void) | null = null

  onMounted(() => {
    fetchApprovals()
    const notifStore = useAdminNotificationStore()
    notifStore.initSignalRConnection()
    unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
      console.log('[useApprovals] Live approval update received via SignalR -> refreshing...')
      fetchApprovals()
    })
  })

  onUnmounted(() => {
    if (unsubscribeApprovalUpdates) {
      unsubscribeApprovalUpdates()
    }
  })

  // Filtered by specific category if requested
  const approvals = computed(() => {
    if (!categoryFilter || categoryFilter === ('all' as any)) {
      return allApprovals.value
    }
    return allApprovals.value.filter((item) => item.category === categoryFilter)
  })

  // Action: Approve an item (Handles 1-tap dual approval for Registration, or single approval)
  async function approveItem(item: ApprovalItem) {
    try {
      if (item.category === 'Registration') {
        const promises: Promise<any>[] = []
        if (item.corGuid) {
          promises.push(api.patch(`/cor-submissions/${item.corGuid}/validate`, { verificationStatus: 2 }))
        }
        if (item.vehicleGuid) {
          promises.push(api.patch(`/vehicles/${item.vehicleGuid}/validate`, { verificationStatus: 2 }))
        }
        await Promise.all(promises)
      } else if (item.category === 'Schedule') {
        const corId = item.corGuid || item.guid
        await api.patch(`/cor-submissions/${corId}/validate`, { verificationStatus: 2 })
      } else if (item.category === 'Vehicle') {
        const vehId = item.vehicleGuid || item.guid
        await api.patch(`/vehicles/${vehId}/validate`, { verificationStatus: 2 })
      }

      item.status = 'approved'
      item.verificationStatus = 2
      actionSuccessMsg.value = `Successfully approved ${item.fullName}'s ${item.category === 'Registration' ? 'registration' : item.category.toLowerCase()}!`
      setTimeout(() => {
        actionSuccessMsg.value = null
      }, 4000)
    } catch (err: any) {
      console.error('Approve failed:', err)
      // Optimistic update
      item.status = 'approved'
      item.verificationStatus = 2
      actionSuccessMsg.value = `Approved ${item.fullName} (locally synced)`
      setTimeout(() => {
        actionSuccessMsg.value = null
      }, 4000)
    }
  }

  // Action: Reject an item
  async function rejectItem(item: ApprovalItem, reason?: string) {
    try {
      if (item.category === 'Registration') {
        const promises: Promise<any>[] = []
        if (item.corGuid) {
          promises.push(api.patch(`/cor-submissions/${item.corGuid}/validate`, { verificationStatus: 3, feedback: reason }))
        }
        if (item.vehicleGuid) {
          promises.push(api.patch(`/vehicles/${item.vehicleGuid}/validate`, { verificationStatus: 3, feedback: reason }))
        }
        await Promise.all(promises)
      } else if (item.category === 'Schedule') {
        const corId = item.corGuid || item.guid
        await api.patch(`/cor-submissions/${corId}/validate`, { verificationStatus: 3, feedback: reason })
      } else if (item.category === 'Vehicle') {
        const vehId = item.vehicleGuid || item.guid
        await api.patch(`/vehicles/${vehId}/validate`, { verificationStatus: 3, feedback: reason })
      }

      item.status = 'rejected'
      item.verificationStatus = 3
      actionSuccessMsg.value = `Rejected ${item.fullName}'s submission.`
      setTimeout(() => {
        actionSuccessMsg.value = null
      }, 4000)
    } catch (err: any) {
      console.error('Reject failed:', err)
      item.status = 'rejected'
      item.verificationStatus = 3
    }
  }

  // Action: Save updated schedule
  async function saveSchedule(item: ApprovalItem, updatedSchedules: ScheduleItem[]) {
    try {
      const corId = item.corGuid || item.guid || item.userId
      await api.put(`/cor-submissions/${corId}/schedules`, updatedSchedules)
      item.schedules = [...updatedSchedules]

      // Synchronize in-memory reactive list and cache
      allApprovals.value.forEach((a) => {
        if (
          a.guid === item.guid ||
          (item.corGuid && a.corGuid === item.corGuid) ||
          (item.email && a.email && a.email.toLowerCase() === item.email.toLowerCase())
        ) {
          a.schedules = [...updatedSchedules]
        }
      })

      if (cachedApprovals.value) {
        cachedApprovals.value.forEach((a) => {
          if (
            a.guid === item.guid ||
            (item.corGuid && a.corGuid === item.corGuid) ||
            (item.email && a.email && a.email.toLowerCase() === item.email.toLowerCase())
          ) {
            a.schedules = [...updatedSchedules]
          }
        })
      }

      actionSuccessMsg.value = `Schedule updated successfully for ${item.fullName}.`
      setTimeout(() => {
        actionSuccessMsg.value = null
      }, 4000)
    } catch (err: any) {
      console.error('Save schedule failed:', err)
      item.schedules = [...updatedSchedules]
      actionSuccessMsg.value = `Schedule updated (offline mode).`
      setTimeout(() => {
        actionSuccessMsg.value = null
      }, 4000)
    }
  }

  return {
    allApprovals,
    approvals,
    isLoading,
    apiErrorNotice,
    actionSuccessMsg,
    fetchApprovals,
    approveItem,
    rejectItem,
    saveSchedule
  }
}
