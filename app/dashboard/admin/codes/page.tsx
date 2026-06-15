'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TesterCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  uses_count: number | null;
}

interface ETransferRequest {
  id: string;
  email: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface PhotoPromoCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<TesterCode[]>([]);
  const [etransferRequests, setEtransferRequests] = useState<ETransferRequest[]>([]);
  const [photoCodes, setPhotoCodes] = useState<PhotoPromoCode[]>([]);

  const [activeTab, setActiveTab] = useState<'codes' | 'etransfer' | 'photo_promo'>('codes');

  const [generating, setGenerating] = useState(false);
  const [photoGenerating, setPhotoGenerating] = useState(false);
  const [customPhotoCode, setCustomPhotoCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCodes();
    fetchEtransferRequests();
    fetchPhotoCodes();
  }, []);

  // ── Tester codes ──────────────────────────────────────────────────────────────

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('tester_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
    setLoading(false);
  };

  const fetchEtransferRequests = async () => {
    const { data } = await supabase
      .from('etransfer_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEtransferRequests(data);
  };

  const generateCode = async () => {
    setGenerating(true);
    const code = randomCode();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('tester_codes')
      .insert({
        code,
        created_by: user?.id || null,
        is_active: true,
        max_uses: 1,
        uses_count: 0,
      });
    if (!error) {
      alert('Code generated: ' + code);
      fetchCodes();
    } else {
      alert('Error generating code: ' + error.message);
    }
    setGenerating(false);
  };

  const deleteCode = async (id: string) => {
    if (confirm('Delete this code?')) {
      await supabase.from('tester_codes').delete().eq('id', id);
      fetchCodes();
    }
  };

  const markRequestProcessed = async (id: string) => {
    await supabase
      .from('etransfer_requests')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', id);
    fetchEtransferRequests();
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  // ── Photo promo codes ─────────────────────────────────────────────────────────

  const fetchPhotoCodes = async () => {
    const { data } = await supabase
      .from('photo_promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPhotoCodes(data);
  };

  const generatePhotoCode = async (codeValue?: string) => {
    setPhotoGenerating(true);
    const code = (codeValue ?? randomCode()).toUpperCase().trim();
    if (!code) { setPhotoGenerating(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('photo_promo_codes')
      .insert({
        code,
        is_used: false,
        created_by: user?.email || user?.id || null,
      });
    if (!error) {
      alert('Photo promo code created: ' + code);
      setCustomPhotoCode('');
      fetchPhotoCodes();
    } else {
      alert('Error creating code: ' + error.message);
    }
    setPhotoGenerating(false);
  };

  const deletePhotoCode = async (id: string) => {
    if (confirm('Delete this photo promo code?')) {
      await supabase.from('photo_promo_codes').delete().eq('id', id);
      fetchPhotoCodes();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Loading codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Payment & Access Codes</h1>

      <div className="flex gap-2 border-b mb-6">
        <button
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2 font-medium ${activeTab === 'codes' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500'}`}
        >
          Access Codes
        </button>
        <button
          onClick={() => setActiveTab('etransfer')}
          className={`px-4 py-2 font-medium ${activeTab === 'etransfer' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500'}`}
        >
          E-Transfer Requests
        </button>
        <button
          onClick={() => setActiveTab('photo_promo')}
          className={`px-4 py-2 font-medium ${activeTab === 'photo_promo' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500'}`}
        >
          Photo Promo Codes
        </button>
      </div>

      {/* ── ACCESS CODES ── */}
      {activeTab === 'codes' && (
        <>
          <div className="bg-teal-50 p-4 rounded-lg mb-6 border border-teal-200">
            <h2 className="font-semibold mb-3 text-teal-800">Generate New Access Code</h2>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={generateCode}
                disabled={generating}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
              >
                {generating ? 'Generating...' : '+ Generate New Code'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">Codes never expire. Each code can be used once.</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">How to Use These Codes</h3>
            <p className="text-sm text-blue-700">
              When a user requests e-transfer payment, generate a code and send it to them via email.
              Users can redeem their code at: /redeem
            </p>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Created</th>
                  <th className="p-3 text-left">Used By</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No codes generated yet. Click "Generate New Code" to create one.
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => {
                    const isUsed = (code.uses_count || 0) >= (code.max_uses || 1);
                    return (
                      <tr key={code.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono font-bold text-teal-700">{code.code}</td>
                        <td className="p-3">
                          {!code.is_active ? (
                            <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs">Inactive</span>
                          ) : isUsed ? (
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs">Used</span>
                          ) : (
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">Available</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{new Date(code.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-gray-600">
                          {code.used_by ? code.used_by.substring(0, 8) + '...' : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => copyCodeToClipboard(code.code)} className="text-blue-600 hover:text-blue-800 text-sm">Copy</button>
                            <button onClick={() => deleteCode(code.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {codes.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total codes: {codes.length} |{' '}
              Available: {codes.filter(c => c.is_active && ((c.uses_count || 0) < (c.max_uses || 1))).length} |{' '}
              Used: {codes.filter(c => !c.is_active || ((c.uses_count || 0) >= (c.max_uses || 1))).length}
            </div>
          )}
        </>
      )}

      {/* ── E-TRANSFER REQUESTS ── */}
      {activeTab === 'etransfer' && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Requested</th>
                <th className="p-3 text-left">Processed</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {etransferRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No e-transfer requests yet</td>
                </tr>
              ) : (
                etransferRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{request.email}</td>
                    <td className="p-3">
                      {request.status === 'pending' ? (
                        <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-xs">Pending</span>
                      ) : (
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">Processed</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-600">{new Date(request.created_at).toLocaleString()}</td>
                    <td className="p-3 text-gray-600">
                      {request.processed_at ? new Date(request.processed_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-3">
                      {request.status === 'pending' && (
                        <button
                          onClick={() => markRequestProcessed(request.id)}
                          className="bg-teal-600 text-white px-3 py-1 rounded text-xs hover:bg-teal-700"
                        >
                          Mark Processed
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PHOTO PROMO CODES ── */}
      {activeTab === 'photo_promo' && (
        <>
          <div className="bg-teal-50 p-4 rounded-lg mb-6 border border-teal-200">
            <h2 className="font-semibold mb-3 text-teal-800">Create Photo Promo Code</h2>

            {/* Random generate */}
            <div className="flex gap-4 flex-wrap items-center mb-3">
              <button
                onClick={() => generatePhotoCode()}
                disabled={photoGenerating}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
              >
                {photoGenerating ? 'Creating...' : '+ Generate Random Code'}
              </button>
            </div>

            {/* Custom code */}
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Or enter a custom code (e.g. PHOTOTEST)"
                value={customPhotoCode}
                onChange={e => setCustomPhotoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={24}
                className="border border-teal-300 rounded-lg px-3 py-2 text-sm font-mono w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={() => generatePhotoCode(customPhotoCode)}
                disabled={photoGenerating || !customPhotoCode.trim()}
                className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 disabled:opacity-50 font-medium text-sm"
              >
                Add Custom Code
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-2">
              Codes never expire. Each code unlocks 4 extra photo slots for one user.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">How to Use These Codes</h3>
            <p className="text-sm text-blue-700">
              Generate a code and send it to the performer. They enter it on their profile page under
              the locked photo slots section. Redeemed via <strong>/api/photo-promo/redeem</strong> (server-side).
            </p>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Created</th>
                  <th className="p-3 text-left">Used By</th>
                  <th className="p-3 text-left">Used At</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {photoCodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No photo promo codes yet. Generate one above.
                    </td>
                  </tr>
                ) : (
                  photoCodes.map((pc) => (
                    <tr key={pc.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-teal-700">{pc.code}</td>
                      <td className="p-3">
                        {pc.is_used ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs">Used</span>
                        ) : (
                          <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">Available</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">{new Date(pc.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-gray-600">
                        {pc.used_by ? pc.used_by.substring(0, 8) + '...' : '-'}
                      </td>
                      <td className="p-3 text-gray-600">
                        {pc.used_at ? new Date(pc.used_at).toLocaleString() : '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => copyCodeToClipboard(pc.code)} className="text-blue-600 hover:text-blue-800 text-sm">Copy</button>
                          <button onClick={() => deletePhotoCode(pc.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {photoCodes.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total: {photoCodes.length} |{' '}
              Available: {photoCodes.filter(c => !c.is_used).length} |{' '}
              Used: {photoCodes.filter(c => c.is_used).length}
            </div>
          )}
        </>
      )}
    </div>
  );
}
