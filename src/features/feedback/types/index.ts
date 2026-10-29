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
  
  // Admin Reply Fields
  adminReplyMessage?: string | null
  adminRepliedAt?: string | null
  hoursSinceSubmitted?: number

  createdAt: string
  updatedAt?: string | null
}
