import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import api from '@/api/axios'

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

  const unreadCount = computed(() => {
    return notifications.value.filter((n) => n.isUnread).length
  })

  function markAsRead(id: string) {
    const item = notifications.value.find((n) => n.id === id)
    if (item) {
      item.isUnread = false
    }
  }

  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.isUnread = false
    })
  }

  function removeNotification(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  function addNotification(item: Omit<AdminNotification, 'id' | 'createdAt' | 'isUnread'>) {
    // Avoid adding exact duplicate by reference code or title
    const exists = notifications.value.some(
      (n) => (Boolean(item.referenceCode) && n.referenceCode === item.referenceCode) || (n.title === item.title && n.message === item.message)
    )
    if (exists) return

    const newNotif: AdminNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date(),
      isUnread: true
    }

    notifications.value.unshift(newNotif)
  }

  // Fetch pending admin tasks & active status alerts from backend APIs
  async function fetchPendingAdminNotifications() {
    isLoading.value = true
    try {
      // 1. Fetch pending COR / Schedule verification submissions
      try {
        const resCor = await api.get('/cor-submissions/pending')
        const items = resCor.data?.data || (Array.isArray(resCor.data) ? resCor.data : [])
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const refCode = item.id || item.referenceNumber || `cor-${item.userId}`
            addNotification({
              type: 'schedule_pending',
              title: 'Schedule Verification Pending',
              subtitle: 'COR Document Review Required',
              message: `${item.userFullName || 'Student'} uploaded a new COR schedule document awaiting verification.`,
              timestamp: item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending',
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
        const resVehicles = await api.get('/vehicles/pending')
        const items = resVehicles.data?.data || (Array.isArray(resVehicles.data) ? resVehicles.data : [])
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const refCode = item.id || item.plateNumber
            addNotification({
              type: 'vehicle_pending',
              title: 'Vehicle Registration Approval',
              subtitle: item.plateNumber || 'Vehicle Verification',
              message: `Vehicle [${item.plateNumber || 'Pending Plate'}] (${item.make} ${item.model || ''}) registered by ${item.ownerName || 'User'} awaiting approval.`,
              timestamp: 'Pending Review',
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
            addNotification({
              type: 'feedback_pending',
              title: 'New Feedback / Inquiry',
              subtitle: item.category || 'General Feedback',
              message: `Inquiry from ${item.fullName || item.email || 'User'}: "${item.description || item.message || ''}"`,
              timestamp: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unanswered',
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
        const resRes = await api.get('/parking-reservations')
        const items = resRes.data?.data || (Array.isArray(resRes.data) ? resRes.data : [])
        if (Array.isArray(items)) {
          const pendingRes = items.filter((r: any) => r.status === 'Pending' || r.status === 1)
          pendingRes.forEach((item: any) => {
            const refCode = item.id || `res-${item.id}`
            addNotification({
              type: 'reservation_pending',
              title: 'Parking Reservation Request',
              subtitle: item.slotName || 'Parking Space Reservation',
              message: `Reservation request by ${item.userName || 'Applicant'} for slot ${item.slotNumber || ''}.`,
              timestamp: 'Pending Action',
              actionUrl: '/reservations',
              actionLabel: 'View Reservation',
              priority: 'medium',
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
            addNotification({
              type: 'violation_issued',
              title: 'Active Overstay Violation Citation',
              subtitle: item.violationType || 'Overstay Citation',
              message: `Vehicle [${item.plateNumber}] citation unpaid. Fine Amount: ₱${Number(item.penaltyFee || item.amount || 100).toFixed(2)}.`,
              timestamp: 'Active Alert',
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
    const baseUrl = import.meta.env.VITE_API_URL || (isProd ? '/api' : 'http://localhost:5000/api')
    const hubUrl = baseUrl.replace(/\/api\/?$/, '') + '/hubs/notifications'

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
      const status = data?.status || data?.Status || 'Entry/Exit'
      addNotification({
        type: 'session_activity',
        title: 'Gate Parking Log Update',
        subtitle: `Scanner Activity: ${status}`,
        message: `Vehicle [${plate}] session activity recorded at campus gates.`,
        timestamp: 'Just now',
        actionUrl: '/parking',
        actionLabel: 'View Gate Log',
        priority: 'low'
      })
    })

    hubConnection.on('ExitResponse', (data: any) => {
      const plate = data?.plateNumber || data?.PlateNumber || 'Vehicle'
      const isViolation = Boolean(data?.isViolation || data?.IsViolation)
      if (isViolation) {
        addNotification({
          type: 'violation_issued',
          title: 'Gate Overstay Violation Triggered',
          subtitle: 'Guard Scanner Alert',
          message: `Overstay citation generated for vehicle [${plate}] upon exit attempt.`,
          timestamp: 'Just now',
          actionUrl: '/violations',
          actionLabel: 'View Violation',
          priority: 'high'
        })
      }
    })

    hubConnection.on('PaymentProcessed', (data: any) => {
      addNotification({
        type: 'payment_processed',
        title: 'Violation Citation Settled',
        subtitle: 'Payment Verified',
        message: `Payment of ₱${Number(data?.amount || 0).toFixed(2)} processed for citation ${data?.referenceNumber || ''}.`,
        timestamp: 'Just now',
        actionUrl: '/violations',
        actionLabel: 'View Settlement',
        priority: 'medium'
      })
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
    initSignalRConnection
  }
})
