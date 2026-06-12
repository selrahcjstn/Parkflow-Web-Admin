export interface Violation {
  violationId: string
  referenceNumber: string
  violationType: string
  penaltyFee: number
  settlementStatus: 'Paid' | 'Unpaid'
  isPaid: boolean
  firstName: string
  lastName: string
  middleName?: string
  roleName: string
  plateNumber: string
  brand: string
  vehicleType: string
  entryTime: string
  exitTime?: string
  issuedAt: string
}
