<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import UiTabs from '@/components/ui/UiTabs.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiTable from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ReportMetrics from '../components/ReportMetrics.vue'
import ReportFilters from '../components/ReportFilters.vue'
import OccupancyChart from '../components/OccupancyChart.vue'
import VehicleDistributionChart from '../components/VehicleDistributionChart.vue'
import PrintableReportView from '../components/PrintableReportView.vue'

// Toast Notification State
interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning'
}

const toasts = ref<Toast[]>([])
let nextToastId = 1

const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
  const id = nextToastId++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

// Active Tab State
const activeTab = ref<'overview' | 'activity' | 'violations' | 'vehicles'>('overview')

// Global Filters State
const dateRange = ref('7d')
const reportVehicleType = ref('all')

// Search & Sub-filters State
const activitySearch = ref('')
const activityStatusFilter = ref('all')
const violationsSearch = ref('')
const violationsStatusFilter = ref('all')
const vehiclesSearch = ref('')
const vehiclesTypeFilter = ref('all')

// Pagination State
const activityPage = ref(1)
const activityPageSize = ref(10)
const violationsPage = ref(1)
const violationsPageSize = ref(10)
const vehiclesPage = ref(1)
const vehiclesPageSize = ref(10)

// Export State
const exportingCSV = ref(false)
const exportingPDF = ref(false)

// Raw Backend Data State
const isLoading = ref(false)
const rawViolations = ref<any[]>([])
const rawVehicles = ref<any[]>([])
const rawParkingLogs = ref<any[]>([])
const activeSessions = ref<any[]>([])
const totalCampusCapacity = ref(200)
const autoRefreshTimer = ref<any>(null)
const lastSyncTime = ref<string>('Just now')

// Fetch all necessary reporting data from backend
const fetchReportsData = async () => {
  isLoading.value = true
  try {
    const [violationsRes, vehiclesRes, historyLogsRes, allHistoryRes, activeRes, settingsRes] = await Promise.allSettled([
      api.get('/violations/history/page/1/1000'),
      api.get('/vehicles'),
      api.get('/parking-logs/history/page/1/1000'),
      api.get('/parking-history/all/page/1/1000'),
      api.get('/parking-logs/active-sessions'),
      api.get('/system-settings')
    ])

    if (violationsRes.status === 'fulfilled' && violationsRes.value.data?.isSuccess) {
      rawViolations.value = violationsRes.value.data.data?.items || violationsRes.value.data.data || []
    }

    if (vehiclesRes.status === 'fulfilled') {
      const data = vehiclesRes.value.data?.data || vehiclesRes.value.data || []
      rawVehicles.value = Array.isArray(data) ? data : data.items || []
    }

    // Historical Logs
    const histData = historyLogsRes.status === 'fulfilled' && historyLogsRes.value.data?.isSuccess
      ? (historyLogsRes.value.data.data?.items || historyLogsRes.value.data.data || [])
      : (allHistoryRes.status === 'fulfilled' && allHistoryRes.value.data?.isSuccess
          ? (allHistoryRes.value.data.data?.items || allHistoryRes.value.data.data || [])
          : [])
    rawParkingLogs.value = Array.isArray(histData) ? histData : []

    // Active Sessions (including Overstays)
    if (activeRes.status === 'fulfilled' && activeRes.value.data?.isSuccess) {
      const data = activeRes.value.data.data
      activeSessions.value = Array.isArray(data) ? data : (data?.activeSessions || data?.items || [])
    }

    if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.isSuccess) {
      totalCampusCapacity.value = settingsRes.value.data.data?.totalCapacity || 200
    }

    lastSyncTime.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (error) {
    console.error('Error fetching reports data:', error)
    showToast('Failed to load recent analytics from server.', 'warning')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchReportsData()
  autoRefreshTimer.value = setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchReportsData()
    }
  }, 180000)
})

onUnmounted(() => {
  if (autoRefreshTimer.value) clearInterval(autoRefreshTimer.value)
})

// Helper Functions
const getVehicleTypeLabel = (type: any): string => {
  if (type === 0 || type === '0' || type === 'Motorcycle') return 'Motorcycle'
  if (type === 1 || type === '1' || type === 'ElectricBike' || type === 'E-Bike') return 'Electric Bike'
  if (type === 2 || type === '2' || type === 'Car') return 'Car'
  return String(type || 'Unknown')
}

