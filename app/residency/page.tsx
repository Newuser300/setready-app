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
          <div className="px-6 py-5 border-b border-amber-300" style={{ backgroundColor: '#F59E0B' }}>
            <h2 className="font-extrabold text-gray-900 text-xl">📧 Email Documents to Production</h2>
            <p className="text-gray-800 font-medium mt-0.5 text-sm">
              Attach from your phone — sent as real attachments, nothing stored
            </p>
          </div>
          <div className="p-6 space-y-5">

            {/* Production Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Production Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={productionEmail}
                onChange={e => { setProductionEmail(e.target.value); setEmailSentTo(''); }}
                placeholder="Enter production email address"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This changes per production — find it on your call sheet or ask your agent.
              </p>
            </div>

            {/* Your Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
              <input
                type="text"
                value={emailUserName}
                onChange={e => setEmailUserName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 text-sm"
              />
            </div>

            {/* Attach Documents */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Attach Documents <span className="text-red-500">*</span>
              </label>

              {/*
                BGReady holds no document library, so "Choose Files" can only
                show what is already on the device. Performers who keep their
                documents in email or cloud storage need to save them down
                first, and will otherwise find an empty file picker.
              */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  📥 Save your documents to this device first
                </p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  BGReady does not keep a copy of your documents, so it can only attach what is
                  already saved on this phone or computer. If yours are in your email, Google
                  Drive, iCloud, or Dropbox, download them to your device first — then they will
                  appear when you tap <strong>Choose Files</strong>.
                </p>
                <p className="text-sm text-amber-800 leading-relaxed mt-2">
                  Do not have a copy yet? Tap <strong>Take Photo</strong> to photograph the
                  document right now.
                </p>
              </div>

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
                  className="py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:border-amber-400 hover:bg-amber-50 transition"
                >
                  📎 Choose Files
                </button>
                <button
                  type="button"
                  onClick={() => emailCameraInputRef.current?.click()}
                  className="py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:border-amber-400 hover:bg-amber-50 transition"
                >
                  📷 Take Photo
                </button>
              </div>

              {emailFiles.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {emailFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-lg">{fileTypeIcon(file.type)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-800 truncate">{file.name}</span>
                        <span className="block text-xs text-gray-500">{humanSize(file.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEmailFile(i)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1.5">
                JPG, PNG, HEIC or PDF · {MAX_EMAIL_FILES} documents max · photos are
                automatically shrunk so they send reliably

              </p>
              {emailAttachmentCount > 0 && (
                <p className="text-xs font-semibold text-gray-700 mt-1">
                  {emailAttachmentCount} document{emailAttachmentCount !== 1 ? 's' : ''} will be attached
                  {emailTotalBytes > 0 ? ` · ${humanSize(emailTotalBytes)}` : ''}
                </p>
              )}
              {emailAttachmentCount > MAX_EMAIL_FILES && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  That is more than {MAX_EMAIL_FILES} documents — remove one before sending.
                </p>
              )}
              {emailPreparing && (
                <p className="text-xs text-gray-500 mt-1">Preparing documents...</p>
              )}
              {emailTotalBytes > MAX_EMAIL_TOTAL && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  These add up to more than {humanSize(MAX_EMAIL_TOTAL)} — remove one, or send
                  them in two emails.
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Message <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 text-sm font-mono resize-none"
              />
            </div>

            {/* How it works */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">How this works</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                Your documents are sent to the production as <strong>real email attachments</strong> —
                no links, nothing to expire, nothing for them to chase.
              </p>
              <p className="text-sm text-blue-800 leading-relaxed mt-2">
                <strong>Nothing is stored anywhere.</strong> Your documents stay in your own
                phone&rsquo;s files and go straight to the production — BGReady keeps no copy and
                creates no link. The production replies directly to your email address.
              </p>
            </div>

            {/* Send button */}
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
              className="w-full py-4 font-bold text-base rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              style={{ backgroundColor: '#F59E0B', color: '#1F2937' }}
            >
              {emailLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                '📧 Send Documents to Production'
              )}
            </button>

            {emailSentTo && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-green-900">✅ Sent to {emailSentTo}</p>
                <p className="text-xs text-green-800 mt-1">
                  The attachments were delivered and nothing was kept. Check your own inbox for a
                  reply — the production replies straight to you.
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
