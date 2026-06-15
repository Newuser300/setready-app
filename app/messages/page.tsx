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
  is_archived: boolean
  action_url?: string
  action_label?: string
  created_at: string
  reply_count?: number
  is_reply?: boolean
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
  { key: 'booking_confirmed', label: 'Bookings' },
  { key: 'system_alert', label: 'System' },
]

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  // Reply state
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const [thread, setThread] = useState<Message[]>([])

  async function fetchMessages(tab: string) {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab === 'unread') params.set('unread', 'true')
    else if (tab) params.set('type', tab)

    const res = await fetch(`/api/messages?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages || [])
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

  async function loadThread(messageId: string) {
    const res = await fetch(`/api/messages/thread?messageId=${messageId}`)
    if (res.ok) {
      const data = await res.json()
      setThread(data.thread || [])
    }
  }

  function openMessage(message: Message) {
    setSelectedMessage(message)
    setReplyText('')
    setReplySuccess(false)
    setThread([])
    markAsRead(message)
    // Load thread if there are replies or if it's part of a thread
    loadThread(message.id)
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

  // Only show thread messages that aren't the parent itself
  const threadReplies = thread.filter(m => m.id !== selectedMessage?.id)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '0' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto', padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>
                ← Back
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
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: '12px', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '1px' }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #F59E0B' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: activeTab === tab.key ? '#F59E0B' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
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
              Casting notifications, booking confirmations and announcements will appear here.
            </p>
          </div>
        ) : (
          <div>
            {messages.map(message => (
              <div
                key={message.id}
                onClick={() => openMessage(message)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '8px',
                  borderLeft: !message.is_read ? '4px solid #F59E0B' : '4px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  opacity: message.is_read ? 0.85 : 1,
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', backgroundColor: TYPE_COLORS[message.message_type] || '#6b7280', color: 'white', marginBottom: '6px', display: 'inline-block' }}>
                      {TYPE_LABELS[message.message_type] || message.message_type}
                    </span>
                    {message.priority === 'urgent' && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dc2626', color: 'white' }}>🚨 URGENT</span>
                    )}
                    {message.priority === 'high' && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', backgroundColor: '#f59e0b', color: '#1a1a2e' }}>⚡ IMPORTANT</span>
                    )}
                    {(message.reply_count ?? 0) > 0 && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6b7280' }}>💬 {message.reply_count}</span>
                    )}
                    <div style={{ fontWeight: !message.is_read ? '700' : '500', color: '#1a1a2e', fontSize: '15px', marginBottom: '4px' }}>
                      {message.subject}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                      {message.body.slice(0, 100)}{message.body.length > 100 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                      From: {message.sender_name} · {timeAgo(message.created_at)}
                    </div>
                  </div>
                  {!message.is_read && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0, marginTop: '4px' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div
          onClick={() => setSelectedMessage(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
          >
            {/* Handle */}
            <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', margin: '0 auto 20px' }} />

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', backgroundColor: TYPE_COLORS[selectedMessage.message_type] || '#6b7280', color: 'white' }}>
                {TYPE_LABELS[selectedMessage.message_type] || selectedMessage.message_type}
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 8px', lineHeight: '1.3', fontFamily: 'Georgia, serif' }}>
              {selectedMessage.subject}
            </h2>

            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 24px' }}>
              From: <strong style={{ color: '#6b7280' }}>{selectedMessage.sender_name}</strong>
              &nbsp;·&nbsp;
              {new Date(selectedMessage.created_at).toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>

            <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
              {selectedMessage.body}
            </div>

            {selectedMessage.action_url && (
              <div style={{ marginBottom: '24px' }}>
                <Link
                  href={selectedMessage.action_url}
                  onClick={() => setSelectedMessage(null)}
                  style={{ display: 'inline-block', backgroundColor: '#F59E0B', color: '#1a1a2e', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}
                >
                  {selectedMessage.action_label || 'View Details'} →
                </Link>
              </div>
            )}

            {/* Thread replies */}
            {threadReplies.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Conversation
                </div>
                {threadReplies.map(reply => (
                  <div key={reply.id} style={{ marginLeft: '24px', borderLeft: '3px solid #F59E0B', paddingLeft: '16px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                      {reply.sender_name} · {timeAgo(reply.created_at)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                      {reply.body}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form — performers can reply but cannot compose new messages */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Reply to {selectedMessage.sender_name}:
              </label>
              {replySuccess && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>
                  ✓ Reply sent successfully!
                </div>
              )}
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={4}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => handleReply(selectedMessage)}
                  disabled={!replyText.trim() || sendingReply}
                  style={{ backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: !replyText.trim() || sendingReply ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: !replyText.trim() || sendingReply ? 0.5 : 1 }}
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
                <button
                  onClick={() => setReplyText('')}
                  style={{ backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #f3f4f6' }}>
              <button
                onClick={() => setSelectedMessage(null)}
                style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
              >
                ← Back to inbox
              </button>
              <button
                onClick={() => deleteMessage(selectedMessage.id)}
                style={{ padding: '10px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
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