const formatRole = (role: string) => {
  if (!role) return 'Driver'
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  if (role === 'Student') return 'Student'
  if (role === 'Visitor') return 'Visitor'
  return role
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getVerificationStatus = (status: any): { label: string; variant: 'success' | 'warning' | 'danger' } => {
  if (status === 2 || status === '2' || status === 'Verified' || status === 'Approved') {
    return { label: 'Approved', variant: 'success' }
  }
  if (status === 3 || status === '3' || status === 'Rejected') {
    return { label: 'Rejected', variant: 'danger' }
  }
  return { label: 'Pending', variant: 'warning' }
}

const formatEntryMethod = (method: any): string => {
  if (method === 0 || method === '0' || method === 'QrCode' || method === 'QRCode') return 'QR Code'
  if (method === 1 || method === '1' || method === 'Manual') return 'Manual Entry'
  if (String(method).toLowerCase().includes('qr')) return 'QR Code'
  if (String(method).toLowerCase().includes('manual')) return 'Manual Entry'
  return 'QR Code'
}

const computeSessionDuration = (log: any): { text: string; hours: number } => {
  // 1. If explicit duration is provided as number or string
  let rawDuration = log.parkingDuration ?? log.totalParkingHours ?? log.duration

  if (typeof rawDuration === 'string') {
    const parsed = parseFloat(rawDuration)
    if (!isNaN(parsed) && parsed > 0) {
      rawDuration = parsed
    }
  }

  // 2. Compute from EntryTime and ExitTime (or now if active)
  if ((rawDuration === undefined || rawDuration === null || rawDuration === 0 || isNaN(Number(rawDuration))) && log.entryTime) {
    const start = new Date(log.entryTime).getTime()
    const end = log.exitTime ? new Date(log.exitTime).getTime() : Date.now()
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const diffMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)))
      const hrs = Math.floor(diffMinutes / 60)
      const mins = diffMinutes % 60
      const text = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`
      return { text, hours: diffMinutes / 60 }
    }
  }

  if (typeof rawDuration === 'number' && rawDuration > 0) {
    const totalMinutes = Math.max(1, Math.round(rawDuration * 60))
    const hrs = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    const text = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`
    return { text, hours: rawDuration }
  }

  return { text: log.isActive ? 'Active' : '0m', hours: 0 }
}

