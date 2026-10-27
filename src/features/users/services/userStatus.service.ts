import api from '@/api/axios'
import type { AccountStatus } from '../types'

export async function updateUserStatus(userId: string, status: AccountStatus): Promise<AccountStatus> {
  const response = await api.put(`/users/${userId}/status`, { status })
  const savedStatus = response.data?.data?.status
  if (!response.data?.isSuccess || !['Active', 'PendingVerification', 'Suspended'].includes(savedStatus)) {
    throw new Error(response.data?.message || 'Could not update account status.')
  }
  return savedStatus
}
