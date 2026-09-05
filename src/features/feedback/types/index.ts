export type FeedbackStatus = 'Pending' | 'Reviewed' | 'Resolved'

export interface FeedbackItem {
  id: string
  userId: string
  fullName?: string
  userFullName?: string
  email?: string
  userEmail?: string
  userRole?: string
  rating: number
  category: string
  description?: string
  message?: string
  attachmentUrl?: string | null
  status: FeedbackStatus | number
  statusName?: FeedbackStatus
  adminNotes?: string | null
  
  // Admin Reply & Invoice Fields
  adminReplyMessage?: string | null
  adminRepliedAt?: string | null
  invoiceNumber?: string | null
  invoiceAmount?: number | null
  invoiceDescription?: string | null
  invoiceStatus?: string | null
  hoursSinceSubmitted?: number

  createdAt: string
  updatedAt?: string | null
}
