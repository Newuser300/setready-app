'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Copyright from '@/components/Copyright';
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type Contact = {
  id: string;
  name: string;
  role: string;
  category?: string;
  agency?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  productions_together?: string;
  notes?: string;
  date_met?: string;
  created_at: string;
};

const CATEGORIES = ['All', 'Director / AD', 'Agent', 'Casting Director', 'Fellow Performer', 'Wardrobe / Costume', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  'Director / AD':        'bg-purple-100 text-purple-800',
  'Agent':                'bg-blue-100 text-blue-800',
  'Casting Director':     'bg-pink-100 text-pink-800',
  'Fellow Performer':     'bg-amber-100 text-amber-800',
  'Wardrobe / Costume':   'bg-green-100 text-green-800',
  'Other':                'bg-gray-100 text-gray-700',
};

const EMPTY_FORM = {
  name: '',
  role: '',
  category: '',
  agency: '',
  phone: '',
  email: '',
  instagram: '',
  productions_together: '',
  notes: '',
  date_met: '',
};

export default function ContactsPage() {
  const router = useRouter();
  const [token, setToken]         = useState<string | null>(null);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    (async () => {
      const browserClient = createClient()
      const { data: { user }, error } = await browserClient.auth.getUser()
      if (error || !user) { router.push('/auth/sign-in'); return }
      const { data: { session } } = await browserClient.auth.getSession()
      setToken(session?.access_token ?? null)
    })()
  }, [router]);

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/contacts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setContacts(await res.json());
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) fetchContacts(); }, [token, fetchContacts]);

  function openAdd() {
    setEditContact(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(c: Contact) {
    setEditContact(c);
    setForm({
      name:                 c.name,
      role:                 c.role,
      category:             c.category             ?? '',
      agency:               c.agency               ?? '',
      phone:                c.phone                ?? '',
      email:                c.email                ?? '',
      instagram:            c.instagram            ?? '',
      productions_together: c.productions_together ?? '',
      notes:                c.notes                ?? '',
      date_met:             c.date_met             ?? '',
    });
    setShowModal(true);
  }

  async function save() {
    if (!token || !form.name.trim() || !form.role.trim()) return;
    setSaving(true);
    try {
      const method = editContact ? 'PUT' : 'POST';
      const body   = editContact ? { id: editContact.id, ...form } : form;
      const res = await fetch('/api/contacts', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        fetchContacts();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: string) {
    if (!token || !confirm('Delete this contact?')) return;
    const res = await fetch(`/api/contacts?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setContacts(prev => prev.filter(c => c.id !== id));
  }

  function f(val: string, field: keyof typeof EMPTY_FORM) {
    setForm(p => ({ ...p, [field]: val }));
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    if (q && !([c.name, c.role, c.agency, c.productions_together] as (string | undefined)[]).some(v => v?.toLowerCase().includes(q))) return false;
    if (category !== 'All' && c.category !== category) return false;
    return true;
  });

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  const catColor = (cat?: string) => CATEGORY_COLORS[cat ?? ''] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <span className="font-bold text-gray-900">Film Contacts</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAdd}
              className="px-4 py-1.5 bg-amber-500 text-black text-sm font-bold rounded-lg hover:bg-amber-400 transition"
            >
              + Add Contact
            </button>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">← Dashboard</Link>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="sticky top-[53px] z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, agency, or production..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${category === cat ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Count */}
        {!loading && contacts.length > 0 && (
          <p className="text-sm text-gray-400 mb-4">
            {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Loading */}
        {loading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}

        {/* Empty state */}
        {!loading && contacts.length === 0 && (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-200">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-semibold text-gray-800 mb-1">Build your network</p>
            <p className="text-sm text-gray-400 mb-4">Save every contact you make on set. Your network is your career.</p>
            <button onClick={openAdd} className="px-5 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition">
              + Add Contact
            </button>
          </div>
        )}

        {!loading && contacts.length > 0 && filtered.length === 0 && (
          <div className="text-center py-8 bg-white rounded-2xl border border-gray-200 text-gray-400 text-sm">
            No contacts match your search.
          </div>
        )}

        {/* Contacts grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
              {/* Avatar + name */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.role}</p>
                </div>
              </div>

              {/* Category + agency */}
              <div className="flex flex-wrap gap-1.5">
                {c.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor(c.category)}`}>
                    {c.category}
                  </span>
                )}
                {c.agency && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {c.agency}
                  </span>
                )}
              </div>

              {/* Contact details */}
              <div className="space-y-1 text-xs text-gray-500">
                {c.phone     && <p>📞 {c.phone}</p>}
                {c.email     && <p className="truncate">✉️ {c.email}</p>}
                {c.instagram && <p>📸 {c.instagram}</p>}
                {c.date_met  && <p>Met: {c.date_met}</p>}
              </div>

              {c.productions_together && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Productions</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{c.productions_together}</p>
                </div>
              )}

              {c.notes && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Notes</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{c.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-1">
                <button onClick={() => openEdit(c)} className="flex-1 text-xs py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium">
                  Edit
                </button>
                <button onClick={() => deleteContact(c.id)} className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Copyright />

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50,
            overflowY: 'auto', display: 'flex', alignItems: 'flex-start',
            justifyContent: 'center', padding: '2rem 1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '520px',
            padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editContact ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 text-2xl font-bold leading-none">×</button>
            </div>

            <div className="space-y-3 max-h-[64vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Name *</label>
                  <input value={form.name} onChange={e => f(e.target.value, 'name')} placeholder="Full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Role / Title *</label>
                  <input value={form.role} onChange={e => f(e.target.value, 'role')} placeholder="e.g. 2nd AD, Agent" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                  <select value={form.category} onChange={e => f(e.target.value, 'category')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">Select...</option>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Agency / Company</label>
                  <input value={form.agency} onChange={e => f(e.target.value, 'agency')} placeholder="e.g. Premiere Extras" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => f(e.target.value, 'phone')} placeholder="604-555-0000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <input value={form.email} onChange={e => f(e.target.value, 'email')} placeholder="name@email.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Instagram</label>
                  <input value={form.instagram} onChange={e => f(e.target.value, 'instagram')} placeholder="@username" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Date Met</label>
                  <input type="date" value={form.date_met} onChange={e => f(e.target.value, 'date_met')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Productions Together</label>
                <textarea value={form.productions_together} onChange={e => f(e.target.value, 'productions_together')} rows={2} placeholder="e.g. The Rookie (2025), Supernatural pilot..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => f(e.target.value, 'notes')} rows={2} placeholder="Anything useful to remember..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.role.trim()}
                className="flex-1 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