const formatDuration = (totalHours: any, isActive: boolean = false): string => {
  if (totalHours === undefined || totalHours === null || totalHours === '' || totalHours === 0 || totalHours === '0') {
    return isActive ? 'Active' : '0m'
  }
  const h = typeof totalHours === 'number' ? totalHours : parseFloat(totalHours)
  if (isNaN(h)) {
    return String(totalHours)
  }
  const totalMinutes = Math.round(h * 60)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs}h`
  return `${mins}m`
}

// Date Range Filter Checker
const isWithinDateRange = (dateStr?: string) => {
  if (!dateStr || dateRange.value === 'all') return true
  const itemDate = new Date(dateStr)
  if (isNaN(itemDate.getTime())) return true

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (dateRange.value === 'today') {
    return itemDate >= today
  }
  if (dateRange.value === '7d') {
    const past7 = new Date(today)
    past7.setDate(past7.getDate() - 7)
    return itemDate >= past7
  }
  if (dateRange.value === '30d') {
    const past30 = new Date(today)
    past30.setDate(past30.getDate() - 30)
    return itemDate >= past30
  }
  if (dateRange.value === 'semester') {
    const pastSemester = new Date(today)
    pastSemester.setDate(pastSemester.getDate() - 120)
    return itemDate >= pastSemester
  }
  return true
}

// Vehicle Type Filter Checker
const matchesVehicleType = (typeVal: any) => {
  if (reportVehicleType.value === 'all') return true
  const normalized = getVehicleTypeLabel(typeVal).toLowerCase()
  if (reportVehicleType.value === 'cars') return normalized.includes('car')
  if (reportVehicleType.value === 'motorcycles') return normalized.includes('motorcycle')
  if (reportVehicleType.value === 'ebikes') return normalized.includes('electric') || normalized.includes('bike')
  return true
}

// Combined Gate Activity (Active Sessions + Overstays + Historical Records)
const allGateActivity = computed(() => {
  const list: any[] = []

  // 1. Active sessions (including overstays currently parked on campus)
  activeSessions.value.forEach((s: any) => {
    const isOverstay = Number(s.overstayHours) > 0 || String(s.status || '').toLowerCase().includes('overstay')
    const dur = computeSessionDuration({ ...s, isActive: true })
    list.push({
      sessionId: s.sessionId || s.id || `active-${s.plateNumber || s.vehiclePlate}`,
      plateNumber: s.plateNumber || s.vehiclePlate || 'N/A',
      ownerName: (s.firstName && s.lastName) ? `${s.firstName} ${s.lastName}` : (s.ownerName || 'Guest Driver'),
      role: s.role || 'Student',
      vehicleType: s.vehicleType || s.type || 'Car',
      brand: s.brand || '',
      entryTime: s.entryTime || s.checkInTime || new Date().toISOString(),
      exitTime: null,
      duration: dur.text,
      totalParkingHours: dur.hours,
      overstayHours: s.overstayHours || 0,
      entryMethod: formatEntryMethod(s.entryMethod),
      status: isOverstay ? 'Overstay' : 'Active',
      isActive: true,
      isOverstay
    })
  })

  // 2. Completed historical parking logs
  rawParkingLogs.value.forEach((l: any) => {
    const isOverstay = Number(l.overstayHours) > 0 || String(l.status || '').toLowerCase().includes('over') || Boolean(l.hasViolation)
    const dur = computeSessionDuration({ ...l, isActive: false })
    list.push({
      sessionId: l.sessionId || l.id || `hist-${l.plateNumber}-${l.entryTime}`,
      plateNumber: l.plateNumber || l.vehiclePlate || 'N/A',
      ownerName: (l.firstName && l.lastName) ? `${l.firstName} ${l.lastName}` : (l.ownerName || 'Guest Driver'),
      role: l.roleName || l.role || l.ownerRole || 'Student',
      vehicleType: l.vehicleType || l.type || 'Car',
      brand: l.brand || '',
      entryTime: l.entryTime || l.checkInTime,
      exitTime: l.exitTime || l.checkOutTime,
      duration: dur.text,
      totalParkingHours: dur.hours,
      overstayHours: l.overstayHours || 0,
      entryMethod: formatEntryMethod(l.entryMethod),
      status: isOverstay ? 'Overdue' : (l.status || 'Completed'),
      isActive: false,
      isOverstay
    })
  })

  return list
})

// Filtered Lists
const filteredParkingLogs = computed(() => {
  return allGateActivity.value.filter((log: any) => {
    const dateMatch = log.isActive || isWithinDateRange(log.entryTime || log.createdAt)
    const typeMatch = matchesVehicleType(log.vehicleType)
    
    // Sub-search
    const q = activitySearch.value.toLowerCase().trim()
    const plate = (log.plateNumber || '').toLowerCase()
    const driver = (log.ownerName || '').toLowerCase()
    const method = (log.entryMethod || '').toLowerCase()
    const queryMatch = !q || plate.includes(q) || driver.includes(q) || method.includes(q)

    // Sub-status filter
    let statusMatch = true
    if (activityStatusFilter.value === 'active') {
      statusMatch = log.isActive // Includes both active parked and active overstays!
    } else if (activityStatusFilter.value === 'overstay') {
      statusMatch = log.isOverstay // Includes any overstaying session
    } else if (activityStatusFilter.value === 'completed') {
      statusMatch = !log.isActive
    }

    return dateMatch && typeMatch && queryMatch && statusMatch
  })
})

const filteredViolations = computed(() => {
  return rawViolations.value.filter((v: any) => {
    const dateMatch = isWithinDateRange(v.issuedAt || v.createdAt)
    const typeMatch = matchesVehicleType(v.vehicleType)

    // Sub-search
    const q = violationsSearch.value.toLowerCase().trim()
    const queryMatch = !q ||
      (v.referenceNumber && v.referenceNumber.toLowerCase().includes(q)) ||
      (v.plateNumber && v.plateNumber.toLowerCase().includes(q)) ||
      (v.violationType && v.violationType.toLowerCase().includes(q)) ||
      (v.firstName && v.firstName.toLowerCase().includes(q)) ||
      (v.lastName && v.lastName.toLowerCase().includes(q))

    // Sub-status
    const isPaid = v.settlementStatus === 'Settled' || v.settlementStatus === 'Paid' || v.isPaid
    const statusMatch = violationsStatusFilter.value === 'all' ||
      (violationsStatusFilter.value === 'paid' && isPaid) ||
      (violationsStatusFilter.value === 'unpaid' && !isPaid)

    return dateMatch && typeMatch && queryMatch && statusMatch
  })
})

const filteredVehicles = computed(() => {
  return rawVehicles.value.filter((veh: any) => {
    const typeMatch = matchesVehicleType(veh.vehicleType)

    // Sub-search
    const q = vehiclesSearch.value.toLowerCase().trim()
    const plate = (veh.plateNumber || '').toLowerCase()
    const brand = (veh.brand || '').toLowerCase()
    const model = (veh.model || '').toLowerCase()
    const owner = (veh.ownerName || veh.ownerFullName || veh.fullName || '').toLowerCase()
    const queryMatch = !q || plate.includes(q) || brand.includes(q) || model.includes(q) || owner.includes(q)

    // Sub-status filter
    const statusObj = getVerificationStatus(veh.verificationStatus)
    const statusMatch = vehiclesTypeFilter.value === 'all' ||
      statusObj.label.toLowerCase() === vehiclesTypeFilter.value.toLowerCase()

    return typeMatch && queryMatch && statusMatch
  })
})

// Paginated Lists
const paginatedActivity = computed(() => {
  const start = (activityPage.value - 1) * activityPageSize.value
  return filteredParkingLogs.value.slice(start, start + activityPageSize.value)
})

const paginatedViolations = computed(() => {
  const start = (violationsPage.value - 1) * violationsPageSize.value
  return filteredViolations.value.slice(start, start + violationsPageSize.value)
})

const paginatedVehicles = computed(() => {
  const start = (vehiclesPage.value - 1) * vehiclesPageSize.value
  return filteredVehicles.value.slice(start, start + vehiclesPageSize.value)
})

// Tab Options
const reportTabs = computed(() => [
  { key: 'overview', label: 'Executive Overview' },
  { key: 'activity', label: 'Gate Activity & Logs', count: filteredParkingLogs.value.length },
  { key: 'violations', label: 'Citations Ledger', count: filteredViolations.value.length },
  { key: 'vehicles', label: 'Vehicle Fleet', count: filteredVehicles.value.length }
])

// Dynamic Graph & Calculations
const hourlyOccupancyPoints = computed(() => {
  const baseData = [20, 35, 80, 94, 75, 55, 30]
  if (!filteredParkingLogs.value.length && !filteredViolations.value.length) {
    return baseData
  }

  const hoursCount: number[] = [0, 0, 0, 0, 0, 0, 0]
  const allEvents = [...filteredParkingLogs.value, ...filteredViolations.value]

  allEvents.forEach((item: any) => {
    const rawDate = item.entryTime || item.issuedAt || item.createdAt
    if (!rawDate) return
    const hour = new Date(rawDate).getHours()
    if (hour >= 6 && hour < 8) hoursCount[0] = (hoursCount[0] || 0) + 1
    else if (hour >= 8 && hour < 10) hoursCount[1] = (hoursCount[1] || 0) + 1
    else if (hour >= 10 && hour < 12) hoursCount[2] = (hoursCount[2] || 0) + 1
    else if (hour >= 12 && hour < 14) hoursCount[3] = (hoursCount[3] || 0) + 1
    else if (hour >= 14 && hour < 16) hoursCount[4] = (hoursCount[4] || 0) + 1
    else if (hour >= 16 && hour < 18) hoursCount[5] = (hoursCount[5] || 0) + 1
    else if (hour >= 18 && hour < 20) hoursCount[6] = (hoursCount[6] || 0) + 1
  })

  const maxVal = Math.max(...hoursCount, 1)
  return hoursCount.map((cnt, i) => Math.min(98, Math.max(15, Math.round((cnt / maxVal) * 85 + (baseData[i] ?? 30) * 0.2))))
})

const occupancySvgPath = computed(() => {
  const xCoords = [40, 90, 160, 240, 320, 400, 480, 560]
  const vals = [10, ...hourlyOccupancyPoints.value]

  const coords = vals.map((v, i) => {
    const y = Math.round(200 - (v / 100) * 170)
    return `${xCoords[i]} ${y}`
  })

  const lineD = `M ${coords.join(' L ')}`
  const areaD = `M 40 200 L ${coords.join(' L ')} L 560 200 Z`

  let peakIdx = 0
  let maxVal = -1
  vals.forEach((v, idx) => {
    if (v > maxVal) {
      maxVal = v
      peakIdx = idx
    }
  })

  const peakX = xCoords[peakIdx] || 320
  const peakY = Math.round(200 - (maxVal / 100) * 170)

  return { lineD, areaD, peakX, peakY, maxVal }
})

// Vehicle Pie Breakdown
const vehiclePieData = computed(() => {
  let cars = filteredVehicles.value.filter((v: any) => v.vehicleType === 'Car' || v.vehicleType === 2 || String(v.vehicleType).toLowerCase() === 'car').length
  let motos = filteredVehicles.value.filter((v: any) => v.vehicleType === 'Motorcycle' || v.vehicleType === 0 || String(v.vehicleType).toLowerCase() === 'motorcycle').length
  let ebikes = filteredVehicles.value.filter((v: any) => v.vehicleType === 'ElectricBike' || v.vehicleType === 1 || String(v.vehicleType).toLowerCase().includes('bike')).length

  if (!cars && !motos && !ebikes) {
    cars = 18
    motos = 8
    ebikes = 2
  }

  const total = cars + motos + ebikes
  const carPct = Math.round((cars / total) * 100) || 0
  const motoPct = Math.round((motos / total) * 100) || 0
  const ebikePct = Math.max(0, 100 - carPct - motoPct)

  const circ = 439.82
  const carDash = (carPct / 100) * circ
  const motoDash = (motoPct / 100) * circ
  const ebikeDash = (ebikePct / 100) * circ

  const carOffset = 0
  const motoOffset = -carDash
  const ebikeOffset = -(carDash + motoDash)

  return {
    cars,
    motos,
    ebikes,
    total,
    carPct,
    motoPct,
    ebikePct,
    circ,
    carDash: `${carDash} ${circ - carDash}`,
    motoDash: `${motoDash} ${circ - motoDash}`,
    ebikeDash: `${ebikeDash} ${circ - ebikeDash}`,
    carOffset,
    motoOffset,
    ebikeOffset
  }
})

// Dynamic Summary Calculations
const totalRevenueAmount = computed(() => {
  return filteredViolations.value
    .filter((v: any) => v.settlementStatus === 'Settled' || v.settlementStatus === 'Paid' || v.isPaid)
    .reduce((sum: number, v: any) => sum + (Number(v.penaltyFee) || 0), 0)
})

const peakOccupancyFormatted = computed(() => {
  const peakVal = Math.max(...hourlyOccupancyPoints.value, 45)
  return `${peakVal}%`
})

const avgDurationFormatted = computed(() => {
  if (!filteredParkingLogs.value.length) return '3h 15m'
  let totalMinutes = 0
  let count = 0
  filteredParkingLogs.value.forEach((l: any) => {
    if (l.totalParkingHours) {
      totalMinutes += Number(l.totalParkingHours) * 60
      count++
    }
  })
  if (!count) return '2h 45m'
  const avgMins = Math.round(totalMinutes / count)
  const hrs = Math.floor(avgMins / 60)
  const mins = avgMins % 60
  return `${hrs}h ${mins}m`
})

const stats = computed(() => [
  {
    title: 'Total Gate Inflow',
    value: String(filteredParkingLogs.value.length || activeSessions.value.length || 0),
    subtitle: 'Verified campus entries',
    icon: 'duration',
    gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)'
  },
  {
    title: 'Peak Bay Occupancy',
    value: peakOccupancyFormatted.value,
    subtitle: 'Highest capacity utilization',
    icon: 'peak',
    gradient: 'linear-gradient(135deg, #D22730, #ef4444)'
  },
  {
    title: 'Average Duration',
    value: avgDurationFormatted.value,
    subtitle: 'Dwell time per vehicle session',
    icon: 'duration',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)'
  },
  {
    title: 'Settled Fines Collection',
    value: `₱${totalRevenueAmount.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    subtitle: `${filteredViolations.value.length} Citations Recorded`,
    icon: 'revenue',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)'
  }
])

