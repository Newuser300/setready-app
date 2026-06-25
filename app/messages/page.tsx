'use client'

import { useEffect, useRef, useState } from 'react'
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
  is_archived: boolean
  action_url?: string
  action_label?: string
  related_id?: string
  created_at: string
  reply_count?: number
  is_reply?: boolean
  saved?: boolean
}

type WeatherResult = {
  tempMax: number
  tempMin: number
  precipProb: number
  windspeed: number
  advisory: string
  icon: string
  regionName: string
}

type BookingDetail = {
  shoot_date: string
  call_time: string | null
  location: string | null
  production_name: string
  role_type: string
  weather: WeatherResult | null
  forecastComingSoon: boolean
}

const TYPE_COLORS: Record<string, string> = {
  casting_request: '#3b82f6',
  booking_confirmed: '#22c55e',
  booking_rejected: '#ef4444',
  announcement: '#F59E0B',
  system_alert: '#8b5cf6',
  voucher_milestone: '#f59e0b',
  general: '#6b7280',
  roster_invite: '#06b6d4',
  roster_approved: '#22c55e',
  promo: '#ec4899',
}

const TYPE_LABELS: Record<string, string> = {
  casting_request: 'Casting',
  booking_confirmed: 'Confirmed',
  booking_rejected: 'Rejected',
  announcement: 'Announcement',
  system_alert: 'System',
  voucher_milestone: 'Milestone',
  general: 'General',
  roster_invite: 'Roster Invite',
  roster_approved: 'Roster',
  promo: 'Promo',
}

