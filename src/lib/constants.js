// ----- Colors -----
export const COLORS = {
  PRIMARY: '#39A1C9',
  ACCENT: '#EBA055',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  TEXT: '#333333',
  GRAY: '#6B7280',
  SUCCESS: '#7DCD93',
  WARNING: '#EBA055',
  ERROR: '#D76B6E',
  MINT: '#7DCD93',
  CORAL: '#D76B6E',
  MAUVE: '#89608E',
}

// ----- Roles -----
export const ROLES = {
  ADMIN: 'admin',
  ADVISOR: 'advisor',
}

// ----- Client Types -----
export const CLIENT_TYPES = {
  B2B: 'b2b',
  B2C: 'b2c',
}

// ----- Activity Types -----
export const ACTIVITY_TYPES = {
  CALL: 'call',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  MEETING: 'meeting',
  NOTE: 'note',
  STAGE_CHANGE: 'stage_change',
}

// ----- Lead Sources -----
export const LEAD_SOURCES = [
  'Sitio Web',
  'Referido',
  'LinkedIn',
  'Instagram',
  'Facebook',
  'Evento',
  'Cold Outreach',
  'Otro',
]

// ----- Company Sizes (B2B) -----
export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
]

// ----- Countries -----
export const COUNTRIES = [
  'México',
  'Colombia',
  'Argentina',
  'Chile',
  'Perú',
  'España',
  'Estados Unidos',
  'Otro',
]

// ----- Lead Score -----
export const MAX_LEAD_SCORE = 100
export const MIN_LEAD_SCORE = 0

// ----- Email Categories -----
export const EMAIL_CATEGORIES = {
  B2B: 'b2b',
  B2C: 'b2c',
  GENERAL: 'general',
}

// ----- Email Status -----
export const EMAIL_STATUS = {
  SENT: 'sent',
  FAILED: 'failed',
  BOUNCED: 'bounced',
}

// ----- Email Template Variables -----
export const EMAIL_VARIABLES = [
  { key: 'nombre', label: 'Nombre completo', field: 'full_name' },
  { key: 'empresa', label: 'Empresa', field: 'company_name' },
  { key: 'cargo', label: 'Cargo', field: 'job_title' },
  { key: 'ciudad', label: 'Ciudad', field: 'city' },
  { key: 'email', label: 'Email', field: 'email' },
  { key: 'telefono', label: 'Teléfono', field: 'phone' },
  { key: 'asesor', label: 'Nombre del asesor', field: '_advisor_name' },
  { key: 'fecha', label: 'Fecha actual', field: '_today' },
]
