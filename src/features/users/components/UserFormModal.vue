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
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click="emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">{{ userToEdit ? 'Edit User Account' : 'Register New User' }}</h3>
            <button class="close-btn" @click="emit('close')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit">
            <div class="modal-body">
              <!-- Basic Details -->
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">First Name</label>
                  <input id="firstName" v-model="form.firstName" type="text" required />
                </div>
                <div class="form-group">
                  <label for="middleName">Middle Name (Optional)</label>
                  <input id="middleName" v-model="form.middleName" type="text" placeholder="e.g. Santos" />
                </div>
                <div class="form-group">
                  <label for="lastName">Last Name</label>
                  <input id="lastName" v-model="form.lastName" type="text" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="email">Email Address</label>
                  <input id="email" v-model="form.email" type="email" required />
                </div>
                <div class="form-group">
                  <label for="phone">Phone Number</label>
                  <input id="phone" v-model="form.phoneNumber" type="text" placeholder="+639..." required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="role">User Role</label>
                  <select id="role" v-model="form.role" class="form-select">
                    <option value="Student">Student</option>
                    <option value="UniversityStaff">University Staff (Faculty)</option>
                    <option value="NonAcademicPersonnel">Non-Academic Personnel</option>
                    <option value="Guard">Security Guard</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div v-if="userToEdit" class="form-group">
                  <label for="status">Account Status</label>
                  <select id="status" v-model="form.status" class="form-select">
                    <option value="Active">Active</option>
                    <option value="PendingVerification">Pending Verification</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <!-- Password Override / Change Password Section (when editing) -->
              <template v-if="userToEdit">
                <div class="divider"></div>
                <div class="role-fields">
                  <h4 class="fields-title">Account Security</h4>
                  <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                      <label for="newPassword">New Password (Leave blank to keep current)</label>
                      <input
                        id="newPassword"
                        v-model="form.newPassword"
                        type="password"
                        placeholder="Enter new password to override..."
                        minlength="6"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Dynamic Role-Specific Fields -->
              <div class="divider"></div>

              <!-- Student Fields -->
              <div v-if="form.role === 'Student'" class="role-fields">
                <h4 class="fields-title">Student Credentials</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="studentNum">Client ID</label>
                    <input id="studentNum" v-model="form.studentNumber" type="text" placeholder="202X-XXXXX" required />
                  </div>
                  <div class="form-group">
                    <label for="course">Course</label>
                    <input id="course" v-model="form.course" type="text" placeholder="BSCS, BSIT, etc." required />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="section">Section (Letters Only)</label>
                    <input
                      id="section"
                      v-model="form.section"
                      type="text"
                      placeholder="A"
                      required
                      @input="form.section = form.section.replace(/[^a-zA-Z]/g, '').toUpperCase()"
                    />
                  </div>
                  <div class="form-group">
                    <label for="yearLvl">Year Level</label>
                    <select id="yearLvl" v-model.number="form.yearLevel" class="form-select">
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
              <div v-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'" class="role-fields">
                <h4 class="fields-title">Employee Details</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="idCard">Client ID</label>
                    <input id="idCard" v-model="form.idCardNumber" type="text" placeholder="EMP-XXXX" required />
                  </div>
                  <div class="form-group">
                    <label for="dept">Department</label>
                    <input id="dept" v-model="form.department" type="text" placeholder="Engineering, Registrar, etc." required />
                  </div>
                </div>
              </div>

              <!-- Guard Fields -->
              <div v-if="form.role === 'Guard'" class="role-fields">
                <h4 class="fields-title">Guard Assignment</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label for="gate">Assigned Gate Number</label>
                    <input id="gate" v-model.number="form.assignedGate" type="number" min="1" max="10" required />
                  </div>
                </div>
              </div>

              <!-- Admin Fields -->
              <div v-if="form.role === 'Admin'" class="role-fields">
                <h4 class="fields-title">Administrator System Key</h4>
                <div class="no-fields-needed">
                  System admin rights will be granted upon creation.
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button v-if="userToEdit" type="button" class="change-password-btn" @click="handleChangePassword">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Change Password Portal
              </button>
              <div class="footer-right">
                <button type="button" class="cancel-btn" @click="emit('close')">Cancel</button>
                <button type="submit" class="submit-btn">{{ userToEdit ? 'Save Changes' : 'Create Account' }}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card, 12px);
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-group input,
.form-select {
  padding: 10px 14px;
  border-radius: var(--radius-btn, 8px);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-select:focus {
  border-color: var(--color-primary, #d22730);
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 0;
}

.fields-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 12px 0;
}

.role-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-fields-needed {
  font-size: 13px;
  color: var(--color-muted);
  font-style: italic;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--color-surface);
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.change-password-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  padding: 8px 14px;
  border-radius: var(--radius-btn, 8px);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.change-password-btn:hover {
  background: rgba(245, 158, 11, 0.22);
}

.cancel-btn {
  padding: 10px 18px;
  border-radius: var(--radius-btn, 8px);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: var(--color-surface-muted);
}

.submit-btn {
  padding: 10px 20px;
  border-radius: var(--radius-btn, 8px);
  border: none;
  background: var(--color-primary, #d22730);
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.submit-btn:hover {
  background: #b91c1c;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