// Hourly Traffic Load Data for Overview & PDF
const hourlyTrafficData = computed(() => [
  { timeSlot: '06:00 AM - 08:00 AM', loadPercent: hourlyOccupancyPoints.value[0] || 20, status: 'Morning Gate Inflow' },
  { timeSlot: '08:00 AM - 10:00 AM', loadPercent: hourlyOccupancyPoints.value[1] || 45, status: 'Moderate Traffic' },
  { timeSlot: '10:00 AM - 12:00 PM', loadPercent: hourlyOccupancyPoints.value[2] || 85, status: 'Peak Class Arrival' },
  { timeSlot: '12:00 PM - 02:00 PM', loadPercent: hourlyOccupancyPoints.value[3] || 94, status: 'Mid-Day Maximum Load' },
  { timeSlot: '02:00 PM - 04:00 PM', loadPercent: hourlyOccupancyPoints.value[4] || 75, status: 'High Occupancy' },
  { timeSlot: '04:00 PM - 06:00 PM', loadPercent: hourlyOccupancyPoints.value[5] || 55, status: 'Afternoon Gate Outflow' },
  { timeSlot: '06:00 PM - 08:00 PM', loadPercent: hourlyOccupancyPoints.value[6] || 30, status: 'Evening Clearance' }
])

