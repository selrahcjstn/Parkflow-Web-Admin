import api from '@/api/axios'

export interface ProfileInformation {
  fullName: string
  email: string
  phone: string
  avatarUrl: string
}

export interface AccountPreferences {
  emailNotifications: boolean
  securityAlerts: boolean
  productUpdates: boolean
  language: string
  timezone: string
  theme: string
}

export interface AccessSummary {
  role: string
  permissions: string[]
}

export interface AccountSettingsModel {
  profile: ProfileInformation
  preferences: AccountPreferences
  access: AccessSummary
}

export interface SecurityPayload {
  currentPassword: string
  newPassword: string
}

const STORAGE_KEYS = {
  name: 'parkflow_user_name',
  email: 'parkflow_user_email',
  phone: 'parkflow_user_phone',
  avatar: 'parkflow_user_avatar',
  role: 'parkflow_user_role',
  language: 'parkflow_settings_language',
  timezone: 'parkflow_settings_timezone',
  theme: 'parkflow_settings_theme',
  emailNotifications: 'parkflow_settings_email_notifications',
  securityAlerts: 'parkflow_settings_security_alerts',
  productUpdates: 'parkflow_settings_product_updates'
} as const

function getRolePermissions(role: string): string[] {
  const roleKey = role.toLowerCase().trim()
  if (roleKey === 'superadmin' || roleKey === 'super_admin') {
    return [
      'Full user management',
      'System customization controls',
      'Approval workflows and escalations',
      'Collections and violation management'
    ]
  }

  if (roleKey === 'guard') {
    return [
      'Gate session monitoring',
      'Parking entry and exit verification',
      'Incident logging and escalation'
    ]
  }

  return [
    'Dashboard and reports access',
    'User account administration',
    'Parking and reservation operations',
    'Feedback and notification management'
  ]
}

function readBoolean(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key)
  if (value === null) return fallback
  return value === 'true'
}

function loadFromLocalStorage(): AccountSettingsModel {
  const role = localStorage.getItem(STORAGE_KEYS.role) || 'Administrator'
  const email = localStorage.getItem(STORAGE_KEYS.email) || 'admin@parkflow.com'
  const fullName = localStorage.getItem(STORAGE_KEYS.name) || email.split('@')[0] || 'Admin User'

  return {
    profile: {
      fullName,
      email,
      phone: localStorage.getItem(STORAGE_KEYS.phone) || '',
      avatarUrl: localStorage.getItem(STORAGE_KEYS.avatar) || ''
    },
    preferences: {
      emailNotifications: readBoolean(STORAGE_KEYS.emailNotifications, true),
      securityAlerts: readBoolean(STORAGE_KEYS.securityAlerts, true),
      productUpdates: readBoolean(STORAGE_KEYS.productUpdates, false),
      language: localStorage.getItem(STORAGE_KEYS.language) || 'en',
      timezone: localStorage.getItem(STORAGE_KEYS.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      theme: localStorage.getItem(STORAGE_KEYS.theme) || 'system'
    },
    access: {
      role,
      permissions: getRolePermissions(role)
    }
  }
}

function persistLocal(settings: AccountSettingsModel) {
  localStorage.setItem(STORAGE_KEYS.name, settings.profile.fullName)
  localStorage.setItem(STORAGE_KEYS.email, settings.profile.email)
  localStorage.setItem(STORAGE_KEYS.phone, settings.profile.phone)
  localStorage.setItem(STORAGE_KEYS.avatar, settings.profile.avatarUrl)
  localStorage.setItem(STORAGE_KEYS.language, settings.preferences.language)
  localStorage.setItem(STORAGE_KEYS.timezone, settings.preferences.timezone)
  localStorage.setItem(STORAGE_KEYS.theme, settings.preferences.theme)
  localStorage.setItem(STORAGE_KEYS.emailNotifications, String(settings.preferences.emailNotifications))
  localStorage.setItem(STORAGE_KEYS.securityAlerts, String(settings.preferences.securityAlerts))
  localStorage.setItem(STORAGE_KEYS.productUpdates, String(settings.preferences.productUpdates))
}

export async function getAccountSettings(): Promise<AccountSettingsModel> {
  const fallback = loadFromLocalStorage()

  try {
    const response = await api.get('/account-settings/me')
    if (!response.data?.data) return fallback

    const data = response.data.data
    const role = data?.access?.role || fallback.access.role

    return {
      profile: {
        fullName: data?.profile?.fullName || fallback.profile.fullName,
        email: data?.profile?.email || fallback.profile.email,
        phone: data?.profile?.phone || fallback.profile.phone,
        avatarUrl: data?.profile?.avatarUrl || fallback.profile.avatarUrl
      },
      preferences: {
        emailNotifications: data?.preferences?.emailNotifications ?? fallback.preferences.emailNotifications,
        securityAlerts: data?.preferences?.securityAlerts ?? fallback.preferences.securityAlerts,
        productUpdates: data?.preferences?.productUpdates ?? fallback.preferences.productUpdates,
        language: data?.preferences?.language || fallback.preferences.language,
        timezone: data?.preferences?.timezone || fallback.preferences.timezone,
        theme: data?.preferences?.theme || fallback.preferences.theme
      },
      access: {
        role,
        permissions: Array.isArray(data?.access?.permissions) && data.access.permissions.length
          ? data.access.permissions
          : getRolePermissions(role)
      }
    }
  } catch {
    return fallback
  }
}

export async function updateAccountSettings(
  settings: AccountSettingsModel,
  securityPayload: SecurityPayload | null
): Promise<{ usedFallback: boolean; passwordSkipped: boolean }> {
  persistLocal(settings)

  try {
    await api.put('/account-settings/me', {
      profile: settings.profile,
      preferences: settings.preferences
    })

    if (securityPayload) {
      await api.put('/account-settings/me/password', securityPayload)
    }

    return { usedFallback: false, passwordSkipped: false }
  } catch {
    if (securityPayload) {
      return { usedFallback: true, passwordSkipped: true }
    }

    return { usedFallback: true, passwordSkipped: false }
  }
}
