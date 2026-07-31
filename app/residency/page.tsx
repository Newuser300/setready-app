'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Copyright from '@/components/Copyright';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient()

// Rows left behind by the earlier version, which uploaded to Supabase Storage.
// Nothing new is ever written in this shape; the page only lists them so a
// performer can pull a copy down and clear it off the server.
type LegacyResidencyDoc = {
  id: string;
  document_type: string;
  document_label: string | null;
  file_url: string;
  filename: string | null;
  file_type: string | null;
  notes: string | null;
  created_at: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.heic,.pdf';
const MAX_EMAIL_FILES = 8;
// Vercel caps a serverless request body at 4.5MB, so the whole attachment set
// must fit inside that. Photos are downscaled below before they ever count
// toward this, which keeps a normal set of ID photos well under the ceiling.
const MAX_EMAIL_TOTAL = 4 * 1024 * 1024;
const COMPRESS_MAX_DIMENSION = 2000;
const COMPRESS_QUALITY = 0.82;

/**
 * Shrinks a photo in the browser before it is attached.
 *
 * A phone camera shot is often 4-6MB, which alone would blow the request
 * limit. Downscaling to 2000px on the long edge keeps every word on an ID or
 * a utility bill readable while bringing the file to a few hundred KB.
 * Anything that cannot be decoded (HEIC on some browsers, PDFs) is returned
 * untouched rather than rejected.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    // Already small enough and already a compact format — leave it alone.
    if (scale === 1 && file.size <= 1024 * 1024 && file.type === 'image/jpeg') {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(b => resolve(b), 'image/jpeg', COMPRESS_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeIcon(fileType: string | null): string {
  if (!fileType) return '📄';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  return '📋';
}

export default function ResidencyPage() {
  const router = useRouter();
  const emailFileInputRef = useRef<HTMLInputElement>(null);
  const emailCameraInputRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [legacyDocs, setLegacyDocs] = useState<LegacyResidencyDoc[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Email to production. The attachments are picked from the device and sent
  // straight through — they are never uploaded to storage or saved anywhere.
  const [productionEmail, setProductionEmail] = useState('');
  const [emailUserName, setEmailUserName] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailFiles, setEmailFiles] = useState<File[]>([]);
  const [emailSentTo, setEmailSentTo] = useState('');
  const [emailPreparing, setEmailPreparing] = useState(false);

  useEffect(() => { loadPage(); }, []);

  // Always fetch a current token from the shared supabase client.
  async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? accessToken;
  }

  async function loadPage() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.push('/auth/sign-in'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    setAccessToken(session?.access_token ?? '');

    const { data: profile } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle();

    const name = profile?.name || profile?.email?.split('@')[0] || '';
    setUserName(name);
    setEmailUserName(name);
    setEmailMessage(
      `Hi,\n\nPlease find my proof of residency documents attached as requested.\n\n${name ? name + '\n' : ''}UBCP/ACTRA Member`
    );

    await loadLegacyDocs(session?.access_token ?? '');
    setPageLoading(false);
  }

  /**
   * Lists documents still sitting in Supabase from the previous version.
   * Read-only: the page never adds to this, it only helps clear it out.
   */
  async function loadLegacyDocs(token: string) {
    if (!token) return;
    try {
      const res = await fetch('/api/residency', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setLegacyDocs(data.documents || []);
    } catch {
      // A failure here must not block the page — the local library is primary.
    }
  }

  /** Legacy only: opens a document still held in Supabase. */
  async function handleView(doc: LegacyResidencyDoc) {
    const toastId = toast.loading('Generating secure link...');
    try {
      const token = await getToken();
      const res = await fetch('/api/residency/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileUrl: doc.file_url }),
      });
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) { toast.error(data.error || 'Failed to generate link.'); return; }
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to open document.');
    }
  }

  /** Legacy only: deletes the Supabase copy left by the previous version. */
  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/residency?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Delete failed.'); return; }
      toast.success('Removed from our server.');
      setConfirmDeleteId(null);
      await loadLegacyDocs(token);
    } finally {
      setDeletingId(null);
    }
  }

  async function addEmailFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const kept: File[] = [];

    setEmailPreparing(true);
    try {
    for (const raw of incoming) {
      const file = await compressImage(raw);
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is larger than 10MB.`);
        continue;
      }
      const lower = file.name.toLowerCase();
      const isHeic = lower.endsWith('.heic') || lower.endsWith('.heif');
      if (!ACCEPTED_TYPES.includes(file.type) && !isHeic) {
        toast.error(`"${file.name}" is not a supported file type.`);
        continue;
      }
      kept.push(file);
    }
    if (kept.length === 0) return;

    setEmailFiles(prev => {
      const merged = [...prev];
      for (const f of kept) {
        if (!merged.some(m => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      if (merged.length > MAX_EMAIL_FILES) {
        toast.error(`You can send up to ${MAX_EMAIL_FILES} documents at a time.`);
        return merged.slice(0, MAX_EMAIL_FILES);
      }
      return merged;
    });
    setEmailSentTo('');
    } finally {
      setEmailPreparing(false);
    }
  }

  function removeEmailFile(index: number) {
    setEmailFiles(prev => prev.filter((_, i) => i !== index));
  }

  const emailTotalBytes = emailFiles.reduce((sum, f) => sum + f.size, 0);
  const emailAttachmentCount = emailFiles.length;

  /**
   * Sends the chosen files to the production as real email attachments.
   *
   * The files go from the device straight to the send endpoint, which holds
   * them in memory only for the length of the request. Nothing is written to
   * Supabase Storage, no database row is created, and no shareable link is
   * generated — so no copy of the document survives the send.
   */
  async function handleSendEmail() {
    if (!productionEmail.trim()) { toast.error('Please enter the production email address.'); return; }
    if (emailAttachmentCount === 0) { toast.error('Please attach at least one document.'); return; }
    if (emailAttachmentCount > MAX_EMAIL_FILES) {
      toast.error(`You can send up to ${MAX_EMAIL_FILES} documents at a time.`);
      return;
    }
    if (emailTotalBytes > MAX_EMAIL_TOTAL) {
      toast.error('Those documents are too large to send at once. Send them in two emails.');
      return;
    }

    setEmailLoading(true);
    setEmailSentTo('');
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('to', productionEmail.trim());
      form.append('senderName', emailUserName.trim());
      form.append('message', emailMessage.trim());
      emailFiles.forEach(f => form.append('files', f, f.name));

      const res = await fetch('/api/residency/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'The email could not be sent.');
        return;
      }

      setEmailSentTo(productionEmail.trim());
      setEmailFiles([]);
      if (emailFileInputRef.current) emailFileInputRef.current.value = '';
      if (emailCameraInputRef.current) emailCameraInputRef.current.value = '';
      toast.success(`Sent to ${productionEmail.trim()}.`);
    } catch {
      toast.error('The email could not be sent. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* ── Sticky Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Proof of Residency</h1>
              <p className="text-xs text-gray-500">Store and send documents for production</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Hero ── */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Send your proof of residency to production in seconds.
          </h2>
          <p className="text-gray-500">
            Straight from your phone, as email attachments. Nothing is stored.
          </p>
        </div>

        {/* ── Accepted Documents ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 text-lg">What Documents Are Accepted</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-6">

            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">
                Category A — Proof of Canadian Citizenship or Permanent Residency Status
              </p>
              <p className="text-xs font-semibold text-blue-600 mb-2">1 document required from this category</p>
              <p className="text-xs text-gray-500 mb-3">
                Productions require ONE document proving your Canadian citizenship or permanent residency
                status. This is required by UBCP/ACTRA under the BC Master Production Agreement.
              </p>
              <ul className="space-y-1.5">
                {['Passport', 'Birth Certificate', 'Certificate of Indian Status Card', 'Citizenship Card', 'Permanent Resident Card'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold shrink-0 mt-px">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-0.5">
                Category B — Proof of BC Residency
              </p>
              <p className="text-xs font-semibold text-purple-600 mb-2">1–2 documents may be required from this category</p>
              <p className="text-xs text-gray-500 mb-2">
                Productions may require documentation proving you are a BC resident, to support their
                provincial tax credit claims with the CRA. Some productions require one document,
                others require two.
              </p>
              <div className="mb-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-800">
                  <strong>💡 Pro Tip:</strong> Your BC Services Card (combined health card + driver's
                  licence) counts as TWO documents on its own.
                </p>
                <p className="text-xs text-purple-600 mt-0.5">Source: ACTRA National residency guidelines</p>
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 font-bold shrink-0 mt-px">✅</span>
                  <span>
                    Notice of Assessment (previous tax year)
                    <span className="block text-xs text-gray-500 italic">You may black out financial information</span>
                  </span>
                </li>
                {["BC Driver's Licence", 'BC Services Card'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold shrink-0 mt-px">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 font-bold shrink-0 mt-px">✅</span>
                  <span>
                    Two current utility bills (hydro or gas only — cell phone bills NOT accepted)
                    <span className="block text-xs text-gray-500 italic">Must show your name and address</span>
                  </span>
                </li>
                {['Property Tax Notice', 'Bank Statement showing BC address'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold shrink-0 mt-px">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Amber warning */}
          <div className="mx-6 mb-6 p-4 rounded-xl border border-amber-300" style={{ backgroundColor: '#FEF3C7' }}>
            <p className="text-sm font-bold text-amber-900 mb-1.5">⚠️ Important</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Productions must request these documents <strong>at time of booking</strong>. You have a
              minimum of <strong>2 business days</strong> to provide them. If you fail to provide
              documents by your call time on your first day, the producer may cancel your booking.
            </p>
            <p className="text-xs text-amber-700 mt-2 font-semibold">Source: UBCP/ACTRA BCMPA Agreement</p>
          </div>
        </div>

        {/* ── Email to Production ── */}
        {/*
          Attachments are chosen from the device and posted straight to
          /api/residency/send, which forwards them to the production and keeps
          nothing. No upload to storage, no saved record, no shareable link.
        */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' }}>
            <h2 className="font-extrabold text-gray-900 text-xl">📧 Email Documents to Production</h2>
            <p className="text-gray-900/80 font-semibold mt-1 text-sm">
              Two quick steps · sent in seconds · nothing stored
            </p>
          </div>
          <div className="p-6 space-y-6">

            {/* ── Step 1: attach ── */}
            <div className="rounded-2xl border-2 border-amber-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border-b border-amber-200">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-extrabold text-gray-900 shadow-sm shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}
                >
                  1
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">Attach your documents</p>
                  <p className="text-xs text-amber-700 mt-0.5">From this phone — or photograph them right now</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-white">
                <input
                  ref={emailFileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={e => addEmailFiles(e.target.files)}
                  className="hidden"
                />
                <input
                  ref={emailCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => addEmailFiles(e.target.files)}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => emailFileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 py-4 px-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 active:scale-[0.98] transition"
                  >
                    <span className="text-2xl">📎</span>
                    <span className="text-sm font-bold text-gray-900">Choose Files</span>
                    <span className="text-[11px] text-gray-500">JPG · PNG · HEIC · PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => emailCameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 py-4 px-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 active:scale-[0.98] transition"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="text-sm font-bold text-gray-900">Take Photo</span>
                    <span className="text-[11px] text-gray-500">Use your camera</span>
                  </button>
                </div>

                {emailFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Attached ({emailFiles.length})
                    </p>
                    {emailFiles.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 text-lg shrink-0 shadow-sm">
                          {fileTypeIcon(file.type)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-gray-800 truncate">{file.name}</span>
                          <span className="block text-xs text-gray-500">{humanSize(file.size)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEmailFile(i)}
                          aria-label={`Remove ${file.name}`}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
                  <span>💡</span>
                  <span>In your email or cloud storage? Save it to this phone first, then attach it here.</span>
                </p>
                {emailPreparing && (
                  <p className="text-xs text-amber-600 font-semibold mt-1.5">Preparing documents…</p>
                )}
                {emailAttachmentCount > MAX_EMAIL_FILES && (
                  <p className="text-xs text-red-600 font-semibold mt-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    Up to {MAX_EMAIL_FILES} documents per email — remove one before sending.
                  </p>
                )}
                {emailTotalBytes > MAX_EMAIL_TOTAL && (
                  <p className="text-xs text-red-600 font-semibold mt-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    Too large for one email — remove a document, or send two emails.
                  </p>
                )}
              </div>
            </div>

            {/* ── Step 2: destination ── */}
            <div className="rounded-2xl border-2 border-blue-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-50 border-b border-blue-200">
                <span className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-extrabold text-white shadow-sm shrink-0 bg-blue-600">
                  2
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">Send to the production</p>
                  <p className="text-xs text-blue-700 mt-0.5">Their casting email — it&rsquo;s on your call sheet</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-white">
                <input
                  type="email"
                  value={productionEmail}
                  onChange={e => { setProductionEmail(e.target.value); setEmailSentTo(''); }}
                  placeholder="casting@theproduction.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                  <span>📋</span>
                  <span>Not sure? Check your call sheet or ask your agent — it changes per production.</span>
                </p>
              </div>
            </div>

            {/* ── Optional extras, folded so the main path stays two steps ── */}
            <details className="group rounded-2xl border-2 border-gray-200 overflow-hidden">
              <summary className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 cursor-pointer select-none list-none hover:bg-gray-100 transition">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-base shrink-0">
                  ✏️
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-gray-800">Your name &amp; message</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Optional — a friendly note is pre-written for you</span>
                </span>
                <span className="text-gray-400 transition-transform group-open:rotate-90 text-lg">›</span>
              </summary>
              <div className="p-4 sm:p-5 bg-white border-t border-gray-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={emailUserName}
                    onChange={e => setEmailUserName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Message to production</label>
                  <textarea
                    value={emailMessage}
                    onChange={e => setEmailMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm resize-none transition"
                  />
                </div>
              </div>
            </details>

            {/* ── Send ── */}
            <div>
              <button
                onClick={handleSendEmail}
                disabled={
                  emailLoading ||
                  emailPreparing ||
                  !productionEmail.trim() ||
                  emailAttachmentCount === 0 ||
                  emailAttachmentCount > MAX_EMAIL_FILES ||
                  emailTotalBytes > MAX_EMAIL_TOTAL
                }
                className="w-full py-4 font-extrabold text-base rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none shadow-lg hover:shadow-xl hover:brightness-105 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: '#1F2937' }}
              >
                {emailLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : emailAttachmentCount > 0 ? (
                  `📧 Send ${emailAttachmentCount} Document${emailAttachmentCount !== 1 ? 's' : ''} to Production`
                ) : (
                  '📧 Send Documents to Production'
                )}
              </button>

              {/* Trust strip */}
              <div className="flex items-center justify-center gap-x-5 gap-y-1 flex-wrap mt-3 text-[11px] text-gray-500 font-medium">
                <span className="flex items-center gap-1"><span>📎</span> Real attachments</span>
                <span className="flex items-center gap-1"><span>🔒</span> No copy kept</span>
                <span className="flex items-center gap-1"><span>↩️</span> Replies come to you</span>
              </div>
            </div>

            {emailSentTo && (
              <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center shadow-sm">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 text-2xl mx-auto mb-2">
                  ✅
                </div>
                <p className="text-base font-extrabold text-green-900">Sent to {emailSentTo}</p>
                <p className="text-xs text-green-800 mt-1.5 leading-relaxed">
                  Your documents were delivered as attachments and nothing was kept.
                  The production replies straight to your inbox.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Legacy: documents still on our server from the previous version ── */}
        {legacyDocs.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-red-50 border-b border-red-200">
              <h2 className="font-extrabold text-red-900 text-lg">
                ⚠️ Stored on our server (old version)
              </h2>
              <p className="text-red-800 text-sm mt-1 leading-relaxed">
                An earlier version of this page uploaded documents to our server. These
                {legacyDocs.length === 1 ? ' is the one' : ' are the ones'} still there.
                Save a copy to your phone if you want it, then remove it from our server.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {legacyDocs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 flex-wrap"
                >
                  <span className="text-2xl">{fileTypeIcon(doc.file_type)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-800">{doc.document_type}</span>
                    {doc.document_label && (
                      <span className="block text-xs text-gray-500">{doc.document_label}</span>
                    )}
                  </span>
                  {confirmDeleteId === doc.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deletingId === doc.id ? '...' : 'Yes, remove'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(doc)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                      >
                        👁 View
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(doc.id)}
                        className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                      >
                        Remove from server
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Security Notice ── */}
        <div className="bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-white font-semibold text-base">
            🔒 Your documents never touch our servers.
          </p>
          <p className="text-gray-400 text-sm mt-1.5">
            Your documents stay in your phone&rsquo;s own files. They are attached to the email
            you send and passed straight to the production. BGReady never keeps a copy.
          </p>
        </div>

      </div>
      <Copyright />
    </div>
  );
}
