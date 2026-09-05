export type ReservationStatusType = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 0 | 1 | 2 | 3

export interface ParkingReservationItem {
  id: string
  userId: string
  userFullName: string
  userEmail: string
  referenceNumber: string
  reservationDate: string
  startTime: string
  endTime: string
  reason: string
  status: ReservationStatusType
  type?: 'Normal' | 'Special' | 0 | 1
  vehicleId?: string
  plateNumber?: string
  brand?: string
  adminNotes?: string
  approvedAt?: string
  approvedByAdminId?: string
  createdAt: string
}
