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

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<TesterCode[]>([]);
  const [etransferRequests, setEtransferRequests] = useState<ETransferRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'codes' | 'etransfer'>('codes');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCodes();
    fetchEtransferRequests();
  }, []);

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
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // REMOVED: expires_at - codes never expire
    const { error } = await supabase
      .from('tester_codes')
      .insert({
        code: code,
        created_by: user?.id || null,
        is_active: true,
        max_uses: 1,
        uses_count: 0
        // expires_at removed - codes never expire
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
          className={`px-4 py-2 font-medium ${
            activeTab === 'codes' 
              ? 'border-b-2 border-teal-600 text-teal-600' 
              : 'text-gray-500'
          }`}
        >
          Access Codes
        </button>
        <button
          onClick={() => setActiveTab('etransfer')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'etransfer' 
              ? 'border-b-2 border-teal-600 text-teal-600' 
              : 'text-gray-500'
          }`}
        >
          E-Transfer Requests
        </button>
      </div>

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
            <p className="text-xs text-gray-600 mt-2">
              Codes never expire. Each code can be used once.
            </p>
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
                            <button
                              onClick={() => copyCodeToClipboard(code.code)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => deleteCode(code.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
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
              Total codes: {codes.length} | 
              Available: {codes.filter(c => c.is_active && ((c.uses_count || 0) < (c.max_uses || 1))).length} | 
              Used: {codes.filter(c => !c.is_active || ((c.uses_count || 0) >= (c.max_uses || 1))).length}
            </div>
          )}
        </>
      )}

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
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No e-transfer requests yet
                  </td>
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
    </div>
  );
}