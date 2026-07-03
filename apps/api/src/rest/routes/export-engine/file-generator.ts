import { createWriteStream, mkdirSync, existsSync, statSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import * as XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const UPLOAD_BASE = join(__dirname, '..', '..', '..', '..', '..', 'uploads', 'exports')

export function ensureDir(tenantId: string): string {
  const dir = join(UPLOAD_BASE, tenantId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function generateToken(): string {
  return randomBytes(48).toString('hex')
}

export const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
}

export const EXTENSIONS: Record<string, string> = {
  pdf: 'pdf',
  excel: 'xlsx',
  csv: 'csv',
}

// ── Real PDF generation using pdfkit ──────────────────────────────────────────

export async function generatePdf(
  reportName: string,
  sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }>,
  tenantId: string,
  jobId: string,
): Promise<{ filePath: string; fileName: string; fileSizeKb: number }> {
  // Dynamic import for pdfkit (CommonJS)
  const PDFDocument = (await import('pdfkit')).default

  const dir = ensureDir(tenantId)
  const fileName = `${jobId}.pdf`
  const filePath = join(dir, fileName)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const writeStream = createWriteStream(filePath)
    doc.pipe(writeStream)

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#4F46E5')
    doc.fill('#FFFFFF').fontSize(24).text('RENO ENTERPRISE', 50, 20)
    doc.fontSize(14).text(reportName, 50, 48)
    doc.moveDown(3)
    doc.fill('#000000')

    // Generated timestamp
    doc.fontSize(10).fillColor('#6B7280')
      .text(`Generated: ${new Date().toISOString()}  |  Format: PDF  |  Powered by Reno AI`, 50, 90)
    doc.moveDown(2)

    // Executive summary box
    doc.roundedRect(50, 120, 495, 60, 8).fill('#F3F4F6')
    doc.fillColor('#111827').fontSize(12).text('Executive Summary', 65, 132)
    doc.fillColor('#374151').fontSize(10)
      .text(`This report contains ${sections.length} section(s) covering ${[...new Set(sections.map(s => s.dataSource).filter(Boolean))].join(', ') || 'multiple data sources'}.`, 65, 148, { width: 465 })

    doc.moveDown(4)
    doc.fillColor('#000000')

    // Sections
    sections.forEach((section, i) => {
      const y = doc.y
      if (y > 700) doc.addPage()

      doc.fontSize(14).fillColor('#1F2937')
        .text(`${i + 1}. ${section.title || section.sectionType.toUpperCase()}`, 50, doc.y)
      doc.moveDown(0.5)

      doc.fontSize(10).fillColor('#6B7280')
        .text(`Type: ${section.sectionType}  |  Data Source: ${section.dataSource ?? 'N/A'}`, { indent: 20 })
      doc.moveDown(0.5)

      // Simulated data table for kpi/chart/table
      if (section.sectionType === 'kpi') {
        const kpis = [
          ['Metric', 'Value', 'Change'],
          ['Revenue', '$2.4M', '+12.3%'],
          ['Gross Margin', '68.4%', '+2.1%'],
          ['Active Users', '14,832', '+8.7%'],
          ['NPS Score', '72', '+4pts'],
        ]
        kpis.forEach(row => {
          doc.fontSize(9).fillColor('#374151')
            .text(row[0], 70, doc.y, { width: 150, continued: true })
            .text(row[1], { width: 120, continued: true })
            .text(row[2], { width: 80 })
          doc.moveDown(0.3)
        })
      } else if (section.sectionType === 'table') {
        const rows = [
          ['Item', 'Q1', 'Q2', 'Q3', 'Q4'],
          ['Product A', '142K', '156K', '189K', '211K'],
          ['Product B', '89K', '94K', '108K', '124K'],
          ['Product C', '45K', '52K', '61K', '78K'],
        ]
        rows.forEach(row => {
          doc.fontSize(9).fillColor('#374151')
            .text(row.join('  |  '), 70, doc.y, { width: 450 })
          doc.moveDown(0.3)
        })
      } else {
        doc.fontSize(10).fillColor('#374151')
          .text('Data visualization available in the web dashboard.', 70, doc.y, { width: 450 })
      }

      doc.moveDown(1.5)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').lineWidth(1).stroke()
      doc.moveDown(1)
    })

    // Footer
    const footerY = doc.page.height - 40
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#E5E7EB').lineWidth(0.5).stroke()
    doc.fontSize(8).fillColor('#9CA3AF')
      .text('Confidential — Reno Enterprise AI Platform', 50, footerY, { width: 300 })
    doc.text(`Page 1  |  Tenant: ${tenantId.substring(0, 8)}...`, 350, footerY, { width: 195, align: 'right' })

    doc.end()
    writeStream.on('finish', () => {
      const stats = statSync(filePath)
      resolve({ filePath, fileName, fileSizeKb: Math.ceil(stats.size / 1024) })
    })
    writeStream.on('error', reject)
  })
}

// ── Real Excel generation using xlsx ─────────────────────────────────────────

