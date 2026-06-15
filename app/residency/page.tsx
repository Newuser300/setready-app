'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Copyright from '@/components/Copyright';
import { supabase } from '@/lib/supabase';

type ResidencyDoc = {
  id: string;
  document_type: string;
  document_label: string | null;
  file_url: string;
  filename: string | null;
  file_type: string | null;
  notes: string | null;
  created_at: string;
};

const DOC_TYPES_CITIZENSHIP = [
  'Passport',
  'Birth Certificate',
  'Certificate of Indian Status Card',
  'Citizenship Card',
  'Permanent Resident Card',
];

const DOC_TYPES_BC = [
  "Notice of Assessment",
  "BC Driver's Licence",
  "BC Services Card",
  "Utility Bill (Hydro/Gas)",
  "Property Tax Notice",
  "Bank Statement",
  "Other",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.heic,.pdf';

function fileTypeIcon(fileType: string | null): string {
  if (!fileType) return '📄';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  return '📋';
}

export default function ResidencyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [docs, setDocs] = useState<ResidencyDoc[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Upload form
  const [docType, setDocType] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Email
  const [productionEmail, setProductionEmail] = useState('');
  const [emailUserName, setEmailUserName] = useState('');
  const [selectedEmailDocs, setSelectedEmailDocs] = useState<Set<string>>(new Set());
  const [emailMessage, setEmailMessage] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => { loadPage(); }, []);

  async function loadPage() {
    const { createBrowserClient } = await import('@supabase/ssr')
    const browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await browserClient.auth.getUser()
    if (error || !user) { router.push('/auth/sign-in'); return; }
    const { data: { session } } = await browserClient.auth.getSession()
    setAccessToken(session?.access_token ?? '');
    setUserId(user.id);

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

    await loadDocs(session?.access_token ?? '');
    setPageLoading(false);
  }

  async function loadDocs(token: string) {
    const res = await fetch('/api/residency', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setDocs(data.documents || []);
  }

  function handleFileChange(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    const accepted = ACCEPTED_TYPES.includes(file.type) || isHeic;
    if (!accepted) {
      toast.error('File type not supported. Use JPG, PNG, HEIC, or PDF.');
      return;
    }
    setSelectedFile(file);
    const canPreview = file.type.startsWith('image/') && !file.type.includes('heic') && !file.type.includes('heif') && !isHeic;
    if (canPreview) {
      const reader = new FileReader();
      reader.onload = e => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview('');
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!selectedFile || !docType) {
      toast.error('Please select a document type and a file.');
      return;
    }
    setUploading(true);
    try {
      const sanitized = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('residency_docs')
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type || 'application/octet-stream',
          cacheControl: '3600',
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const res = await fetch('/api/residency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          document_type: docType,
          document_label: docLabel.trim() || null,
          file_url: filePath,
          filename: selectedFile.name,
          file_type: selectedFile.type,
          notes: docNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save document.');
        return;
      }

      toast.success('Document saved!');
      setDocType('');
      setDocLabel('');
      setDocNotes('');
      clearFile();
      await loadDocs(accessToken);
    } finally {
      setUploading(false);
    }
  }

  async function handleView(doc: ResidencyDoc) {
    const toastId = toast.loading('Generating secure link...');
    try {
      const res = await fetch('/api/residency/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
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

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/residency?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Delete failed.'); return; }
      toast.success('Document deleted.');
      setConfirmDeleteId(null);
      setSelectedEmailDocs(prev => { const n = new Set(prev); n.delete(id); return n; });
      await loadDocs(accessToken);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleEmailDoc(id: string) {
    setSelectedEmailDocs(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function selectAllEmailDocs() {
    if (selectedEmailDocs.size === docs.length) {
      setSelectedEmailDocs(new Set());
    } else {
      setSelectedEmailDocs(new Set(docs.map(d => d.id)));
    }
  }

  async function handleSendEmail() {
    if (!productionEmail.trim()) { toast.error('Please enter the production email address.'); return; }
    if (selectedEmailDocs.size === 0) { toast.error('Please select at least one document.'); return; }

    setEmailLoading(true);
    try {
      const selected = docs.filter(d => selectedEmailDocs.has(d.id));

      const urlResults = await Promise.all(
        selected.map(async doc => {
          const res = await fetch('/api/residency/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ fileUrl: doc.file_url }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(`Failed to get link for "${doc.document_type}"`);
          return { doc, signedUrl: data.signedUrl as string };
        })
      );

      const subject = encodeURIComponent(`Proof of Residency — ${emailUserName}`);

      let body = emailMessage + '\n\n';
      body += '——\nPROOF OF RESIDENCY DOCUMENTS:\n\n';
      urlResults.forEach(({ doc, signedUrl }, i) => {
        const label = doc.document_label
          ? `${doc.document_type} (${doc.document_label})`
          : doc.document_type;
        body += `Document ${i + 1} — ${label}:\n${signedUrl}\n\n`;
      });
      body += 'Note: These links expire in 1 hour for security.';

      const mailtoUrl = `mailto:${encodeURIComponent(productionEmail.trim())}?subject=${subject}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
      toast.success('Email app opened — review and send!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to prepare email.');
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
            Store your documents securely for quick access on set.
          </h2>
          <p className="text-gray-500">Email them to production directly from this page.</p>
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

        {/* ── My Stored Documents ── */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            My Stored Documents
            {docs.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                {docs.length}
              </span>
            )}
          </h2>

          {docs.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-gray-500 font-medium">No documents uploaded yet.</p>
              <p className="text-gray-400 text-sm mt-1">Upload your first document using the form below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {docs.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl shrink-0 mt-0.5">{fileTypeIcon(doc.file_type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{doc.document_type}</p>
                      {doc.document_label && (
                        <p className="text-xs text-gray-500 mt-0.5">{doc.document_label}</p>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-blue-600 mt-0.5 italic">{doc.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(doc.created_at).toLocaleDateString('en-CA', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {confirmDeleteId === doc.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-red-600 font-semibold flex-1">Delete this document?</span>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deletingId === doc.id ? '...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(doc)}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                      >
                        👁 View
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(doc.id)}
                        className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Upload New Document ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 text-lg">Upload New Document</h2>
            <p className="text-xs text-gray-500 mt-0.5">Accepts JPG, PNG, HEIC, PDF · Max 10MB</p>
          </div>
          <div className="p-6 space-y-5">

            {/* Document Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">— Select document type —</option>
                <optgroup label="Citizenship / PR Status">
                  {DOC_TYPES_CITIZENSHIP.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="BC Residency">
                  {DOC_TYPES_BC.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              </select>
            </div>

            {/* Custom Label */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Custom Label <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={docLabel}
                onChange={e => setDocLabel(e.target.value)}
                placeholder="e.g. Front of Passport, Jan 2026 Hydro Bill"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={docNotes}
                onChange={e => setDocNotes(e.target.value)}
                placeholder="e.g. Financial info blacked out"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                File <span className="text-red-500">*</span>
              </label>

              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center space-y-4">
                  <p className="text-gray-400 text-sm">Take a photo or choose a file from your device</p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-blue-700 transition shadow-sm">
                      📷 Take Photo
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
                      />
                    </label>
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-200 transition shadow-sm">
                      📁 Choose File
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">JPG · PNG · HEIC · PDF · Max 10MB</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full max-h-52 object-contain rounded-lg bg-gray-50"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-3xl">
                        {selectedFile.type === 'application/pdf' ? '📄' : '🖼️'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 break-all">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={clearFile}
                    className="text-xs text-red-500 hover:text-red-700 transition font-medium"
                  >
                    ✕ Remove file
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !docType}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                '💾 Save Document'
              )}
            </button>
          </div>
        </div>

        {/* ── Email to Production ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-amber-300" style={{ backgroundColor: '#F59E0B' }}>
            <h2 className="font-extrabold text-gray-900 text-xl">📧 Email Documents to Production</h2>
            <p className="text-gray-800 font-medium mt-0.5 text-sm">Open your email app with documents pre-linked</p>
          </div>
          <div className="p-6 space-y-5">

            {docs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p>Upload documents first to use this feature.</p>
              </div>
            ) : (
              <>
                {/* Production Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Production Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={productionEmail}
                    onChange={e => setProductionEmail(e.target.value)}
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

                {/* Select Documents */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Select Documents to Send</label>
                    <button
                      onClick={selectAllEmailDocs}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      {selectedEmailDocs.size === docs.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {docs.map(doc => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmailDocs.has(doc.id)}
                          onChange={() => toggleEmailDoc(doc.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-amber-500"
                        />
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">{doc.document_type}</span>
                          {doc.document_label && (
                            <span className="text-gray-500"> — {doc.document_label}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedEmailDocs.size > 0 && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      {selectedEmailDocs.size} document{selectedEmailDocs.size !== 1 ? 's' : ''} selected
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
                    This will open your email app with the documents linked. The production can click
                    each link to view your documents. <strong>Links expire after 1 hour</strong> for security.
                  </p>
                </div>

                {/* Send button */}
                <button
                  onClick={handleSendEmail}
                  disabled={emailLoading || !productionEmail.trim() || selectedEmailDocs.size === 0}
                  className="w-full py-4 font-bold text-base rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{ backgroundColor: '#F59E0B', color: '#1F2937' }}
                >
                  {emailLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                      Generating links...
                    </span>
                  ) : (
                    '📧 Open Email with Documents'
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Security Notice ── */}
        <div className="bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-white font-semibold text-base">
            🔒 Your documents are stored securely and privately.
          </p>
          <p className="text-gray-400 text-sm mt-1.5">
            Only you can access them. They are never shared with SetReady or third parties.
          </p>
        </div>

      </div>
      <Copyright />
    </div>
  );
}
