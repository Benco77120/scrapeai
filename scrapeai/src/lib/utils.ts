import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Result } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function truncate(str: string, length = 40): string {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '…' : str
}

// ── Export helpers ───────────────────────────────────────────

export function exportToCSV(results: Partial<Result>[], filename: string): void {
  const data = results.map(flattenResult)
  const csv = Papa.unparse(data)
  downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

export function exportToJSON(results: Partial<Result>[], filename: string): void {
  const data = results.map(flattenResult)
  const json = JSON.stringify(data, null, 2)
  downloadBlob(json, `${filename}.json`, 'application/json')
}

export function exportToXLSX(results: Partial<Result>[], filename: string): void {
  const data = results.map(flattenResult)
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Results')

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
    if (cell) {
      cell.s = { font: { bold: true }, fill: { fgColor: { rgb: '0D0D14' } } }
    }
  }

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function flattenResult(r: Partial<Result>): Record<string, unknown> {
  const { extra, ...rest } = r as Result & { extra?: Record<string, unknown> }
  return { ...rest, ...extra }
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ── Status helpers ───────────────────────────────────────────

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-lime-400'
    case 'running':   return 'text-accent'
    case 'pending':   return 'text-yellow-400'
    case 'failed':    return 'text-red-400'
    case 'cancelled': return 'text-ink-muted'
    default:          return 'text-ink-muted'
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'completed': return 'bg-lime/10 text-lime border-lime/20'
    case 'running':   return 'bg-accent/10 text-accent border-accent/20'
    case 'pending':   return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
    case 'failed':    return 'bg-red-400/10 text-red-400 border-red-400/20'
    default:          return 'bg-ink-faint/30 text-ink-muted border-ink-faint/20'
  }
}

// ── Polling utility ──────────────────────────────────────────
export async function poll<T>(
  fn: () => Promise<T>,
  isComplete: (result: T) => boolean,
  intervalMs = 3000,
  maxAttempts = 60
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fn()
    if (isComplete(result)) return result
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error('Polling timed out')
}
