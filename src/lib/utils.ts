import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj)
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  
  return `MS-${year}${month}${day}-${random}`
}

export function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.random().toString().slice(2, 6)
  
  return `F-${year}${month}${day}${random}`
}

export function validateRFC(rfc: string): boolean {
  // RFC validation regex for Mexico
  const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/
  return rfcPattern.test(rfc.toUpperCase())
}

export function validateCURP(curp: string): boolean {
  // CURP validation regex for Mexico  
  const curpPattern = /^[A-Z]{4}\d{6}[HM][A-Z]{5}\d{2}$/
  return curpPattern.test(curp.toUpperCase())
}

export function calculateTax(amount: number, taxRate: number = 0.16): number {
  return Math.round((amount * taxRate) * 100) / 100
}

export function calculateTotal(subtotal: number, taxRate: number = 0.16): number {
  const tax = calculateTax(subtotal, taxRate)
  return Math.round((subtotal + tax) * 100) / 100
}

export function truncateText(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}