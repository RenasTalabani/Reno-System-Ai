import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName?.charAt(0) ?? ''
  const last = lastName?.charAt(0) ?? ''
  return (first + last).toUpperCase() || '?'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}...`
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
    inactive: 'text-gray-500 bg-gray-50 dark:bg-gray-900 dark:text-gray-400',
    suspended: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
    pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400',
    trial: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  }
  return map[status] ?? 'text-gray-500 bg-gray-50'
}
