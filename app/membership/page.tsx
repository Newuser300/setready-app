'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Copyright from '@/components/Copyright';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

type Submission = {
  id: string;
  tier: string;
  member_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  created_at: string;
};

const UNIONS = [
  { value: 'ubcp', label: 'UBCP/ACTRA (British Columbia)' },
  { value: 'actra', label: 'ACTRA (rest of Canada)' },
];

const TIERS = [
  { value: 'full', label: 'ACTRA Full Member', hint: 'Number looks like 05-12345', pattern: /^\d{2}-\d{3,6}$/ },
  { value: 'apprentice', label: 'ACTRA Apprentice', hint: 'Number looks like AM-12345', pattern: /^AM-\d{3,6}$/i },
  { value: 'aabp', label: 'ACTRA Additional Background Performer (AABP)', hint: 'Number looks like EX-054321', pattern: /^EX-\d{3,6}$/i },
  { value: 'permittee', label: 'Permittee (non-member on a permit)', hint: 'No member number required', pattern: null },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.heic,.pdf';

export default function MembershipPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [union, setUnion] = useState('');
  const [tier, setTier] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const tierConfig = TIERS.find((t) => t.value === tier);
  const numberRequired = tier && tier !== 'permittee';
  const numberLooksValid = !tierConfig?.pattern || tierConfig.pattern.test(memberNumber.trim());

  useEffect(() => { loadPage(); }, []);

  async function loadPage() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.push('/auth/sign-in'); return; }
    setUserId(user.id);
    const { data: { session } } = await supabase.auth.getSession();
    await loadSubmissions(session?.access_token ?? '');
    setPageLoading(false);
  }

  async function loadSubmissions(token: string) {
    const res = await fetch('/api/membership', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setSubmissions(data.submissions || []);
  }

  function handleFileChange(file: File) {
    if (file.size > MAX_FILE_SIZE) { toast.error('File too large. Maximum size is 10MB.'); return; }
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    if (!ACCEPTED_TYPES.includes(file.type) && !isHeic) {
      toast.error('File type not supported. Use JPG, PNG, HEIC, or PDF.');
      return;
    }
    setSelectedFile(file);
    const canPreview = file.type.startsWith('image/') && !isHeic;
    if (canPreview) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
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

  async function handleSubmit() {
    if (!union) { toast.error('Please select your union.'); return; }
    if (!tier) { toast.error('Please select your membership tier.'); return; }
    if (numberRequired && !memberNumber.trim()) { toast.error('Please enter your member number.'); return; }
    if (!selectedFile) { toast.error('Please attach a proof document.'); return; }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Your session expired. Please sign in again.'); router.push('/auth/sign-in'); return; }

      const sanitized = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('membership_docs')
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type || 'application/octet-stream',
          cacheControl: '3600',
        });

      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); return; }

      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          union_org: union,
          tier,
          member_number: numberRequired ? memberNumber.trim() : null,
          file_url: filePath,
          filename: selectedFile.name,
          file_type: selectedFile.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to submit.'); return; }

      toast.success('Submitted for review!');
      setTier('');
      setMemberNumber('');
      clearFile();
      await loadSubmissions(token);
    } finally {
      setUploading(false);
    }
  }

  const latest = submissions[0];

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

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Verify ACTRA Membership</h1>
              <p className="text-xs text-gray-500">Prove your tier so it shows on your profile</p>
            </div>
          </div>
          <Link href="/dashboard" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 font-medium transition">← Dashboard</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Current status */}
        {latest && (
          <div className={`rounded-2xl border p-5 ${
            latest.status === 'approved' ? 'bg-green-50 border-green-200'
            : latest.status === 'pending' ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
          }`}>
            <p className="font-bold text-gray-800">
              {latest.status === 'approved' && '✅ Verified'}
              {latest.status === 'pending' && '⏳ Under review'}
              {latest.status === 'rejected' && '❌ Not approved'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {latest.status === 'approved' && 'Your membership tier now shows on your profile.'}
              {latest.status === 'pending' && 'We usually review within a couple of days. You can update your submission below if needed.'}
              {latest.status === 'rejected' && (
                <>
                  {latest.review_notes ? <>Reason: {latest.review_notes}<br /></> : null}
                  Please upload a new copy of your UBCP/ACTRA card below to try again.
                </>
              )}
            </p>
          </div>
        )}

        {/* Submission form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 text-lg">Submit for verification</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload a clear photo or screenshot of your <strong>UBCP or ACTRA membership card</strong> — the digital card in the ACTRA Online / AMS app works too. JPG, PNG, or PDF.</p>
          </div>
          <div className="p-6 space-y-5">

            {/* Union */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Union <span className="text-red-500">*</span></label>
              <select
                value={union}
                onChange={(e) => setUnion(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">— Select your union —</option>
                {UNIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">In BC, most performers are UBCP/ACTRA. Elsewhere in Canada, ACTRA.</p>
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Membership Tier <span className="text-red-500">*</span></label>
              <select
                value={tier}
                onChange={(e) => { setTier(e.target.value); setMemberNumber(''); }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">— Select your tier —</option>
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Member number */}
            {numberRequired && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Member Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  placeholder={tierConfig?.hint}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className={`text-xs mt-1 ${memberNumber && !numberLooksValid ? 'text-amber-600' : 'text-gray-400'}`}>
                  {memberNumber && !numberLooksValid ? `That doesn't match the usual format (${tierConfig?.hint}). Double-check, but you can still submit — we review the document.` : tierConfig?.hint}
                </p>
              </div>
            )}

            {/* File */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Proof Document <span className="text-red-500">*</span></label>
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center space-y-4">
                  <p className="text-gray-400 text-sm">Take a photo or choose a file</p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-blue-700 transition">
                      📷 Take Photo
                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
                    </label>
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-gray-200 transition">
                      📁 Choose File
                      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">JPG · PNG · HEIC · PDF · Max 10MB</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-full max-h-52 object-contain rounded-lg bg-gray-50" />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-3xl">{selectedFile.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 break-all">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  )}
                  <button onClick={clearFile} className="text-xs text-red-500 hover:text-red-700 transition font-medium">✕ Remove file</button>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!!(uploading || !tier || !selectedFile || (numberRequired && !memberNumber.trim()))}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Submitting...' : 'Submit for Verification'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your document is stored privately and only used to verify your membership.
            </p>
          </div>
        </div>
      </div>
      <Copyright />
    </div>
  );
}