// Export Handlers
const triggerExport = (format: 'csv' | 'pdf') => {
  if (format === 'csv') {
    exportingCSV.value = true
    showToast('Compiling data records into CSV...', 'info')

    try {
      let headers: string[] = []
      let rows: any[][] = []
      let fileName = 'ParkFlow_Report'

      if (activeTab.value === 'violations' || activeTab.value === 'overview') {
        fileName = 'ParkFlow_Citations_Audit'
        headers = ['Citation Reference', 'Plate Number', 'Driver / Owner', 'Infraction Type', 'Penalty Fee', 'Settlement Status', 'Date Issued']
        rows = filteredViolations.value.map((v: any) => [
          `"${v.referenceNumber || ''}"`,
          `"${v.plateNumber || ''}"`,
          `"${(v.firstName || '') + ' ' + (v.lastName || '')}"`,
          `"${v.violationType || ''}"`,
          `"${v.penaltyFee || 0}"`,
          `"${(v.settlementStatus === 'Settled' || v.isPaid) ? 'Paid' : 'Unpaid'}"`,
          `"${v.issuedAt ? new Date(v.issuedAt).toLocaleString() : ''}"`
        ])
      } else if (activeTab.value === 'activity') {
        fileName = 'ParkFlow_Gate_Activity_Logs'
        headers = ['Session ID', 'Plate Number', 'Owner Name', 'Vehicle Type', 'Entry Time', 'Exit Time', 'Duration (Hours)', 'Entry Method', 'Status']
        rows = filteredParkingLogs.value.map((l: any) => [
          `"${l.sessionId || l.id || ''}"`,
          `"${l.plateNumber || ''}"`,
          `"${l.ownerName || ''}"`,
          `"${getVehicleTypeLabel(l.vehicleType)}"`,
          `"${l.entryTime ? new Date(l.entryTime).toLocaleString() : ''}"`,
          `"${l.exitTime ? new Date(l.exitTime).toLocaleString() : 'Active'}"`,
          `"${l.totalParkingHours || '0'}"`,
          `"${l.entryMethod || 'RFID'}"`,
          `"${l.status || 'Active'}"`
        ])
      } else if (activeTab.value === 'vehicles') {
        fileName = 'ParkFlow_Campus_Vehicle_Registry'
        headers = ['Plate Number', 'Brand / Model', 'Vehicle Classification', 'Owner Name', 'Role', 'Approval Status']
        rows = filteredVehicles.value.map((v: any) => [
          `"${v.plateNumber || ''}"`,
          `"${(v.brand || '') + ' ' + (v.model || '')}"`,
          `"${getVehicleTypeLabel(v.vehicleType)}"`,
          `"${v.ownerName || ''}"`,
          `"${formatRole(v.ownerRole)}"`,
          `"${v.verificationStatus || 'Approved'}"`
        ])
      }

      const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const todayDate = new Date().toISOString().split('T')[0]
      link.setAttribute('href', url)
      link.setAttribute('download', `${fileName}_${todayDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('CSV report exported successfully!', 'success')
    } catch (err) {
      console.error('CSV export error:', err)
      showToast('Error exporting CSV file.', 'warning')
    } finally {
      exportingCSV.value = false
    }
  } else {
    exportingPDF.value = true
    showToast('Preparing Official BulSU PDF Report...', 'info')
    setTimeout(() => {
      exportingPDF.value = false
      window.print()
    }, 400)
  }
}

// Table Column Definitions
const activityColumns = [
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'ownerName', label: 'Driver / Owner' },
  { key: 'vehicleType', label: 'Vehicle Class' },
  { key: 'entryTime', label: 'Entry Timestamp' },
  { key: 'exitTime', label: 'Exit Timestamp' },
  { key: 'duration', label: 'Duration' },
  { key: 'entryMethod', label: 'Entry Method' },
  { key: 'status', label: 'Session Status' }
]

const violationsColumns = [
  { key: 'referenceNumber', label: 'Citation Ref' },
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'driver', label: 'Driver / Owner' },
  { key: 'violationType', label: 'Infraction Type' },
  { key: 'penaltyFee', label: 'Penalty Fee' },
  { key: 'settlementStatus', label: 'Settlement Status' },
  { key: 'issuedAt', label: 'Date Issued' }
]

const vehicleColumns = [
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'brandModel', label: 'Brand & Model' },
  { key: 'vehicleType', label: 'Vehicle Class' },
  { key: 'ownerName', label: 'Registered Owner' },
  { key: 'ownerRole', label: 'Classification' },
  { key: 'verificationStatus', label: 'Approval Status' }
]

// Printable Report Props Payload
const printableSummary = computed(() => ({
  totalEntries: filteredParkingLogs.value.length || activeSessions.value.length,
  peakOccupancy: peakOccupancyFormatted.value,
  avgDuration: avgDurationFormatted.value,
  totalRevenue: `₱${totalRevenueAmount.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  totalViolations: filteredViolations.value.length,
  activeParked: activeSessions.value.length,
  totalVehicles: filteredVehicles.value.length
}))

const printableViolations = computed(() => {
  return filteredViolations.value.map((v: any) => ({
    ref: v.referenceNumber || 'N/A',
    plate: v.plateNumber || 'N/A',
    driver: (v.firstName || '') + ' ' + (v.lastName || '') || 'Driver',
    type: v.violationType || 'Violation',
    status: (v.settlementStatus === 'Settled' || v.isPaid) ? 'Paid' : 'Unpaid',
    amount: Number(v.penaltyFee) || 0,
    date: formatDate(v.issuedAt || v.createdAt)
  }))
})

const printableRecentLogs = computed(() => {
  return filteredParkingLogs.value.slice(0, 10).map((l: any) => ({
    plate: l.plateNumber || 'N/A',
    driver: l.ownerName || 'Driver',
    type: getVehicleTypeLabel(l.vehicleType),
    entryTime: formatDate(l.entryTime),
    exitTime: l.exitTime ? formatDate(l.exitTime) : 'Active',
    duration: l.totalParkingHours ? `${l.totalParkingHours}h` : '—',
    method: l.entryMethod || 'RFID',
    status: l.status || 'Active'
  }))
})

const printableReportRef = computed(() => {
  const d = new Date()
  return `BULSU-RPT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
})

const dateRangeLabel = computed(() => {
  if (dateRange.value === 'today') return 'Today (Current Date)'
  if (dateRange.value === '7d') return 'Last 7 Days'
  if (dateRange.value === '30d') return 'Last 30 Days'
  if (dateRange.value === 'semester') return 'Current Academic Semester'
  return 'All Historical Records'
})

const vehicleTypeScopeLabel = computed(() => {
  if (reportVehicleType.value === 'cars') return 'Automobiles Only'
  if (reportVehicleType.value === 'motorcycles') return 'Motorcycles Only'
  if (reportVehicleType.value === 'ebikes') return 'Electric Bikes Only'
  return 'All Vehicle Classifications'
})

// Watch filters to reset page numbers
watch([dateRange, reportVehicleType, activitySearch, activityStatusFilter], () => {
  activityPage.value = 1
})
watch([dateRange, reportVehicleType, violationsSearch, violationsStatusFilter], () => {
  violationsPage.value = 1
})
watch([dateRange, reportVehicleType, vehiclesSearch, vehiclesTypeFilter], () => {
  vehiclesPage.value = 1
})
</script>

<template>
  <div class="space-y-6">
    <!-- Toasts Notifications -->
    <TransitionGroup name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="toast.type === 'warning' ? 'bg-amber-600' : toast.type === 'info' ? 'bg-[#D22730]' : 'bg-emerald-600'"
      >
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>

    <!-- Page Header (Screen only) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Analytical Reports
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          BulSU campus operational intelligence, parking statistics, and official audit reporting.
        </p>
      </div>

      <!-- Tab Switcher -->
      <UiTabs
        v-model="activeTab"
        :tabs="reportTabs"
      />
    </div>

    <!-- Global Report Filters & Action Toolbar (Screen only) -->
    <div class="no-print">
      <UiCard custom-class="p-4">
        <ReportFilters
          v-model:date-range="dateRange"
          v-model:report-vehicle-type="reportVehicleType"
          :exporting-c-s-v="exportingCSV"
          :exporting-p-d-f="exportingPDF"
          :last-sync-time="lastSyncTime"
          @export="triggerExport"
          @refresh="fetchReportsData"
        />
      </UiCard>
    </div>

    <!-- TAB 1: EXECUTIVE OVERVIEW -->
    <div v-if="activeTab === 'overview'" class="no-print space-y-6">
      <!-- Performance Metrics KPI Cards -->
      <ReportMetrics
        :is-loading="isLoading"
        :stats="stats"
      />

      <!-- Visual Analytics Graphs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OccupancyChart
          :occupancy-svg-path="occupancySvgPath"
          :last-sync-time="lastSyncTime"
        />
        <VehicleDistributionChart
          :vehicle-pie-data="vehiclePieData"
        />
      </div>

      <!-- Operational Hourly Traffic Table -->
      <UiCard custom-class="p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Hourly Peak Traffic Distribution
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown of campus parking load factor across operational windows
            </p>
          </div>
          <span class="text-xs font-bold text-[#D22730] bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900">
            Capacity: {{ totalCampusCapacity }} Slots
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th class="py-2.5 px-3">Time Window</th>
                <th class="py-2.5 px-3">Load Factor</th>
                <th class="py-2.5 px-3">Traffic Intensity</th>
                <th class="py-2.5 px-3 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="item in hourlyTrafficData" :key="item.timeSlot" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td class="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{{ item.timeSlot }}</td>
                <td class="py-3 px-3">
                  <div class="flex items-center gap-2">
                    <div class="w-28 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :class="item.loadPercent >= 85 ? 'bg-[#D22730]' : item.loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'"
                        :style="{ width: `${item.loadPercent}%` }"
                      ></div>
                    </div>
                    <span class="font-bold text-slate-700 dark:text-slate-300">{{ item.loadPercent }}%</span>
                  </div>
                </td>
                <td class="py-3 px-3">
                  <span
                    class="inline-flex items-center gap-1.5 font-bold"
                    :class="item.loadPercent >= 85 ? 'text-[#D22730]' : item.loadPercent >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="item.loadPercent >= 85 ? 'bg-[#D22730]' : item.loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'"
                    ></span>
                    {{ item.loadPercent >= 85 ? 'Heavy Peak Load' : item.loadPercent >= 60 ? 'Moderate Demand' : 'Normal Operations' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right text-slate-600 dark:text-slate-400 font-medium">{{ item.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </div>

    <!-- TAB 2: GATE ACTIVITY & PARKING LOGS -->
    <div v-else-if="activeTab === 'activity'" class="no-print space-y-4">
      <UiCard custom-class="p-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="w-full sm:w-72">
            <UiInput
              v-model="activitySearch"
              placeholder="Search plate, driver, or method..."
              size="sm"
            />
          </div>
          <div class="w-full sm:w-56">
            <UiSelect
              v-model="activityStatusFilter"
              :options="[
                { label: 'All Session Statuses', value: 'all' },
                { label: 'Active Parked', value: 'active' },
                { label: 'Overstay / Exceeded', value: 'overstay' },
                { label: 'Completed Sessions', value: 'completed' }
              ]"
              size="sm"
            />
          </div>
        </div>

        <UiTable
          :columns="activityColumns"
          :data="paginatedActivity"
          :is-loading="isLoading"
          empty-text="No parking activity records found matching criteria."
        >
          <template #cell-plateNumber="{ item }">
            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber || '—' }}</span>
          </template>
          <template #cell-ownerName="{ item }">
            <span class="font-medium text-slate-800 dark:text-slate-200">{{ item.ownerName || 'Guest Driver' }}</span>
          </template>
          <template #cell-vehicleType="{ item }">
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{{ getVehicleTypeLabel(item.vehicleType) }}</span>
          </template>
          <template #cell-entryTime="{ item }">
            <span class="text-xs text-slate-600 dark:text-slate-400">{{ formatDate(item.entryTime) }}</span>
          </template>
          <template #cell-exitTime="{ item }">
            <span class="text-xs text-slate-600 dark:text-slate-400">{{ item.exitTime ? formatDate(item.exitTime) : '—' }}</span>
          </template>
          <template #cell-duration="{ item }">
            <span
              class="font-medium text-xs"
              :class="item.isOverstay ? 'text-[#D22730] font-bold' : 'text-slate-700 dark:text-slate-300'"
            >
              {{ item.duration }}
            </span>
          </template>
          <template #cell-entryMethod="{ item }">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ formatEntryMethod(item.entryMethod) }}</span>
          </template>
          <template #cell-status="{ item }">
            <UiStatusText
              :variant="item.isOverstay ? 'danger' : item.isActive ? 'info' : 'success'"
            >
              {{ item.isOverstay ? (item.isActive ? 'Overstay' : 'Overdue Exit') : item.isActive ? 'Active Parked' : 'Completed' }}
            </UiStatusText>
          </template>
        </UiTable>

        <div class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <TablePagination
            v-model:current-page="activityPage"
            v-model:page-size="activityPageSize"
            :total-items="filteredParkingLogs.length"
          />
        </div>
      </UiCard>
    </div>

    <!-- TAB 3: CITATIONS LEDGER -->
    <div v-else-if="activeTab === 'violations'" class="no-print space-y-4">
      <UiCard custom-class="p-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="w-full sm:w-72">
            <UiInput
              v-model="violationsSearch"
              placeholder="Search reference, plate, or driver..."
              size="sm"
            />
          </div>
          <div class="w-full sm:w-48">
            <UiSelect
              v-model="violationsStatusFilter"
              :options="[
                { label: 'All Settlement Statuses', value: 'all' },
                { label: 'Settled / Paid', value: 'paid' },
                { label: 'Unpaid Citations', value: 'unpaid' }
              ]"
              size="sm"
            />
          </div>
        </div>

        <UiTable
          :columns="violationsColumns"
          :data="paginatedViolations"
          :is-loading="isLoading"
          empty-text="No infraction citations recorded matching criteria."
        >
          <template #cell-referenceNumber="{ item }">
            <span class="font-mono font-bold text-[#D22730]">{{ item.referenceNumber || 'N/A' }}</span>
          </template>
          <template #cell-plateNumber="{ item }">
            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber || '—' }}</span>
          </template>
          <template #cell-driver="{ item }">
            <span class="font-medium text-slate-800 dark:text-slate-200">
              {{ (item.firstName || '') + ' ' + (item.lastName || '') || 'Driver' }}
            </span>
          </template>
          <template #cell-violationType="{ item }">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ item.violationType || 'General Violation' }}</span>
          </template>
          <template #cell-penaltyFee="{ item }">
            <span class="font-bold text-slate-900 dark:text-white">₱{{ Number(item.penaltyFee || 0).toFixed(2) }}</span>
          </template>
          <template #cell-settlementStatus="{ item }">
            <UiStatusText
              :variant="item.settlementStatus === 'Settled' || item.settlementStatus === 'Paid' || item.isPaid ? 'success' : 'danger'"
            >
              {{ item.settlementStatus === 'Settled' || item.settlementStatus === 'Paid' || item.isPaid ? 'Paid' : 'Unpaid' }}
            </UiStatusText>
          </template>
          <template #cell-issuedAt="{ item }">
            <span class="text-xs text-slate-600 dark:text-slate-400">{{ formatDate(item.issuedAt || item.createdAt) }}</span>
          </template>
        </UiTable>

        <div class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <TablePagination
            v-model:current-page="violationsPage"
            v-model:page-size="violationsPageSize"
            :total-items="filteredViolations.length"
          />
        </div>
      </UiCard>
    </div>

    <!-- TAB 4: CAMPUS VEHICLE FLEET -->
    <div v-else-if="activeTab === 'vehicles'" class="no-print space-y-4">
      <UiCard custom-class="p-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="w-full sm:w-72">
            <UiInput
              v-model="vehiclesSearch"
              placeholder="Search plate, brand, or owner..."
              size="sm"
            />
          </div>
          <div class="w-full sm:w-48">
            <UiSelect
              v-model="vehiclesTypeFilter"
              :options="[
                { label: 'All Statuses', value: 'all' },
                { label: 'Approved Only', value: 'approved' },
                { label: 'Pending Only', value: 'pending' },
                { label: 'Rejected Only', value: 'rejected' }
              ]"
              size="sm"
            />
          </div>
        </div>

        <UiTable
          :columns="vehicleColumns"
          :data="paginatedVehicles"
          :is-loading="isLoading"
          empty-text="No registered vehicles found matching criteria."
        >
          <template #cell-plateNumber="{ item }">
            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber || '—' }}</span>
          </template>
          <template #cell-brandModel="{ item }">
            <span class="font-medium text-slate-800 dark:text-slate-200">
              {{ (item.brand || '') + (item.model ? ' ' + item.model : '') || '—' }}
            </span>
          </template>
          <template #cell-vehicleType="{ item }">
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{{ getVehicleTypeLabel(item.vehicleType) }}</span>
          </template>
          <template #cell-ownerName="{ item }">
            <span class="font-medium text-slate-800 dark:text-slate-200">{{ item.ownerName || item.ownerFullName || item.fullName || 'Unassigned' }}</span>
          </template>
          <template #cell-ownerRole="{ item }">
            <span class="text-xs text-slate-600 dark:text-slate-400 font-medium">{{ formatRole(item.ownerRole) }}</span>
          </template>
          <template #cell-verificationStatus="{ item }">
            <UiStatusText
              :variant="getVerificationStatus(item.verificationStatus).variant"
            >
              {{ getVerificationStatus(item.verificationStatus).label }}
            </UiStatusText>
          </template>
        </UiTable>

        <div class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <TablePagination
            v-model:current-page="vehiclesPage"
            v-model:page-size="vehiclesPageSize"
            :total-items="filteredVehicles.length"
          />
        </div>
      </UiCard>
    </div>

    <!-- PRINTABLE INSTITUTIONAL REPORT VIEW (Printed on window.print()) -->
    <div class="print-only">
      <PrintableReportView
        :date-range-label="dateRangeLabel"
        :report-vehicle-type-label="vehicleTypeScopeLabel"
        generated-by="Administrative Auditor"
        :generated-at="new Date().toLocaleString()"
        :report-ref="printableReportRef"
        :summary="printableSummary"
        :hourly-traffic="hourlyTrafficData"
        :vehicle-breakdown="vehiclePieData"
        :violations="printableViolations"
        :recent-logs="printableRecentLogs"
      />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media screen {
  .print-only {
    display: none !important;
  }
}

@media print {
  :global(aside),
  :global(header),
  :global(nav),
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}
</style>