const SENDER_COLORS: Record<string, string> = {
  agent: '#F59E0B',
  casting_director: '#F59E0B',
  system: '#22c55e',
  admin: '#22c55e',
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
  { key: 'casting_request', label: '🎬 Casting' },
  { key: 'booking_confirmed', label: '📋 Bookings' },
  { key: 'agent', label: '🏢 From Agent' },
  { key: 'system_alert', label: '⚙️ System' },
]

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const [thread, setThread] = useState<Message[]>([])

  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const weatherCache = useRef<Map<string, BookingDetail>>(new Map())

  async function fetchMessages(tab: string) {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab === 'unread') params.set('unread', 'true')
    else if (tab === 'agent' || tab === 'casting_director' || tab === 'casting_request') {
      // Fetch all, filter client-side by sender_type
    } else if (tab) {
      params.set('type', tab)
    }

    const res = await fetch(`/api/messages?${params}`)
    if (res.ok) {
      const data = await res.json()
      let msgs: Message[] = data.messages || []
      if (tab === 'agent') msgs = msgs.filter(m => m.sender_type === 'agent')
      if (tab === 'casting_request') msgs = msgs.filter(m => m.message_type === 'casting_request' || m.sender_type === 'casting_director')
      setMessages(msgs)
      setUnreadCount(data.unread_count || 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchMessages(activeTab) }, [activeTab])

  async function markAsRead(message: Message) {
    if (message.is_read) return
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: message.id }),
    })
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, is_read: true } : m))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setMessages(prev => prev.map(m => ({ ...m, is_read: true })))
    setUnreadCount(0)
  }

  async function deleteMessage(messageId: string) {
    await fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setSelectedMessage(null)
  }

  async function toggleSave(message: Message) {
    const newSaved = !message.saved
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: newSaved ? 'save' : 'unsave', messageId: message.id }),
    })
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, saved: newSaved } : m))
    setSelectedMessage(prev => prev && prev.id === message.id ? { ...prev, saved: newSaved } : prev)
  }

  async function loadThread(messageId: string) {
    const res = await fetch(`/api/messages/thread?messageId=${messageId}`)
    if (res.ok) {
      const data = await res.json()
      setThread(data.thread || [])
    }
  }

  async function loadBookingDetail(requestId: string) {
    const cached = weatherCache.current.get(requestId)
    if (cached) { setBookingDetail(cached); return }

    setBookingLoading(true)
    setBookingDetail(null)
    try {
      const res = await fetch(`/api/performer/booking-weather?requestId=${requestId}`)
      if (res.ok) {
        const data: BookingDetail = await res.json()
        weatherCache.current.set(requestId, data)
        setBookingDetail(data)
      }
    } finally {
      setBookingLoading(false)
    }
  }

  function openMessage(message: Message) {
    setSelectedMessage(message)
    setReplyText('')
    setReplySuccess(false)
    setThread([])
    setBookingDetail(null)
    markAsRead(message)
    loadThread(message.id)
    if (message.message_type === 'booking_confirmed' && message.related_id) {
      loadBookingDetail(message.related_id)
    }
  }

  async function handleReply(message: Message) {
    if (!replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          parentMessageId: message.id,
          body: replyText,
          recipientType: message.sender_type,
          recipientId: message.sender_id,
        }),
      })
      if (res.ok) {
        setReplyText('')
        setReplySuccess(true)
        setTimeout(() => setReplySuccess(false), 3000)
        loadThread(message.id)
      }
    } finally {
      setSendingReply(false)
    }
  }

  const threadReplies = thread.filter(m => m.id !== selectedMessage?.id)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a' }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto', padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px' }}>
                ← Back
              </Link>
              <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'white' }}>
                📬 Messages
                {unreadCount > 0 && (
                  <span style={{ marginLeft: '10px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px' }}>
                    {unreadCount}
                  </span>
                )}
              </h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: '12px', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '1px' }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #F59E0B' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: activeTab === tab.key ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Message List ── */}
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '12px 12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📬</div>
            <p style={{ margin: 0 }}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.3 }}>📬</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>No messages yet</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', maxWidth: '300px', margin: '0 auto', lineHeight: '1.6' }}>
              Casting notifications, booking confirmations and announcements will appear here.
            </p>
          </div>
        ) : (
          <div>
            {messages.map(message => {
              const senderColor = SENDER_COLORS[message.sender_type] || '#9ca3af'
              const isAgent = message.sender_type === 'agent' || message.sender_type === 'casting_director'
              return (
                <div
                  key={message.id}
                  onClick={() => openMessage(message)}
                  style={{
                    backgroundColor: '#1e1e35',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: !message.is_read ? '4px solid #F59E0B' : '4px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#252540')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e1e35')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', backgroundColor: TYPE_COLORS[message.message_type] ? TYPE_COLORS[message.message_type] + '22' : 'rgba(107,114,128,0.2)', color: TYPE_COLORS[message.message_type] || '#9ca3af', border: `1px solid ${TYPE_COLORS[message.message_type] || '#6b7280'}44` }}>
                          {TYPE_LABELS[message.message_type] || message.message_type}
                        </span>
                        {message.priority === 'urgent' && (
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '999px', backgroundColor: 'rgba(220,38,38,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>🚨 URGENT</span>
                        )}
                        {message.priority === 'high' && (
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '999px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>⚡ IMPORTANT</span>
                        )}
                        {(message.reply_count ?? 0) > 0 && (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>💬 {message.reply_count}</span>
                        )}
                      </div>
                      <div style={{ fontWeight: !message.is_read ? '700' : '500', color: 'white', fontSize: '14px', marginBottom: '3px', lineHeight: '1.3' }}>
                        {message.subject}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px' }}>
                        {message.body.slice(0, 100)}{message.body.length > 100 ? '...' : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        From: <span style={{ color: isAgent ? '#F59E0B' : '#9ca3af', fontWeight: isAgent ? '600' : '400' }}>{message.sender_name}</span>
                        &nbsp;·&nbsp;{timeAgo(message.created_at)}
                      </div>
                    </div>
                    {!message.is_read && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0, marginTop: '6px' }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Message Detail Modal ── */}
      {selectedMessage && (
        <div
          onClick={() => setSelectedMessage(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#1e1e35', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '20px 20px 32px', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}
          >
            {/* Handle */}
            <div style={{ width: '40px', height: '4px', backgroundColor: '#3a3a4e', borderRadius: '2px', margin: '0 auto 20px' }} />

            {/* Type badge */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', backgroundColor: TYPE_COLORS[selectedMessage.message_type] ? TYPE_COLORS[selectedMessage.message_type] + '22' : 'rgba(107,114,128,0.2)', color: TYPE_COLORS[selectedMessage.message_type] || '#9ca3af', border: `1px solid ${TYPE_COLORS[selectedMessage.message_type] || '#6b7280'}44` }}>
                {TYPE_LABELS[selectedMessage.message_type] || selectedMessage.message_type}
              </span>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: '0 0 10px', lineHeight: '1.3', fontFamily: 'Georgia, serif' }}>
              {selectedMessage.subject}
            </h2>

            {/* Sender info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '10px 14px', backgroundColor: '#2a2a3e', borderRadius: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', color: '#F59E0B', flexShrink: 0 }}>
                {selectedMessage.sender_name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: SENDER_COLORS[selectedMessage.sender_type] || 'white' }}>{selectedMessage.sender_name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  {new Date(selectedMessage.created_at).toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
              {selectedMessage.body}
            </div>

            {/* ── Weather + Commute card (booking_confirmed only) ── */}
            {selectedMessage.message_type === 'booking_confirmed' && (
              <div style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
                {bookingLoading ? (
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>Loading shoot details…</div>
                ) : bookingDetail ? (
                  <>
                    {/* Shoot date + location header */}
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                      Shoot Day Info
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px', fontSize: '12px' }}>
                      <div style={{ color: '#9ca3af' }}>
                        <span style={{ color: '#6b7280' }}>Date </span>
                        {new Date(bookingDetail.shoot_date + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {bookingDetail.location && (
                        <div style={{ color: '#9ca3af' }}>
                          <span style={{ color: '#6b7280' }}>Location </span>
                          {bookingDetail.location}
                        </div>
                      )}
                    </div>

                    {/* Weather row */}
                    {bookingDetail.weather ? (
                      <div style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '20px' }}>{bookingDetail.weather.icon}</span>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: '600', flex: 1, minWidth: '140px' }}>
                          {bookingDetail.weather.advisory}
                        </span>
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          High {bookingDetail.weather.tempMax}° / Low {bookingDetail.weather.tempMin}°
                        </span>
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {bookingDetail.weather.precipProb}% rain
                        </span>
                      </div>
                    ) : bookingDetail.forecastComingSoon ? (
                      <div style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', fontSize: '12px', color: '#9ca3af' }}>
                        📅 Forecast available closer to the shoot date.
                      </div>
                    ) : null}

                  </>
                ) : null}
              </div>
            )}

            {/* Action button */}
            {selectedMessage.action_url && (
              <div style={{ marginBottom: '24px' }}>
                <Link
                  href={selectedMessage.action_url}
                  onClick={() => setSelectedMessage(null)}
                  style={{ display: 'inline-block', backgroundColor: '#F59E0B', color: '#1a1a2e', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}
                >
                  {selectedMessage.action_label || 'View Details'} →
                </Link>
              </div>
            )}

            {/* Save / Delete actions */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                onClick={() => toggleSave(selectedMessage)}
                style={{ flex: 1, padding: '10px', backgroundColor: selectedMessage.saved ? 'rgba(245,158,11,0.15)' : 'transparent', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
              >
                {selectedMessage.saved ? '★ Saved' : '☆ Save'}
              </button>
              <button
                onClick={() => { if (confirm('Delete this message?')) deleteMessage(selectedMessage.id) }}
                style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
              >
                🗑 Delete
              </button>
            </div>

            {/* Thread replies */}
            {threadReplies.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Conversation
                </div>
                {threadReplies.map(reply => (
                  <div key={reply.id} style={{ marginLeft: '16px', borderLeft: '3px solid #F59E0B', paddingLeft: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                      {reply.sender_name} · {timeAgo(reply.created_at)}
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                      {reply.body}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form — hidden for system/admin messages (one-way only) */}
            {selectedMessage.sender_type !== 'system' && selectedMessage.sender_type !== 'admin' && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reply to {selectedMessage.sender_name}:
              </label>
              {replySuccess && (
                <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', fontSize: '13px', color: '#22c55e', fontWeight: '600' }}>
                  ✓ Reply sent successfully!
                </div>
              )}
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                style={{ width: '100%', backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: 'white', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => handleReply(selectedMessage)}
                  disabled={!replyText.trim() || sendingReply}
                  style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '700', cursor: !replyText.trim() || sendingReply ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: !replyText.trim() || sendingReply ? 0.5 : 1 }}
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
                <button
                  onClick={() => setReplyText('')}
                  style={{ backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setSelectedMessage(null)}
                style={{ flex: 1, padding: '10px', backgroundColor: '#2a2a3e', color: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
              >
                ← Back to inbox
              </button>
              <button
                onClick={() => deleteMessage(selectedMessage.id)}
                style={{ padding: '10px 16px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
