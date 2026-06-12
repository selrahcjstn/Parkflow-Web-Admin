export interface ReportSummary {
  peakOccupancy: string
  avgDuration: string
  totalViolations: number
  totalRevenue: string
}

export interface AIInsight {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'success'
  confidence: number
}
