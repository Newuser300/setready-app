'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'sr-availability-reminder-dismissed-at';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const AVAILABILITY_PATH = '/availability';

export default function AvailabilityReminder() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  // Start hidden (matches server render to avoid hydration mismatch), then
  // decide on the client whether it's due.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const last = raw ? parseInt(raw, 10) : 0;
      if (!last || Number.isNaN(last) || Date.now() - last >= THIRTY_DAYS_MS) {
        setShow(true);
      }
    } catch {
      // localStorage unavailable (e.g. private mode) — just don't show.
    }
  }, []);

  function snooze() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setShow(false);
  }

  function goUpdate() {
    snooze();
    router.push(AVAILABILITY_PATH);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="availability-reminder-title"
      onClick={snooze}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px 24px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center', position: 'relative' }}
      >
        <button
          onClick={snooze}
          aria-label="Close"
          style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', fontSize: '22px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1, padding: 0 }}
        >
          ×
        </button>

        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
        <h2 id="availability-reminder-title" style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>
          Time to update your availability
        </h2>
        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6, margin: '0 0 22px' }}>
          Keeping your calendar current helps casting directors and agents know when you're free to work. Take a moment to review it.
        </p>

        <button
          onClick={goUpdate}
          style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px' }}
        >
          Update my availability
        </button>
        <button
          onClick={snooze}
          style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
