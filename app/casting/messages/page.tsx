'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Message = {
  id: string
  sender_name: string
  sender_type: string
  sender_id?: string
  recipient_type: string
  subject: string
  body: string
  message_type: string
  priority: string
  is_read: boolean
  action_url?: string
  action_label?: string
  created_at: string
  reply_count?: number
}

const TYPE_COLORS: Record<string, string> = {
  casting_request: '#3b82f6',
  booking_confirmed: '#22c55e',
  booking_rejected: '#ef4444',
  announcement: '#F59E0B',
  system_alert: '#8b5cf6',
  general: '#6b7280',
}

const TYPE_LABELS: Record<string, string> = {
  casting_request: 'Casting',
  booking_confirmed: 'Confirmed',
  booking_rejected: 'Rejected',
  announcement: 'Announcement',
  system_alert: 'System',
  general: 'General',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'casting_request', label: 'Casting' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'system_alert', label: 'System' },
]

export default function CastingMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  // Compose state
  const [canMessage, setCanMessage] = useState<boolean | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')
  const [composeResults, setComposeResults] = useState<any[]>([])
  const [composeSearching, setComposeSearching] = useState(false)
  const [composeRecipient, setComposeRecipient] = useState<any>(null)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeSent, setComposeSent] = useState(false)
  const [composeError, setComposeError] = useState('')

  // Reply state
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)

  async function fetchMessages(tab: string) {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab === 'unread') params.set('unread', 'true')
    else if (tab) params.set('type', tab)

    const res = await fetch(`/api/casting/messages?${params}`)
    if (res.status === 401) { setUnauthorized(true); setLoading(false); return }
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages || [])
      setUnreadCount(data.unread_count || 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages(activeTab)
    fetch('/api/casting/can-message')
      .then(r => r.ok ? r.json() : { canMessage: false })
      .then(d => setCanMessage(d.canMessage))
      .catch(() => setCanMessage(false))
  }, [activeTab])

  async function markAsRead(message: Message) {
    if (message.is_read) return
    await fetch('/api/casting/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: message.id }),
    })
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, is_read: true } : m))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function deleteMessage(messageId: string) {
    await fetch('/api/casting/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setSelectedMessage(null)
  }

  function openMessage(message: Message) {
    setSelectedMessage(message)
    setReplyText('')
    setReplySuccess(false)
    markAsRead(message)
  }

  async function handleReply(message: Message) {
    if (!replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/casting/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType: message.sender_type,
          recipientId: message.sender_id,
          subject: `Re: ${message.subject}`,
          messageBody: replyText,
        }),
      })
      if (res.ok) {
        setReplyText('')
        setReplySuccess(true)
        setTimeout(() => setReplySuccess(false), 3000)
      }
    } finally {
      setSendingReply(false)
    }
  }

  async function searchComposeRecipients() {
    if (!composeSearch.trim()) return
    setComposeSearching(true)
    setComposeResults([])
    try {
      // Search performers and agents
      const res = await fetch(`/api/casting/search-recipients?q=${encodeURIComponent(composeSearch)}`)
      if (res.ok) {
        const data = await res.json()
        setComposeResults(data.results || [])
      }
    } finally {
      setComposeSearching(false)
    }
  }

  async function sendCompose() {
    if (!composeSubject.trim() || !composeBody.trim()) return
    setComposeSending(true)
    setComposeError('')
    try {
      const res = await fetch('/api/casting/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType: composeRecipient?.type || 'all_performers',
          recipientId: composeRecipient?.id,
          recipientEmail: composeRecipient?.email,
          subject: composeSubject,
          messageBody: composeBody,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setComposeSent(true)
        setTimeout(() => {
          setShowCompose(false)
          setComposeSent(false)
          setComposeRecipient(null)
          setComposeSubject('')
          setComposeBody('')
          setComposeSearch('')
          setComposeResults([])
        }, 1500)
      } else {
        setComposeError(data.error || 'Failed to send message')
      }
    } finally {
      setComposeSending(false)
    }
  }

  if (unauthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>Session Expired</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Please log in again to view messages.</p>
          <Link href="/casting/login" style={{ padding: '10px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
            Log In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto', padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/casting/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>
                ← Dashboard
              </Link>
              <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                📬 Messages
                {unreadCount > 0 && (
                  <span style={{ marginLeft: '10px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontSize: '12px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px' }}>
                    {unreadCount}
                  </span>
                )}
              </h1>
            </div>
            {canMessage === true && (
              <button
                onClick={() => setShowCompose(true)}
                style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ✉️ New Message
              </button>
            )}
          </div>

          {canMessage === false && (
            <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              ⚠️ Messaging is currently restricted by the platform administrator. You can still reply to messages you receive.
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '1px' }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '600', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #F59E0B' : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === tab.key ? '#F59E0B' : 'rgba(255,255,255,0.6)', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📬</div>
            <p style={{ margin: 0 }}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.4 }}>📬</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>No messages yet</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', maxWidth: '300px', margin: '0 auto', lineHeight: '1.6' }}>
              Platform announcements and replies will appear here.
            </p>
          </div>
        ) : (
          <div>
            {messages.map(message => (
              <div
                key={message.id}
                onClick={() => openMessage(message)}
                style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', borderLeft: !message.is_read ? '4px solid #F59E0B' : '4px solid transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer', opacity: message.is_read ? 0.85 : 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', backgroundColor: TYPE_COLORS[message.message_type] || '#6b7280', color: 'white', marginBottom: '6px', display: 'inline-block' }}>
                      {TYPE_LABELS[message.message_type] || message.message_type}
                    </span>
                    <div style={{ fontWeight: !message.is_read ? '700' : '500', color: '#1a1a2e', fontSize: '15px', marginBottom: '4px' }}>{message.subject}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {message.body.slice(0, 100)}{message.body.length > 100 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>From: {message.sender_name} · {timeAgo(message.created_at)}</div>
                  </div>
                  {!message.is_read && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0, marginTop: '4px' }} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div onClick={() => setSelectedMessage(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', backgroundColor: TYPE_COLORS[selectedMessage.message_type] || '#6b7280', color: 'white' }}>
                {TYPE_LABELS[selectedMessage.message_type] || selectedMessage.message_type}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 8px', lineHeight: '1.3', fontFamily: 'Georgia, serif' }}>{selectedMessage.subject}</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 24px' }}>
              From: <strong style={{ color: '#6b7280' }}>{selectedMessage.sender_name}</strong>
              &nbsp;·&nbsp;
              {new Date(selectedMessage.created_at).toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>{selectedMessage.body}</div>
            {selectedMessage.action_url && (
              <div style={{ marginBottom: '24px' }}>
                <Link href={selectedMessage.action_url} onClick={() => setSelectedMessage(null)} style={{ display: 'inline-block', backgroundColor: '#F59E0B', color: '#1a1a2e', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
                  {selectedMessage.action_label || 'View Details'} →
                </Link>
              </div>
            )}

            {/* Reply form */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Reply to {selectedMessage.sender_name}:</label>
              {replySuccess && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>✓ Reply sent!</div>
              )}
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={4}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => handleReply(selectedMessage)} disabled={!replyText.trim() || sendingReply} style={{ backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', opacity: !replyText.trim() || sendingReply ? 0.5 : 1 }}>
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
                <button onClick={() => setReplyText('')} style={{ backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={() => setSelectedMessage(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>← Back to inbox</button>
              <button onClick={() => deleteMessage(selectedMessage.id)} style={{ padding: '10px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div onClick={() => setShowCompose(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>✉️ New Message</h2>
              <button onClick={() => setShowCompose(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {composeSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <p style={{ fontWeight: '700', color: '#166534', fontSize: '16px' }}>Message sent!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>To</label>
                  {composeRecipient ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '600' }}>{composeRecipient.name || composeRecipient.email}</span>
                      <span style={{ fontSize: '11px', color: '#93c5fd' }}>({composeRecipient.type})</span>
                      <button onClick={() => setComposeRecipient(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontWeight: '700' }}>×</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Broadcast options */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                          { type: 'all_performers', label: '👥 All Performers' },
                          { type: 'all_agents', label: '🏢 All Agents' },
                        ].map(opt => (
                          <button
                            key={opt.type}
                            onClick={() => setComposeRecipient({ type: opt.type, label: opt.label })}
                            style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={composeSearch}
                          onChange={e => setComposeSearch(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && searchComposeRecipients()}
                          placeholder="Or search a specific performer or agent..."
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }}
                        />
                        <button onClick={searchComposeRecipients} disabled={composeSearching} style={{ padding: '10px 16px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                          {composeSearching ? '...' : 'Search'}
                        </button>
                      </div>
                      {composeResults.length > 0 && (
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                          {composeResults.map((r: any) => (
                            <button key={r.id} onClick={() => { setComposeRecipient(r); setComposeResults([]); setComposeSearch('') }} style={{ width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: '#374151' }}>{r.name || r.email}</span>
                              <span style={{ fontSize: '11px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{r.type}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Subject</label>
                  <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Message subject..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Message</label>
                  <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message..." rows={6} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                {composeError && <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{composeError}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={sendCompose} disabled={!composeRecipient || !composeSubject.trim() || !composeBody.trim() || composeSending} style={{ flex: 1, padding: '12px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', opacity: (!composeRecipient || !composeSubject.trim() || !composeBody.trim() || composeSending) ? 0.5 : 1 }}>
                    {composeSending ? 'Sending...' : 'Send Message'}
                  </button>
                  <button onClick={() => setShowCompose(false)} style={{ padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
