'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Copyright from '@/components/Copyright';

type PhotoMeta = {
  id: string;
  filename: string;
  photo_url: string; // storage path, not a URL
};

type Entry = {
  id: string;
  date: string;
  production_name?: string;
  production_type?: string;
  role_type?: string;
  location?: string;
  people_met?: string;
  lessons_learned?: string;
  memorable_moments?: string;
  rating?: number;
  created_at: string;
  photos: PhotoMeta[];
};

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  production_name: '',
  production_type: '',
  role_type: '',
  location: '',
  people_met: '',
  lessons_learned: '',
  memorable_moments: '',
  rating: 5,
};

function Stars({ rating, onClick }: { rating: number; onClick?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(r => (
        <span
          key={r}
          onClick={() => onClick?.(r)}
          className={`text-lg leading-none select-none ${onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${r <= rating ? 'text-amber-400' : 'text-gray-200'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function JournalPage() {
  const router = useRouter();
  const [token, setToken]     = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]   = useState('');

  // Photo state for existing entries
  const [signedUrls, setSignedUrls] = useState<Record<string, Record<string, string>>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<string | null>(null);
  const [uploadingEntry, setUploadingEntry] = useState<string | null>(null);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);

  // Lightbox: list of signed URLs + current index
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  // In-modal photo staging
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const journalCameraRef = useRef<HTMLInputElement>(null);
  const journalUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { createBrowserClient } = await import('@supabase/ssr')
      const browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user }, error } = await browserClient.auth.getUser()
      if (error || !user) { router.push('/auth/sign-in'); return }
      const { data: { session } } = await browserClient.auth.getSession()
      setToken(session?.access_token ?? null)
    })()
  }, [router]);

  const fetchEntries = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/journal', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) fetchEntries(); }, [token, fetchEntries]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')
        setLightbox(prev => prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev);
      if (e.key === 'ArrowRight')
        setLightbox(prev => prev && prev.index < prev.urls.length - 1 ? { ...prev, index: prev.index + 1 } : prev);
      if (e.key === 'Escape') setLightbox(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  async function loadSignedUrls(entryId: string, photos: PhotoMeta[]) {
    if (!token || photos.length === 0) return;
    if (signedUrls[entryId]) return;
    setLoadingPhotos(entryId);
    try {
      const res = await fetch(`/api/journal-photos/signed-url?entryId=${entryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: { id: string; signedUrl: string }[] = await res.json();
        const map: Record<string, string> = {};
        data.forEach(d => { if (d.signedUrl) map[d.id] = d.signedUrl; });
        setSignedUrls(prev => ({ ...prev, [entryId]: map }));
      }
    } finally {
      setLoadingPhotos(null);
    }
  }

  function toggleExpand(entry: Entry) {
    const next = expanded === entry.id ? null : entry.id;
    setExpanded(next);
    if (next && entry.photos.length > 0) loadSignedUrls(entry.id, entry.photos);
  }

  function openLightbox(entryId: string, photoId: string) {
    const urlMap = signedUrls[entryId];
    const entry = entries.find(e => e.id === entryId);
    if (!urlMap || !entry) return;
    const urls = entry.photos.map(p => urlMap[p.id]).filter(Boolean) as string[];
    const idx = entry.photos.findIndex(p => p.id === photoId);
    setLightbox({ urls, index: Math.max(0, idx) });
  }

  async function uploadPhoto(entryId: string, file: File) {
    if (!token) return;
    setUploadingEntry(entryId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entryId', entryId);
      const res = await fetch('/api/journal-photos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const newPhoto: PhotoMeta = await res.json();
        setEntries(prev => prev.map(e =>
          e.id === entryId ? { ...e, photos: [...e.photos, newPhoto] } : e
        ));
        setSignedUrls(prev => { const next = { ...prev }; delete next[entryId]; return next; });
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
          const updated = [...entry.photos, newPhoto];
          setTimeout(() => loadSignedUrls(entryId, updated), 100);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed. Please try again.');
      }
    } finally {
      setUploadingEntry(null);
    }
  }

  async function removePhoto(entryId: string, photoId: string) {
    if (!token || !confirm('Remove this photo?')) return;
    setRemovingPhoto(photoId);
    try {
      const res = await fetch(`/api/journal-photos?id=${photoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEntries(prev => prev.map(e =>
          e.id === entryId ? { ...e, photos: e.photos.filter(p => p.id !== photoId) } : e
        ));
        setSignedUrls(prev => {
          const next = { ...prev };
          if (next[entryId]) {
            const updated = { ...next[entryId] };
            delete updated[photoId];
            next[entryId] = updated;
          }
          return next;
        });
      } else {
        alert('Failed to remove photo.');
      }
    } finally {
      setRemovingPhoto(null);
    }
  }

  function addPendingPhoto(file: File) {
    const existingCount = editEntry ? editEntry.photos.length : 0;
    if (existingCount + pendingPhotos.length >= 5) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5 MB per photo.'); return; }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setPendingPhotos(prev => [...prev, file]);
    setPendingPreviews(prev => [...prev, preview]);
  }

  function handleJournalPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(addPendingPhoto);
    e.target.value = '';
  }

  function removePendingPhoto(index: number) {
    const url = pendingPreviews[index];
    if (url) URL.revokeObjectURL(url);
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function clearPendingPhotos() {
    pendingPreviews.forEach(p => { if (p) URL.revokeObjectURL(p); });
    setPendingPhotos([]);
    setPendingPreviews([]);
  }

  function openAdd() {
    setEditEntry(null);
    setForm(EMPTY_FORM);
    clearPendingPhotos();
    setShowModal(true);
  }

  function openEdit(e: Entry) {
    setEditEntry(e);
    setForm({
      date:               e.date,
      production_name:    e.production_name    ?? '',
      production_type:    e.production_type    ?? '',
      role_type:          e.role_type          ?? '',
      location:           e.location           ?? '',
      people_met:         e.people_met         ?? '',
      lessons_learned:    e.lessons_learned    ?? '',
      memorable_moments:  e.memorable_moments  ?? '',
      rating:             e.rating             ?? 5,
    });
    clearPendingPhotos();
    if (e.photos.length > 0 && token) loadSignedUrls(e.id, e.photos);
    setShowModal(true);
  }

  async function save() {
    if (!token || !form.date) return;
    setSaving(true);
    try {
      const method = editEntry ? 'PUT' : 'POST';
      const body   = editEntry ? { id: editEntry.id, ...form } : form;
      const res = await fetch('/api/journal', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const saved = await res.json();
      const entryId = editEntry ? editEntry.id : saved.id;

      // Upload staged photos
      let uploadErrors = 0;
      for (const file of pendingPhotos) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('entryId', entryId);
        const upRes = await fetch('/api/journal-photos', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!upRes.ok) uploadErrors++;
      }

      clearPendingPhotos();
      setShowModal(false);
      fetchEntries();
      if (uploadErrors > 0) alert(`Entry saved but ${uploadErrors} photo(s) failed to upload.`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!token || !confirm('Delete this journal entry?')) return;
    const res = await fetch(`/api/journal?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setEntries(prev => prev.filter(x => x.id !== id));
      if (expanded === id) setExpanded(null);
    }
  }

  function f(val: string | number, field: keyof typeof EMPTY_FORM) {
    setForm(p => ({ ...p, [field]: val }));
  }

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    if (q && !([e.production_name, e.location, e.people_met, e.role_type] as (string | undefined)[]).some(v => v?.toLowerCase().includes(q))) return false;
    if (fromDate && e.date < fromDate) return false;
    if (toDate   && e.date > toDate)   return false;
    return true;
  });

  const totalModalPhotos = (editEntry ? editEntry.photos.length : 0) + pendingPhotos.length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Always-mounted hidden inputs (must be outside all conditionals for mobile camera to work) ── */}
      <input
        ref={journalCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleJournalPhotoChange}
      />
      <input
        ref={journalUploadRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        style={{ display: 'none' }}
        onChange={handleJournalPhotoChange}
      />

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📔</span>
            <span className="font-bold text-gray-900">On-Set Journal</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAdd}
              className="px-4 py-1.5 bg-amber-500 text-black text-sm font-bold rounded-lg hover:bg-amber-400 transition"
            >
              + New Entry
            </button>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">← Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Search & filter */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by production, location, or people..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">From date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">To date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          {(search || fromDate || toDate) && (
            <button onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }} className="text-xs text-amber-600 hover:underline">Clear filters</button>
          )}
        </div>

        {/* Count */}
        {!loading && entries.length > 0 && (
          <p className="text-sm text-gray-400">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</p>
        )}

        {loading && (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <div className="text-4xl mb-3">📔</div>
            <p className="font-semibold text-gray-800 mb-1">Start your on-set journal</p>
            <p className="text-sm text-gray-400 mb-4">Log every shoot day — what you learned, who you met, and how it went.</p>
            <button onClick={openAdd} className="px-5 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition">
              + New Entry
            </button>
          </div>
        )}

        {!loading && entries.length > 0 && filtered.length === 0 && (
          <div className="text-center py-8 bg-white rounded-2xl border border-gray-200 text-gray-400 text-sm">
            No entries match your filters.
          </div>
        )}

        {/* Entries */}
        {filtered.map(entry => (
          <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleExpand(entry)}
              className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {entry.production_name || 'Untitled Production'}
                  </span>
                  {entry.role_type && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      {entry.role_type}
                    </span>
                  )}
                  {entry.photos.length > 0 && (
                    <span className="text-xs text-gray-400">📷 {entry.photos.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400">{entry.date}</span>
                  {entry.location && <span className="text-xs text-gray-400">📍 {entry.location}</span>}
                  {entry.rating && <Stars rating={entry.rating} />}
                </div>
              </div>
              <span className="text-gray-300 shrink-0 text-xs mt-0.5">{expanded === entry.id ? '▲' : '▼'}</span>
            </button>

            {expanded === entry.id && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                {entry.production_type && (
                  <p className="text-sm text-gray-500">
                    Production type: <span className="font-medium text-gray-700">{entry.production_type}</span>
                  </p>
                )}
                {entry.people_met && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">People Met</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.people_met}</p>
                  </div>
                )}
                {entry.lessons_learned && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Lessons Learned</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.lessons_learned}</p>
                  </div>
                )}
                {entry.memorable_moments && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Memorable Moments</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.memorable_moments}</p>
                  </div>
                )}

                {/* ── PHOTOS SECTION ── */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Photos</p>

                  {loadingPhotos === entry.id && (
                    <p className="text-xs text-gray-400 animate-pulse">Loading photos…</p>
                  )}

                  {entry.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {entry.photos.map(photo => {
                        const url = signedUrls[entry.id]?.[photo.id];
                        return (
                          <div key={photo.id} className="relative group">
                            {url ? (
                              <button
                                onClick={() => openLightbox(entry.id, photo.id)}
                                className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-400 transition"
                              >
                                <img
                                  src={url}
                                  alt={photo.filename}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-xl">📷</span>
                              </div>
                            )}
                            <button
                              onClick={() => removePhoto(entry.id, photo.id)}
                              disabled={removingPhoto === photo.id}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600 disabled:opacity-50"
                              title="Remove photo"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {entry.photos.length < 5 && (
                    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                      uploadingEntry === entry.id
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                    }`}>
                      {uploadingEntry === entry.id ? (
                        <span className="animate-pulse">Uploading…</span>
                      ) : (
                        <>📷 Add Photo ({entry.photos.length}/5)</>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.heic,.heif"
                        disabled={uploadingEntry === entry.id}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadPhoto(entry.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {entry.photos.length >= 5 && (
                    <p className="text-xs text-gray-400">Maximum 5 photos reached.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(entry)}
                    className="px-4 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="px-4 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setLightbox(null)}
        >
          {/* Prev */}
          {lightbox.urls.length > 1 && lightbox.index > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : null); }}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'white', fontSize: '3rem', lineHeight: 1, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
            >
              ‹
            </button>
          )}

          <img
            src={lightbox.urls[lightbox.index]}
            alt="Journal photo"
            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          {lightbox.urls.length > 1 && lightbox.index < lightbox.urls.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : null); }}
              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'white', fontSize: '3rem', lineHeight: 1, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
            >
              ›
            </button>
          )}

          {/* Counter */}
          {lightbox.urls.length > 1 && (
            <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', color: 'white', fontSize: '0.875rem', background: 'rgba(0,0,0,0.55)', padding: '0.25rem 0.875rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
              {lightbox.index + 1} of {lightbox.urls.length}
            </div>
          )}

          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'white', fontSize: '2rem', lineHeight: 1, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>
      )}

      <Copyright />

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50,
            overflowY: 'auto', display: 'flex', alignItems: 'flex-start',
            justifyContent: 'center', padding: '2rem 1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) { clearPendingPhotos(); setShowModal(false); } }}
        >
          <div style={{
            background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '540px',
            padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editEntry ? 'Edit Entry' : 'New Entry'}
              </h2>
              <button onClick={() => { clearPendingPhotos(); setShowModal(false); }} className="text-gray-400 hover:text-gray-900 text-2xl font-bold leading-none">×</button>
            </div>

            <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => f(e.target.value, 'date')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Rating</label>
                  <Stars rating={form.rating} onClick={r => f(r, 'rating')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Production Name</label>
                <input
                  value={form.production_name}
                  onChange={e => f(e.target.value, 'production_name')}
                  placeholder="e.g. The Rookie, Supernatural"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Production Type</label>
                  <select
                    value={form.production_type}
                    onChange={e => f(e.target.value, 'production_type')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select...</option>
                    {['TV Series', 'Film', 'Commercial', 'Music Video', 'Short Film', 'Web Series', 'Other'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Role Type</label>
                  <select
                    value={form.role_type}
                    onChange={e => f(e.target.value, 'role_type')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select...</option>
                    {['General Background', 'Stand-in', 'Special Ability', 'Photo Double', 'Featured Extra', 'Other'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={e => f(e.target.value, 'location')}
                  placeholder="e.g. Burnaby, BC"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">People Met</label>
                <textarea
                  value={form.people_met}
                  onChange={e => f(e.target.value, 'people_met')}
                  rows={2}
                  placeholder="Names, roles, contact info, agency..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Lessons Learned</label>
                <textarea
                  value={form.lessons_learned}
                  onChange={e => f(e.target.value, 'lessons_learned')}
                  rows={3}
                  placeholder="What did you observe or learn today?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Memorable Moments</label>
                <textarea
                  value={form.memorable_moments}
                  onChange={e => f(e.target.value, 'memorable_moments')}
                  rows={3}
                  placeholder="What stood out? Anything surprising or exciting?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>

              {/* ── PHOTOS SECTION ── */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">📸 Photos (Optional)</label>
                  <span className="text-xs text-gray-400">{totalModalPhotos} of 5</span>
                </div>

                {/* Existing photos in edit mode */}
                {editEntry && editEntry.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editEntry.photos.map(photo => {
                      const url = signedUrls[editEntry.id]?.[photo.id];
                      return (
                        <div key={photo.id} className="relative group">
                          {url ? (
                            <img
                              src={url}
                              alt={photo.filename}
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <span className="text-lg">📷</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(editEntry.id, photo.id)}
                            disabled={removingPhoto === photo.id}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600 disabled:opacity-50"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Staged (pending) photos */}
                {pendingPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pendingPreviews.map((preview, i) => (
                      <div key={i} className="relative group">
                        {preview ? (
                          <img
                            src={preview}
                            alt={pendingPhotos[i].name}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-amber-300"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-amber-50 border-2 border-amber-300 flex flex-col items-center justify-center gap-0.5">
                            <span className="text-lg">📷</span>
                            <span className="text-[9px] text-gray-500 px-1 text-center leading-tight truncate w-full">{pendingPhotos[i].name.slice(0, 10)}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePendingPhoto(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add buttons */}
                {totalModalPhotos < 5 ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => journalCameraRef.current?.click()}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px',
                        minHeight: '48px',
                        backgroundColor: '#1a1a2e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    >
                      📷 Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => journalUploadRef.current?.click()}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px',
                        minHeight: '48px',
                        backgroundColor: 'transparent',
                        color: '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    >
                      📁 Upload Photo
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center">Maximum 5 photos reached.</p>
                )}

                {pendingPhotos.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5 text-center">
                    {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? 's' : ''} will upload when you save
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { clearPendingPhotos(); setShowModal(false); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.date}
                className="flex-1 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editEntry ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
