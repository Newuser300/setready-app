'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Copyright from '@/components/Copyright';

type WorkLog = {
  id: string;
  work_date: string;
  production_name: string;
  location: string;
  role: string;
  character_name: string;
  hours_worked: number;
  lunch_break: boolean;
  is_union: boolean;
  pay_rate: number;
  gross_pay: number;
  deductions: number;
  final_pay: number;
  paid: boolean;
  notes: string;
  production_type?: string | null;
  agency?: string | null;
  created_at: string;
  voucher_url?: string | null;
  voucher_filename?: string | null;
  voucher_type?: string | null;
};

export default function WorkLogPage() {
  const router = useRouter();

  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [showWorkLogForm, setShowWorkLogForm] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [workLogForm, setWorkLogForm] = useState({
    work_date: new Date().toISOString().split('T')[0],
    production_name: '',
    production_type: '',
    location: '',
    role: '',
    character_name: '',
    agency: '',
    hours_worked: '',
    lunch_break: false,
    is_union: false,
    pay_rate: '',
    deductions: '0',
    paid: false,
    notes: '',
    voucher_type: '',
  });
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const workLogFormRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [formVoucherFile, setFormVoucherFile] = useState<File | null>(null);
  const [formVoucherType, setFormVoucherType] = useState<'Union Voucher' | 'Non-Union Voucher' | ''>('');
  const [formVoucherPreview, setFormVoucherPreview] = useState<string | null>(null);
  const [unionStatus, setUnionStatus] = useState<'union' | 'non-union'>('non-union');
  const [uploadingLogId, setUploadingLogId] = useState<string | null>(null);
  const [removingLogId, setRemovingLogId] = useState<string | null>(null);
  const [confirmRemoveVoucherId, setConfirmRemoveVoucherId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkLogs();
  }, []);

  useEffect(() => {
    if (showWorkLogForm && workLogFormRef.current) {
      setTimeout(() => {
        workLogFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [showWorkLogForm]);

  async function loadWorkLogs() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { router.push('/auth/sign-in'); return; }
    const res = await fetch('/api/work-log/entries', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setWorkLogs(await res.json());
    setLoading(false);
  }

  async function uploadVoucher(logId: string, file: File, voucherType?: string) {
    setUploadingLogId(logId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert('Please sign in again'); return; }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workLogId', logId);
      if (voucherType) fd.append('voucherType', voucherType);
      const res = await fetch('/api/work-log/voucher', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      if (res.ok) {
        loadWorkLogs();
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed. Please try again.');
      }
    } catch {
      alert('Upload error. Please try again.');
    } finally {
      setUploadingLogId(null);
    }
  }

  async function removeVoucher(logId: string) {
    setConfirmRemoveVoucherId(null);
    setRemovingLogId(logId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert('Please sign in again'); return; }
      const res = await fetch(`/api/work-log/voucher?id=${logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) loadWorkLogs();
      else alert('Failed to remove voucher.');
    } finally {
      setRemovingLogId(null);
    }
  }

  async function viewVoucher(logId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { alert('Please sign in again'); return; }
    const res = await fetch(`/api/work-log/voucher/view?workLogId=${logId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Could not load voucher. Please try again.');
    }
  }

  function handleVoucherFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formVoucherPreview) URL.revokeObjectURL(formVoucherPreview);
    setFormVoucherFile(file);
    setFormVoucherType('');
    setFormVoucherPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = '';
  }

  function clearFormVoucher() {
    if (formVoucherPreview) URL.revokeObjectURL(formVoucherPreview);
    setFormVoucherFile(null);
    setFormVoucherType('');
    setFormVoucherPreview(null);
  }

  function calculatePay() {
    const hours = parseFloat(workLogForm.hours_worked) || 0;
    const rate = parseFloat(workLogForm.pay_rate) || 0;
    const deductions = parseFloat(workLogForm.deductions) || 0;
    return { grossPay: hours * rate, finalPay: hours * rate - deductions };
  }

  async function saveWorkLog(e: React.FormEvent) {
    e.preventDefault();
    if (!workLogForm.work_date) { alert('Please enter the work date'); return; }
    if (!workLogForm.production_name.trim()) { alert('Please enter the production name'); return; }

    setWorkLogLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      alert('Please sign in again');
      setWorkLogLoading(false);
      return;
    }

    const hours = parseFloat(workLogForm.hours_worked) || 0;
    const rate = parseFloat(workLogForm.pay_rate) || 0;
    const deductions = parseFloat(workLogForm.deductions) || 0;
    const grossPay = hours * rate;
    const finalPay = grossPay - deductions;

    const workLogData = {
      user_id: session.user.id,
      work_date: workLogForm.work_date,
      production_name: workLogForm.production_name,
      production_type: workLogForm.production_type || null,
      location: workLogForm.location || null,
      role: workLogForm.role || null,
      character_name: workLogForm.character_name || null,
      agency: workLogForm.agency || null,
      hours_worked: hours,
      lunch_break: workLogForm.lunch_break,
      is_union: unionStatus === 'union',
      pay_rate: rate,
      gross_pay: grossPay,
      deductions,
      final_pay: finalPay,
      paid: workLogForm.paid,
      notes: workLogForm.notes || null,
    };

    try {
      const payload = editingWorkLog ? { id: editingWorkLog.id, ...workLogData } : workLogData;
      const saveRes = await fetch('/api/work-log/entries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        alert(`Error saving: ${err.error || 'Unknown error'}`);
        return;
      }
      const saved = await saveRes.json();
      const savedId = editingWorkLog?.id ?? saved?.id;
      if (formVoucherFile && savedId) {
        const fd = new FormData();
        fd.append('file', formVoucherFile);
        fd.append('workLogId', savedId);
        fd.append('voucherType', formVoucherType);
        const uploadRes = await fetch('/api/work-log/voucher', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: fd,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          alert(`Entry saved but voucher upload failed: ${err.error || 'Unknown error'}`);
        }
      }
      resetWorkLogForm();
      loadWorkLogs();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Something went wrong'}`);
    } finally {
      setWorkLogLoading(false);
    }
  }

  async function deleteWorkLog(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { alert('Please sign in again'); return; }
    const res = await fetch(`/api/work-log/entries?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) loadWorkLogs();
    else alert('Error deleting work log');
  }

  function editWorkLog(log: WorkLog) {
    setEditingWorkLog(log);
    setUnionStatus(log.is_union ? 'union' : 'non-union');
    setWorkLogForm({
      work_date: log.work_date,
      production_name: log.production_name || '',
      production_type: log.production_type || '',
      location: log.location || '',
      role: log.role || '',
      character_name: log.character_name || '',
      agency: log.agency || '',
      hours_worked: log.hours_worked?.toString() || '',
      lunch_break: log.lunch_break || false,
      is_union: log.is_union || false,
      pay_rate: log.pay_rate?.toString() || '',
      deductions: log.deductions?.toString() || '0',
      paid: log.paid || false,
      notes: log.notes || '',
      voucher_type: log.voucher_type || '',
    });
    clearFormVoucher();
    setShowWorkLogForm(true);
  }

  function resetWorkLogForm() {
    setEditingWorkLog(null);
    setUnionStatus('non-union');
    setWorkLogForm({
      work_date: new Date().toISOString().split('T')[0],
      production_name: '',
      production_type: '',
      location: '',
      role: '',
      character_name: '',
      agency: '',
      hours_worked: '',
      lunch_break: false,
      is_union: false,
      pay_rate: '',
      deductions: '0',
      paid: false,
      notes: '',
      voucher_type: '',
    });
    clearFormVoucher();
    setShowWorkLogForm(false);
  }

  const { grossPay, finalPay } = calculatePay();
  const totalEarnings = workLogs.reduce((sum, log) => sum + (log.final_pay || 0), 0);
  const totalPaid = workLogs.filter(log => log.paid).reduce((sum, log) => sum + (log.final_pay || 0), 0);
  const totalUnpaid = totalEarnings - totalPaid;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9ca3af' }}>Loading...</p>
    </div>
  );

  return (
    <>
      {/* Hidden inputs must be outside conditionals for mobile camera to work */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleVoucherFileChange} />
      <input ref={uploadInputRef} type="file" accept="image/*,application/pdf,.heic,.heif" style={{ display: 'none' }} onChange={handleVoucherFileChange} />

      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ backgroundColor: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>←</button>
          <span style={{ color: '#e5e7eb', fontWeight: '600', fontSize: '15px' }}>📋 Work Log & Earnings Tracker</span>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 60px' }}>

          {/* Title banner */}
          <div className="mb-6 rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: '#F59E0B' }}>
            <div className="px-6 py-7 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">📋💰 Work Log & Earnings Tracker</h2>
                <p className="text-gray-800 font-medium mt-1 text-base">Track your film industry work, earnings, and deductions</p>
              </div>
              <button
                onClick={() => { setEditingWorkLog(null); setShowWorkLogForm(true); }}
                className="shrink-0 px-7 py-3 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-gray-800 active:scale-95 transition shadow-md"
              >
                ➕ Add Work Entry
              </button>
            </div>
          </div>

          {/* Work Log Form */}
          {showWorkLogForm && (
            <div ref={workLogFormRef} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                {editingWorkLog ? '✏️ Edit Work Entry' : '➕ New Work Entry'}
              </h3>

              <form onSubmit={saveWorkLog} className="space-y-8">

                {/* BASIC INFO */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Basic Info</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                      <input type="date" required value={workLogForm.work_date}
                        onChange={(e) => setWorkLogForm({...workLogForm, work_date: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Production Name *</label>
                      <input type="text" required value={workLogForm.production_name}
                        onChange={(e) => setWorkLogForm({...workLogForm, production_name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g., Movie or Show Title" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Production Type</label>
                      <select value={workLogForm.production_type}
                        onChange={(e) => setWorkLogForm({...workLogForm, production_type: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                        <option value="">— Select —</option>
                        <option value="Film">Film</option>
                        <option value="TV Series">TV Series</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Music Video">Music Video</option>
                        <option value="Short Film">Short Film</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                      <input type="text" value={workLogForm.location}
                        onChange={(e) => setWorkLogForm({...workLogForm, location: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="City / Studio" />
                    </div>
                  </div>
                </div>

                {/* ROLE & PAY */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Role &amp; Pay</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Union Status</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setUnionStatus('union')}
                          style={{ flex: 1, padding: '12px', minHeight: '44px', backgroundColor: unionStatus === 'union' ? '#1a1a2e' : 'transparent', color: unionStatus === 'union' ? 'white' : '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                          🎭 Union (UBCP/ACTRA)
                        </button>
                        <button type="button" onClick={() => setUnionStatus('non-union')}
                          style={{ flex: 1, padding: '12px', minHeight: '44px', backgroundColor: unionStatus === 'non-union' ? '#1a1a2e' : 'transparent', color: unionStatus === 'non-union' ? 'white' : '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                          Non-Union
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Role Type</label>
                      <select value={workLogForm.role} onChange={(e) => setWorkLogForm({...workLogForm, role: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                        <option value="">— Select —</option>
                        <option value="General Background">General Background</option>
                        <option value="Stand-in">Stand-in</option>
                        <option value="Special Ability Background">Special Ability Background</option>
                        <option value="Photo Double">Photo Double</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Agency <span className="font-normal text-gray-400">(optional)</span></label>
                      <input type="text" value={workLogForm.agency}
                        onChange={(e) => setWorkLogForm({...workLogForm, agency: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g., Extras Casting Agency" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Hours Worked</label>
                      <input type="number" step="0.5" min="0" value={workLogForm.hours_worked}
                        onChange={(e) => setWorkLogForm({...workLogForm, hours_worked: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g., 8.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Hourly Rate ($)</label>
                      <input type="number" step="0.01" min="0" value={workLogForm.pay_rate}
                        onChange={(e) => setWorkLogForm({...workLogForm, pay_rate: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g., 270.30" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Gross Pay <span className="font-normal text-gray-400">(hours × rate)</span></label>
                      <input type="text" readOnly value={`$${grossPay.toFixed(2)}`}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-default" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Deductions ($)</label>
                      <input type="number" step="0.01" min="0" value={workLogForm.deductions}
                        onChange={(e) => setWorkLogForm({...workLogForm, deductions: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Pay <span className="font-normal text-gray-400">(after deductions)</span></label>
                      <input type="text" readOnly value={`$${finalPay.toFixed(2)}`}
                        className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 font-bold cursor-default" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                        <input type="checkbox" checked={workLogForm.paid}
                          onChange={(e) => setWorkLogForm({...workLogForm, paid: e.target.checked})}
                          className="w-5 h-5 rounded text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">Payment received</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* VOUCHER UPLOAD */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    📄 Upload Work Voucher Photo <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  {editingWorkLog?.voucher_filename && !formVoucherFile && (
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        ✅ {editingWorkLog.voucher_type || 'Voucher'}
                      </span>
                      <span className="text-sm text-gray-700 truncate max-w-[200px]">{editingWorkLog.voucher_filename}</span>
                      <span className="text-xs text-gray-400">— select a new file below to replace</span>
                    </div>
                  )}
                  {formVoucherFile ? (
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      {formVoucherFile.type.startsWith('image/') && formVoucherPreview ? (
                        <img src={formVoucherPreview} alt="Voucher preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center text-3xl shrink-0">📄</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{formVoucherFile.name}</p>
                        <p className="text-xs text-gray-400">{(formVoucherFile.size / 1024 / 1024).toFixed(1)} MB — will upload on save</p>
                      </div>
                      <button type="button" onClick={clearFormVoucher}
                        className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition underline underline-offset-2">
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => cameraInputRef.current?.click()}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', minHeight: '48px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                        📷 Take Photo
                      </button>
                      <button type="button" onClick={() => uploadInputRef.current?.click()}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', minHeight: '48px', backgroundColor: 'transparent', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                        📁 Upload Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* NOTES */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea value={workLogForm.notes} onChange={(e) => setWorkLogForm({...workLogForm, notes: e.target.value})}
                    rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    placeholder="Any notes about this booking..." />
                </div>

                {/* BUTTONS */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={resetWorkLogForm}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
                    Cancel
                  </button>
                  <button type="submit" disabled={workLogLoading}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold disabled:opacity-50 shadow-sm">
                    {workLogLoading ? 'Saving…' : (editingWorkLog ? '💾 Update Entry' : '💾 Save Entry')}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-gray-600">💰 Total Earnings</p>
              <p className="text-2xl font-bold text-gray-800">${totalEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-gray-600">✅ Total Paid</p>
              <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-sm text-gray-600">⏳ Total Unpaid</p>
              <p className="text-2xl font-bold text-orange-600">${totalUnpaid.toFixed(2)}</p>
            </div>
          </div>

          {/* Work Log Cards */}
          {workLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-500 italic">No work entries yet.</p>
              <p className="text-sm text-gray-400">Click &quot;Add Work Entry&quot; to start tracking your film industry work.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 pt-4 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-gray-900">
                          {new Date(log.work_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-base font-semibold text-gray-700">{log.production_name}</span>
                        {log.is_union ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Union</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Non-Union</span>
                        )}
                        {log.paid ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">✓ Paid</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs font-medium">Unpaid</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => editWorkLog(log)} title="Edit"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition">✏️</button>
                        <button onClick={() => deleteWorkLog(log.id)} title="Delete"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition">🗑️</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                      {log.location && <span>📍 {log.location}</span>}
                      {log.role && <span>🎭 {log.role}</span>}
                      {log.character_name && <span>🎬 {log.character_name}</span>}
                      <span>⏱ {log.hours_worked}h</span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 text-sm">
                      <span className="text-gray-500">Gross: <span className="font-medium text-gray-700">${log.gross_pay?.toFixed(2)}</span></span>
                      <span className="text-gray-500">Final Pay: <span className="font-bold text-gray-900">${log.final_pay?.toFixed(2)}</span></span>
                    </div>
                  </div>

                  {/* Voucher section */}
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">📄 Work Voucher</p>
                    {uploadingLogId === log.id ? (
                      <p className="text-sm text-blue-500 animate-pulse">Uploading voucher…</p>
                    ) : removingLogId === log.id ? (
                      <p className="text-sm text-red-400 animate-pulse">Removing voucher…</p>
                    ) : log.voucher_filename ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.voucher_type === 'Union Voucher' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                          ✅ {log.voucher_type || 'Voucher'}
                        </span>
                        <span className="text-sm text-gray-600 truncate max-w-[200px]" title={log.voucher_filename}>{log.voucher_filename}</span>
                        <button onClick={() => viewVoucher(log.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition">
                          👁 View
                        </button>
                        {confirmRemoveVoucherId === log.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Remove voucher?</span>
                            <button onClick={() => removeVoucher(log.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Yes, remove</button>
                            <button onClick={() => setConfirmRemoveVoucherId(null)}
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmRemoveVoucherId(log.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition">
                            🗑 Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl cursor-pointer transition select-none shadow-sm">
                          🎭 Union Voucher
                          <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadVoucher(log.id, f, 'Union Voucher'); e.target.value = ''; }} />
                        </label>
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl cursor-pointer transition select-none shadow-sm">
                          📋 Non-Union Voucher
                          <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadVoucher(log.id, f, 'Non-Union Voucher'); e.target.value = ''; }} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Copyright />
        </div>
      </div>
    </>
  );
}
