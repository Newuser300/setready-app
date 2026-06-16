'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

type Stats = {
  totalUsers: number;
  activeSubscribers: number;
  section2Purchases: number;
  totalCertificates: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
};

type RecentUser = {
  id: string;
  email: string;
  name: string | null;
  subscription_status: string | null;
  section2_unlocked: boolean;
  referral_code: string | null;
  referred_by: string | null;
  referrer_email: string | null;
  progress_count: number;
  created_at: string;
};

type IssuedCert = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  certificate_type: string;
  module_id: number | null;
  module_name: string | null;
  score: number;
  issued_at: string;
};

type InProgressUser = {
  user_id: string;
  email: string;
  name: string | null;
  completed_count: number;
  cert_count: number;
  module_numbers: number[];
};

type ModuleStat = {
  moduleNumber: number;
  title: string;
  completions: number;
  avgScore: number;
  certificates: number;
};

type SystemInfo = {
  stripeMode: string;
  vercelEnv: string;
};

type AdminRecord = {
  id: string;
  email: string;
  added_by: string;
  added_at: string;
};

type NavSection = 'overview' | 'users' | 'referrals' | 'certificates' | 'tools' | 'admins' | 'casting' | 'promos' | 'messages' | 'tester_codes' | 'photo_promo';

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
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStat[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');

  // Email download / copy
  const [allEmails, setAllEmails] = useState<string[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  // Admin management
  const [envAdmins, setEnvAdmins] = useState<string[]>([]);
  const [dbAdmins, setDbAdmins] = useState<AdminRecord[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [adminMgmtMessage, setAdminMgmtMessage] = useState('');
  const [adminMgmtError, setAdminMgmtError] = useState('');
  const [confirmNewAdmin, setConfirmNewAdmin] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Backfill modal
  const [showBackfill, setShowBackfill] = useState(false);
  const [backfillEmail, setBackfillEmail] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backfillUserInfo, setBackfillUserInfo] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backfillResults, setBackfillResults] = useState<any>(null);
  const [backfillError, setBackfillError] = useState('');

  // Certificates tab
  const [certsLoading, setCertsLoading] = useState(false);
  const [issuedCerts, setIssuedCerts] = useState<IssuedCert[]>([]);
  const [inProgressUsers, setInProgressUsers] = useState<InProgressUser[]>([]);
  const [certsLoaded, setCertsLoaded] = useState(false);
  const [showInProgress, setShowInProgress] = useState(false);

  // Remove user modal
  const [showRemoveUser, setShowRemoveUser] = useState(false);
  const [removeUserEmail, setRemoveUserEmail] = useState('');
  const [removeUserLoading, setRemoveUserLoading] = useState(false);
  const [removeUserInfo, setRemoveUserInfo] = useState<{
    id: string; email: string; name: string | null;
    subscription_status: string | null; stripe_subscription_id: string | null;
    subscription_started_at: string | null; within_30_days: boolean;
    created_at: string; completed_modules: number; certificates: number;
  } | null>(null);
  const [removeUserError, setRemoveUserError] = useState('');
  const [removeUserDone, setRemoveUserDone] = useState<string[] | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);

  // Casting tab
  const [castingSubTab, setCastingSubTab] = useState<'pending' | 'stats' | 'requests' | 'agents' | 'performers'>('pending');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [castingData, setCastingData] = useState<any>(null);
  const [castingLoading, setCastingLoading] = useState(false);

  // Review mode toggle
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewModeLoading, setReviewModeLoading] = useState(false);

  // Independent performer notifications
  const [notifyIndependent, setNotifyIndependent] = useState(false);
  const [notifyIndependentLoading, setNotifyIndependentLoading] = useState(false);
  const [emailIndependentPerformers, setEmailIndependentPerformers] = useState(false);
  const [emailIndependentLoading, setEmailIndependentLoading] = useState(false);
  const [emailAgentsOnRequest, setEmailAgentsOnRequest] = useState(false);
  const [emailAgentsLoading, setEmailAgentsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [exclusionsLoading, setExclusionsLoading] = useState(false);
  const [exclusionSearch, setExclusionSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [exclusionSearchResults, setExclusionSearchResults] = useState<any[]>([]);
  const [exclusionSearching, setExclusionSearching] = useState(false);
  const [exclusionReason, setExclusionReason] = useState('');

  // Agent controls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [performers, setPerformers] = useState<any[]>([]);
  const [performersLoading, setPerformersLoading] = useState(false);

  // Messages tab state
  const [msgSubTab, setMsgSubTab] = useState<'compose' | 'sent' | 'all' | 'stats' | 'restrictions'>('compose')
  const [agentsCanMessage, setAgentsCanMessage] = useState<boolean>(true)
  const [cdCanMessage, setCdCanMessage] = useState<boolean>(true)
  const [restrictionsLoading, setRestrictionsLoading] = useState(false)
  const [msgRecipientType, setMsgRecipientType] = useState('all_performers')
  const [msgSpecificRecipients, setMsgSpecificRecipients] = useState<any[]>([])
  const [msgSearch, setMsgSearch] = useState('')
  const [msgSearchResults, setMsgSearchResults] = useState<any[]>([])
  const [msgSearching, setMsgSearching] = useState(false)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgPriority, setMsgPriority] = useState('normal')
  const [msgActionUrl, setMsgActionUrl] = useState('')
  const [msgActionLabel, setMsgActionLabel] = useState('')
  const [msgSendEmail, setMsgSendEmail] = useState(false)
  const [msgSending, setMsgSending] = useState(false)
  const [msgSentResult, setMsgSentResult] = useState<any>(null)
  const [adminSentMessages, setAdminSentMessages] = useState<any[]>([])
  const [adminSentLoading, setAdminSentLoading] = useState(false)
  const [allPlatformMessages, setAllPlatformMessages] = useState<any[]>([])
  const [allMessagesLoading, setAllMessagesLoading] = useState(false)
  const [msgStats, setMsgStats] = useState<any>(null)
  const [msgStatsLoading, setMsgStatsLoading] = useState(false)
  const [msgViewDetail, setMsgViewDetail] = useState<any>(null)

  // Promo codes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', type: 'training', description: '', maxUses: '', expiresAt: '' });
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [promoUses, setPromoUses] = useState<any[]>([]);
  const [promoUsesLoading, setPromoUsesLoading] = useState(false);

  // Tester codes
  const [testerCodes, setTesterCodes] = useState<TesterCode[]>([]);
  const [testerCodesLoading, setTesterCodesLoading] = useState(false);
  const [generatingTesterCode, setGeneratingTesterCode] = useState(false);


  // Photo promo codes
  const [photoCodes, setPhotoCodes] = useState<PhotoPromoCode[]>([]);
  const [photoCodesLoading, setPhotoCodesLoading] = useState(false);
  const [generatingPhotoCode, setGeneratingPhotoCode] = useState(false);
  const [customPhotoCode, setCustomPhotoCode] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { createBrowserClient } = await import('@supabase/ssr')
    const browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await browserClient.auth.getUser()
    if (error || !user) { router.push('/auth/sign-in'); return; }
    const { data: { session } } = await browserClient.auth.getSession()
    setAccessToken(session?.access_token ?? '');

    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (!res.ok) { setError('Failed to load admin data.'); setLoading(false); return; }

    const data = await res.json();
    setStats(data.stats);
    setRecentUsers(data.recentUsers || []);
    setModuleStats(data.moduleStats || []);
    setSystemInfo(data.systemInfo);
    setLoading(false);
  }

  // ── Email helpers ──────────────────────────────────────────────────────────

  async function fetchAllEmails(token: string): Promise<string[]> {
    if (allEmails.length > 0) return allEmails;
    setEmailsLoading(true);
    try {
      const res = await fetch('/api/admin/emails', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const emails: string[] = data.emails || [];
      setAllEmails(emails);
      return emails;
    } finally {
      setEmailsLoading(false);
    }
  }

  async function downloadEmails() {
    const emails = await fetchAllEmails(accessToken);
    if (!emails.length) { toast.error('No emails found.'); return; }
    const blob = new Blob([emails.join(',\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `setready-emails-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${emails.length} emails`);
  }

  async function copyEmails() {
    const emails = await fetchAllEmails(accessToken);
    if (!emails.length) { toast.error('No emails found.'); return; }
    await navigator.clipboard.writeText(emails.join(', '));
    toast.success(`Copied ${emails.length} emails to clipboard`);
  }

  // ── Admin management helpers ───────────────────────────────────────────────

  async function loadAdmins() {
    setAdminsLoading(true);
    setAdminMgmtMessage('');
    setAdminMgmtError('');
    try {
      const res = await fetch('/api/admin/manage-admins', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) { setAdminMgmtError(data.error || 'Failed to load admins.'); return; }
      setEnvAdmins(data.envAdmins || []);
      setDbAdmins(data.dbAdmins || []);
    } finally {
      setAdminsLoading(false);
    }
  }

  async function addAdmin() {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    setAdminMgmtMessage('');
    setAdminMgmtError('');
    try {
      const res = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: newAdminEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAdminMgmtError(data.error || 'Failed to add admin.'); return; }
      setAdminMgmtMessage(`${newAdminEmail.trim()} added as admin.`);
      setNewAdminEmail('');
      setConfirmNewAdmin(false);
      await loadAdmins();
    } finally {
      setAddingAdmin(false);
    }
  }

  async function removeAdmin(id: string) {
    setRemovingAdminId(id);
    setAdminMgmtMessage('');
    setAdminMgmtError('');
    try {
      const res = await fetch(`/api/admin/manage-admins?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) { setAdminMgmtError(data.error || 'Failed to remove admin.'); return; }
      setAdminMgmtMessage('Admin removed.');
      setConfirmRemoveId(null);
      await loadAdmins();
    } finally {
      setRemovingAdminId(null);
    }
  }

  // ── Backfill helpers ───────────────────────────────────────────────────────

  function openBackfill() {
    setShowBackfill(true);
    setBackfillEmail('');
    setBackfillUserInfo(null);
    setBackfillResults(null);
    setBackfillError('');
  }

  function closeBackfill() {
    setShowBackfill(false);
    setBackfillEmail('');
    setBackfillUserInfo(null);
    setBackfillResults(null);
    setBackfillError('');
  }

  async function findBackfillUser() {
    if (!backfillEmail.trim()) return;
    setBackfillLoading(true);
    setBackfillError('');
    setBackfillUserInfo(null);
    setBackfillResults(null);
    const res = await fetch(`/api/admin/backfill-certificates?email=${encodeURIComponent(backfillEmail.trim())}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) setBackfillError(data.error || 'User not found.');
    else setBackfillUserInfo(data);
    setBackfillLoading(false);
  }

  // ── Certificates helpers ───────────────────────────────────────────────────

  async function loadCertificates() {
    if (certsLoaded) return;
    setCertsLoading(true);
    const res = await fetch('/api/admin/certificates', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setIssuedCerts(data.issuedCerts || []);
      setInProgressUsers(data.inProgress || []);
      setCertsLoaded(true);
    }
    setCertsLoading(false);
  }

  // ── Remove user helpers ────────────────────────────────────────────────────

  function openRemoveUser() {
    setShowRemoveUser(true);
    setRemoveUserEmail('');
    setRemoveUserInfo(null);
    setRemoveUserError('');
    setRemoveUserDone(null);
    setConfirmDeleteUser(false);
  }

  function closeRemoveUser() {
    setShowRemoveUser(false);
    setRemoveUserEmail('');
    setRemoveUserInfo(null);
    setRemoveUserError('');
    setRemoveUserDone(null);
    setConfirmDeleteUser(false);
  }

  async function findRemoveUser() {
    if (!removeUserEmail.trim()) return;
    setRemoveUserLoading(true);
    setRemoveUserError('');
    setRemoveUserInfo(null);
    const res = await fetch(`/api/admin/remove-user?email=${encodeURIComponent(removeUserEmail.trim())}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) setRemoveUserError(data.error || 'User not found.');
    else setRemoveUserInfo(data);
    setRemoveUserLoading(false);
  }

  async function executeRemoveUser() {
    if (!removeUserInfo) return;
    setRemoveUserLoading(true);
    setRemoveUserError('');
    const res = await fetch('/api/admin/remove-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ userId: removeUserInfo.id }),
    });
    const data = await res.json();
    if (!res.ok) setRemoveUserError(data.error || 'Deletion failed.');
    else setRemoveUserDone(data.log || []);
    setRemoveUserLoading(false);
    setConfirmDeleteUser(false);
  }

  async function runBackfill() {
    if (!backfillUserInfo?.userId) return;
    setBackfillLoading(true);
    setBackfillError('');
    const res = await fetch('/api/admin/backfill-certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ userId: backfillUserInfo.userId }),
    });
    const data = await res.json();
    if (!res.ok) setBackfillError(data.error || 'Backfill failed.');
    else setBackfillResults(data);
    setBackfillLoading(false);
  }

  async function loadReviewMode() {
    const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) {
      const data = await res.json();
      setReviewMode(data.casting_request_review_mode === 'true');
      setNotifyIndependent(data.notify_independent_performers === 'true');
      setEmailIndependentPerformers(data.email_independent_performers === 'true');
      setEmailAgentsOnRequest(data.email_agents_on_request === 'true');
    }
  }

  async function toggleNotifyIndependent() {
    setNotifyIndependentLoading(true);
    const newVal = !notifyIndependent;
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ key: 'notify_independent_performers', value: String(newVal) }),
    });
    setNotifyIndependent(newVal);
    setNotifyIndependentLoading(false);
  }

  async function toggleEmailIndependentPerformers() {
    setEmailIndependentLoading(true);
    const newVal = !emailIndependentPerformers;
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ key: 'email_independent_performers', value: String(newVal) }),
    });
    setEmailIndependentPerformers(newVal);
    setEmailIndependentLoading(false);
  }

  async function toggleEmailAgentsOnRequest() {
    setEmailAgentsLoading(true);
    const newVal = !emailAgentsOnRequest;
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ key: 'email_agents_on_request', value: String(newVal) }),
    });
    setEmailAgentsOnRequest(newVal);
    setEmailAgentsLoading(false);
  }

  async function loadExclusions() {
    setExclusionsLoading(true);
    const res = await fetch('/api/admin/casting-exclusions', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setExclusions(await res.json());
    setExclusionsLoading(false);
  }

  async function searchExclusionUsers() {
    if (!exclusionSearch.trim()) return;
    setExclusionSearching(true);
    setExclusionSearchResults([]);
    const res = await fetch(`/api/admin/casting-exclusions?search=${encodeURIComponent(exclusionSearch.trim())}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setExclusionSearchResults(data.users || []);
    }
    setExclusionSearching(false);
  }

  async function addExclusion(userId: string, userEmail: string) {
    await fetch('/api/admin/casting-exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ userId, reason: exclusionReason || null }),
    });
    setExclusionSearchResults([]);
    setExclusionSearch('');
    setExclusionReason('');
    loadExclusions();
  }

  async function removeExclusion(userId: string) {
    await fetch(`/api/admin/casting-exclusions?userId=${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    loadExclusions();
  }

  async function toggleReviewMode() {
    setReviewModeLoading(true);
    const newVal = !reviewMode;
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ key: 'casting_request_review_mode', value: String(newVal) }),
    });
    setReviewMode(newVal);
    setReviewModeLoading(false);
  }

  async function loadAgents() {
    setAgentsLoading(true);
    const res = await fetch('/api/admin/casting?type=agents', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setAgents(await res.json());
    setAgentsLoading(false);
  }

  async function toggleAgentSuspension(agentId: string, suspend: boolean) {
    await fetch('/api/admin/casting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: suspend ? 'suspend_agent' : 'restore_agent', id: agentId }),
    });
    loadAgents();
  }

  async function loadPerformers() {
    setPerformersLoading(true);
    const res = await fetch('/api/admin/casting?type=performers', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setPerformers(await res.json());
    setPerformersLoading(false);
  }

  async function loadPromoCodes() {
    setPromoLoading(true);
    const res = await fetch('/api/admin/promo?type=codes', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setPromoCodes(await res.json());
    setPromoLoading(false);
  }

  async function createPromoCode() {
    if (!promoForm.code.trim() || !promoForm.type) return;
    setPromoSubmitting(true);
    setPromoMsg('');
    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        code: promoForm.code.trim().toUpperCase(),
        type: promoForm.type,
        description: promoForm.description || null,
        maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses) : null,
        expiresAt: promoForm.expiresAt || null,
      }),
    });
    const data = await res.json();
    setPromoSubmitting(false);
    if (res.ok) {
      setPromoMsg('✓ Code created');
      setPromoForm({ code: '', type: 'training', description: '', maxUses: '', expiresAt: '' });
      loadPromoCodes();
    } else {
      setPromoMsg('✗ ' + (data.error || 'Failed'));
    }
  }

  async function togglePromoActive(id: string, is_active: boolean) {
    await fetch('/api/admin/promo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, is_active }),
    });
    loadPromoCodes();
  }

  async function deletePromoCode(id: string, code: string) {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return;
    await fetch('/api/admin/promo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id }),
    });
    loadPromoCodes();
  }

  function generatePromoCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setPromoForm(f => ({ ...f, code: 'SR' + random }));
  }

  async function loadPromoUses() {
    setPromoUsesLoading(true);
    const res = await fetch('/api/admin/promo?type=uses', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setPromoUses(await res.json());
    setPromoUsesLoading(false);
  }

  // ── Tester codes helpers ──────────────────────────────────────────────────

  async function fetchTesterCodes() {
    setTesterCodesLoading(true);
    const res = await fetch('/api/admin/tester-codes', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) setTesterCodes(await res.json());
    setTesterCodesLoading(false);
  }

  async function generateTesterCode() {
    setGeneratingTesterCode(true);
    const code = randomCode();
    const res = await fetch('/api/admin/tester-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      toast.success('Code generated: ' + code);
      fetchTesterCodes();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to generate code');
    }
    setGeneratingTesterCode(false);
  }

  async function deleteTesterCode(id: string) {
    if (!confirm('Delete this code?')) return;
    await fetch('/api/admin/tester-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id }),
    });
    fetchTesterCodes();
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  }

  // ── Photo promo helpers ────────────────────────────────────────────────────

  async function fetchPhotoCodes() {
    setPhotoCodesLoading(true);
    const res = await fetch('/api/admin/photo-promo-codes', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) setPhotoCodes(await res.json());
    setPhotoCodesLoading(false);
  }

  async function generatePhotoPromoCode(codeValue?: string) {
    setGeneratingPhotoCode(true);
    const code = (codeValue ?? randomCode()).toUpperCase().trim();
    if (!code) { setGeneratingPhotoCode(false); return; }
    const res = await fetch('/api/admin/photo-promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      toast.success('Photo promo code created: ' + code);
      setCustomPhotoCode('');
      fetchPhotoCodes();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to create code');
    }
    setGeneratingPhotoCode(false);
  }

  async function deletePhotoPromoCode(id: string) {
    if (!confirm('Delete this photo promo code?')) return;
    await fetch('/api/admin/photo-promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id }),
    });
    fetchPhotoCodes();
  }

  // ── Messages helpers ───────────────────────────────────────────────────────

  async function loadAdminSentMessages() {
    setAdminSentLoading(true)
    const res = await fetch('/api/admin/messages?view=sent', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) {
      const data = await res.json()
      setAdminSentMessages(data.messages || [])
    }
    setAdminSentLoading(false)
  }

  async function loadAllPlatformMessages() {
    setAllMessagesLoading(true)
    const res = await fetch('/api/admin/messages?view=all', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) {
      const data = await res.json()
      setAllPlatformMessages(data.messages || [])
    }
    setAllMessagesLoading(false)
  }

  async function loadMsgStats() {
    setMsgStatsLoading(true)
    const res = await fetch('/api/admin/messages?view=stats', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) setMsgStats(await res.json())
    setMsgStatsLoading(false)
  }

  async function searchMsgRecipients() {
    if (!msgSearch.trim()) return
    setMsgSearching(true)
    setMsgSearchResults([])
    // Search users, agents, casting directors
    const [usersRes, agentsRes] = await Promise.all([
      fetch(`/api/admin/users?search=${encodeURIComponent(msgSearch.trim())}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`/api/admin/casting?type=agents&search=${encodeURIComponent(msgSearch.trim())}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ])
    const results: any[] = []
    if (usersRes.ok) {
      const data = await usersRes.json()
      const users = Array.isArray(data) ? data : (data.users || [])
      users.forEach((u: any) => results.push({ id: u.id, email: u.email, name: u.name, type: 'performer' }))
    }
    if (agentsRes.ok) {
      const data = await agentsRes.json()
      const agents = Array.isArray(data) ? data : []
      agents.forEach((a: any) => results.push({ id: a.id, email: a.email || a.owner_email, name: a.name || a.agency_name, type: 'agent' }))
    }
    setMsgSearchResults(results.slice(0, 10))
    setMsgSearching(false)
  }

  function addMsgRecipient(recipient: any) {
    if (!msgSpecificRecipients.find(r => r.id === recipient.id)) {
      setMsgSpecificRecipients(prev => [...prev, recipient])
    }
    setMsgSearch('')
    setMsgSearchResults([])
  }

  async function sendAdminMessage() {
    if (!msgSubject.trim() || !msgBody.trim()) {
      toast.error('Subject and body are required')
      return
    }
    if (msgRecipientType === 'specific' && msgSpecificRecipients.length === 0) {
      toast.error('Please add at least one recipient')
      return
    }
    setMsgSending(true)
    setMsgSentResult(null)

    const res = await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        recipientType: msgRecipientType === 'specific' ? undefined : msgRecipientType,
        recipientIds: msgRecipientType === 'specific' ? msgSpecificRecipients : undefined,
        subject: msgSubject.trim(),
        body: msgBody.trim(),
        messageType: 'general',
        priority: msgPriority,
        actionUrl: msgActionUrl.trim() || undefined,
        actionLabel: msgActionLabel.trim() || undefined,
        sendEmail: msgSendEmail,
      }),
    })
    const data = await res.json()
    setMsgSending(false)
    if (res.ok) {
      setMsgSentResult(data)
      toast.success('Message sent!')
      setMsgSubject('')
      setMsgBody('')
      setMsgActionUrl('')
      setMsgActionLabel('')
      setMsgPriority('normal')
      setMsgSendEmail(false)
      setMsgSpecificRecipients([])
    } else {
      toast.error(data.error || 'Failed to send message')
    }
  }

  async function deleteAdminMessage(messageId: string) {
    if (!confirm('Delete this message?')) return
    await fetch('/api/admin/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ messageId }),
    })
    setAdminSentMessages(prev => prev.filter(m => m.id !== messageId))
    setAllPlatformMessages(prev => prev.filter(m => m.id !== messageId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/dashboard" className="text-blue-600 underline text-sm">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Certificates: group by user for compact display ───────────────────────
  const CERT_MODULE_NAMES: Record<number, string> = {
    1: 'Film Set Terminology',
    2: 'Background Acting Terms & Performance',
    3: 'Set Etiquette & Professional Conduct',
    4: 'Safety on Set',
    5: 'Industry Standards, Pay & Career Advancement',
    6: 'Foundation',
    7: 'Audition Technique',
    8: 'Scene Study',
    9: 'Advanced Technique',
  };

  type CertGroup = { email: string; name: string | null; certs: IssuedCert[]; lastEarned: string };
  const certsByUser: Record<string, CertGroup> = {};
  issuedCerts.forEach(cert => {
    if (!certsByUser[cert.user_email]) {
      certsByUser[cert.user_email] = { email: cert.user_email, name: cert.user_name, certs: [], lastEarned: cert.issued_at || '' };
    }
    certsByUser[cert.user_email].certs.push(cert);
    if (cert.issued_at && cert.issued_at > certsByUser[cert.user_email].lastEarned) {
      certsByUser[cert.user_email].lastEarned = cert.issued_at;
    }
  });
  const groupedCertUsers = Object.values(certsByUser).sort((a, b) => b.certs.length - a.certs.length);
  const usersWithAllSection1 = groupedCertUsers.filter(u =>
    [1, 2, 3, 4, 5].every(n => u.certs.some(c => c.module_id === n))
  ).length;

  const navItems: { key: NavSection; label: string; icon: string }[] = [
    { key: 'overview',     label: 'Overview',     icon: '📊' },
    { key: 'users',        label: 'Users',         icon: '👥' },
    { key: 'referrals',    label: 'Referrals',     icon: '💰' },
    { key: 'certificates', label: 'Certificates',  icon: '🏆' },
    { key: 'tools',        label: 'Tools',         icon: '🔧' },
    { key: 'admins',       label: 'Admins',        icon: '🔐' },
    { key: 'casting',      label: 'Casting',       icon: '🎬' },
    { key: 'promos',       label: 'Access Codes',  icon: '🎟️' },
    { key: 'messages',     label: 'Messages',      icon: '📬' },
    { key: 'tester_codes', label: 'Tester Codes',  icon: '🔑' },
    { key: 'photo_promo',  label: 'Photo Promos',   icon: '📸' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">SetReady</p>
              <h1 className="text-lg font-bold leading-tight">Admin Panel</h1>
            </div>
          </div>
          <Link href="/dashboard" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
            ← Dashboard
          </Link>
        </div>

        {/* ── Nav tabs ── */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-white/10 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => {
                setActiveSection(item.key);
                if (item.key === 'admins' && envAdmins.length === 0 && dbAdmins.length === 0) {
                  loadAdmins();
                }
                if (item.key === 'certificates') {
                  loadCertificates();
                }
                if (item.key === 'casting') {
                  loadReviewMode();
                  loadExclusions();
                }
                if (item.key === 'promos') {
                  loadPromoCodes();
                  loadPromoUses();
                }
                if (item.key === 'messages') {
                  loadAdminSentMessages();
                }
                if (item.key === 'tester_codes') {
                  fetchTesterCodes();
                }
                if (item.key === 'photo_promo') {
                  fetchPhotoCodes();
                }
              }}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                activeSection === item.key
                  ? 'border-blue-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ══════════════════════════════════════
            OVERVIEW
        ══════════════════════════════════════ */}
        {activeSection === 'overview' && stats && (
          <div className="space-y-8">

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: '👥', label: 'Total Users',             value: stats.totalUsers,                            color: 'text-blue-600' },
                { icon: '✅', label: 'Active Subscribers',      value: stats.activeSubscribers,                     color: 'text-green-600' },
                { icon: '🎓', label: 'Section 2 Purchases',     value: stats.section2Purchases,                     color: 'text-purple-600' },
                { icon: '🏆', label: 'Certificates Issued',     value: stats.totalCertificates,                     color: 'text-yellow-600' },
                { icon: '💰', label: 'Pending Payout Requests', value: stats.pendingPayouts,                        color: 'text-orange-600' },
                { icon: '💵', label: 'Total Pending Amount',    value: `$${stats.pendingPayoutAmount.toFixed(2)}`,  color: 'text-red-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{card.icon}</span>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide leading-tight">{card.label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Link href="/admin/referrals" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition cursor-pointer">
                  <div className="text-2xl mb-1">💰</div>
                  <p className="text-sm font-semibold text-gray-700">Referral Payouts</p>
                </Link>
                <button onClick={() => { openBackfill(); setActiveSection('tools'); }} className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">🔧</div>
                  <p className="text-sm font-semibold text-gray-700">Certificate Backfill</p>
                </button>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-sm font-semibold text-gray-700">Supabase</p>
                </a>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">💳</div>
                  <p className="text-sm font-semibold text-gray-700">Stripe</p>
                </a>
                <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">🚀</div>
                  <p className="text-sm font-semibold text-gray-700">Vercel</p>
                </a>
              </div>
            </div>

            {/* System Status */}
            {systemInfo && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3">System Status</h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Stripe Mode</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        systemInfo.stripeMode === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {systemInfo.stripeMode === 'LIVE' ? '🟢' : '🟡'} {systemInfo.stripeMode}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Supabase</p>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Connected</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Environment</p>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{systemInfo.vercelEnv}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            USERS
        ══════════════════════════════════════ */}
        {activeSection === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Recent Users</h2>
                <p className="text-sm text-gray-500">Latest 20 signups</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadEmails}
                  disabled={emailsLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {emailsLoading ? '...' : '⬇ Download All Emails'}
                </button>
                <button
                  onClick={copyEmails}
                  disabled={emailsLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {emailsLoading ? '...' : '📋 Copy All Emails'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Email', 'Name', 'Joined', 'Subscription', 'Progress', 'Section 2', 'Referral Code', 'Referred By'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {recentUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800 font-medium">{u.email}</td>
                        <td className="px-4 py-3 text-gray-600">{u.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.subscription_status === 'active' ? '✓ Active' : 'Not Subscribed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.progress_count > 0 ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              u.progress_count >= 9 ? 'bg-green-100 text-green-700'
                              : u.progress_count >= 5 ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {u.progress_count}/9 modules
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {u.section2_unlocked
                            ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">✓ Unlocked</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {u.referral_code
                            ? <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{u.referral_code}</code>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {u.referrer_email
                            ? <span className="text-xs text-gray-700">{u.referrer_email}</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {recentUsers.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            REFERRALS
        ══════════════════════════════════════ */}
        {activeSection === 'referrals' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Referral Payouts</h2>
            <p className="text-gray-500 text-sm">Manage payout requests, view commission history, and assign referral codes to users.</p>
            {stats && stats.pendingPayouts > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-orange-900">{stats.pendingPayouts} pending payout request{stats.pendingPayouts !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-orange-700">Total owed: ${stats.pendingPayoutAmount.toFixed(2)} CAD</p>
                </div>
              </div>
            )}
            <Link
              href="/admin/referrals"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              💰 Open Referral Payouts Manager →
            </Link>
          </div>
        )}

        {/* ══════════════════════════════════════
            CERTIFICATES
        ══════════════════════════════════════ */}
        {activeSection === 'certificates' && (
          <div className="space-y-5">

            {/* Summary stats */}
            {!certsLoading && certsLoaded && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: groupedCertUsers.length, label: 'Users with certificates', color: 'text-blue-600' },
                  { value: issuedCerts.length,       label: 'Total certificates issued', color: 'text-yellow-600' },
                  { value: usersWithAllSection1,     label: 'Completed all Section 1',   color: 'text-green-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Grouped certs table */}
            {certsLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Loading certificates...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm">Certificates by User</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, backgroundColor: '#1a1a2e' }} />
                      Section 1 (1–5)
                    </span>
                    <span className="flex items-center gap-1">
                      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, backgroundColor: '#7c3aed' }} />
                      Section 2 (6–9)
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Email', 'Certificates Earned', 'Count', 'Last Earned'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {groupedCertUsers.map(u => (
                        <tr key={u.email} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <p className="text-gray-800 text-xs font-medium">{u.email}</p>
                            {u.name && <p className="text-gray-400 text-xs">{u.name}</p>}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-px">
                              {u.certs
                                .filter(c => c.certificate_type === 'module' && c.module_id != null)
                                .sort((a, b) => (a.module_id ?? 0) - (b.module_id ?? 0))
                                .map(c => (
                                  <span
                                    key={c.id}
                                    title={`${CERT_MODULE_NAMES[c.module_id!] || `Module ${c.module_id}`} — ${c.score}%`}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 28, height: 22, borderRadius: 4,
                                      fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'default',
                                      backgroundColor: (c.module_id ?? 0) >= 6 ? '#7c3aed' : '#1a1a2e',
                                    }}
                                  >
                                    {c.module_id}
                                  </span>
                                ))
                              }
                              {u.certs
                                .filter(c => c.certificate_type !== 'module')
                                .map(c => (
                                  <span
                                    key={c.id}
                                    title={`${c.certificate_type} — ${c.score}%`}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      padding: '0 5px', height: 22, borderRadius: 4,
                                      fontSize: 10, fontWeight: 700, color: '#fff', cursor: 'default',
                                      backgroundColor: '#059669',
                                    }}
                                  >
                                    {c.certificate_type === 'section1' ? 'S1' : c.certificate_type === 'section2' ? 'S2' : c.certificate_type.substring(0, 3).toUpperCase()}
                                  </span>
                                ))
                              }
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 font-semibold text-sm">{u.certs.length}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {u.lastEarned ? new Date(u.lastEarned).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      ))}
                      {groupedCertUsers.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No certificates issued yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* In Progress — collapsible */}
            <div>
              <button
                onClick={() => setShowInProgress(p => !p)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition mb-3"
              >
                <span className="text-xs">{showInProgress ? '▲' : '▼'}</span>
                {showInProgress ? 'Hide' : 'Show'} In Progress ({inProgressUsers.length} users)
              </button>

              {showInProgress && (
                certsLoading ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {['Email', 'Modules Completed', 'Count'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {inProgressUsers.map(u => (
                            <tr key={u.user_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5">
                                <p className="text-gray-800 text-xs font-medium">{u.email}</p>
                                {u.name && <p className="text-gray-400 text-xs">{u.name}</p>}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap gap-px">
                                  {(u.module_numbers || []).map(n => (
                                    <span
                                      key={n}
                                      title={CERT_MODULE_NAMES[n] || `Module ${n}`}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 28, height: 22, borderRadius: 4,
                                        fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'default',
                                        backgroundColor: n >= 6 ? '#7c3aed' : '#1a1a2e',
                                        opacity: 0.65,
                                      }}
                                    >
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  u.completed_count >= 7 ? 'bg-green-100 text-green-700'
                                  : u.completed_count >= 4 ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {u.completed_count}/9
                                </span>
                              </td>
                            </tr>
                          ))}
                          {inProgressUsers.length === 0 && (
                            <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">No users currently in progress.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Backfill hint */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl shrink-0">🔧</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 text-sm">Missing a certificate?</p>
                <p className="text-xs text-amber-700">Use the Backfill Tool to regenerate certificates for any user.</p>
              </div>
              <button
                onClick={() => { openBackfill(); setActiveSection('tools'); }}
                className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition shrink-0"
              >
                Open Backfill →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TOOLS
        ══════════════════════════════════════ */}
        {activeSection === 'tools' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Tools & Utilities</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="font-bold text-gray-800 mb-1">Certificate Backfill</h3>
                <p className="text-sm text-gray-500 mb-4">Generate missing certificates for a user who completed modules but didn't receive them.</p>
                <button
                  onClick={openBackfill}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Open Backfill Tool
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl mb-3">🎁</div>
                <h3 className="font-bold text-gray-800 mb-1">Assign Referral Code</h3>
                <p className="text-sm text-gray-500 mb-4">Manually apply a referral code to a user who missed it at signup.</p>
                <Link
                  href="/admin/referrals"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition text-center"
                >
                  Go to Referrals Panel →
                </Link>
              </div>

              <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
                <div className="text-3xl mb-3">🗑️</div>
                <h3 className="font-bold text-gray-800 mb-1">Remove User Account</h3>
                <p className="text-sm text-gray-500 mb-4">Permanently delete a user: cancel their Stripe subscription (no refund per 30-day commitment policy), then remove all their data.</p>
                <button
                  onClick={openRemoveUser}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                >
                  Open Remove Tool
                </button>
              </div>

              {systemInfo && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-3xl mb-3">🖥️</div>
                  <h3 className="font-bold text-gray-800 mb-3">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stripe Mode</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        systemInfo.stripeMode === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {systemInfo.stripeMode === 'LIVE' ? '🟢' : '🟡'} {systemInfo.stripeMode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Supabase</span>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Environment</span>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{systemInfo.vercelEnv}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-700 mb-3">External Dashboards</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { href: 'https://supabase.com/dashboard', icon: '📊', label: 'Supabase Dashboard' },
                  { href: 'https://dashboard.stripe.com', icon: '💳', label: 'Stripe Dashboard' },
                  { href: 'https://vercel.com/dashboard', icon: '🚀', label: 'Vercel Dashboard' },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-300 hover:shadow-sm transition"
                  >
                    {link.icon} {link.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ADMINS
        ══════════════════════════════════════ */}
        {activeSection === 'admins' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Admin Management</h2>
                <p className="text-sm text-gray-500">Manage who has access to this admin panel.</p>
              </div>
              <button
                onClick={loadAdmins}
                disabled={adminsLoading}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition disabled:opacity-50"
              >
                {adminsLoading ? '...' : '↻ Refresh'}
              </button>
            </div>

            {adminMgmtMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{adminMgmtMessage}</div>
            )}
            {adminMgmtError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{adminMgmtError}</div>
            )}

            {/* Primary (env) admins */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Primary Admins</h3>
                  <p className="text-xs text-gray-500">Configured via ADMIN_EMAILS environment variable. Cannot be removed here.</p>
                </div>
              </div>
              {adminsLoading ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : envAdmins.length === 0 ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">No primary admins found.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {envAdmins.map(email => (
                    <li key={email} className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-800 font-medium">{email}</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">Primary Admin</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dynamic (db) admins */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Additional Admins</h3>
                  <p className="text-xs text-gray-500">Stored in the admin_emails table. Can be added or removed below.</p>
                </div>
              </div>
              {adminsLoading ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : dbAdmins.length === 0 ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">No additional admins yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {dbAdmins.map(record => (
                    <li key={record.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-800 font-medium">{record.email}</p>
                        <p className="text-xs text-gray-400">
                          Added by {record.added_by} · {new Date(record.added_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {confirmRemoveId === record.id ? (
                          <>
                            <span className="text-xs text-red-600 font-semibold">Remove this admin?</span>
                            <button
                              onClick={() => removeAdmin(record.id)}
                              disabled={removingAdminId === record.id}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                            >
                              {removingAdminId === record.id ? '...' : 'Yes, Remove'}
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setConfirmRemoveId(record.id); setAdminMgmtMessage(''); setAdminMgmtError(''); }}
                            className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add new admin */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-1 text-sm">Add New Admin</h3>
              <p className="text-xs text-gray-500 mb-4">Grant admin access to another email address. They must already have a SetReady account.</p>

              {!confirmNewAdmin ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newAdminEmail.trim()) setConfirmNewAdmin(true); }}
                    placeholder="admin@example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={() => { if (newAdminEmail.trim()) setConfirmNewAdmin(true); }}
                    disabled={!newAdminEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Add Admin
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-amber-900 font-semibold">
                    Grant admin access to <span className="font-bold">{newAdminEmail}</span>?
                  </p>
                  <p className="text-xs text-amber-700">This will give them full access to this admin panel.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={addAdmin}
                      disabled={addingAdmin}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                    >
                      {addingAdmin ? 'Adding...' : 'Confirm — Add Admin'}
                    </button>
                    <button
                      onClick={() => { setConfirmNewAdmin(false); setAdminMgmtError(''); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            CASTING PLATFORM
        ══════════════════════════════════════ */}
        {activeSection === 'promos' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">🎟️ Access Codes</h2>

            {/* Create Code Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Create New Code</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Code *</label>
                  <div className="flex gap-1.5">
                    <input
                      value={promoForm.code}
                      onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SETREADY2026"
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase tracking-wider font-mono"
                    />
                    <button
                      type="button"
                      onClick={generatePromoCode}
                      className="px-2 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition whitespace-nowrap"
                      title="Auto-generate SR + 6 chars"
                    >
                      ✨ Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
                  <select
                    value={promoForm.type}
                    onChange={e => setPromoForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="training">Training (Performer)</option>
                    <option value="agent_pro">Agent Pro</option>
                    <option value="casting_pro">Casting Pro</option>
                    <option value="press">Press (All types)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                  <input
                    value={promoForm.description}
                    onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Press access 2026"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Max Uses (blank = unlimited)</label>
                  <input
                    type="number"
                    value={promoForm.maxUses}
                    onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Expires At (blank = never)</label>
                  <input
                    type="date"
                    value={promoForm.expiresAt}
                    onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={createPromoCode}
                  disabled={promoSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {promoSubmitting ? 'Creating...' : 'Create Code'}
                </button>
                {promoMsg && <span className={`text-sm font-medium ${promoMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{promoMsg}</span>}
              </div>
            </div>

            {/* Active Codes Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">All Codes</h3>
                <button onClick={loadPromoCodes} className="text-xs text-blue-600 font-semibold hover:underline">
                  {promoLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {promoCodes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-400 text-sm mb-3">No promo codes yet.</p>
                  <button onClick={loadPromoCodes} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">
                    Load Codes
                  </button>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Uses</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Expires</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {promoCodes.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-gray-800 tracking-wider">{p.code}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            p.type === 'training' ? 'bg-blue-50 text-blue-700'
                            : p.type === 'agent_pro' ? 'bg-amber-50 text-amber-700'
                            : p.type === 'casting_pro' ? 'bg-purple-50 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>{p.type}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.description || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 font-semibold">
                          {p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-CA') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => togglePromoActive(p.id, !p.is_active)}
                              className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 font-medium"
                            >
                              {p.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deletePromoCode(p.id, p.code)}
                              className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Usage History */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">📋 Usage History</h3>
                <button onClick={loadPromoUses} className="text-xs text-blue-600 font-semibold hover:underline">
                  {promoUsesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {promoUsesLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : promoUses.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No usage records yet.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Used At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {promoUses.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-gray-800 tracking-wider text-xs">{u.promo_codes?.code || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{u.promo_codes?.type || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{u.user_email || u.user_id || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                          {u.used_at ? new Date(u.used_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TESTER CODES
        ══════════════════════════════════════ */}
        {activeSection === 'tester_codes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">🔑 Tester Codes</h2>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Generate New Access Code</h3>
              <button
                onClick={generateTesterCode}
                disabled={generatingTesterCode}
                className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {generatingTesterCode ? 'Generating...' : '+ Generate New Code'}
              </button>
              <p className="text-xs text-gray-500 mt-2">Codes never expire. Each code can be used once. Redeemed at /redeem.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">All Access Codes</h3>
                <button onClick={fetchTesterCodes} className="text-xs text-blue-600 font-semibold hover:underline">
                  {testerCodesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {testerCodes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No codes yet.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Used By</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {testerCodes.map(c => {
                      const isUsed = (c.uses_count || 0) >= (c.max_uses || 1);
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-bold text-gray-800 tracking-wider">{c.code}</td>
                          <td className="px-4 py-3">
                            {!c.is_active
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Inactive</span>
                              : isUsed
                                ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">Used</span>
                                : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">Available</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString('en-CA')}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{c.used_by ? c.used_by.substring(0, 8) + '...' : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => copyToClipboard(c.code)} className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 font-medium">Copy</button>
                              <button onClick={() => deleteTesterCode(c.id)} className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {testerCodes.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                  Total: {testerCodes.length} · Available: {testerCodes.filter(c => c.is_active && (c.uses_count || 0) < (c.max_uses || 1)).length} · Used: {testerCodes.filter(c => !c.is_active || (c.uses_count || 0) >= (c.max_uses || 1)).length}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            PHOTO PROMO CODES
        ══════════════════════════════════════ */}
        {activeSection === 'photo_promo' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">📸 Photo Promo Codes</h2>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-700">Create Photo Promo Code</h3>

              <div className="flex gap-3 flex-wrap items-center">
                <button
                  onClick={() => generatePhotoPromoCode()}
                  disabled={generatingPhotoCode}
                  className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {generatingPhotoCode ? 'Creating...' : '+ Generate Random Code'}
                </button>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  placeholder="Or enter a custom code (e.g. PHOTOTEST)"
                  value={customPhotoCode}
                  onChange={e => setCustomPhotoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={24}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => generatePhotoPromoCode(customPhotoCode)}
                  disabled={generatingPhotoCode || !customPhotoCode.trim()}
                  className="px-4 py-2 bg-teal-700 text-white text-sm font-bold rounded-lg hover:bg-teal-800 disabled:opacity-50"
                >
                  Add Custom Code
                </button>
              </div>

              <p className="text-xs text-gray-500">Codes never expire. Each code unlocks 4 extra photo slots for one user.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">All Photo Promo Codes</h3>
                <button onClick={fetchPhotoCodes} className="text-xs text-blue-600 font-semibold hover:underline">
                  {photoCodesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {photoCodes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No photo promo codes yet. Generate one above.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Used By</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Used At</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {photoCodes.map(pc => (
                      <tr key={pc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-gray-800 tracking-wider">{pc.code}</td>
                        <td className="px-4 py-3">
                          {pc.is_used
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">Used</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">Available</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(pc.created_at).toLocaleDateString('en-CA')}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{pc.used_by ? pc.used_by.substring(0, 8) + '...' : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{pc.used_at ? new Date(pc.used_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => copyToClipboard(pc.code)} className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 font-medium">Copy</button>
                            <button onClick={() => deletePhotoPromoCode(pc.id)} className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {photoCodes.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                  Total: {photoCodes.length} · Available: {photoCodes.filter(c => !c.is_used).length} · Used: {photoCodes.filter(c => c.is_used).length}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'casting' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-800">🎬 Casting Platform</h2>
            </div>

            {/* Review Mode Toggle */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800 text-sm">Casting Request Review Mode</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {reviewMode
                    ? 'ON — New casting requests require admin review before being sent to agents.'
                    : 'OFF — Casting requests go directly to agents immediately.'}
                </p>
              </div>
              <button
                onClick={toggleReviewMode}
                disabled={reviewModeLoading}
                style={{ flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px', backgroundColor: reviewMode ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: '4px', left: reviewMode ? '28px' : '4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {/* Casting Request Notifications */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginTop: '4px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 20px' }}>📢 Casting Request Notifications</h3>

              {/* Toggle: Email agents on request */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '15px' }}>📧 Email agents when request posted</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    All approved agents receive an email with full casting details when a new request is posted
                  </div>
                </div>
                <button
                  onClick={toggleEmailAgentsOnRequest}
                  disabled={emailAgentsLoading}
                  style={{ flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px', backgroundColor: emailAgentsOnRequest ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', marginLeft: '16px' }}
                >
                  <div style={{ position: 'absolute', top: '4px', left: emailAgentsOnRequest ? '28px' : '4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              {/* Toggle: Notify independent performers + sub-toggle for email */}
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '15px' }}>👤 Notify self-represented performers</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      Performers with no agency receive in-app notifications for new casting requests
                    </div>
                  </div>
                  <button
                    onClick={toggleNotifyIndependent}
                    disabled={notifyIndependentLoading}
                    style={{ flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px', backgroundColor: notifyIndependent ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', marginLeft: '16px' }}
                  >
                    <div style={{ position: 'absolute', top: '4px', left: notifyIndependent ? '28px' : '4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>

                {/* Sub-toggle: Email independent performers — only when parent is ON */}
                {notifyIndependent && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '14px' }}>📧 Also email these performers</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                        Send email notification in addition to in-app notification
                      </div>
                    </div>
                    <button
                      onClick={toggleEmailIndependentPerformers}
                      disabled={emailIndependentLoading}
                      style={{ flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px', backgroundColor: emailIndependentPerformers ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', marginLeft: '16px' }}
                    >
                      <div style={{ position: 'absolute', top: '4px', left: emailIndependentPerformers ? '28px' : '4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Exclusion list — only when notifyIndependent is ON */}
              {notifyIndependent && (
                <div style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 6px' }}>🚫 Exclusion List</h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                    These performers will NOT receive casting notifications even when independent notifications are ON.
                  </p>

                  {/* Search */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Search by email or name..."
                      value={exclusionSearch}
                      onChange={e => setExclusionSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchExclusionUsers()}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                    />
                    <button
                      onClick={searchExclusionUsers}
                      disabled={exclusionSearching}
                      className="px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      {exclusionSearching ? '...' : 'Search'}
                    </button>
                  </div>

                  {/* Search results */}
                  {exclusionSearchResults.length > 0 && (
                    <div className="bg-white border border-orange-200 rounded-lg p-2 mb-3 space-y-1">
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={exclusionReason}
                        onChange={e => setExclusionReason(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                      />
                      {exclusionSearchResults.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 rounded border border-gray-100">
                          <div>
                            <span className="text-xs font-semibold text-gray-800">{u.email}</span>
                            {u.name && <span className="text-xs text-gray-400 ml-2">{u.name}</span>}
                          </div>
                          <button
                            onClick={() => addExclusion(u.id, u.email)}
                            className="px-2 py-1 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                          >
                            Exclude
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Current exclusions */}
                  {exclusionsLoading ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                  ) : exclusions.length === 0 ? (
                    <p className="text-xs text-gray-500">No exclusions yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {exclusions.map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-orange-100 rounded-lg">
                          <div>
                            <span className="text-xs font-semibold text-gray-800">{ex.user_email || ex.user_id}</span>
                            {ex.user_name && <span className="text-xs text-gray-400 ml-2">{ex.user_name}</span>}
                            {ex.reason && <span className="text-xs text-gray-400 ml-2">— {ex.reason}</span>}
                          </div>
                          <button
                            onClick={() => removeExclusion(ex.user_id)}
                            className="px-2 py-1 text-xs font-bold bg-white text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
              {([
                { key: 'pending',    label: 'Pending Applications' },
                { key: 'stats',      label: 'Platform Stats' },
                { key: 'requests',   label: 'All Requests' },
                { key: 'agents',     label: 'Agents' },
                { key: 'performers', label: 'Performers' },
              ] as const).map(t => (
                <button key={t.key} onClick={async () => {
                  setCastingSubTab(t.key)
                  if (t.key === 'agents') { loadAgents(); return; }
                  if (t.key === 'performers') { loadPerformers(); return; }
                  setCastingLoading(true)
                  const res = await fetch(`/api/admin/casting?type=${t.key}`, { headers: { Authorization: `Bearer ${accessToken}` } })
                  setCastingLoading(false)
                  if (res.ok) setCastingData(await res.json())
                }}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px whitespace-nowrap ${castingSubTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {castingLoading && <div className="text-center py-10 text-gray-400">Loading...</div>}

            {/* Pending Applications */}
            {!castingLoading && castingSubTab === 'pending' && castingData && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Casting Directors ({castingData.castingDirectors?.length || 0} pending)</h3>
                  {castingData.castingDirectors?.length === 0
                    ? <p className="text-gray-400 text-sm">No pending casting director applications.</p>
                    : castingData.castingDirectors?.map((cd: any) => (
                      <div key={cd.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-gray-800">{cd.name} <span className="font-normal text-gray-500">· {cd.company}</span></div>
                          <div className="text-sm text-gray-500">{cd.email} {cd.phone && `· ${cd.phone}`}</div>
                          {cd.description && <div className="text-xs text-gray-400 mt-1">{cd.description}</div>}
                          <div className="text-xs text-gray-300 mt-1">{new Date(cd.created_at).toLocaleString('en-CA')}</div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={async () => {
                            await fetch('/api/admin/casting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id: cd.id, entityType: 'casting_director' }) })
                            setCastingData((d: any) => ({ ...d, castingDirectors: d.castingDirectors.filter((x: any) => x.id !== cd.id) }))
                          }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">Approve</button>
                          <button onClick={async () => {
                            if (!confirm('Reject and delete this application?')) return
                            await fetch('/api/admin/casting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', id: cd.id, entityType: 'casting_director' }) })
                            setCastingData((d: any) => ({ ...d, castingDirectors: d.castingDirectors.filter((x: any) => x.id !== cd.id) }))
                          }} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100">Reject</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Agencies ({castingData.agencies?.length || 0} pending)</h3>
                  {castingData.agencies?.length === 0
                    ? <p className="text-gray-400 text-sm">No pending agency applications.</p>
                    : castingData.agencies?.map((ag: any) => (
                      <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-gray-800">{ag.name}</div>
                          <div className="text-sm text-gray-500">{ag.contact_name} · {ag.email} {ag.phone && `· ${ag.phone}`}</div>
                          {ag.city && <div className="text-xs text-gray-400 mt-1">{ag.city}{ag.website && ` · ${ag.website}`}</div>}
                          <div className="text-xs text-gray-300 mt-1">{new Date(ag.created_at).toLocaleString('en-CA')}</div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={async () => {
                            await fetch('/api/admin/casting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id: ag.id, entityType: 'agency' }) })
                            setCastingData((d: any) => ({ ...d, agencies: d.agencies.filter((x: any) => x.id !== ag.id) }))
                          }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">Approve</button>
                          <button onClick={async () => {
                            if (!confirm('Reject and delete this application?')) return
                            await fetch('/api/admin/casting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', id: ag.id, entityType: 'agency' }) })
                            setCastingData((d: any) => ({ ...d, agencies: d.agencies.filter((x: any) => x.id !== ag.id) }))
                          }} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100">Reject</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Platform Stats */}
            {!castingLoading && castingSubTab === 'stats' && castingData && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Verified CDs', value: castingData.totalCDs },
                  { label: 'Approved Agencies', value: castingData.totalAgencies },
                  { label: 'Public Performers', value: castingData.totalPerformers },
                  { label: 'Casting Requests', value: castingData.totalRequests },
                  { label: 'Total Submissions', value: castingData.totalSubmissions },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                    <div className="text-3xl font-black text-gray-800">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* All Requests */}
            {!castingLoading && castingSubTab === 'requests' && castingData && (
              <div className="space-y-3">
                {castingData.length === 0 && <p className="text-gray-400 text-sm">No casting requests yet.</p>}
                {castingData.map((r: any) => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{r.production_name}</div>
                      <div className="text-sm text-gray-500">{r.role_type} · {r.shoot_date} · {(r.casting_directors as any)?.company || (r.casting_directors as any)?.name}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Load initial data on mount */}
            {!castingLoading && !castingData && castingSubTab !== 'agents' && castingSubTab !== 'performers' && (
              <button onClick={async () => {
                setCastingLoading(true)
                const res = await fetch('/api/admin/casting?type=pending', { headers: { Authorization: `Bearer ${accessToken}` } })
                setCastingLoading(false)
                if (res.ok) setCastingData(await res.json())
              }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                Load Casting Data
              </button>
            )}

            {/* Agents Sub-tab */}
            {castingSubTab === 'agents' && (
              <div>
                {agentsLoading ? (
                  <div className="text-center py-10 text-gray-400">Loading agents...</div>
                ) : agents.length === 0 ? (
                  <p className="text-gray-400 text-sm">No agents found.</p>
                ) : agents.map((ag: any) => (
                  <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-800">{ag.agency_name || ag.name}</div>
                      <div className="text-sm text-gray-500">{ag.owner_email || ag.email}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {[ag.city, ag.province].filter(Boolean).join(', ')}
                        {ag.licence_number && <span className="ml-2 text-amber-600 font-medium">Lic. {ag.licence_number}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ag.is_suspended ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                          {ag.is_suspended ? '🚫 Suspended' : '✅ Active'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ag.can_receive_requests !== false ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {ag.can_receive_requests !== false ? 'Receiving Requests' : 'Requests Blocked'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {ag.is_suspended ? (
                        <button
                          onClick={() => toggleAgentSuspension(ag.id, false)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
                        >Restore</button>
                      ) : (
                        <button
                          onClick={() => { if (confirm(`Suspend ${ag.agency_name || ag.name}?`)) toggleAgentSuspension(ag.id, true) }}
                          className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100"
                        >Suspend</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Performers Sub-tab */}
            {castingSubTab === 'performers' && (
              <div>
                {performersLoading ? (
                  <div className="text-center py-10 text-gray-400">Loading performers...</div>
                ) : performers.length === 0 ? (
                  <p className="text-gray-400 text-sm">No performers with availability set.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Union Status</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Priority</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">This Month</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Next Month</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Agency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {performers.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{p.name || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{p.email}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{p.union_status || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                p.union_priority === 1 ? 'bg-purple-100 text-purple-700'
                                : p.union_priority === 2 ? 'bg-blue-100 text-blue-700'
                                : p.union_priority === 3 ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                              }`}>P{p.union_priority ?? 4}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 font-semibold">{p.this_month_available ?? 0}</td>
                            <td className="px-4 py-3 text-gray-700">{p.next_month_available ?? 0}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{p.agency_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          MESSAGES
      ══════════════════════════════════════ */}
      {activeSection === 'messages' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">📬 Message Center</h2>

          {/* Sub-tabs */}
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
            {([
              { key: 'compose',      label: '📝 Compose' },
              { key: 'sent',         label: '📤 Sent Messages' },
              { key: 'all',          label: '🗂️ All Platform Messages' },
              { key: 'stats',        label: '📊 Stats' },
              { key: 'restrictions', label: '⚙️ Restrictions' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={async () => {
                  setMsgSubTab(t.key)
                  if (t.key === 'sent') loadAdminSentMessages()
                  if (t.key === 'all') loadAllPlatformMessages()
                  if (t.key === 'stats') loadMsgStats()
                  if (t.key === 'restrictions') {
                    setRestrictionsLoading(true)
                    try {
                      const res = await fetch('/api/admin/settings', {
                        headers: { Authorization: `Bearer ${accessToken}` },
                      })
                      if (res.ok) {
                        const data = await res.json()
                        setAgentsCanMessage(data.agents_can_message !== 'false')
                        setCdCanMessage(data.casting_directors_can_message !== 'false')
                      }
                    } finally {
                      setRestrictionsLoading(false)
                    }
                  }
                }}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${msgSubTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── COMPOSE ── */}
          {msgSubTab === 'compose' && (
            <div className="space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

                {/* Recipient selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Recipients</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { key: 'all_performers', label: '👥 All Performers' },
                      { key: 'all_agents',     label: '🏢 All Agents' },
                      { key: 'all_casting_directors', label: '🎬 All Casting Directors' },
                      { key: 'all_users',      label: '🌐 Everyone' },
                      { key: 'specific',       label: '👤 Specific User' },
                    ].map(r => (
                      <button
                        key={r.key}
                        onClick={() => { setMsgRecipientType(r.key); setMsgSpecificRecipients([]); setMsgSearchResults([]); setMsgSearch(''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${msgRecipientType === r.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {msgRecipientType === 'specific' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={msgSearch}
                          onChange={e => setMsgSearch(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && searchMsgRecipients()}
                          placeholder="Search by name or email..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button onClick={searchMsgRecipients} disabled={msgSearching} className="px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50">
                          {msgSearching ? '...' : 'Search'}
                        </button>
                      </div>
                      {msgSearchResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          {msgSearchResults.map(u => (
                            <button
                              key={u.id}
                              onClick={() => addMsgRecipient(u)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <span className="text-sm font-medium text-gray-800">{u.email}</span>
                                {u.name && <span className="text-xs text-gray-400 ml-2">{u.name}</span>}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.type === 'agent' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {u.type}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {msgSpecificRecipients.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msgSpecificRecipients.map(r => (
                            <div key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
                              <span>{r.email}</span>
                              <button onClick={() => setMsgSpecificRecipients(prev => prev.filter(x => x.id !== r.id))} className="text-blue-400 hover:text-blue-600 font-bold">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Priority</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'normal', label: 'Normal', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                      { key: 'high',   label: '⚡ High',   color: 'bg-amber-100 text-amber-800 border-amber-200' },
                      { key: 'urgent', label: '🚨 Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
                    ].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setMsgPriority(p.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${msgPriority === p.key ? 'ring-2 ring-offset-1 ring-blue-500 ' + p.color : p.color + ' opacity-60 hover:opacity-100'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Subject *</label>
                  <input
                    type="text"
                    value={msgSubject}
                    onChange={e => setMsgSubject(e.target.value)}
                    placeholder="Message subject..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Message *</label>
                  <textarea
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    placeholder="Write your message here..."
                    rows={6}
                    style={{ minHeight: '150px' }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                  />
                </div>

                {/* Action button (optional) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Button Label (optional)</label>
                    <input
                      type="text"
                      value={msgActionLabel}
                      onChange={e => setMsgActionLabel(e.target.value)}
                      placeholder="e.g. View Dashboard"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Button URL (optional)</label>
                    <input
                      type="text"
                      value={msgActionUrl}
                      onChange={e => setMsgActionUrl(e.target.value)}
                      placeholder="e.g. /dashboard"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Email toggle */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Also send via email</div>
                    <div className="text-xs text-gray-500">Sends an email in addition to the in-app message</div>
                  </div>
                  <button
                    onClick={() => setMsgSendEmail(v => !v)}
                    style={{ flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px', backgroundColor: msgSendEmail ? '#22c55e' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                  >
                    <div style={{ position: 'absolute', top: '4px', left: msgSendEmail ? '28px' : '4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>

                {/* Success result */}
                {msgSentResult && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800">✅ Message sent successfully!</p>
                    {msgSentResult.emailCount > 0 && (
                      <p className="text-sm text-green-700 mt-1">📧 Emails sent to {msgSentResult.emailCount} address{msgSentResult.emailCount !== 1 ? 'es' : ''}</p>
                    )}
                  </div>
                )}

                {/* Send button */}
                <button
                  onClick={sendAdminMessage}
                  disabled={msgSending || !msgSubject.trim() || !msgBody.trim()}
                  className="w-full py-3 bg-amber-500 text-gray-900 font-bold text-base rounded-xl hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  {msgSending ? 'Sending...' : '📬 Send Message'}
                </button>
              </div>
            </div>
          )}

          {/* ── SENT MESSAGES ── */}
          {msgSubTab === 'sent' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Sent by Admin</h3>
                <button onClick={loadAdminSentMessages} className="text-xs text-blue-600 font-semibold hover:underline">{adminSentLoading ? 'Loading...' : 'Refresh'}</button>
              </div>
              {adminSentLoading ? (
                <div className="text-center py-10 text-gray-400">Loading...</div>
              ) : adminSentMessages.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No messages sent yet.</div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Recipients</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Sent</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {adminSentMessages.map((m: any) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800 text-sm">{m.subject}</p>
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.body?.slice(0, 60)}...</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                              {m.recipient_type === 'all_performers' ? '👥 All Performers'
                                : m.recipient_type === 'all_agents' ? '🏢 All Agents'
                                : m.recipient_type === 'all_users' ? '🌐 Everyone'
                                : m.recipient_type === 'all_casting_directors' ? '🎬 All CDs'
                                : m.email_to || 'Specific user'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{m.message_type}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {m.email_sent ? `📧 Sent` : 'In-app only'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(m.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => setMsgViewDetail(m)} className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">View</button>
                                <button onClick={() => deleteAdminMessage(m.id)} className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ALL PLATFORM MESSAGES ── */}
          {msgSubTab === 'all' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">All Platform Messages</h3>
                <button onClick={loadAllPlatformMessages} className="text-xs text-blue-600 font-semibold hover:underline">{allMessagesLoading ? 'Loading...' : 'Refresh'}</button>
              </div>
              {allMessagesLoading ? (
                <div className="text-center py-10 text-gray-400">Loading...</div>
              ) : allPlatformMessages.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No messages on the platform yet.</div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">From</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">To</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Read</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allPlatformMessages.map((m: any) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800 text-sm">{m.subject}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{m.sender_name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{m.recipient_type}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{m.message_type}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              {m.is_read
                                ? <span className="text-green-600 text-xs font-semibold">✓ Read</span>
                                : <span className="text-gray-400 text-xs">Unread</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(m.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-2">
                                <button onClick={() => setMsgViewDetail(m)} className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">View</button>
                                <button onClick={() => deleteAdminMessage(m.id)} className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STATS ── */}
          {msgSubTab === 'stats' && (
            <div className="space-y-6">
              {msgStatsLoading ? (
                <div className="text-center py-10 text-gray-400">Loading stats...</div>
              ) : msgStats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Messages', value: msgStats.totalMessages, color: 'text-blue-600' },
                      { label: 'This Week', value: msgStats.weekMessages, color: 'text-green-600' },
                      { label: 'Email Delivery Rate', value: `${msgStats.emailDeliveryRate}%`, color: 'text-amber-600' },
                      { label: 'Avg Read Rate', value: `${msgStats.averageReadRate}%`, color: 'text-purple-600' },
                      { label: 'Top Message Type', value: msgStats.topMessageType, color: 'text-gray-700' },
                    ].map(s => (
                      <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {msgStats.dailyCounts && Object.keys(msgStats.dailyCounts).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h4 className="font-bold text-gray-700 mb-4 text-sm">Messages per Day (Last 30 days)</h4>
                      <div className="flex items-end gap-1" style={{ height: '80px' }}>
                        {Object.entries(msgStats.dailyCounts).map(([day, count]: [string, any]) => {
                          const maxCount = Math.max(...Object.values(msgStats.dailyCounts) as number[])
                          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                          return (
                            <div key={day} title={`${day}: ${count}`} style={{ flex: 1, backgroundColor: '#3b82f6', height: `${Math.max(pct, 4)}%`, borderRadius: '2px 2px 0 0', minWidth: '4px' }} />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button onClick={loadMsgStats} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Load Stats</button>
              )}
            </div>
          )}

          {/* ── RESTRICTIONS ── */}
          {msgSubTab === 'restrictions' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold text-gray-800 mb-1">Messaging Permissions</h3>
                <p className="text-sm text-gray-500 mb-6">Control who can initiate new conversations. Restricting a role only prevents composing new messages — they can still reply to messages they receive.</p>

                {restrictionsLoading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Loading settings...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Agents toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">🏢 Agents can compose messages</p>
                        <p className="text-xs text-gray-500 mt-0.5">Allow agents to initiate new conversations with performers and casting directors</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newVal = !agentsCanMessage
                          setAgentsCanMessage(newVal)
                          await fetch('/api/admin/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                            body: JSON.stringify({ key: 'agents_can_message', value: String(newVal) }),
                          })
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${agentsCanMessage ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${agentsCanMessage ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Casting directors toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">🎬 Casting directors can compose messages</p>
                        <p className="text-xs text-gray-500 mt-0.5">Allow casting directors to initiate new conversations with performers and agents</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newVal = !cdCanMessage
                          setCdCanMessage(newVal)
                          await fetch('/api/admin/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                            body: JSON.stringify({ key: 'casting_directors_can_message', value: String(newVal) }),
                          })
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cdCanMessage ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cdCanMessage ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 pt-2">Changes take effect immediately. Performers cannot compose messages — this is hardcoded by design.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message detail modal */}
      {msgViewDetail && (
        <div onClick={() => setMsgViewDetail(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Message Detail</h2>
              <button onClick={() => setMsgViewDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Subject</p>
                <p className="font-semibold text-gray-800">{msgViewDetail.subject}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">From</p><p className="text-gray-700">{msgViewDetail.sender_name}</p></div>
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">To</p><p className="text-gray-700">{msgViewDetail.recipient_type}{msgViewDetail.email_to ? ` (${msgViewDetail.email_to})` : ''}</p></div>
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Type</p><p className="text-gray-700">{msgViewDetail.message_type}</p></div>
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Priority</p><p className="text-gray-700">{msgViewDetail.priority}</p></div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Body</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg">{msgViewDetail.body}</p>
              </div>
              {msgViewDetail.action_url && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Action</p>
                  <p className="text-sm text-blue-600">{msgViewDetail.action_label || 'View Details'} → {msgViewDetail.action_url}</p>
                </div>
              )}
              <p className="text-xs text-gray-400">Sent: {new Date(msgViewDetail.created_at).toLocaleString('en-CA')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          REMOVE USER MODAL
      ══════════════════════════════════════ */}
      {showRemoveUser && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeRemoveUser(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">🗑️ Remove User Account</h2>
                <p className="text-xs text-gray-500">Permanently delete a user and cancel their subscription</p>
              </div>
              <button onClick={closeRemoveUser} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {removeUserError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{removeUserError}</div>
              )}

              {!removeUserInfo && !removeUserDone && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={removeUserEmail}
                      onChange={e => setRemoveUserEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') findRemoveUser(); }}
                      placeholder="user@example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={findRemoveUser}
                      disabled={removeUserLoading || !removeUserEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {removeUserLoading ? '...' : 'Find User'}
                    </button>
                  </div>
                </div>
              )}

              {removeUserInfo && !removeUserDone && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1.5 text-sm">
                    <p><span className="font-semibold text-gray-600">Email:</span> {removeUserInfo.email}</p>
                    <p><span className="font-semibold text-gray-600">Name:</span> {removeUserInfo.name || '—'}</p>
                    <p><span className="font-semibold text-gray-600">Status:</span> {removeUserInfo.subscription_status || 'none'}</p>
                    {removeUserInfo.subscription_started_at && (
                      <p><span className="font-semibold text-gray-600">Subscribed:</span> {new Date(removeUserInfo.subscription_started_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    )}
                    <p><span className="font-semibold text-gray-600">Joined:</span> {new Date(removeUserInfo.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    <p><span className="font-semibold text-gray-600">Completed Modules:</span> {removeUserInfo.completed_modules}</p>
                    <p><span className="font-semibold text-gray-600">Certificates:</span> {removeUserInfo.certificates}</p>
                    {removeUserInfo.stripe_subscription_id && (
                      <p className="text-orange-700 font-semibold text-xs mt-2">⚠ Active subscription will be cancelled — no refund will be issued</p>
                    )}
                    {removeUserInfo.within_30_days && removeUserInfo.stripe_subscription_id && (
                      <p className="text-red-700 font-semibold text-xs">⚠ User is within their 30-day minimum commitment period</p>
                    )}
                  </div>

                  {!confirmDeleteUser ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmDeleteUser(true)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition"
                      >
                        Delete This Account
                      </button>
                      <button
                        onClick={() => { setRemoveUserInfo(null); setRemoveUserEmail(''); setRemoveUserError(''); }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                      >
                        Back
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-bold text-red-800">This cannot be undone. Permanently delete <span className="underline">{removeUserInfo.email}</span>?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={executeRemoveUser}
                          disabled={removeUserLoading}
                          className="flex-1 px-4 py-2 bg-red-700 text-white rounded-lg font-semibold text-sm hover:bg-red-800 transition disabled:opacity-50"
                        >
                          {removeUserLoading ? 'Deleting...' : 'Yes, Permanently Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteUser(false)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {removeUserDone && (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800 text-sm">✅ User account deleted successfully</p>
                  </div>
                  <div className="space-y-1">
                    {removeUserDone.map((line, i) => (
                      <p key={i} className="text-xs text-gray-600">• {line}</p>
                    ))}
                  </div>
                  <button
                    onClick={closeRemoveUser}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          CERTIFICATE BACKFILL MODAL
      ══════════════════════════════════════ */}
      {showBackfill && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeBackfill(); }}
        >
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">🏆 Certificate Backfill Tool</h2>
                <p className="text-xs text-gray-500">Generate missing certificates for a user</p>
              </div>
              <button onClick={closeBackfill} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {backfillError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{backfillError}</div>
              )}

              {!backfillUserInfo && !backfillResults && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={backfillEmail}
                      onChange={e => setBackfillEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') findBackfillUser(); }}
                      placeholder="user@example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={findBackfillUser}
                      disabled={backfillLoading || !backfillEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {backfillLoading ? '...' : 'Find User'}
                    </button>
                  </div>
                </div>
              )}

              {backfillUserInfo && !backfillResults && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                    <p><span className="font-semibold text-gray-600">User ID:</span> <code className="text-xs font-mono text-gray-500 break-all">{backfillUserInfo.userId}</code></p>
                    <p><span className="font-semibold text-gray-600">Completed modules:</span> {backfillUserInfo.debug?.completedModulesForUser?.length ?? 0}</p>
                    <p><span className="font-semibold text-gray-600">Existing certificates:</span> {backfillUserInfo.debug?.certificatesForUser?.length ?? 0}</p>
                  </div>

                  {(backfillUserInfo.debug?.completedModulesForUser?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Completed Modules</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {backfillUserInfo.debug.completedModulesForUser.map((m: any) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const hasCert = (backfillUserInfo.debug.certificatesForUser || []).some((c: any) => c.module_id === m.module_number);
                          return (
                            <div key={m.progress_module_id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
                              <span className="text-gray-700">Module {m.module_number}{m.title ? `: ${m.title}` : ''}</span>
                              <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ml-2 ${
                                hasCert ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {hasCert ? '✓ Has cert' : '⚠ Missing'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={runBackfill}
                      disabled={backfillLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {backfillLoading ? 'Generating...' : '✓ Generate Missing Certificates'}
                    </button>
                    <button
                      onClick={() => { setBackfillUserInfo(null); setBackfillEmail(''); setBackfillError(''); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {backfillResults && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${backfillResults.created > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="font-semibold text-sm text-gray-800">
                      {backfillResults.created > 0
                        ? `✅ Created ${backfillResults.created} certificate${backfillResults.created !== 1 ? 's' : ''}`
                        : '✅ No missing certificates — all up to date'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Skipped: {backfillResults.skipped} · Errors: {backfillResults.errors}</p>
                  </div>

                  {(backfillResults.results?.length ?? 0) > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {backfillResults.results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
                          <span className="text-gray-700">Module {r.moduleNumber}{r.title ? `: ${r.title}` : ''}</span>
                          <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ml-2 ${
                            r.status === 'created' ? 'bg-green-100 text-green-700'
                            : r.status === 'skipped' ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { setBackfillResults(null); setBackfillUserInfo(null); setBackfillEmail(''); setBackfillError(''); }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Run Another
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
