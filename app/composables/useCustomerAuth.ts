import { computed } from 'vue'
import {
  isValidEmail,
  isValidIndonesianWhatsapp,
  normalizeWhatsappNumber,
  type CustomerProfile,
} from '~/data/orders'

const CUSTOMERS_STORAGE_KEY = 'hallopedia:customers:v1'
const SESSION_CUSTOMER_ID_KEY = 'hallopedia:session-customer-id:v1'

export type AuthActionResult =
  | { ok: true; customer: CustomerProfile }
  | { ok: false; error: string }

function isValidCustomerProfile(value: unknown): value is CustomerProfile {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.fullName === 'string' &&
    typeof c.email === 'string' &&
    typeof c.whatsappNumber === 'string' &&
    typeof c.brandName === 'string' &&
    typeof c.createdAt === 'string'
  )
}

export function useCustomerAuth() {
  const customers = useState<CustomerProfile[]>('hallopedia:auth:customers', () => [])
  const currentCustomerId = useState<string | null>('hallopedia:auth:session-id', () => null)
  const isAuthHydrated = useState<boolean>('hallopedia:auth:hydrated', () => false)

  const currentCustomer = computed<CustomerProfile | null>(
    () => customers.value.find((c) => c.id === currentCustomerId.value) ?? null,
  )

  function persistState() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers.value))
      if (currentCustomerId.value) {
        window.localStorage.setItem(SESSION_CUSTOMER_ID_KEY, currentCustomerId.value)
      } else {
        window.localStorage.removeItem(SESSION_CUSTOMER_ID_KEY)
      }
    } catch {
      // Abaikan jika browser membatasi localStorage
    }
  }

  function hydrateAuth() {
    if (!import.meta.client || isAuthHydrated.value) return
    try {
      const rawCustomers = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY)
      if (rawCustomers) {
        const parsed: unknown = JSON.parse(rawCustomers)
        if (Array.isArray(parsed)) {
          customers.value = parsed.filter(isValidCustomerProfile)
        }
      }
      const savedSessionId = window.localStorage.getItem(SESSION_CUSTOMER_ID_KEY)
      if (savedSessionId && customers.value.some((c) => c.id === savedSessionId)) {
        currentCustomerId.value = savedSessionId
      }
    } catch {
      customers.value = []
      currentCustomerId.value = null
    } finally {
      isAuthHydrated.value = true
    }
  }

  function registerCustomer(payload: {
    fullName: string
    email: string
    whatsappNumber: string
    brandName: string
    secretInput: string
  }): AuthActionResult {
    hydrateAuth()
    const fullName = payload.fullName.trim()
    const email = payload.email.trim().toLowerCase()
    const brandName = payload.brandName.trim()

    if (fullName.length < 2) {
      return { ok: false, error: 'Nama lengkap minimal 2 karakter.' }
    }
    if (!isValidEmail(email)) {
      return { ok: false, error: 'Format alamat email tidak valid.' }
    }
    if (!isValidIndonesianWhatsapp(payload.whatsappNumber)) {
      return { ok: false, error: 'Nomor WhatsApp harus aktif di Indonesia (misal: 081234567890).' }
    }
    if (payload.secretInput.trim().length < 6) {
      return { ok: false, error: 'Kata sandi minimal 6 karakter.' }
    }

    const duplicate = customers.value.find((c) => c.email === email)
    if (duplicate) {
      return { ok: false, error: 'Email sudah terdaftar. Silakan masuk melalui halaman Login.' }
    }

    const created: CustomerProfile = {
      id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName,
      email,
      whatsappNumber: normalizeWhatsappNumber(payload.whatsappNumber),
      brandName: brandName || fullName,
      createdAt: new Date().toISOString(),
    }

    customers.value = [created, ...customers.value]
    currentCustomerId.value = created.id
    persistState()
    return { ok: true, customer: created }
  }

  function loginCustomer(payload: { email: string; secretInput: string }): AuthActionResult {
    hydrateAuth()
    const email = payload.email.trim().toLowerCase()
    if (!isValidEmail(email)) {
      return { ok: false, error: 'Masukkan alamat email yang valid.' }
    }
    if (payload.secretInput.trim().length < 6) {
      return { ok: false, error: 'Kata sandi minimal 6 karakter.' }
    }

    const matched = customers.value.find((c) => c.email === email)
    if (!matched) {
      return {
        ok: false,
        error: 'Akun email belum ditemukan di sesi browser ini. Silakan daftar akun baru atau pakai akun uji pratinjau.',
      }
    }

    currentCustomerId.value = matched.id
    persistState()
    return { ok: true, customer: matched }
  }

  function loginPreviewCustomer(): CustomerProfile {
    hydrateAuth()
    const previewEmail = 'pratinjau@borneorasa.id'
    let matched = customers.value.find((c) => c.email === previewEmail)
    if (!matched) {
      matched = {
        id: 'cust-preview-borneo',
        fullName: 'Raka Pratama',
        email: previewEmail,
        whatsappNumber: '081255008899',
        brandName: 'Borneo Rasa Culinary',
        createdAt: new Date().toISOString(),
      }
      customers.value = [matched, ...customers.value]
    }
    currentCustomerId.value = matched.id
    persistState()
    return matched
  }

  function logoutCustomer() {
    currentCustomerId.value = null
    persistState()
  }

  return {
    customers,
    currentCustomer,
    isAuthHydrated,
    hydrateAuth,
    registerCustomer,
    loginCustomer,
    loginPreviewCustomer,
    logoutCustomer,
  }
}