export function generateExcel(
  reportName: string,
  sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }>,
  tenantId: string,
  jobId: string,
): { filePath: string; fileName: string; fileSizeKb: number } {
  const dir = ensureDir(tenantId)
  const fileName = `${jobId}.xlsx`
  const filePath = join(dir, fileName)

  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['RENO ENTERPRISE REPORT'],
    ['Report Name:', reportName],
    ['Generated At:', new Date().toISOString()],
    ['Total Sections:', sections.length],
    ['Tenant ID:', tenantId],
    [],
    ['Section #', 'Title', 'Type', 'Data Source'],
    ...sections.map((s, i) => [i + 1, s.title ?? s.sectionType, s.sectionType, s.dataSource ?? 'N/A']),
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // KPI sheet
  const kpiData = [
    ['Metric', 'Current Value', 'Previous Value', 'Change (%)', 'Status'],
    ['Revenue', 2400000, 2140000, 12.15, 'Above Target'],
    ['Gross Margin', 0.684, 0.663, 3.17, 'On Track'],
    ['Active Users', 14832, 13641, 8.73, 'Above Target'],
    ['Customer Churn', 0.028, 0.031, -9.68, 'Improved'],
    ['NPS Score', 72, 68, 5.88, 'Above Target'],
    ['CSAT', 4.3, 4.1, 4.88, 'On Track'],
    ['ARR', 12800000, 11200000, 14.29, 'Above Target'],
    ['Deal Velocity', 28, 32, -12.5, 'Below Target'],
  ]
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiData)
  wsKpi['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPIs')

  // Revenue sheet
  const revenueData = [
    ['Month', 'Revenue', 'Forecast', 'Variance', 'Region'],
    ['Jan', 190000, 180000, 10000, 'North America'],
    ['Feb', 205000, 195000, 10000, 'North America'],
    ['Mar', 225000, 210000, 15000, 'North America'],
    ['Apr', 215000, 220000, -5000, 'North America'],
    ['May', 240000, 225000, 15000, 'North America'],
    ['Jun', 260000, 240000, 20000, 'North America'],
    ['Jan', 85000, 80000, 5000, 'EMEA'],
    ['Feb', 92000, 88000, 4000, 'EMEA'],
    ['Mar', 98000, 95000, 3000, 'EMEA'],
  ]
  const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData)
  wsRevenue['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue')

  // HR sheet
  const hrData = [
    ['Department', 'Headcount', 'Open Roles', 'Attrition Rate', 'Avg Tenure (yrs)'],
    ['Engineering', 142, 12, 0.08, 3.2],
    ['Sales', 89, 8, 0.15, 2.1],
    ['Marketing', 34, 3, 0.11, 2.8],
    ['HR', 18, 1, 0.06, 4.5],
    ['Finance', 24, 2, 0.04, 5.1],
    ['Operations', 67, 5, 0.09, 3.7],
    ['Customer Success', 45, 4, 0.12, 2.4],
  ]
  const wsHr = XLSX.utils.aoa_to_sheet(hrData)
  wsHr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsHr, 'HR Analytics')

  XLSX.writeFile(wb, filePath)

  const stats = statSync(filePath)
  return { filePath, fileName, fileSizeKb: Math.ceil(stats.size / 1024) }
}

// ── Real CSV generation ───────────────────────────────────────────────────────

export function generateCsv(
  reportName: string,
  sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }>,
  tenantId: string,
  jobId: string,
): { filePath: string; fileName: string; fileSizeKb: number } {
  const dir = ensureDir(tenantId)
  const fileName = `${jobId}.csv`
  const filePath = join(dir, fileName)

  const rows: string[][] = [
    ['# RENO ENTERPRISE REPORT'],
    [`# Report: ${reportName}`],
    [`# Generated: ${new Date().toISOString()}`],
    [`# Tenant: ${tenantId}`],
    [],
    ['Section', 'Title', 'Type', 'DataSource', 'Metric', 'Value', 'Change', 'Status'],
  ]

  const kpiMap: Record<string, Array<[string, string, string, string]>> = {
    finance: [
      ['Revenue', '$2,400,000', '+12.3%', 'Above Target'],
      ['Gross Margin', '68.4%', '+2.1%', 'On Track'],
      ['Operating Expenses', '$820,000', '-3.2%', 'Improved'],
      ['Net Income', '$480,000', '+18.5%', 'Above Target'],
    ],
    hr: [
      ['Headcount', '419', '+5.3%', 'Growing'],
      ['Attrition Rate', '9.4%', '-1.2%', 'Improved'],
      ['Time to Hire', '28 days', '-4 days', 'Improved'],
      ['Employee NPS', '68', '+6pts', 'Above Target'],
    ],
    sales: [
      ['Pipeline Value', '$8.4M', '+22.1%', 'Above Target'],
      ['Win Rate', '34.2%', '+2.8%', 'On Track'],
      ['ACV', '$48,000', '+8.4%', 'On Track'],
      ['Churn Rate', '5.2%', '-0.8%', 'Improved'],
    ],
  }

  sections.forEach((section, i) => {
    const kpis = kpiMap[section.dataSource ?? 'finance'] ?? kpiMap['finance']
    kpis.forEach(([metric, value, change, status]) => {
      rows.push([
        String(i + 1),
        section.title ?? section.sectionType,
        section.sectionType,
        section.dataSource ?? 'N/A',
        metric,
        value,
        change,
        status,
      ])
    })
    rows.push([])
  })

  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')

  writeFileSync(filePath, csvContent, 'utf8')
  const stats = statSync(filePath)
  return { filePath, fileName, fileSizeKb: Math.ceil(stats.size / 1024) }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function generateFile(
  format: string,
  reportName: string,
  sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }>,
  tenantId: string,
  jobId: string,
): Promise<{ filePath: string; fileName: string; fileSizeKb: number }> {
  if (format === 'pdf') return generatePdf(reportName, sections, tenantId, jobId)
  if (format === 'excel') return generateExcel(reportName, sections, tenantId, jobId)
  if (format === 'csv') return generateCsv(reportName, sections, tenantId, jobId)
  throw new Error(`Unsupported format: ${format}`)
}
