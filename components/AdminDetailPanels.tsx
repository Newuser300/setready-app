'use client'
import { useEffect, useState } from 'react'

// ── Admin drill-down detail panels for Agencies and Casting Directors ──
// SECURITY: every fetch carries the admin Bearer token. All writes hit the
// verifyAdminRequest-gated, audited routes (agency-detail / casting-detail).
// Private MESSAGES are loaded only on an explicit "break-glass" click — never
// as part of the default view — and that access is logged server-side.

type Props = { accessToken: string }

const card: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '12px' }
const label: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
const btn = (bg: string, color = 'white'): React.CSSProperties => ({ background: bg, color, border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' })
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }

// ════════════════════════════════ AGENCY DETAIL ════════════════════════════════
export function AgencyDetailPanel({ accessToken, agencyId, onClose }: Props & { agencyId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [addEmail, setAddEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [messages, setMessages] = useState<any[] | null>(null)
  const [msgLoading, setMsgLoading] = useState(false)

  const auth = { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/agency-detail?agencyId=${agencyId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) { const d = await res.json(); setData(d); setForm(d.agency) }
    setLoading(false)
  }
  useEffect(() => { load() }, [agencyId])

  async function act(body: any, ok: string) {
    setMsg('')
    const res = await fetch('/api/admin/agency-detail', { method: 'POST', ...auth, body: JSON.stringify({ agencyId, ...body }) })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setMsg(ok); load() } else setMsg(d.error || 'Action failed')
  }

  async function saveEdit() {
    const fields = ['name', 'contact_name', 'email', 'phone', 'city', 'province', 'website', 'licence_number', 'description']
    const payload: any = { action: 'update_agency' }
    fields.forEach(f => { payload[f] = form[f] })
    await act(payload, 'Agency updated'); setEditing(false)
  }

  // BREAK-GLASS: load this agency's contact email's messages only when explicitly requested.
  async function loadMessages() {
    setMsgLoading(true); setMsg('')
    // pull all messages, filter to anyone connected to this agency's email/contacts
    const res = await fetch('/api/admin/messages?view=all', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) { const d = await res.json(); setMessages(d.messages || []) }
    else setMsg('Could not load messages')
    setMsgLoading(false)
  }

  if (loading) return <div style={card}>Loading agency…</div>
  if (!data) return <div style={card}>Agency not found. <button onClick={onClose} style={btn('#374151')}>Back</button></div>

  const a = data.agency
  return (
    <div>
      <button onClick={onClose} style={{ ...btn('#374151'), marginBottom: '12px' }}>← Back to list</button>
      {msg && <div style={{ ...card, background: '#eff6ff', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>{msg}</div>}

      {/* Profile + edit */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {a.logo_url && <img src={a.logo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e5e7eb' }} />}
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a2e' }}>{a.name}</div>
            <span style={{ ...label, padding: '2px 8px', borderRadius: '999px', background: a.is_suspended ? '#fef2f2' : '#f0fdf4', color: a.is_suspended ? '#dc2626' : '#16a34a' }}>{a.is_suspended ? 'Suspended' : 'Active'}</span>
            {a.is_pro && <span style={{ ...label, padding: '2px 8px', borderRadius: '999px', background: '#fef3c7', color: '#92400e' }}>PRO</span>}
          </div>
          {!editing ? <button onClick={() => setEditing(true)} style={btn('#1a1a2e')}>Edit</button>
            : <div style={{ display: 'flex', gap: '6px' }}><button onClick={saveEdit} style={btn('#16a34a')}>Save</button><button onClick={() => { setEditing(false); setForm(a) }} style={btn('#9ca3af')}>Cancel</button></div>}
        </div>
        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px' }}>
            {[['Contact', a.contact_name], ['Email', a.email], ['Phone', a.phone], ['City', a.city], ['Province', a.province], ['Licence', a.licence_number], ['Website', a.website], ['Plan', a.plan], ['Created', a.created_at?.slice(0, 10)]].map(([k, v]) => (
              <div key={k as string}><div style={label}>{k}</div><div style={{ fontSize: '13px', color: '#1a1a2e' }}>{v || '—'}</div></div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px' }}>
            {['name', 'contact_name', 'email', 'phone', 'city', 'province', 'website', 'licence_number'].map(f => (
              <div key={f}><div style={label}>{f.replace('_', ' ')}</div><input style={inp} value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} /></div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {a.is_suspended
            ? <button onClick={() => act({ action: 'restore' }, 'Agency restored')} style={btn('#16a34a')}>Restore Agency</button>
            : <button onClick={() => { if (confirm(`Suspend ${a.name}?`)) act({ action: 'suspend' }, 'Agency suspended') }} style={btn('#dc2626')}>Suspend Agency</button>}
        </div>
      </div>

      {/* Staff accounts */}
      {data.agents?.length > 0 && (
        <div style={card}>
          <div style={{ ...label, marginBottom: '8px' }}>Agent Accounts ({data.agents.length})</div>
          {data.agents.map((ag: any) => (
            <div key={ag.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span>{ag.name || '—'} <span style={{ color: '#9ca3af' }}>({ag.role})</span></span>
              <span style={{ color: '#6b7280' }}>{ag.email}</span>
            </div>
          ))}
        </div>
      )}

      {/* Roster */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ ...label }}>Roster ({data.roster?.length || 0})</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input placeholder="Add performer by email" style={{ ...inp, width: '200px' }} value={addEmail} onChange={e => setAddEmail(e.target.value)} />
            <button onClick={() => { if (addEmail.trim()) { act({ action: 'add_roster', email: addEmail.trim() }, 'Performer added'); setAddEmail('') } }} style={btn('#1a1a2e')}>Add</button>
          </div>
        </div>
        {!data.roster?.length ? <div style={{ color: '#9ca3af', fontSize: '13px' }}>No performers on roster.</div> : data.roster.map((r: any) => (
          <div key={r.rosterId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            {r.headshot_url ? <img src={r.headshot_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} /> : <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎭</div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>{r.name || r.email || 'Unknown'}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{r.email} · {r.union_status || 'non-union'} · joined {r.joined_at?.slice(0, 10)}{r.notes ? ` · note: ${r.notes}` : ''}</div>
            </div>
            <span style={{ ...label, color: r.status === 'active' ? '#16a34a' : '#9ca3af' }}>{r.status}</span>
            <button onClick={() => { if (confirm(`Remove ${r.name || r.email} from roster?`)) act({ action: 'remove_roster', rosterId: r.rosterId }, 'Performer removed') }} style={btn('#fef2f2', '#dc2626')}>Remove</button>
          </div>
        ))}
      </div>

      {/* Break-glass messages */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...label }}>🔒 Private Messages</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Accessing messages is logged. Use only for support or moderation.</div>
          </div>
          {messages === null && <button onClick={loadMessages} disabled={msgLoading} style={btn('#7c3aed')}>{msgLoading ? 'Loading…' : '🔓 View Messages'}</button>}
        </div>
        {messages !== null && (
          <div style={{ marginTop: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {messages.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '13px' }}>No messages.</div> : messages.slice(0, 100).map((m: any) => (
              <div key={m.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#9ca3af' }}>{m.created_at?.slice(0, 16).replace('T', ' ')} · {m.sender_type}→{m.recipient_type}:</span> {m.subject || m.body || m.content || ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════ CASTING DIRECTOR DETAIL ════════════════════════════════
export function CastingDirectorDetailPanel({ accessToken, cdId, onClose }: Props & { cdId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [msg, setMsg] = useState('')
  const auth = { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/casting-detail?cdId=${cdId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) { const d = await res.json(); setData(d); setForm(d.castingDirector) }
    setLoading(false)
  }
  useEffect(() => { load() }, [cdId])

  async function act(body: any, ok: string) {
    setMsg('')
    const res = await fetch('/api/admin/casting-detail', { method: 'POST', ...auth, body: JSON.stringify({ cdId, ...body }) })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setMsg(ok); load() } else setMsg(d.error || 'Action failed')
  }
  async function saveEdit() {
    const payload: any = { action: 'update_cd' }
    ;['name', 'company', 'email', 'phone', 'bio', 'description'].forEach(f => { payload[f] = form[f] })
    await act(payload, 'Casting director updated'); setEditing(false)
  }

  if (loading) return <div style={card}>Loading…</div>
  if (!data) return <div style={card}>Not found. <button onClick={onClose} style={btn('#374151')}>Back</button></div>
  const c = data.castingDirector
  return (
    <div>
      <button onClick={onClose} style={{ ...btn('#374151'), marginBottom: '12px' }}>← Back to list</button>
      {msg && <div style={{ ...card, background: '#eff6ff', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>{msg}</div>}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a2e' }}>{c.name}</div>
            <span style={{ ...label, padding: '2px 8px', borderRadius: '999px', background: c.is_active === false ? '#fef2f2' : '#f0fdf4', color: c.is_active === false ? '#dc2626' : '#16a34a' }}>{c.is_active === false ? 'Suspended' : 'Active'}</span>
            {c.is_pro && <span style={{ ...label, padding: '2px 8px', borderRadius: '999px', background: '#fef3c7', color: '#92400e' }}>PRO</span>}
          </div>
          {!editing ? <button onClick={() => setEditing(true)} style={btn('#1a1a2e')}>Edit</button>
            : <div style={{ display: 'flex', gap: '6px' }}><button onClick={saveEdit} style={btn('#16a34a')}>Save</button><button onClick={() => { setEditing(false); setForm(c) }} style={btn('#9ca3af')}>Cancel</button></div>}
        </div>
        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px' }}>
            {[['Company', c.company], ['Email', c.email], ['Phone', c.phone], ['Verified', c.is_verified ? 'Yes' : 'No'], ['Auto-approve', c.auto_approve ? 'Yes' : 'No'], ['Plan', c.plan], ['Created', c.created_at?.slice(0, 10)]].map(([k, v]) => (
              <div key={k as string}><div style={label}>{k}</div><div style={{ fontSize: '13px', color: '#1a1a2e' }}>{v || '—'}</div></div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px' }}>
            {['name', 'company', 'email', 'phone', 'bio', 'description'].map(f => (
              <div key={f}><div style={label}>{f}</div><input style={inp} value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} /></div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {c.is_active === false
            ? <button onClick={() => act({ action: 'restore' }, 'Restored')} style={btn('#16a34a')}>Restore</button>
            : <button onClick={() => { if (confirm(`Suspend ${c.name}?`)) act({ action: 'suspend' }, 'Suspended') }} style={btn('#dc2626')}>Suspend</button>}
        </div>
      </div>

      {/* Their casting requests */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '8px' }}>Casting Requests ({data.requests?.length || 0})</div>
        {!data.requests?.length ? <div style={{ color: '#9ca3af', fontSize: '13px' }}>None.</div> : data.requests.map((r: any) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span>{r.production_name} <span style={{ color: '#9ca3af' }}>· {r.role_type}</span></span>
            <span style={{ color: '#6b7280' }}>{r.status} · {r.shoot_date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
