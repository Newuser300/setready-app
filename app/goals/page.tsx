'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Goal = {
  id: string;
  goal_type: string;
  goal_title: string;
  target_value: number;
  current_value: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
};

const PRESET_TYPES = [
  { type: 'work_days',          label: 'Days on Set',                icon: '🎬', defaultTarget: 50, description: 'Track the number of days you work on set.' },
  { type: 'register_agencies',  label: 'Register with Agencies',     icon: '🏢', defaultTarget: 5,  description: 'Submit your profile to new casting agencies.' },
  { type: 'earn_vouchers',      label: 'Earn Union Vouchers',        icon: '🎫', defaultTarget: 3,  description: 'Accumulate UBCP permit vouchers toward membership.' },
  { type: 'earn_certificates',  label: 'Earn SetReady Certificates', icon: '🏆', defaultTarget: 2,  description: 'Auto-tracked from your SetReady course progress.' },
  { type: 'refer_friends',      label: 'Refer Friends to SetReady',  icon: '🤝', defaultTarget: 3,  description: 'Help others in the industry get started.' },
  { type: 'custom',             label: 'Custom Goal',                icon: '🎯', defaultTarget: 1,  description: 'Set your own goal with a custom title and target.' },
];

export default function GoalsPage() {
  const router = useRouter();
  const [token, setToken]       = useState<string | null>(null);
  const [goals, setGoals]       = useState<Goal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [certCount, setCertCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('work_days');
  const [customTitle, setCustomTitle]   = useState('');
  const [targetValue, setTargetValue]   = useState(50);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth/sign-in'); return; }
      setToken(session.access_token);
      supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .then(({ count }) => setCertCount(count ?? 0));
    });
  }, [router]);

  const fetchGoals = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setGoals(await res.json());
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) fetchGoals(); }, [token, fetchGoals]);

  function getLiveValue(g: Goal) {
    if (g.goal_type === 'earn_certificates') return certCount;
    return g.current_value;
  }

  async function increment(goal: Goal) {
    if (!token || goal.goal_type === 'earn_certificates' || goal.completed) return;
    const newVal      = goal.current_value + 1;
    const nowComplete = newVal >= goal.target_value;
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: goal.id, current_value: newVal, completed: nowComplete }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGoals(gs => gs.map(g => g.id === goal.id ? updated : g));
    }
  }

  async function markComplete(goal: Goal) {
    if (!token) return;
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: goal.id, completed: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGoals(gs => gs.map(g => g.id === goal.id ? updated : g));
    }
  }

  async function deleteGoal(id: string) {
    if (!token || !confirm('Delete this goal?')) return;
    const res = await fetch(`/api/goals?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setGoals(gs => gs.filter(g => g.id !== id));
  }

  function openModal() {
    setSelectedType('work_days');
    setCustomTitle('');
    setTargetValue(50);
    setShowModal(true);
  }

  function onTypeChange(type: string) {
    setSelectedType(type);
    const preset = PRESET_TYPES.find(p => p.type === type);
    if (preset) setTargetValue(preset.defaultTarget);
  }

  async function addGoal() {
    if (!token) return;
    const preset = PRESET_TYPES.find(p => p.type === selectedType);
    const title  = selectedType === 'custom' ? customTitle.trim() : preset?.label ?? selectedType;
    if (!title) return;
    setSaving(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goal_type:     selectedType,
          goal_title:    title,
          target_value:  targetValue,
          current_value: 0,
          completed:     false,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchGoals();
      }
    } finally {
      setSaving(false);
    }
  }

  const activeGoals    = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  function GoalCard({ goal }: { goal: Goal }) {
    const live   = getLiveValue(goal);
    const pct    = Math.min(Math.round((live / goal.target_value) * 100), 100);
    const isAuto = goal.goal_type === 'earn_certificates';
    const isDone = goal.completed || live >= goal.target_value;
    const icon   = PRESET_TYPES.find(p => p.type === goal.goal_type)?.icon ?? '🎯';

    return (
      <div className={`bg-white rounded-2xl border shadow-sm p-5 ${isDone ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{icon}</span>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{goal.goal_title}</h3>
              {isAuto && <p className="text-xs text-blue-500">Auto-tracked</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isDone && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Done</span>
            )}
            {!isDone && !isAuto && (
              <button
                onClick={() => increment(goal)}
                className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-bold hover:bg-amber-200 transition"
              >
                +1
              </button>
            )}
            {!isDone && isAuto && pct >= 100 && (
              <button
                onClick={() => markComplete(goal)}
                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold hover:bg-green-200 transition"
              >
                Mark done
              </button>
            )}
            <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-400 transition font-bold text-sm ml-1">✕</button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-gray-800 shrink-0">
            {live}<span className="text-xs font-normal text-gray-400">/{goal.target_value}</span>
          </span>
        </div>
        <p className="text-xs text-gray-400">{pct}% complete</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-gray-900">My Goals</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openModal}
              className="px-4 py-1.5 bg-amber-500 text-black text-sm font-bold rounded-lg hover:bg-amber-400 transition"
            >
              + Add Goal
            </button>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">← Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Loading */}
        {loading && (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        )}

        {/* Active goals */}
        {!loading && activeGoals.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Active — {activeGoals.length}
            </h2>
            <div className="space-y-3">
              {activeGoals.map(g => <GoalCard key={g.id} goal={g} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && goals.length === 0 && (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-200">
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-semibold text-gray-800 mb-1">Set your first goal</p>
            <p className="text-sm text-gray-400 mb-4">
              Track what matters to your career as a background performer.
            </p>
            <button
              onClick={openModal}
              className="px-5 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition"
            >
              + Add Goal
            </button>
          </div>
        )}

        {/* Completed goals */}
        {!loading && completedGoals.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Completed — {completedGoals.length}
            </h2>
            <div className="space-y-3">
              {completedGoals.map(g => <GoalCard key={g.id} goal={g} />)}
            </div>
          </div>
        )}
      </div>

      {/* Add goal modal */}
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
            background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '480px',
            padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Add Goal</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 text-2xl font-bold leading-none">×</button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Goal Type</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {PRESET_TYPES.map(p => (
                  <button
                    key={p.type}
                    onClick={() => onTypeChange(p.type)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition ${selectedType === p.type ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span>{p.icon}</span>
                      <span className="font-bold text-sm text-gray-800">{p.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-6">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedType === 'custom' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Goal Title *</label>
                <input
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Land a featured extra role"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-500 mb-1">Target Number</label>
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={e => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={addGoal}
                disabled={saving || (selectedType === 'custom' && !customTitle.trim())}
                className="flex-1 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
