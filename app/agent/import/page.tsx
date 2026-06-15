'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import Logo from '@/components/Logo'
import Link from 'next/link'

// ── SetReady field definitions ────────────────────────────────────────────────

const SR_FIELDS = [
  { value: '',               label: '— skip column —' },
  { value: 'first_name',    label: 'First Name' },
  { value: 'last_name',     label: 'Last Name' },
  { value: 'email',         label: 'Email *' },
  { value: 'phone',         label: 'Phone' },
  { value: 'gender',        label: 'Gender' },
  { value: 'date_of_birth', label: 'Date of Birth (YYYY-MM-DD)' },
  { value: 'height_cm',     label: 'Height (cm)' },
  { value: 'hair_color',    label: 'Hair Color' },
  { value: 'eye_color',     label: 'Eye Color' },
  { value: 'union_status',  label: 'Union Status' },
  { value: 'special_skills',label: 'Special Skills' },
]

const ALIASES: Record<string, string> = {
  firstname: 'first_name', 'first name': 'first_name',
  lastname: 'last_name', 'last name': 'last_name', surname: 'last_name', name: 'last_name',
  dob: 'date_of_birth', birth_date: 'date_of_birth', birthdate: 'date_of_birth', birthday: 'date_of_birth',
  height: 'height_cm', height_in_cm: 'height_cm',
  hair: 'hair_color',
  eyes: 'eye_color', eye: 'eye_color',
  union: 'union_status',
  skills: 'special_skills',
  mobile: 'phone', tel: 'phone', telephone: 'phone', cell: 'phone', cellphone: 'phone',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview' | 'results'

type Flag = { field: string; msg: string; level: 'error' | 'warn' }

type ImportResults = {
  imported: number
  invited: number
  skipped: number
  skippedRows: Array<{ email: string; reason: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function autoMap(headers: string[]): Record<string, string> {
  const srValues = new Set(SR_FIELDS.filter(f => f.value).map(f => f.value))
  const result: Record<string, string> = {}
  for (const h of headers) {
    const norm = h.toLowerCase().trim().replace(/\s+/g, '_')
    const norm2 = h.toLowerCase().trim().replace(/[\s_-]+/g, '')
    if (srValues.has(norm))         result[h] = norm
    else if (ALIASES[norm])         result[h] = ALIASES[norm]
    else if (ALIASES[norm2])        result[h] = ALIASES[norm2]
  }
  return result
}

function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Record<string, string>[] {
  return rows.map(row => {
    const out: Record<string, string> = {}
    for (const [col, field] of Object.entries(mapping)) {
      if (field && row[col] !== undefined) out[field] = row[col]
    }
    return out
  })
}

function validateRow(row: Record<string, string>): Flag[] {
  const flags: Flag[] = []
  if (!row.email?.trim()) {
    flags.push({ field: 'email', msg: 'Email required — row will be skipped', level: 'error' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    flags.push({ field: 'email', msg: 'Looks like an invalid email', level: 'warn' })
  }
  if (row.date_of_birth?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth.trim())) {
    flags.push({ field: 'date_of_birth', msg: 'Use YYYY-MM-DD format', level: 'warn' })
  }
  if (row.height_cm?.trim() && isNaN(Number(row.height_cm.trim()))) {
    flags.push({ field: 'height_cm', msg: 'Must be a number (e.g. 168)', level: 'warn' })
  }
  return flags
}

function downloadTemplate() {
  const header = 'first_name,last_name,email,phone,gender,date_of_birth,height_cm,hair_color,eye_color,union_status,special_skills'
  const example = 'Jane,Doe,jane@example.com,604-555-0100,female,1990-03-15,168,Brown,Blue,non-union,"Horseback riding"'
  const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'setready_roster_template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: '#1e1e35',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
}

const label: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  display: 'block',
}

const btnAmber: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#F59E0B',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnGhost: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState('')

  // ── CSV parsing ──────────────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setError('')
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        const headers = result.meta.fields || []
        const rows = result.data as Record<string, string>[]
        setRawHeaders(headers)
        setRawRows(rows)
        setMapping(autoMap(headers))
        setStep('mapping')
      },
      error(err) {
        setError('Failed to parse CSV: ' + err.message)
      },
    })
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  // ── Import submission ────────────────────────────────────────────────────────

  async function runImport() {
    const mappedRows = applyMapping(rawRows, mapping)
    const validRows = mappedRows.filter(r => r.email?.trim())
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/agent/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rows: validRows }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Import failed'); setImporting(false); return }
      setResults(data)
      setStep('results')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep('upload')
    setRawHeaders([])
    setRawRows([])
    setMapping({})
    setResults(null)
    setError('')
  }

  // ── Derived data (preview) ───────────────────────────────────────────────────

  const mappedPreview = applyMapping(rawRows.slice(0, 10), mapping)
  const allMapped = applyMapping(rawRows, mapping)
  const validCount = allMapped.filter(r => r.email?.trim()).length
  const errorCount = allMapped.filter(r => !r.email?.trim()).length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', fontFamily: '-apple-system, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size="md" darkBackground showText />
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Import Roster</span>
        </div>
        <Link href="/agent/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center' }}>
          {(['upload', 'mapping', 'preview', 'results'] as Step[]).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: step === s ? '#F59E0B' : ((['upload','mapping','preview','results'].indexOf(step) > i) ? '#22c55e' : 'rgba(255,255,255,0.1)'),
                color: step === s ? '#1a1a2e' : ((['upload','mapping','preview','results'].indexOf(step) > i) ? 'white' : '#6b7280'),
              }}>{i + 1}</div>
              <span style={{ fontSize: '12px', color: step === s ? '#F59E0B' : '#6b7280', fontWeight: step === s ? 700 : 400, display: i === 3 ? 'inline' : undefined }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {i < 3 && <div style={{ width: '24px', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#fca5a5', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* ── STEP: UPLOAD ──────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>Import Your Roster</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>
              Upload a CSV of your performers. Each person receives a private invite to claim their profile — nothing is visible until they confirm.
            </p>

            {/* Template download */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>📄 Download CSV Template</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Headers: first_name, last_name, email, phone, gender, date_of_birth, height_cm, hair_color, eye_color, union_status, special_skills
                </div>
              </div>
              <button onClick={downloadTemplate} style={{ ...btnGhost, whiteSpace: 'nowrap' }}>
                Download Template
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#F59E0B' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '12px',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragging ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📂</div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
                Drop your CSV here or click to browse
              </div>
              <div style={{ color: '#6b7280', fontSize: '13px' }}>.csv files only</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} style={{ display: 'none' }} />
          </>
        )}

        {/* ── STEP: MAPPING ────────────────────────────────────────────────── */}
        {step === 'mapping' && (
          <>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>Map Columns</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 24px' }}>
              {rawRows.length} rows detected. Exact-match columns are pre-mapped — adjust any that need changing.
            </p>

            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <span style={label}>CSV Column</span>
                <span style={label}>Sample Value</span>
                <span style={label}>Maps To</span>
              </div>
              {rawHeaders.map(h => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'white', fontFamily: 'monospace' }}>{h}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rawRows[0]?.[h] || '—'}
                  </span>
                  <select
                    value={mapping[h] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    style={{ backgroundColor: '#0f0f1a', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit' }}
                  >
                    {SR_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={reset} style={btnGhost}>Start Over</button>
              <button onClick={() => setStep('preview')} style={btnAmber}>Preview Import →</button>
            </div>
          </>
        )}

        {/* ── STEP: PREVIEW ────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>Preview</h1>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>
                ✓ {validCount} rows ready to import
              </div>
              {errorCount > 0 && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#fca5a5', fontWeight: 600 }}>
                  ✕ {errorCount} rows missing email — will be skipped
                </div>
              )}
              {rawRows.length > 10 && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#9ca3af' }}>
                  Showing first 10 of {rawRows.length} rows
                </div>
              )}
            </div>

            {/* Preview table */}
            <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {SR_FIELDS.filter(f => f.value && Object.values(mapping).includes(f.value)).map(f => (
                        <th key={f.value} style={{ padding: '10px 14px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {f.label.replace(' *', '')}
                        </th>
                      ))}
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedPreview.map((row, i) => {
                      const flags = validateRow(row)
                      const hasError = flags.some(f => f.level === 'error')
                      const hasWarn = flags.some(f => f.level === 'warn')
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: hasError ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                          {SR_FIELDS.filter(f => f.value && Object.values(mapping).includes(f.value)).map(f => (
                            <td key={f.value} style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row[f.value] || <span style={{ color: '#4b5563' }}>—</span>}
                            </td>
                          ))}
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            {flags.length === 0 ? (
                              <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>✓ Ready</span>
                            ) : flags.map((fl, fi) => (
                              <div key={fi} style={{ fontSize: '11px', color: fl.level === 'error' ? '#fca5a5' : '#fde68a', fontWeight: 600 }}>
                                {fl.level === 'error' ? '✕' : '⚠'} {fl.msg}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
              ⚠️ Each performer will receive an email invite. Their profile stays <strong style={{ color: 'white' }}>private</strong> until they claim it — nothing is shared with casting until they confirm.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep('mapping')} style={btnGhost}>← Back</button>
              <button
                onClick={runImport}
                disabled={importing || validCount === 0}
                style={{ ...btnAmber, opacity: (importing || validCount === 0) ? 0.6 : 1, cursor: (importing || validCount === 0) ? 'not-allowed' : 'pointer' }}
              >
                {importing ? 'Importing…' : `Import ${validCount} Performer${validCount !== 1 ? 's' : ''} & Send Invites`}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: RESULTS ─────────────────────────────────────────────────── */}
        {step === 'results' && results && (
          <>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 20px' }}>Import Complete</h1>

            {/* Summary tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ ...card, textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{results.imported}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', fontWeight: 600 }}>IMPORTED</div>
              </div>
              <div style={{ ...card, textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>{results.invited}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', fontWeight: 600 }}>INVITES SENT</div>
              </div>
              <div style={{ ...card, textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 900, color: results.skipped > 0 ? '#ef4444' : '#6b7280', lineHeight: 1 }}>{results.skipped}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', fontWeight: 600 }}>SKIPPED</div>
              </div>
            </div>

            {/* Skipped rows */}
            {results.skippedRows.length > 0 && (
              <div style={card}>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>Skipped Rows</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.skippedRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '12px' }}>{r.email}</td>
                        <td style={{ padding: '8px 12px', color: '#fca5a5', fontSize: '12px' }}>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={reset} style={btnGhost}>Import Another File</button>
              <Link href="/agent/dashboard" style={{ ...btnAmber, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Go to Dashboard →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
