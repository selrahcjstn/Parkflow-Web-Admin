export type FeedbackStatus = 'Pending' | 'Reviewed' | 'Resolved'

export interface FeedbackItem {
  id: string
  userId: string
  userFullName: string
  userEmail: string
  userRole: string
  rating: number
  category: string
  message: string
  attachmentUrl?: string | null
  status: FeedbackStatus
  adminNotes?: string | null
  createdAt: string
  updatedAt?: string | null
}
