<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { UserWithDetails, UserRole } from '../types'

const router = useRouter()

const props = defineProps<{
  isOpen: boolean
  userToEdit: UserWithDetails | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', form: any): void
}>()

const form = ref({
  id: '',
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  phoneNumber: '',
  role: 'Student' as UserRole,
  status: 'Active' as 'Active' | 'Suspended' | 'PendingVerification',
  newPassword: '',
  // Role specific
  studentNumber: '',
  course: '',
  section: '',
  yearLevel: 1,
  idCardNumber: '',
  department: '',
  assignedGate: 1
})

const resetForm = () => {
  form.value = {
    id: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    role: 'Student',
    status: 'Active',
    newPassword: '',
    studentNumber: '',
    course: '',
    section: '',
    yearLevel: 1,
    idCardNumber: '',
    department: '',
    assignedGate: 1
  }
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      if (props.userToEdit) {
        form.value = {
          id: props.userToEdit.id,
          firstName: props.userToEdit.firstName,
          lastName: props.userToEdit.lastName,
          middleName: props.userToEdit.middleName || '',
          email: props.userToEdit.email,
          phoneNumber: props.userToEdit.phoneNumber,
          role: props.userToEdit.role,
          status: props.userToEdit.status,
          newPassword: '',
          studentNumber: props.userToEdit.student?.studentNumber || '',
          course: props.userToEdit.student?.course || '',
          section: props.userToEdit.student?.section || '',
          yearLevel: props.userToEdit.student?.yearLevel || 1,
          idCardNumber: props.userToEdit.personnel?.idCardNumber || '',
          department: props.userToEdit.personnel?.department || '',
          assignedGate: props.userToEdit.guard?.assignedGate || 1
        }
      } else {
        resetForm()
      }
    }
  }
)

const handleChangePassword = () => {
  if (!props.userToEdit) return
  emit('close')
  router.push({
    path: '/users/change-password',
    query: {
      email: props.userToEdit.email,
      name: `${props.userToEdit.firstName} ${props.userToEdit.lastName}`,
      role: props.userToEdit.role
    }
  })
}

const handleSubmit = () => {
  emit('submit', { ...form.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')">
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ userToEdit ? 'Edit User Account' : 'Register New User' }}</h3>
            <button
              type="button"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="flex flex-col flex-1 overflow-hidden">
            <div class="p-6 overflow-y-auto space-y-4 flex-1">
              <!-- Basic Details -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label for="firstName" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">First Name <span class="text-red-500">*</span></label>
                  <input
                    id="firstName"
                    v-model="form.firstName"
                    type="text"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                </div>
                <div class="space-y-1.5">
                  <label for="middleName" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Middle Name</label>
                  <input
                    id="middleName"
                    v-model="form.middleName"
                    type="text"
                    placeholder="e.g. Santos"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>
                <div class="space-y-1.5">
                  <label for="lastName" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Last Name <span class="text-red-500">*</span></label>
                  <input
                    id="lastName"
                    v-model="form.lastName"
                    type="text"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label for="email" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address <span class="text-red-500">*</span></label>
                  <input
                    id="email"
                    v-model="form.email"
                    type="email"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                </div>
                <div class="space-y-1.5">
                  <label for="phone" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number <span class="text-red-500">*</span></label>
                  <input
                    id="phone"
                    v-model="form.phoneNumber"
                    type="text"
                    placeholder="+639..."
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label for="role" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">User Role</label>
                  <select
                    id="role"
                    v-model="form.role"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  >
                    <option value="Student">Student</option>
                    <option value="UniversityStaff">University Staff (Faculty)</option>
                    <option value="NonAcademicPersonnel">Non-Academic Personnel</option>
                    <option value="Guard">Security Guard</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div v-if="userToEdit" class="space-y-1.5">
                  <label for="status" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Account Status</label>
                  <select
                    id="status"
                    v-model="form.status"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  >
                    <option value="Active">Active</option>
                    <option value="PendingVerification">Pending Verification</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <!-- Password Override / Change Password Section (when editing) -->
              <template v-if="userToEdit">
                <div class="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                <div class="space-y-3">
                  <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Account Security</h4>
                  <div class="space-y-1.5">
                    <label for="newPassword" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">New Password (Leave blank to keep current)</label>
                    <input
                      id="newPassword"
                      v-model="form.newPassword"
                      type="password"
                      placeholder="Enter new password to override..."
                      minlength="6"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              </template>

              <!-- Dynamic Role-Specific Fields -->
              <div class="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

              <!-- Student Fields -->
              <div v-if="form.role === 'Student'" class="space-y-3">
                <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Student Credentials</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label for="studentNum" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client ID <span class="text-red-500">*</span></label>
                    <input
                      id="studentNum"
                      v-model="form.studentNumber"
                      type="text"
                      placeholder="202X-XXXXX"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      required
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label for="course" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Course <span class="text-red-500">*</span></label>
                    <input
                      id="course"
                      v-model="form.course"
                      type="text"
                      placeholder="BSCS, BSIT, etc."
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      required
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label for="section" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Section (Letters Only) <span class="text-red-500">*</span></label>
                    <input
                      id="section"
                      v-model="form.section"
                      type="text"
                      placeholder="A"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      required
                      @input="form.section = form.section.replace(/[^a-zA-Z]/g, '').toUpperCase()"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label for="yearLvl" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Year Level</label>
                    <select
                      id="yearLvl"
                      v-model.number="form.yearLevel"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    >
                      <option :value="7">Grade 7</option>
                      <option :value="8">Grade 8</option>
                      <option :value="9">Grade 9</option>
                      <option :value="10">Grade 10</option>
                      <option :value="11">Grade 11</option>
                      <option :value="12">Grade 12</option>
                      <option :value="1">1st Year</option>
                      <option :value="2">2nd Year</option>
                      <option :value="3">3rd Year</option>
                      <option :value="4">4th Year</option>
                      <option :value="5">5th Year+</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Staff/Faculty Fields -->
              <div v-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'" class="space-y-3">
                <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Employee Details</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label for="idCard" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client ID <span class="text-red-500">*</span></label>
                    <input
                      id="idCard"
                      v-model="form.idCardNumber"
                      type="text"
                      placeholder="EMP-XXXX"
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      required
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label for="dept" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Department <span class="text-red-500">*</span></label>
                    <input
                      id="dept"
                      v-model="form.department"
                      type="text"
                      placeholder="Engineering, Registrar, etc."
                      class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Guard Fields -->
              <div v-if="form.role === 'Guard'" class="space-y-3">
                <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Guard Assignment</h4>
                <div class="space-y-1.5">
                  <label for="gate" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Assigned Gate Number <span class="text-red-500">*</span></label>
                  <input
                    id="gate"
                    v-model.number="form.assignedGate"
                    type="number"
                    min="1"
                    max="10"
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              <!-- Admin Fields -->
              <div v-if="form.role === 'Admin'" class="space-y-3">
                <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Administrator System Key</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 italic">
                  System admin rights will be granted upon creation.
                </p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                v-if="userToEdit"
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold transition cursor-pointer"
                @click="handleChangePassword"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Change Password Portal
              </button>

              <div class="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition cursor-pointer"
                  @click="emit('close')"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  {{ userToEdit ? 'Save Changes' : 'Create Account' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
