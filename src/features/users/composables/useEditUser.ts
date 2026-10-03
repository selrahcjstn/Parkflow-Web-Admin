import { ref, computed, onMounted, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import { cachedUsers } from '@/stores/appCache'
import type { UserRole, AccountStatus } from '../types'
import {
  STUDENT_ID_REGEX,
  normalizeCourseName
} from '@/constants/courses'

export interface EditUserFormData {
  id: string
  firstName: string
  lastName: string
  middleName: string
  email: string
  phoneNumber: string
  role: UserRole
  status: 'Active' | 'Suspended' | 'PendingVerification'
  photoUrl: string
  // Role specific
  studentNumber: string
  course: string
  section: string
  yearLevel: number
  idCardNumber: string
  department: string
  assignedGate: number
  // Password change optional
  newPassword: string
  confirmPassword: string
}

export interface ToastNotification {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

export function useEditUser(userId: ComputedRef<string>) {
  const router = useRouter()

  const isLoading = ref(true)
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)
  const successToast = ref<string | null>(null)
  const toasts = ref<ToastNotification[]>([])
  let nextToastId = 1

  function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
    const id = nextToastId++
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 3500)
  }

  const fileInput = ref<HTMLInputElement | null>(null)
  const selectedPhotoFile = ref<File | null>(null)
  const isPhotoRemoved = ref(false)

  const form = ref<EditUserFormData>({
    id: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    role: 'Student' as UserRole,
    status: 'Active',
    photoUrl: '',
    studentNumber: '',
    course: '',
    section: '',
    yearLevel: 1,
    idCardNumber: '',
    department: '',
    assignedGate: 1,
    newPassword: '',
    confirmPassword: ''
  })

  const studentFieldErrors = ref({
    studentNumber: null as string | null,
    course: null as string | null,
    section: null as string | null
  })

  const showPasswordFields = ref(false)
  const showNewPassword = ref(false)
  const showConfirmPassword = ref(false)
  const isSendingTempPw = ref(false)
  const tempPwSuccessMessage = ref<string | null>(null)

  function getInitials(): string {
    const f = form.value.firstName?.charAt(0) || ''
    const l = form.value.lastName?.charAt(0) || ''
    if (f || l) return (f + l).toUpperCase()
    return (form.value.email?.slice(0, 2) || 'US').toUpperCase()
  }

  function triggerPhotoSelect() {
    fileInput.value?.click()
  }

  function handlePhotoChange(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      const file = target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        showToast('Photo size must be less than 5MB.', 'error')
        return
      }
      selectedPhotoFile.value = file
      isPhotoRemoved.value = false
      const reader = new FileReader()
      reader.onload = (e) => {
        form.value.photoUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  function removePhoto() {
    selectedPhotoFile.value = null
    isPhotoRemoved.value = true
    form.value.photoUrl = ''
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }

  function onStudentNumberInput(val: string | number) {
    const raw = String(val)
    const filtered = raw.replace(/[^\d-]/g, '').slice(0, 12)
    form.value.studentNumber = filtered
    if (studentFieldErrors.value.studentNumber) {
      studentFieldErrors.value.studentNumber = null
    }
  }

  function generateRandomTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let result = 'PF-'
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    result += '!9'
    return result
  }

  async function handleSendTempPassword() {
    if (!form.value.email) {
      showToast('User email address is required to dispatch a temporary password.', 'error')
      return
    }

    isSendingTempPw.value = true
    errorMessage.value = null
    tempPwSuccessMessage.value = null

    const tempPw = generateRandomTempPassword()

    try {
      const payload = {
        email: form.value.email,
        targetEmail: form.value.email,
        temporaryPassword: tempPw
      }

      const res = await api.post('/users/send-temp-password', payload)
      if (res.status === 200 || res.data?.isSuccess) {
        tempPwSuccessMessage.value = `Temporary password "${tempPw}" has been generated and emailed to ${form.value.email}. The user can use this to log in immediately.`
        showToast('Temporary password generated and emailed successfully.', 'success')
        showPasswordFields.value = true
        showNewPassword.value = true
        showConfirmPassword.value = true
        form.value.newPassword = tempPw
        form.value.confirmPassword = tempPw
      } else {
        showToast(res.data?.message || 'Failed to dispatch temporary password email.', 'error')
      }
    } catch (err: any) {
      console.error('Error sending temp password:', err)
      showToast(err.response?.data?.message || 'Failed to dispatch temporary password email. Please verify user email address and network.', 'error')
    } finally {
      isSendingTempPw.value = false
    }
  }

  function populateFormFromUser(u: any): boolean {
    if (!u) return false

    let fname = u.firstName || ''
    let lname = u.lastName || ''
    if (!fname && u.fullName) {
      const parts = String(u.fullName).trim().split(/\s+/)
      fname = parts[0] || ''
      lname = parts.slice(1).join(' ') || ''
    }

    form.value.id = String(u.id || userId.value)
    form.value.firstName = fname
    form.value.lastName = lname
    form.value.middleName = u.middleName || ''
    form.value.email = u.email || ''
    form.value.phoneNumber = u.phoneNumber || u.phone || ''
    form.value.role = u.role || 'Student'
    form.value.status = u.status || 'Active'
    form.value.photoUrl = u.profilePictureUrl || u.avatarUrl || u.photoUrl || ''

    if (u.student) {
      form.value.studentNumber = u.student.studentNumber || ''
      form.value.course = normalizeCourseName(u.student.course || '')
      form.value.section = u.student.section || ''
      form.value.yearLevel = Number(u.student.yearLevel) || 1
    }
    if (u.personnel) {
      form.value.idCardNumber = u.personnel.idCardNumber || ''
      form.value.department = u.personnel.department || ''
    }
    if (u.guard) {
      form.value.assignedGate = u.guard.assignedGate || 1
    }
    return true
  }

  async function loadUserData() {
    isLoading.value = true
    errorMessage.value = null

    // 1. Check history.state.user passed via router.push
    const stateUser = history.state?.user
    if (stateUser && populateFormFromUser(stateUser)) {
      isLoading.value = false
      return
    }

    // 2. Check cachedUsers in dashboardCache
    if (cachedUsers.value && cachedUsers.value.length > 0) {
      const target = cachedUsers.value.find((x: any) => String(x.id) === userId.value)
      if (target && populateFormFromUser(target)) {
        isLoading.value = false
        return
      }
    }

    // 3. API Request
    try {
      const response = await api.get(`/users/${userId.value}`)
      const u = response.data?.isSuccess && response.data?.data ? response.data.data : response.data
      if (u && populateFormFromUser(u)) {
        isLoading.value = false
        return
      }
    } catch (err: any) {
      console.error('Error fetching user for edit:', err)
      showToast('Failed to load user profile information.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  function goBack() {
    router.push('/users')
  }

  function syncToCachedUsers() {
    if (!cachedUsers.value) {
      cachedUsers.value = []
    }
    const full = `${form.value.firstName} ${form.value.lastName}`.trim()
    const targetId = userId.value
    const existingIdx = cachedUsers.value.findIndex((u: any) => String(u.id) === String(targetId))

    const updatedUserObj: any = {
      id: targetId,
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      middleName: form.value.middleName || '',
      fullName: full,
      email: form.value.email,
      phoneNumber: form.value.phoneNumber,
      phone: form.value.phoneNumber,
      role: form.value.role,
      status: form.value.status,
      profilePictureUrl: form.value.photoUrl || '',
      avatarUrl: form.value.photoUrl || '',
      corVerificationStatus: existingIdx !== -1 && cachedUsers.value[existingIdx]?.corVerificationStatus
        ? cachedUsers.value[existingIdx].corVerificationStatus
        : 'NotSubmitted',
      student: form.value.role === 'Student' ? {
        studentNumber: form.value.studentNumber.trim(),
        course: form.value.course.trim(),
        section: form.value.section.trim(),
        yearLevel: form.value.yearLevel
      } : null,
      personnel: (form.value.role === 'UniversityStaff' || form.value.role === 'NonAcademicPersonnel') ? {
        idCardNumber: form.value.idCardNumber,
        department: form.value.department
      } : null,
      guard: form.value.role === 'Guard' ? {
        assignedGate: form.value.assignedGate
      } : null
    }

    if (existingIdx !== -1) {
      cachedUsers.value[existingIdx] = {
        ...cachedUsers.value[existingIdx],
        ...updatedUserObj
      }
    } else {
      cachedUsers.value.push(updatedUserObj)
    }
  }

  const isConfirmModalOpen = ref(false)
  const hasPasswordChange = computed(() => Boolean(showPasswordFields.value && form.value.newPassword?.trim()))

  function validateForm(): boolean {
    studentFieldErrors.value = {
      studentNumber: null,
      course: null,
      section: null
    }

    if (!form.value.firstName || !form.value.lastName || !form.value.email) {
      showToast('Please fill out all required personal information fields.', 'error')
      return false
    }

    // Student specific validation
    if (form.value.role === 'Student') {
      const sNum = form.value.studentNumber.trim()
      if (!sNum) {
        studentFieldErrors.value.studentNumber = 'Student Number is required.'
        showToast('Student Number is required.', 'error')
        return false
      }
      if (!STUDENT_ID_REGEX.test(sNum)) {
        studentFieldErrors.value.studentNumber = 'Student Number must follow the official format (e.g. 2024-00001 or 7-10 digit student ID).'
        showToast('Student Number must follow the official format (e.g. 2024-00001 or 7-10 digit student ID).', 'error')
        return false
      }
      if (!form.value.course || !form.value.course.trim()) {
        studentFieldErrors.value.course = 'Please select a Course / Degree Program.'
        showToast('Please select a Course / Degree Program.', 'error')
        return false
      }
      if (!form.value.section || !form.value.section.trim()) {
        studentFieldErrors.value.section = 'Section is required (e.g. 3A).'
        showToast('Section is required (e.g. 3A).', 'error')
        return false
      }
    }

    if (showPasswordFields.value) {
      const newPw = form.value.newPassword ? form.value.newPassword.trim() : ''
      const confirmPw = form.value.confirmPassword ? form.value.confirmPassword.trim() : ''

      if (!newPw) {
        showToast('Please enter a new password (minimum 6 characters).', 'error')
        return false
      }
      if (newPw.length < 6) {
        showToast('New password must be at least 6 characters long.', 'error')
        return false
      }
      if (!confirmPw) {
        showToast('Please re-enter and confirm the new password.', 'error')
        return false
      }
      if (newPw !== confirmPw) {
        showToast('New password and confirmation password do not match.', 'error')
        return false
      }
    }

    errorMessage.value = null
    return true
  }

  function handleSubmit() {
    if (validateForm()) {
      isConfirmModalOpen.value = true
    }
  }

  function closeConfirmModal() {
    if (!isSubmitting.value) {
      isConfirmModalOpen.value = false
    }
  }

  async function confirmSubmit() {
    if (!validateForm()) {
      isConfirmModalOpen.value = false
      return
    }

    isSubmitting.value = true
    errorMessage.value = null
    successToast.value = null

    try {
      let finalPhotoUrl = form.value.photoUrl

      // If a new photo file was picked, upload it to Cloudinary first
      if (selectedPhotoFile.value) {
        const formData = new FormData()
        formData.append('File', selectedPhotoFile.value)
        formData.append('UserId', userId.value)
        const uploadRes = await api.post('/files/upload/profile-picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (uploadRes.data?.isSuccess && uploadRes.data?.data?.url) {
          finalPhotoUrl = uploadRes.data.data.url
          form.value.photoUrl = finalPhotoUrl
          selectedPhotoFile.value = null
        } else {
          throw new Error(uploadRes.data?.message || 'Failed to upload profile picture.')
        }
      } else if (isPhotoRemoved.value) {
        finalPhotoUrl = ''
      }

      const payload = {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        middleName: form.value.middleName || null,
        email: form.value.email,
        phoneNumber: form.value.phoneNumber,
        role: form.value.role,
        status: form.value.status,
        photoUrl: finalPhotoUrl || null,
        password: showPasswordFields.value && form.value.newPassword?.trim() ? form.value.newPassword.trim() : undefined,
        student: form.value.role === 'Student' ? {
          studentNumber: form.value.studentNumber.trim(),
          course: form.value.course.trim(),
          section: form.value.section.trim(),
          yearLevel: form.value.yearLevel
        } : null,
        personnel: (form.value.role === 'UniversityStaff' || form.value.role === 'NonAcademicPersonnel') ? {
          idCardNumber: form.value.idCardNumber,
          department: form.value.department
        } : null,
        guard: form.value.role === 'Guard' ? {
          assignedGate: form.value.assignedGate
        } : null
      }

      const res = await api.put(`/users/${userId.value}`, payload)
      if (res.status === 200 || res.data?.isSuccess) {
        isConfirmModalOpen.value = false
        syncToCachedUsers()
        showToast('User account profile updated successfully!', 'success')
        setTimeout(() => {
          router.push('/users')
        }, 1200)
      } else {
        isConfirmModalOpen.value = false
        showToast(res.data?.message || 'Failed to update user account profile.', 'error')
      }
    } catch (err: any) {
      console.error('Error updating user:', err)
      isConfirmModalOpen.value = false
      showToast(err.response?.data?.message || err.message || 'Failed to update user account profile. Please check your inputs and try again.', 'error')
    } finally {
      isSubmitting.value = false
    }
  }

  onMounted(loadUserData)

  return {
    form,
    isLoading,
    isSubmitting,
    isConfirmModalOpen,
    hasPasswordChange,
    errorMessage,
    successToast,
    toasts,
    showToast,
    fileInput,
    studentFieldErrors,
    showPasswordFields,
    showNewPassword,
    showConfirmPassword,
    isSendingTempPw,
    tempPwSuccessMessage,
    getInitials,
    triggerPhotoSelect,
    handlePhotoChange,
    removePhoto,
    onStudentNumberInput,
    handleSendTempPassword,
    handleSubmit,
    closeConfirmModal,
    confirmSubmit,
    goBack
  }
}
