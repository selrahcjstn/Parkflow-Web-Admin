import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import api from '@/api/axios'
import { cachedApprovals, cachedRegistrations, cachedScheduleSubmissions, cachedVehicleApprovals, cachedReservations, cachedVehicles, cachedViolations, cachedFeedbacks } from '@/stores/appCache'

export interface AdminNotification {
  id: string
  type: 'schedule_pending' | 'vehicle_pending' | 'feedback_pending' | 'reservation_pending' | 'violation_issued' | 'session_activity' | 'payment_processed' | 'system'
  title: string
  subtitle: string
  message: string
  timestamp: string
  createdAt: Date
  isUnread: boolean
  actionUrl: string
  actionLabel: string
  priority?: 'high' | 'medium' | 'low'
  referenceCode?: string
}

export const useAdminNotificationStore = defineStore('adminNotification', () => {
  const notifications = ref<AdminNotification[]>([])
  const isSignalRConnected = ref(false)
  const isLoading = ref(false)
  let hubConnection: HubConnection | null = null

  type ApprovalListener = (data: any) => void
  const approvalListeners = new Set<ApprovalListener>()

  type ReservationListener = (data: any) => void
  const reservationListeners = new Set<ReservationListener>()

  function onApprovalUpdate(callback: ApprovalListener) {
    approvalListeners.add(callback)
    return () => {
      approvalListeners.delete(callback)
    }
  }

  function onReservationUpdate(callback: ReservationListener) {
    reservationListeners.add(callback)
    return () => {
      reservationListeners.delete(callback)
    }
  }

  function triggerApprovalUpdate(data: any) {
    cachedApprovals.value = null
    cachedRegistrations.value = null
    cachedScheduleSubmissions.value = null
    cachedVehicleApprovals.value = null
    cachedVehicles.value = null
    cachedReservations.value = null
    cachedViolations.value = null
    cachedFeedbacks.value = null
    approvalListeners.forEach((listener) => {
      try {
        listener(data)
      } catch (e) {
        console.error('Error in approval update listener:', e)
      }
    })
  }

  function triggerReservationUpdate(data: any) {
    cachedReservations.value = null
    reservationListeners.forEach((listener) => {
      try {
        listener(data)
      } catch (e) {
        console.error('Error in reservation update listener:', e)
      }
    })
  }

  const STORAGE_KEY_READ_NOTIFS = 'parkflow_read_notifications_v1'
  const STORAGE_KEY_LAST_READ_ALL = 'parkflow_last_read_all_v1'

  function getReadIdsFromStorage(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_READ_NOTIFS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return new Set(arr)
      }
    } catch (e) {}
    return new Set()
  }

  function getLastMarkAllReadTime(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEY_LAST_READ_ALL)
      if (val) return Number(val) || 0
    } catch (e) {}
    return 0
  }

  function saveReadIdsToStorage(ids: Set<string>) {
    try {
      const arr = Array.from(ids).slice(-500)
      localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(arr))
    } catch (e) {}
  }

  const unreadCount = computed(() => {
    return notifications.value.filter((n) => n.isUnread).length
  })

  function markAsRead(id: string) {
    const item = notifications.value.find((n) => n.id === id)
    if (item) {
      item.isUnread = false
      const readIds = getReadIdsFromStorage()
      if (item.referenceCode) readIds.add(item.referenceCode)
      readIds.add(item.id)
      readIds.add(`${item.type}-${item.title}-${item.message}`)
      saveReadIdsToStorage(readIds)
    }
  }

  function markAllAsRead() {
    const readIds = getReadIdsFromStorage()
    const now = Date.now()
    notifications.value.forEach((n) => {
      n.isUnread = false
      if (n.referenceCode) readIds.add(n.referenceCode)
      readIds.add(n.id)
      readIds.add(`${n.type}-${n.title}-${n.message}`)
    })
    saveReadIdsToStorage(readIds)
    localStorage.setItem(STORAGE_KEY_LAST_READ_ALL, String(now))
  }

  function removeNotification(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  function addNotification(item: Omit<AdminNotification, 'id' | 'createdAt' | 'isUnread'> & { createdAt?: Date | string }, allowDuplicate = false) {
    const notifKey = item.referenceCode || `${item.type}-${item.title}-${item.message}`

    // Avoid adding exact duplicate by reference code or title for REST sync
    if (!allowDuplicate) {
      const exists = notifications.value.some(
        (n) => (Boolean(item.referenceCode) && n.referenceCode === item.referenceCode) || (n.title === item.title && n.message === item.message) || n.id === notifKey
      )
      if (exists) return
    }

    let parsedDate = new Date()
    if (item.createdAt) {
      const d = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
      if (!isNaN(d.getTime())) {
        parsedDate = d
      }
    }

    const readIds = getReadIdsFromStorage()
    const lastMarkAll = getLastMarkAllReadTime()

    const isAlreadyRead = readIds.has(notifKey) || (Boolean(item.referenceCode) && readIds.has(item.referenceCode!)) || (lastMarkAll > 0 && parsedDate.getTime() <= lastMarkAll)

    const newNotif: AdminNotification = {
      ...item,
      id: notifKey,
      createdAt: parsedDate,
      isUnread: !isAlreadyRead
    }

    notifications.value.unshift(newNotif)
  }

  // Fetch pending admin tasks & active status alerts from backend APIs
  async function fetchPendingAdminNotifications() {
    isLoading.value = true
    try {
      // 1. Fetch pending COR / Schedule verification submissions
      try {
        const resCor = await api.get('/cor-submissions')
        const items = resCor.data?.data || (Array.isArray(resCor.data) ? resCor.data : [])
        if (Array.isArray(items)) {
          const pendingCors = items.filter((item: any) => item.verificationStatus === 1 || item.verificationStatus === 'Pending')
          pendingCors.forEach((item: any) => {
            const refCode = item.id || item.referenceNumber || `cor-${item.userId || item.userAccountId}`
            const rawDate = item.createdAt || item.submittedAt
            addNotification({
              type: 'schedule_pending',
              title: 'Schedule Verification Pending',
              subtitle: 'COR Document Review Required',
              message: `${item.fullName || item.userFullName || 'Student'} uploaded a new COR schedule document awaiting verification.`,
              timestamp: rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending',
              createdAt: rawDate,
              actionUrl: '/schedule-approval',
              actionLabel: 'Review Schedule',
              priority: 'high',
              referenceCode: refCode
            })
          })
        }
      } catch (e) {
        // Silently skip if endpoint not returned
      }

      // 2. Fetch pending Vehicle Registrations
      try {
        const resVehicles = await api.get('/vehicles')
        const items = resVehicles.data?.data || (Array.isArray(resVehicles.data) ? resVehicles.data : [])
        if (Array.isArray(items)) {
          const pendingVehicles = items.filter((item: any) => item.verificationStatus === 1 || item.verificationStatus === 'Pending')
          pendingVehicles.forEach((item: any) => {
            const refCode = item.id || item.plateNumber
            const rawDate = item.createdAt || item.registeredAt || item.submittedAt
            addNotification({
              type: 'vehicle_pending',
              title: 'Vehicle Registration Approval',
              subtitle: item.plateNumber || 'Vehicle Verification',
              message: `Vehicle [${item.plateNumber || 'Pending Plate'}] (${item.brand || item.make || ''} ${item.model || ''}) registered by ${item.ownerName || 'User'} awaiting approval.`,
              timestamp: rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Review',
              createdAt: rawDate,
              actionUrl: '/vehicle-approval',
              actionLabel: 'Inspect Vehicle',
              priority: 'high',
              referenceCode: refCode
            })
          })
        }
      } catch (e) {}

      // 3. Fetch pending Feedback & Inquiries
      try {
        const resFeedback = await api.get('/feedbacks')
        const items = resFeedback.data?.data || (Array.isArray(resFeedback.data) ? resFeedback.data : [])
        if (Array.isArray(items)) {
          const pendingFeedbacks = items.filter((f: any) => f.status === 'Pending' || f.statusName === 'Pending' || f.status === 1)
          pendingFeedbacks.forEach((item: any) => {
            const refCode = item.id || `fb-${item.id}`
            const rawDate = item.createdAt || item.submittedAt
            addNotification({
              type: 'feedback_pending',
              title: 'New Feedback / Inquiry',
              subtitle: item.category || 'General Feedback',
              message: `Inquiry from ${item.fullName || item.email || 'User'}: "${item.description || item.message || ''}"`,
              timestamp: rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unanswered',
              createdAt: rawDate,
              actionUrl: '/feedback',
              actionLabel: 'Answer Inquiry',
              priority: 'medium',
              referenceCode: refCode
            })
          })
        }
      } catch (e) {}

      // 4. Fetch pending Parking Space Reservations
      try {
        const resRes = await api.get('/parking-reservations/admin/all')
        const items = resRes.data?.data || (Array.isArray(resRes.data) ? resRes.data : [])
        if (Array.isArray(items)) {
          const pendingRes = items.filter((r: any) => r.status === 'Pending' || r.status === 0)
          pendingRes.forEach((item: any) => {
            const refCode = item.referenceNumber || item.id || `res-${item.id}`
            const rawDate = item.createdAt || item.reservationDate || item.startTime
            const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Review'
            addNotification({
              type: 'reservation_pending',
              title: 'Parking Reservation Request',
              subtitle: item.referenceNumber || 'Reservation Request',
              message: `Reservation [${item.referenceNumber || 'Pending'}] by ${item.userFullName || item.userEmail || 'Applicant'} awaiting admin review.`,
              timestamp: timeStr,
              createdAt: rawDate,
              actionUrl: '/reservations',
              actionLabel: 'View Reservation',
              priority: 'high',
              referenceCode: refCode
            })
          })
        }
      } catch (e) {}

      // 5. Fetch active unpaid violations
      try {
        const resViolations = await api.get('/violations')
        const items = resViolations.data?.data || (Array.isArray(resViolations.data) ? resViolations.data : [])
        if (Array.isArray(items)) {
          const unpaid = items.filter((v: any) => !v.isPaid && (v.status === 'Active' || v.status === 'Pending' || v.status === 1))
          unpaid.slice(0, 5).forEach((item: any) => {
            const refCode = item.id || item.violationNumber || item.referenceNumber
            const rawDate = item.createdAt || item.issuedAt || item.violationDate
            addNotification({
              type: 'violation_issued',
              title: 'Active Overstay Violation Citation',
              subtitle: item.violationType || 'Overstay Citation',
              message: `Vehicle [${item.plateNumber}] citation unpaid. Fine Amount: ₱${Number(item.penaltyFee || item.amount || 100).toFixed(2)}.`,
              timestamp: rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Alert',
              createdAt: rawDate,
              actionUrl: '/violations',
              actionLabel: 'Manage Citation',
              priority: 'high',
              referenceCode: refCode
            })
          })
        }
      } catch (e) {}
    } catch (err) {
      console.error('Error fetching admin notifications:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Connect to backend SignalR NotificationHub for real-time live events
  function initSignalRConnection() {
    if (hubConnection) return

    const isProd = import.meta.env.PROD
    const defaultHubUrl = isProd
      ? 'http://54.90.173.98:5000/hubs/notifications'
      : (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/hubs/notifications` : 'http://localhost:5044/hubs/notifications')
    const hubUrl = import.meta.env.VITE_SIGNALR_HUB_URL || defaultHubUrl

    const token = localStorage.getItem('parkflow_token') || ''

    hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build()

    // SignalR Real-Time Event Handlers
    hubConnection.on('ParkingSessionUpdated', (data: any) => {
      const plate = data?.plateNumber || data?.PlateNumber || 'Vehicle'
      const brand = data?.brand || data?.Brand || ''
      const status = data?.status || data?.Status || 'Entry/Exit'
      
      const fn = data?.firstName || data?.FirstName || ''
      const ln = data?.lastName || data?.LastName || ''
      const driverName = [fn, ln].filter(Boolean).join(' ')
      const role = data?.role || data?.Role || ''

      const guardName = data?.guardName || data?.GuardName || data?.issuedBy || data?.IssuedBy || ''

      const vehicleStr = brand ? `${brand} [${plate}]` : `[${plate}]`
      const driverStr = driverName ? ` by ${driverName}${role ? ` (${role})` : ''}` : ''
      const guardStr = guardName ? ` | Issued by Guard: ${guardName}` : ''

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      addNotification({
        type: 'session_activity',
        title: 'Gate Parking Log Update',
        subtitle: `Scanner Activity: ${status}`,
        message: `Vehicle ${vehicleStr} ${status.toLowerCase()} recorded at campus gates${driverStr} (${timeStr})${guardStr}.`,
        timestamp: timeStr,
        actionUrl: '/parking',
        actionLabel: 'View Gate Log',
        priority: 'low',
        referenceCode: `gate-${plate}-${Date.now()}`
      }, true)
    })

    hubConnection.on('ExitResponse', (data: any) => {
      const plate = data?.plateNumber || data?.PlateNumber || 'Vehicle'
      const brand = data?.brand || data?.Brand || ''
      const isViolation = Boolean(data?.isViolation || data?.IsViolation)
      const guardName = data?.guardName || data?.GuardName || data?.issuedBy || data?.IssuedBy || ''
      const vehicleStr = brand ? `${brand} [${plate}]` : `[${plate}]`
      const guardStr = guardName ? ` | Issued by Guard: ${guardName}` : ''
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (isViolation) {
        addNotification({
          type: 'violation_issued',
          title: 'Gate Overstay Violation Triggered',
          subtitle: 'Guard Scanner Alert',
          message: `Overstay citation generated for vehicle ${vehicleStr} upon exit attempt (${timeStr})${guardStr}.`,
          timestamp: timeStr,
          actionUrl: '/violations',
          actionLabel: 'View Violation',
          priority: 'high',
          referenceCode: `violation-${plate}-${Date.now()}`
        }, true)
      }
    })

    hubConnection.on('PaymentProcessed', (data: any) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      addNotification({
        type: 'payment_processed',
        title: 'Violation Citation Settled',
        subtitle: 'Payment Verified',
        message: `Payment of ₱${Number(data?.amount || 0).toFixed(2)} processed for citation ${data?.referenceNumber || ''} (${timeStr}).`,
        timestamp: timeStr,
        actionUrl: '/violations',
        actionLabel: 'View Settlement',
        priority: 'medium',
        referenceCode: `pay-${data?.referenceNumber || Date.now()}-${Date.now()}`
      }, true)
    })

    hubConnection.on('RegistrationSubmitted', (data: any) => {
      console.log('[SignalR Admin] RegistrationSubmitted received:', data)
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      addNotification({
        type: 'schedule_pending',
        title: 'New Registration Submitted',
        subtitle: 'Documents Awaiting Review',
        message: `A new registration has been submitted and is awaiting approval (${timeStr}).`,
        timestamp: timeStr,
        actionUrl: '/registrations',
        actionLabel: 'Review Registration',
        priority: 'high',
        referenceCode: `reg-${Date.now()}`
      }, true)
      triggerApprovalUpdate(data)
    })

    hubConnection.on('ScheduleSubmitted', (data: any) => {
      console.log('[SignalR Admin] ScheduleSubmitted received:', data)
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      addNotification({
        type: 'schedule_pending',
        title: 'New Schedule Submission',
        subtitle: 'COR Schedule Uploaded',
        message: `A student submitted a new COR schedule document for verification (${timeStr}).`,
        timestamp: timeStr,
        actionUrl: '/schedule-approval',
        actionLabel: 'Review Schedule',
        priority: 'high',
        referenceCode: `sched-${Date.now()}`
      }, true)
      triggerApprovalUpdate(data)
    })

    hubConnection.on('VehicleSubmitted', (data: any) => {
      console.log('[SignalR Admin] VehicleSubmitted received:', data)
      const plate = data?.plateNumber || data?.PlateNumber || 'Vehicle'
      const brand = data?.brand || data?.Brand || ''
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      addNotification({
        type: 'vehicle_pending',
        title: 'New Vehicle Registration',
        subtitle: plate,
        message: `Vehicle [${plate}] (${brand}) was registered and is awaiting admin approval (${timeStr}).`,
        timestamp: timeStr,
        actionUrl: '/vehicle-approval',
        actionLabel: 'Inspect Vehicle',
        priority: 'high',
        referenceCode: `veh-${plate}-${Date.now()}`
      }, true)
      triggerApprovalUpdate(data)
    })

    hubConnection.on('ReservationSubmitted', (data: any) => {
      console.log('[SignalR Admin] ReservationSubmitted received:', data)
      const refNum = data?.referenceNumber || data?.ReferenceNumber || 'Reservation'
      const applicant = data?.userFullName || data?.UserFullName || 'Applicant'
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      addNotification({
        type: 'reservation_pending',
        title: 'New Reservation Request',
        subtitle: refNum,
        message: `Reservation [${refNum}] submitted by ${applicant} awaiting approval (${timeStr}).`,
        timestamp: timeStr,
        actionUrl: '/reservations',
        actionLabel: 'Review Reservation',
        priority: 'high',
        referenceCode: `res-${refNum}-${Date.now()}`
      }, true)
      triggerReservationUpdate(data)
      triggerApprovalUpdate(data)
    })

    hubConnection.on('ReservationUpdated', (data: any) => {
      console.log('[SignalR Admin] ReservationUpdated received:', data)
      triggerReservationUpdate(data)
      triggerApprovalUpdate(data)
    })

    hubConnection.on('ApprovalListUpdated', (data: any) => {
      console.log('[SignalR Admin] ApprovalListUpdated received:', data)
      triggerApprovalUpdate(data)
      triggerReservationUpdate(data)
    })

    hubConnection.start()
      .then(() => {
        isSignalRConnected.value = true
      })
      .catch((err) => {
        console.warn('SignalR Connection Error (NotificationHub):', err)
        isSignalRConnected.value = false
      })

    hubConnection.onreconnected(() => {
      isSignalRConnected.value = true
    })

    hubConnection.onclose(() => {
      isSignalRConnected.value = false
    })

    // Fetch initial REST notifications
    fetchPendingAdminNotifications()
  }

  return {
    notifications,
    unreadCount,
    isSignalRConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    fetchPendingAdminNotifications,
    initSignalRConnection,
    onApprovalUpdate,
    triggerApprovalUpdate,
    onReservationUpdate,
    triggerReservationUpdate
  }
})
