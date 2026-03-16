import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString) {
  if (!dateString) return ''
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  return format(date, 'dd MMM yyyy', { locale: es })
}

/**
 * Format a date string to relative time (e.g., "hace 2 días")
 */
export function formatRelativeDate(dateString) {
  if (!dateString) return ''
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  return formatDistanceToNow(date, { addSuffix: true, locale: es })
}

/**
 * Format currency value
 */
export function formatCurrency(value, currency = 'USD') {
  if (value == null) return ''
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Get initials from a full name
 */
export function getInitials(fullName) {
  if (!fullName) return '??'
  return fullName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Merge class names conditionally
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Generate WhatsApp link
 */
export function getWhatsAppLink(phone, message = '') {
  const cleanPhone = phone?.replace(/\D/g, '') || ''
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`
}

/**
 * Generate a WhatsApp greeting message for a prospect
 */
export function getWhatsAppGreeting(prospectName) {
  const firstName = prospectName?.split(' ')[0] || ''
  return `¡Hola ${firstName}! 👋 Soy del equipo de MAAT. ¿Cómo estás? Me gustaría platicar contigo sobre cómo podemos ayudarte a alcanzar tus objetivos profesionales.`
}

/**
 * Check if a date is overdue (past today)
 */
export function isOverdue(dateString) {
  if (!dateString) return false
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Truncate text to a max length
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? ''
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    ),
  ]

  const csvString = csvRows.join('\n')
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format a number with compact notation
 */
export function formatCompactNumber(value) {
  if (value == null) return '0'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}
