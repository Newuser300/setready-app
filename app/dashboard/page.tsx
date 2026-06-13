'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import Copyright from '@/components/Copyright';

type Module = {
  id: string;
  title: string;
  section: number;
  module_number: number;
  order_index: number;
};

type Progress = {
  module_id: string;
  completed: boolean;
  score: number;
};

type Certificate = {
  id: string;
  user_id: string;
  certificate_type: string;
  module_name: string | null;
  section_name: string | null;
  score: number;
  created_at: string;
  issued_at?: string;
  pdf_url?: string;
};

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

// Module icons
const moduleIcons: Record<number, string> = {
  1: '🎬',
  2: '🎭',
  3: '⚖️',
  4: '🛡️',
  5: '💰',
  6: '📖',
  7: '🎤',
  8: '🎪',
  9: '🏆',
};

// Module subtitle descriptions
const moduleSubtitles: Record<number, string> = {
  1: 'Learn the language of the film set',
  2: 'Master the craft of invisible performance',
  3: 'Professional conduct that gets you hired',
  4: 'Protect yourself and others',
  5: 'Know your worth, build your career',
  6: 'The foundation of modern acting',
  7: 'Nail every audition',
  8: 'Advanced scene study techniques',
  9: 'Advanced technique for working actors',
};

// Short display names — overrides the DB title for Section 2 modules
const moduleTitleOverrides: Record<number, string> = {
  6: 'Foundation',
  7: 'Audition Technique',
  8: 'Scene Study',
  9: 'Advanced Technique',
};

const quickActions = [
  { icon: '📋', label: 'Work Log', action: 'scroll' as const, target: 'work-log-section' },
  { icon: '💰', label: 'Rate Calculator', action: 'link' as const, href: '/rate-calculator' },
  { icon: '📔', label: 'Journal', action: 'link' as const, href: '/journal' },
  { icon: '👥', label: 'Contacts', action: 'link' as const, href: '/contacts' },
  { icon: '🎯', label: 'My Goals', action: 'link' as const, href: '/goals' },
  { icon: '📖', label: 'Glossary', action: 'link' as const, href: '/glossary' },
  { icon: '📋', label: 'Residency Docs', action: 'link' as const, href: '/residency' },
  { icon: '👔', label: 'What to Wear', action: 'link' as const, href: '/clothing' },
  { icon: '🎭', label: 'Agency Click', action: 'modal' as const, modal: 'agencyClick' },
  { icon: '⚖️', label: 'Know Your Rights', action: 'external' as const, href: 'https://ubcpactra.ca/agreements/' },
  { icon: '🎬', label: 'Productions in BC', action: 'external' as const, href: 'https://ubcpactra.ca/production-list/' },
  { icon: '🍁', label: 'Find Agencies', action: 'link' as const, href: '/agencies' },
  { icon: '📅', label: 'Availability', action: 'link' as const, href: '/availability' },
  { icon: '👤', label: 'My Profile', action: 'link' as const, href: '/profile' },
  { icon: '🎬', label: 'Casting Platform', action: 'link' as const, href: '/casting/about' },
];

export default function Dashboard() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [user, setUser] = useState<any>(null);
  const [section2Visible, setSection2Visible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // SECTION 2 POP-UP STATE
  const [showSection2Popup, setShowSection2Popup] = useState(false);

  // MODULE ACCESS MODALS
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showSection2Modal, setShowSection2Modal] = useState(false);

  // PAYMENT STATES - ADDED
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [section2Unlocked, setSection2Unlocked] = useState(false);
  const [subscriptionStartedAt, setSubscriptionStartedAt] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // CUSTOMER PORTAL STATE
  const [loadingPortal, setLoadingPortal] = useState(false);

  // AGENCY CLICK MODAL STATE
  const [showAgencyClickModal, setShowAgencyClickModal] = useState(false);
  const [agencyClickView, setAgencyClickView] = useState<'confirm' | 'save-form' | 'with-saved'>('confirm');
  const [agencyUsername, setAgencyUsername] = useState('');
  const [agencyPassword, setAgencyPassword] = useState('');

  // CERTIFICATES STATE
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  // REFERRAL STATE
  type ReferralCommission = {
    id: string;
    commission_amount: number;
    sale_amount: number;
    status: string;
    created_at: string;
    referred_email: string;
  };
  type ReferralStats = {
    referralCode: string;
    totalReferrals: number;
    pendingCommission: number;
    totalEarned: number;
    commissions: ReferralCommission[];
  };
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [showReferralDetails, setShowReferralDetails] = useState(false);

  // Work Log State
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
  const workLogFormRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  // In-form voucher staging (file picked but not yet uploaded — uploads on Save)
  const [formVoucherFile, setFormVoucherFile] = useState<File | null>(null);
  const [formVoucherType, setFormVoucherType] = useState<'Union Voucher' | 'Non-Union Voucher' | ''>('');
  const [formVoucherPreview, setFormVoucherPreview] = useState<string | null>(null);
  const [showVoucherTypePicker, setShowVoucherTypePicker] = useState(false);
  const [unionStatus, setUnionStatus] = useState<'union' | 'non-union'>('non-union');
  // Post-save voucher actions on existing cards
  const [uploadingLogId, setUploadingLogId] = useState<string | null>(null);
  const [removingLogId, setRemovingLogId] = useState<string | null>(null);
  const [confirmRemoveVoucherId, setConfirmRemoveVoucherId] = useState<string | null>(null);

  // PRE-CHECKOUT REFERRAL MODAL STATE (Feature 4)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<'section1' | 'section2'>('section1');
  const [preCheckoutCode, setPreCheckoutCode] = useState('');
  const [preCheckoutError, setPreCheckoutError] = useState('');
  const [preCheckoutValidating, setPreCheckoutValidating] = useState(false);
  const [userHasReferral, setUserHasReferral] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Locks to prevent concurrent auth calls
  let isCheckingUser = false;
  let isRefreshingProgress = false;

  // STRIPE PAYMENT FUNCTIONS
  // Inner functions that actually call Stripe — called after referral check is done
  async function runSection1Checkout() {
    setLoadingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { alert('Please sign in again'); setLoadingPayment(false); return; }
      const response = await fetch('/api/checkout/section1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      });
      const result = await response.json();
      if (result.url) { window.location.href = result.url; }
      else if (result.error) { alert(result.error || 'Error starting checkout'); }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error starting checkout. Please try again.');
    }
    setLoadingPayment(false);
  }

  async function runSection2Checkout() {
    setLoadingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { alert('Please sign in again'); setLoadingPayment(false); return; }
      const response = await fetch('/api/checkout/section2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      });
      const result = await response.json();
      if (result.url) { window.location.href = result.url; }
      else { alert(result.error || 'Error starting checkout'); }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error starting checkout. Please try again.');
    }
    setLoadingPayment(false);
  }

  // Public handlers — show referral modal first if user has no referred_by
  async function handleSection1Checkout() {
    if (!userHasReferral) {
      setCheckoutTarget('section1');
      setPreCheckoutCode('');
      setPreCheckoutError('');
      setShowCheckoutModal(true);
      return;
    }
    await runSection1Checkout();
  }

  async function handleSection2Checkout() {
    if (!userHasReferral) {
      setCheckoutTarget('section2');
      setPreCheckoutCode('');
      setPreCheckoutError('');
      setShowCheckoutModal(true);
      return;
    }
    await runSection2Checkout();
  }

  // Modal actions
  async function applyCodeAndSubscribe() {
    if (!preCheckoutCode.trim()) {
      setPreCheckoutError('Please enter a code or click "Skip and Subscribe".');
      return;
    }
    setPreCheckoutValidating(true);
    setPreCheckoutError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert('Please sign in again'); return; }
      const res = await fetch('/api/referral/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code: preCheckoutCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      console.log('Referral apply response:', res.status, data);
      if (!res.ok) {
        setPreCheckoutError(data.error || 'Invalid code. Please check and try again.');
        return;
      }
      setUserHasReferral(true);
      setShowCheckoutModal(false);
      if (checkoutTarget === 'section1') await runSection1Checkout();
      else await runSection2Checkout();
    } finally {
      setPreCheckoutValidating(false);
    }
  }

  function skipAndSubscribe() {
    setShowCheckoutModal(false);
    if (checkoutTarget === 'section1') runSection1Checkout();
    else runSection2Checkout();
  }

  // CUSTOMER PORTAL FUNCTION - Updated with authorization header
  async function handleManageBilling() {
    setLoadingPortal(true);
    try {
      // Get the current session to obtain the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        alert('Please sign in again');
        setLoadingPortal(false);
        return;
      }
      
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error || 'Error opening billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Error opening billing portal');
    }
    setLoadingPortal(false);
  }

  // AGENCY CLICK FUNCTIONS
  function openAgencyClickModal() {
    const stored = localStorage.getItem('agencyclick_credentials');
    setAgencyClickView(stored ? 'with-saved' : 'confirm');
    setShowAgencyClickModal(true);
  }

  function saveAgencyCredentials() {
    const encoded = btoa(JSON.stringify({ username: agencyUsername, password: agencyPassword }));
    localStorage.setItem('agencyclick_credentials', encoded);
    window.open('https://www.agencyclick.com', '_blank', 'noopener,noreferrer');
    setShowAgencyClickModal(false);
    setAgencyUsername('');
    setAgencyPassword('');
  }

  function clearAgencyCredentials() {
    localStorage.removeItem('agencyclick_credentials');
    setAgencyClickView('confirm');
  }

  // REFERRAL FUNCTIONS
  async function loadReferralStats() {
    setLoadingReferral(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch('/api/referral/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReferralStats(data);
        if (data.referralCode) setReferralCode(data.referralCode);
      }
    } catch (error) {
      console.error('Failed to load referral stats:', error);
    } finally {
      setLoadingReferral(false);
    }
  }

  async function submitPayoutRequest() {
    if (!payoutEmail || !payoutAmount) {
      setPayoutMessage('Please fill in all fields.');
      return;
    }
    setPayoutLoading(true);
    setPayoutMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/referral/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ etransferEmail: payoutEmail, amount: parseFloat(payoutAmount), referralCode, note: payoutNote }),
      });
      const data = await response.json();
      if (response.ok) {
        setPayoutMessage(data.message);
        setShowPayoutForm(false);
        setPayoutEmail('');
        setPayoutAmount('');
        setPayoutNote('');
      } else {
        setPayoutMessage(data.error || 'Failed to submit request.');
      }
    } catch {
      setPayoutMessage('An error occurred. Please try again.');
    } finally {
      setPayoutLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      setTimeout(() => setCopiedText(''), 2000);
    });
  }

  // CERTIFICATES FUNCTION
  async function loadCertificates() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setLoadingCertificates(true);
    const { data: certData, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('issued_at', { ascending: false });
    console.log('Certificates found:', certData?.length, certError);
    console.log('Certificate issued_at:', certData?.[0]?.issued_at);
    setCertificates(certData || []);
    setLoadingCertificates(false);
  }

  // Fetch subscription status directly from Supabase to avoid API 401 issues
  const fetchSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsSubscribed(false);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', session.user.id)
        .maybeSingle();
      setIsSubscribed(data?.subscription_status === 'active');
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  useEffect(() => {
    checkUser();
    loadModules();
    loadWorkLogs();
    loadCertificates();
    loadReferralStats();
    fetchSubscriptionStatus(); // <-- ADD THIS LINE to refresh subscription status on page load
    
    // Subscribe to realtime updates for user_progress
    const subscription = supabase
      .channel('user_progress_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_progress' }, 
        (payload) => {
          // Refresh progress when changes occur
          refreshProgress();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('sr-ios-tip-dismissed')
    if (isIOS && !isStandalone && !dismissed) {
      setShowIOSTip(true)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Get current user ID to pass to child pages (like certificates)
  // Using getSession() instead of getUser() for better reliability
  useEffect(() => {
    async function getCurrentUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        console.log('Dashboard - User ID loaded from session:', session.user.id);
      } else {
        console.log('Dashboard - No session found');
      }
    }
    getCurrentUserId();
  }, []);

  // Scroll the Add Entry form into view whenever it opens
  useEffect(() => {
    if (showWorkLogForm && workLogFormRef.current) {
      setTimeout(() => {
        workLogFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [showWorkLogForm]);

  // NEW: Check for refresh parameter when returning from quiz
  useEffect(() => {
    // Check if we just came back from a quiz
    const urlParams = new URLSearchParams(window.location.search);
    const refresh = urlParams.get('refresh');
    if (refresh) {
      // Refresh the progress data
      refreshProgress();
      // Remove the query param from URL without refreshing the page
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // SECTION 2 POP-UP CHECK
  async function checkSection2Completion() {
    if (!user) return;
    
    // Section 2 modules are 6, 7, 8, 9
    const section2ModuleIds = [6, 7, 8, 9];
    
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('module_id, completed, section2_popup_shown')
      .eq('user_id', user.id)
      .in('module_id', section2ModuleIds);
    
    if (!progressData || progressData.length === 0) return;
    
    // Check if all Section 2 modules are completed
    const allCompleted = progressData.filter(p => p.completed === true).length === 4;
    const alreadyShown = progressData.some(p => p.section2_popup_shown === true);
    
    if (allCompleted && !alreadyShown) {
      setShowSection2Popup(true);
      
      // Mark as shown so it doesn't appear again
      for (const module of progressData) {
        await supabase
          .from('user_progress')
          .update({ section2_popup_shown: true })
          .eq('user_id', user.id)
          .eq('module_id', module.module_id);
      }
    }
  }

  async function checkUser() {
    // Prevent concurrent calls
    if (isCheckingUser) {
      console.log('Already checking user, skipping...');
      return;
    }
    
    isCheckingUser = true;
    
    try {
      // Use getSession() instead of getUser() to avoid token conflicts
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        router.push('/auth/sign-in');
        return;
      }
      
      const user = session.user;
      setUser(user);

      try {
        const adminCheckRes = await fetch('/api/admin/check', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (adminCheckRes.ok) {
          const adminData = await adminCheckRes.json();
          setIsAdmin(adminData.isAdmin === true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }

      const { data } = await supabase
        .from('users')
        .select('section1_completed, subscription_status, section2_unlocked, referral_code, referred_by, subscription_started_at')
        .eq('id', user.id)
        .single();

      if (data) {
        setSection2Visible(data.section1_completed || false);
        setIsSubscribed(data.subscription_status === 'active');
        setSection2Unlocked(data.section2_unlocked || false);
        if (data.referral_code) setReferralCode(data.referral_code);
        setUserHasReferral(!!data.referred_by);
        setSubscriptionStartedAt(data.subscription_started_at || null);
        console.log('User subscription status:', data.subscription_status);
      }
    } catch (error) {
      console.error('Check user error:', error);
    } finally {
      isCheckingUser = false;
    }
  }

  async function refreshProgress() {
    // Prevent concurrent calls
    if (isRefreshingProgress) {
      console.log('Already refreshing progress, skipping...');
      return;
    }
    
    isRefreshingProgress = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const { data: prog } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', session.user.id);
      
      const progressMap: Record<string, Progress> = {};
      prog?.forEach(p => {
        progressMap[p.module_id] = p;
      });
      setProgress(progressMap);
      
      // Check if section 1 is now complete
      const section1ModulesList = modules.filter(m => m.section === 1);
      const allCompleted = section1ModulesList.length > 0 && 
        section1ModulesList.every(m => progressMap[m.id]?.completed === true);
      
      if (allCompleted && !section2Visible && !isUpdating) {
        setIsUpdating(true);
        setSection2Visible(true);
        await supabase
          .from('users')
          .update({ section1_completed: true })
          .eq('id', session.user.id);
        setIsUpdating(false);
      }
      
      // SECTION 2 POP-UP: Check after refreshing progress
      if (session.user) {
        // Temporarily set user for checkSection2Completion
        setUser(session.user);
        await checkSection2Completion();
      }
    } catch (error) {
      console.error('Refresh progress error:', error);
    } finally {
      isRefreshingProgress = false;
    }
  }

  async function loadModules() {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .order('order_index');
    setModules(data || []);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: prog } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', session.user.id);
      
      const progressMap: Record<string, Progress> = {};
      prog?.forEach(p => {
        progressMap[p.module_id] = p;
      });
      setProgress(progressMap);
      
      const section1ModulesList = (data || []).filter(m => m.section === 1);
      const allCompleted = section1ModulesList.length > 0 && 
        section1ModulesList.every(m => progressMap[m.id]?.completed === true);
      
      if (allCompleted && !section2Visible) {
        setSection2Visible(true);
        await supabase
          .from('users')
          .update({ section1_completed: true })
          .eq('id', session.user.id);
      }
      
      // SECTION 2 POP-UP: Check after loading modules
      setUser(session.user);
      await checkSection2Completion();
    }
    setLoading(false);
  }

  // Work Log Functions
  async function loadWorkLogs() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('work_date', { ascending: false });

    if (error) {
      console.error('Error loading work logs:', error);
    } else {
      setWorkLogs(data || []);
    }
  }

  // VOUCHER FUNCTIONS — used on existing cards (post-save upload/remove/view)
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

  function handleFormVoucherSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'Union Voucher' | 'Non-Union Voucher') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formVoucherPreview) URL.revokeObjectURL(formVoucherPreview);
    setFormVoucherFile(file);
    setFormVoucherType(type);
    setFormVoucherPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = '';
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
    setShowVoucherTypePicker(false);
  }

  function calculatePay() {
    const hours = parseFloat(workLogForm.hours_worked) || 0;
    const rate = parseFloat(workLogForm.pay_rate) || 0;
    const deductions = parseFloat(workLogForm.deductions) || 0;
    
    const grossPay = hours * rate;
    const finalPay = grossPay - deductions;
    
    return { grossPay, finalPay };
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
      deductions: deductions,
      final_pay: finalPay,
      paid: workLogForm.paid,
      notes: workLogForm.notes || null,
    };

    try {
      let result;
      if (editingWorkLog) {
        result = await supabase.from('work_logs').update(workLogData).eq('id', editingWorkLog.id).select();
      } else {
        result = await supabase.from('work_logs').insert([workLogData]).select();
      }

      if (result.error) {
        alert(`Error saving: ${result.error.message || 'Unknown error'}`);
        return;
      }

      // Upload staged voucher if one was selected in the form
      const savedId = editingWorkLog?.id ?? result.data?.[0]?.id;
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

    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting work log:', error);
      alert('Error deleting work log');
    } else {
      loadWorkLogs();
    }
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

  function handleQuickAction(item: typeof quickActions[0]) {
    if (item.action === 'scroll' && item.target) {
      document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth' });
    } else if (item.action === 'link' && item.href) {
      router.push(item.href);
    } else if (item.action === 'external' && item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    } else if (item.action === 'modal' && item.modal === 'agencyClick') {
      openAgencyClickModal();
    }
  }

  const totalEarnings = workLogs.reduce((sum, log) => sum + (log.final_pay || 0), 0);
  const totalPaid = workLogs.filter(log => log.paid).reduce((sum, log) => sum + (log.final_pay || 0), 0);
  const totalUnpaid = totalEarnings - totalPaid;
  const { grossPay, finalPay } = calculatePay();

  // Helper function to convert percentage score to actual correct answers
  const getActualScore = (percentageScore: number | undefined): number => {
    if (!percentageScore) return 0;
    return Math.round(percentageScore * 15 / 100);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🎬</div>
        <p className="text-gray-500">Loading your dashboard...</p>
      </div>
    </div>
  );

  const section1Modules = modules.filter(m => m.section === 1);
  const section2Modules = modules.filter(m => m.section === 2);
  const completedCount = section1Modules.filter(m => progress[m.id]?.completed).length;
  const progressPercentage = (completedCount / section1Modules.length) * 100;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date unavailable';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const shortName = (name: string | null) => {
    if (!name) return 'Certificate';
    return name.includes(':') ? name.split(':')[1].trim() : name;
  };

  return (
    <>
      {/* ── Always-mounted hidden inputs (must be outside all conditionals for mobile camera to work) ── */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleVoucherFileChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*,application/pdf,.heic,.heif"
        style={{ display: 'none' }}
        onChange={handleVoucherFileChange}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-800 text-white">
          <div className="max-w-4xl mx-auto px-4" style={{ paddingTop: isMobile ? '16px' : '24px', paddingBottom: isMobile ? '16px' : '24px' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-bold tracking-tight" style={{ fontSize: isMobile ? '20px' : '28px' }}>
                  Welcome back, <span className="text-yellow-300">{user?.email?.split('@')[0]}</span>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Link href="/admin" className="text-white/60 hover:text-white transition text-xs flex items-center gap-1 border border-white/20 px-2 py-1 rounded-lg">
                    <span>🔑</span>
                    <span>Admin</span>
                  </Link>
                )}
                <Link href="/settings" className="text-white/80 hover:text-white transition text-sm flex items-center gap-1">
                  <span className="text-xl">⚙️</span>
                  <span className="hidden sm:inline">Settings</span>
                </Link>
                <div className="hidden md:block text-6xl">🎭</div>
              </div>
            </div>
            
            {/* Progress Card */}
            <div className="bg-white/10 rounded-2xl backdrop-blur-sm" style={{ marginTop: isMobile ? '12px' : '20px', padding: isMobile ? '12px' : '16px' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Your Progress</span>
                <span className="text-2xl font-bold">{completedCount}/{section1Modules.length}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-sm text-blue-200 mt-2">
                {completedCount === section1Modules.length 
                  ? '🎉 Amazing! You\'ve unlocked the secret section!' 
                  : `${section1Modules.length - completedCount} more modules to unlock the secret section`}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* QUICK ACTION GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)',
            gap: '10px',
            marginBottom: '16px',
          }}>
            {quickActions.map((item) => (
              <button
                key={item.label}
                onClick={() => handleQuickAction(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px 4px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  minHeight: '72px',
                }}
              >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>{item.icon}</span>
                <span style={{
                  fontSize: '10px',
                  color: '#374151',
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: '1.3',
                }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {showIOSTip && (
            <div style={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #F59E0B',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <span style={{ fontSize: '13px', color: 'white' }}>
                📱 Add SetReady to your home screen: tap Share then &ldquo;Add to Home Screen&rdquo;
              </span>
              <button
                onClick={() => {
                  setShowIOSTip(false)
                  localStorage.setItem('sr-ios-tip-dismissed', 'true')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >✕</button>
            </div>
          )}

          {/* PAYMENT STATUS CARDS - UPDATED to use Stripe functions */}
          {!isSubscribed && (
            <div id="subscribe-banner" className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="font-semibold text-yellow-800">🔓 Unlock Section 1 Modules</p>
              <p className="text-sm text-yellow-700 mb-3">Subscribe for $9.99/month to access all training modules.</p>
              <button
                onClick={() => handleSection1Checkout()}
                disabled={loadingPayment}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingPayment ? 'Processing...' : 'Subscribe Now - $9.99/month'}
              </button>
            </div>
          )}

          {section2Visible && !section2Unlocked && isSubscribed && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-purple-800">🎓 Unlock Section 2</p>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-500 text-xs font-semibold rounded-full border border-purple-200 uppercase tracking-wide">Optional</span>
              </div>
              <p className="text-sm text-purple-700 mb-3">You've completed Section 1! Unlock advanced acting modules for a one-time fee of $19.99.</p>
              <button
                onClick={() => handleSection2Checkout()}
                disabled={loadingPayment}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {loadingPayment ? 'Processing...' : 'Unlock Section 2 - $19.99'}
              </button>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 24px' }} />

          {/* Section 1 Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="text-3xl">📚</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Section 1: Background Performer Training</h2>
              <p className="text-gray-500 text-sm">Master the fundamentals of working on a film set</p>
            </div>
          </div>

          {/* Section 1 Modules — locked for non-subscribers, clickable for subscribers */}
          <div className="grid gap-4">
            {section1Modules.map((module) => {
              const isCompleted = progress[module.id]?.completed;
              const score = progress[module.id]?.score;
              const actualScore = getActualScore(score);

              // Non-subscriber: show locked card that scrolls to subscribe banner on click
              if (!isSubscribed) {
                return (
                  <div
                    key={module.id}
                    onClick={() => setShowSubscribeModal(true)}
                    className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 cursor-pointer hover:shadow-md hover:border-yellow-300 transition-all duration-300"
                  >
                    <div style={{ padding: isMobile ? '10px 12px' : '20px' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl opacity-40">{moduleIcons[module.module_number] || '📘'}</div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-500">{module.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">{moduleSubtitles[module.module_number] || 'Subscribe to access this module'}</p>
                          </div>
                        </div>
                        <span className="shrink-0 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">
                          🔒 Subscribe to unlock
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Subscriber: full clickable card
              return (
                <Link href={`/module/${module.id}`} key={module.id}>
                  <div className={`
                    relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
                    ${isCompleted
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500'
                      : 'bg-white hover:shadow-md border border-gray-200'
                    }
                  `}>
                    <div style={{ padding: isMobile ? '10px 12px' : '20px' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{moduleIcons[module.module_number] || '📘'}</div>
                          <div>
                            <h3 className="font-bold text-gray-800" style={{ fontSize: isMobile ? '15px' : '18px' }}>{module.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{moduleSubtitles[module.module_number] || 'Complete this module to advance'}</p>
                          </div>
                        </div>
                        <div>
                          {isCompleted ? (
                            <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                              ✓ Completed ({actualScore}/15)
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                              📝 Not started
                            </span>
                          )}
                        </div>
                      </div>
                      {isCompleted && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                          <span>✓</span>
                          <span>Passed with {actualScore}/15</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Scenario Simulator Banner ── */}
          <div className="my-8 rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: '#F59E0B' }}>
            <div className="px-6 py-7 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">🎭 Set Etiquette Simulator</h2>
                <p className="text-gray-800 font-medium mt-1 text-base">Test your on-set knowledge with real scenarios</p>
              </div>
              <Link
                href="/simulator"
                className="shrink-0 px-7 py-3 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-gray-800 active:scale-95 transition shadow-md"
              >
                Launch Simulator →
              </Link>
            </div>
          </div>

          {/* Secret Section 2 - LOCKED until all Section 1 complete */}
          {section2Visible ? (
            <div className="mt-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur-xl opacity-30"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-white">SECRET SECTION UNLOCKED!</h2>
                  <p className="text-yellow-100 mt-2">You've mastered the basics. Now learn to become a principal actor.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8 mb-6">
                <div className="text-3xl">🎭</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-800">Section 2: From Background to Acting</h2>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full border border-gray-200 uppercase tracking-wide">Optional Upgrade</span>
                  </div>
                  <p className="text-gray-500 text-sm">Advanced techniques for the serious performer</p>
                </div>
              </div>

              <div className="grid gap-4">
                {section2Modules.map((module) => {
                  const isCompleted = progress[module.id]?.completed;

                  // Locked: user has not purchased Section 2
                  if (!section2Unlocked) {
                    return (
                      <div
                        key={module.id}
                        onClick={() => setShowSection2Modal(true)}
                        className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all duration-200"
                        style={{ padding: isMobile ? '10px 12px' : '20px' }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl opacity-40">{moduleIcons[module.module_number] || '🎯'}</div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-500">{moduleTitleOverrides[module.module_number] || module.title}</h3>
                              <p className="text-sm text-gray-400 mt-1">{moduleSubtitles[module.module_number] || 'Advanced acting techniques'}</p>
                            </div>
                          </div>
                          <span className="shrink-0 bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                            🔒 Optional upgrade
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Unlocked: full clickable card
                  return (
                    <Link href={`/module/${module.id}`} key={module.id}>
                      <div className={`bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl hover:scale-[1.02] transition-all duration-300 hover:shadow-lg border border-purple-200 ${isCompleted ? 'border-l-4 border-green-500' : ''}`} style={{ padding: isMobile ? '10px 12px' : '20px' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl">{moduleIcons[module.module_number] || '🎯'}</div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-800">{moduleTitleOverrides[module.module_number] || module.title}</h3>
                              <p className="text-sm text-gray-500 mt-1">{moduleSubtitles[module.module_number] || 'Advanced acting techniques'}</p>
                            </div>
                          </div>
                          {isCompleted && (
                            <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-12 text-center">
              <div className="bg-gray-100 rounded-2xl p-8 border border-dashed border-gray-300">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-bold text-gray-600">Secret Section Locked</h3>
                <p className="text-sm text-gray-400 mt-1">Complete all 5 modules in Section 1 to unlock</p>
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '24px 0' }} />

          {/* MY CERTIFICATES SECTION */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">🏆</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">My Certificates</h2>
                <p className="text-gray-500 text-sm">Your earned completion certificates</p>
              </div>
            </div>
            {loadingCertificates ? (
              <div className="text-center py-8 text-gray-400">Loading certificates...</div>
            ) : certificates.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-300">
                <div className="text-4xl mb-3">🏅</div>
                <p className="text-gray-500">Complete modules to earn certificates</p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <div key={cert.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-sm leading-snug">
                        {shortName(cert.module_name ?? cert.section_name)}
                      </p>
                      <span className="text-2xl flex-shrink-0">🏆</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">{cert.score}%</span>
                      <span>{formatDate(cert.issued_at)}</span>
                    </div>
                    {cert.pdf_url && (
                      <a
                        href={cert.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        ⬇️ Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0' }} />

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '24px 0' }} />

          {/* ===================================================== */}
          {/* WORK LOG SECTION */}
          {/* ===================================================== */}
          <div id="work-log-section">
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

            {/* ── Work Log Form ── */}
            {showWorkLogForm && (
              <div ref={workLogFormRef} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  {editingWorkLog ? '✏️ Edit Work Entry' : '➕ New Work Entry'}
                </h3>

                <form onSubmit={saveWorkLog} className="space-y-8">

                  {/* ── BASIC INFO ── */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Basic Info</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                        <input
                          type="date"
                          required
                          value={workLogForm.work_date}
                          onChange={(e) => setWorkLogForm({...workLogForm, work_date: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Production Name *</label>
                        <input
                          type="text"
                          required
                          value={workLogForm.production_name}
                          onChange={(e) => setWorkLogForm({...workLogForm, production_name: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g., Movie or Show Title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Production Type</label>
                        <select
                          value={workLogForm.production_type}
                          onChange={(e) => setWorkLogForm({...workLogForm, production_type: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
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
                        <input
                          type="text"
                          value={workLogForm.location}
                          onChange={(e) => setWorkLogForm({...workLogForm, location: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="City / Studio"
                        />
                      </div>

                    </div>
                  </div>

                  {/* ── ROLE & PAY ── */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Role &amp; Pay</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* Union Status selector */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Union Status</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setUnionStatus('union')}
                            style={{
                              flex: 1,
                              padding: '12px',
                              minHeight: '44px',
                              backgroundColor: unionStatus === 'union' ? '#1a1a2e' : 'transparent',
                              color: unionStatus === 'union' ? 'white' : '#1a1a2e',
                              border: '2px solid #1a1a2e',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '14px',
                            }}
                          >
                            🎭 Union (UBCP/ACTRA)
                          </button>
                          <button
                            type="button"
                            onClick={() => setUnionStatus('non-union')}
                            style={{
                              flex: 1,
                              padding: '12px',
                              minHeight: '44px',
                              backgroundColor: unionStatus === 'non-union' ? '#1a1a2e' : 'transparent',
                              color: unionStatus === 'non-union' ? 'white' : '#1a1a2e',
                              border: '2px solid #1a1a2e',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '14px',
                            }}
                          >
                            Non-Union
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Role Type</label>
                        <select
                          value={workLogForm.role}
                          onChange={(e) => setWorkLogForm({...workLogForm, role: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
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
                        <input
                          type="text"
                          value={workLogForm.agency}
                          onChange={(e) => setWorkLogForm({...workLogForm, agency: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g., Extras Casting Agency"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Hours Worked</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={workLogForm.hours_worked}
                          onChange={(e) => setWorkLogForm({...workLogForm, hours_worked: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g., 8.5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Hourly Rate ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={workLogForm.pay_rate}
                          onChange={(e) => setWorkLogForm({...workLogForm, pay_rate: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g., 270.30"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Gross Pay <span className="font-normal text-gray-400">(hours × rate)</span></label>
                        <input type="text" readOnly value={`$${grossPay.toFixed(2)}`}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-default" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Deductions ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={workLogForm.deductions}
                          onChange={(e) => setWorkLogForm({...workLogForm, deductions: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="0.00"
                        />
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

                  {/* ── VOUCHER UPLOAD ── */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      📄 Upload Work Voucher Photo <span className="font-normal text-gray-400">(optional)</span>
                    </label>

                    {/* Edit mode: show existing voucher if no new file picked */}
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
                      /* File staged — show thumbnail + filename + remove */
                      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        {formVoucherFile.type.startsWith('image/') && formVoucherPreview ? (
                          <img src={formVoucherPreview} alt="Voucher preview"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center text-3xl shrink-0">📄</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{formVoucherFile.name}</p>
                          <p className="text-xs text-gray-400">{(formVoucherFile.size / 1024 / 1024).toFixed(1)} MB — will upload on save</p>
                        </div>
                        <button
                          type="button"
                          onClick={clearFormVoucher}
                          className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition underline underline-offset-2"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      /* Two buttons: camera + file picker */
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px',
                            minHeight: '48px',
                            backgroundColor: '#1a1a2e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                          }}
                        >
                          📷 Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => uploadInputRef.current?.click()}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px',
                            minHeight: '48px',
                            backgroundColor: 'transparent',
                            color: '#1a1a2e',
                            border: '2px solid #1a1a2e',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                          }}
                        >
                          📁 Upload Photo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── NOTES ── */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                    <textarea
                      value={workLogForm.notes}
                      onChange={(e) => setWorkLogForm({...workLogForm, notes: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      placeholder="Any notes about this booking..."
                    />
                  </div>

                  {/* ── BUTTONS ── */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={resetWorkLogForm}
                      className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={workLogLoading}
                      className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold disabled:opacity-50 shadow-sm"
                    >
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
                <p className="text-sm text-gray-400">Click "Add Work Entry" to start tracking your film industry work.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workLogs.map((log) => (
                  <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                    {/* Entry details */}
                    <div className="px-5 pt-4 pb-4">
                      {/* Top row: date, production, badges, actions */}
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
                          <button
                            onClick={() => editWorkLog(log)}
                            title="Edit"
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition"
                          >✏️</button>
                          <button
                            onClick={() => deleteWorkLog(log.id)}
                            title="Delete"
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition"
                          >🗑️</button>
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                        {log.location && <span>📍 {log.location}</span>}
                        {log.role && <span>🎭 {log.role}</span>}
                        {log.character_name && <span>🎬 {log.character_name}</span>}
                        <span>⏱ {log.hours_worked}h</span>
                      </div>

                      {/* Earnings row */}
                      <div className="flex flex-wrap gap-x-6 text-sm">
                        <span className="text-gray-500">Gross: <span className="font-medium text-gray-700">${log.gross_pay?.toFixed(2)}</span></span>
                        <span className="text-gray-500">Final Pay: <span className="font-bold text-gray-900">${log.final_pay?.toFixed(2)}</span></span>
                      </div>
                    </div>

                    {/* ── Voucher section ── */}
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">📄 Work Voucher</p>

                      {uploadingLogId === log.id ? (
                        <p className="text-sm text-blue-500 animate-pulse">Uploading voucher…</p>
                      ) : removingLogId === log.id ? (
                        <p className="text-sm text-red-400 animate-pulse">Removing voucher…</p>
                      ) : log.voucher_filename ? (
                        /* Has voucher uploaded */
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.voucher_type === 'Union Voucher' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                            ✅ {log.voucher_type || 'Voucher'}
                          </span>
                          <span className="text-sm text-gray-600 truncate max-w-[200px]" title={log.voucher_filename}>
                            {log.voucher_filename}
                          </span>
                          <button
                            onClick={() => viewVoucher(log.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                          >
                            👁 View
                          </button>
                          {confirmRemoveVoucherId === log.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Remove voucher?</span>
                              <button
                                onClick={() => removeVoucher(log.id)}
                                className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                              >Yes, remove</button>
                              <button
                                onClick={() => setConfirmRemoveVoucherId(null)}
                                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                              >Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveVoucherId(log.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                            >
                              🗑 Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        /* No voucher — two type buttons that directly open the file picker */
                        <div className="flex flex-wrap gap-3">
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl cursor-pointer transition select-none shadow-sm">
                            🎭 Union Voucher
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) uploadVoucher(log.id, f, 'Union Voucher');
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl cursor-pointer transition select-none shadow-sm">
                            📋 Non-Union Voucher
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) uploadVoucher(log.id, f, 'Non-Union Voucher');
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MY REFERRALS SECTION - compact, collapsible */}
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: '20px' }}>🤝</span>
                <h2 className="text-base font-bold text-gray-800">My Referrals</h2>
                <span className="text-xs text-gray-400 hidden sm:inline">— earn 20% commission</span>
              </div>

              {referralCode ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Your code:</span>
                      <span className="font-mono font-bold text-gray-900 tracking-wider text-sm">{referralCode}</span>
                      <button
                        onClick={() => copyToClipboard(referralCode, 'code')}
                        className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition"
                      >
                        {copiedText === 'code' ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Total earned: </span>
                      <span className="font-semibold text-green-600">${referralStats?.totalEarned?.toFixed(2) ?? '0.00'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowReferralDetails(!showReferralDetails)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                  >
                    {showReferralDetails ? 'Hide Details ▲' : 'Show Details ▼'}
                  </button>

                  {showReferralDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {/* Referral link */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <p className="text-xs font-medium text-blue-700 mb-1">Your referral link:</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded break-all">
                            {`https://www.setready.site/auth/sign-up?ref=${referralCode}`}
                          </code>
                          <button
                            onClick={() => copyToClipboard(`https://www.setready.site/auth/sign-up?ref=${referralCode}`, 'link')}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                          >
                            {copiedText === 'link' ? '✓ Copied!' : 'Copy Link'}
                          </button>
                        </div>
                      </div>

                      {/* How it works */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-800 mb-2">How it works:</p>
                        <ol className="space-y-1 text-sm text-gray-600 list-none">
                          <li>1. Share your referral link with friends</li>
                          <li>2. They sign up and subscribe using your link</li>
                          <li>3. You earn 20% commission, paid monthly via e-transfer</li>
                          <li>4. Once you reach $10.00, request your payout below</li>
                        </ol>
                      </div>

                      {/* Stats */}
                      {loadingReferral ? (
                        <div className="text-center py-4 text-gray-400 text-sm">Loading stats...</div>
                      ) : referralStats ? (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center shadow-sm">
                              <p className="text-xl font-bold text-gray-800">{referralStats.totalReferrals}</p>
                              <p className="text-xs text-gray-500 mt-1">Referrals</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center shadow-sm">
                              <p className="text-xl font-bold text-orange-600">${referralStats.pendingCommission.toFixed(2)}</p>
                              <p className="text-xs text-gray-500 mt-1">Pending</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center shadow-sm">
                              <p className="text-xl font-bold text-green-600">${referralStats.totalEarned.toFixed(2)}</p>
                              <p className="text-xs text-gray-500 mt-1">Earned</p>
                            </div>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                            <span className="text-lg mt-0.5">💰</span>
                            <div>
                              <p className="text-sm font-semibold text-blue-800">Minimum payout threshold: $10.00</p>
                              <p className="text-xs text-blue-700 mt-0.5">Commissions paid monthly via e-transfer. Reach $10.00 to request payout.</p>
                            </div>
                          </div>

                          {/* Commission history */}
                          {referralStats.commissions.length === 0 ? (
                            <div className="bg-gray-50 rounded-xl p-4 text-center border border-dashed border-gray-300 mb-4">
                              <p className="text-gray-500 text-sm">No commissions yet. Share your link to start earning!</p>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Referred User</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Commission</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {referralStats.commissions.map((c) => (
                                      <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.referred_email}</td>
                                        <td className="px-4 py-3 font-semibold text-green-700">${c.commission_amount.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {c.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Payout request */}
                          {!showPayoutForm ? (
                            <div>
                              <button
                                onClick={() => {
                                  setPayoutAmount(referralStats.pendingCommission.toFixed(2));
                                  setPayoutMessage('');
                                  setShowPayoutForm(true);
                                }}
                                disabled={referralStats.pendingCommission < 10.00}
                                title={referralStats.pendingCommission < 10.00
                                  ? `Minimum payout is $10.00. You have $${referralStats.pendingCommission.toFixed(2)} pending.`
                                  : undefined}
                                className="px-5 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                              >
                                💸 Request E-Transfer Payout
                              </button>
                              {referralStats.pendingCommission < 10.00 && referralStats.pendingCommission > 0 && (
                                <p className="mt-2 text-xs text-gray-500">
                                  Minimum payout is $10.00. You have ${referralStats.pendingCommission.toFixed(2)} pending.
                                </p>
                              )}
                              {payoutMessage && (
                                <p className="mt-2 text-sm text-green-700">{payoutMessage}</p>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                              <h3 className="font-semibold text-gray-800 mb-4">Request E-Transfer Payout</h3>
                              <div className="space-y-3 mb-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Referral Code</label>
                                  <input
                                    type="text"
                                    value={referralCode}
                                    readOnly
                                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono tracking-widest"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Transfer Email</label>
                                  <input
                                    type="email"
                                    value={payoutEmail}
                                    onChange={(e) => setPayoutEmail(e.target.value)}
                                    placeholder="your@bank-email.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">Must be registered with your bank for Interac e-Transfer</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                                  <textarea
                                    value={payoutNote}
                                    onChange={(e) => setPayoutNote(e.target.value)}
                                    placeholder="Any additional details..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
                                  />
                                </div>
                              </div>
                              {payoutMessage && (
                                <p className={`text-sm mb-3 ${payoutMessage.includes('ubmitted') ? 'text-green-700' : 'text-red-600'}`}>
                                  {payoutMessage}
                                </p>
                              )}
                              <div className="flex gap-3">
                                <button
                                  onClick={submitPayoutRequest}
                                  disabled={payoutLoading}
                                  className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 text-sm"
                                >
                                  {payoutLoading ? 'Submitting...' : 'Submit Request'}
                                </button>
                                <button
                                  onClick={() => { setShowPayoutForm(false); setPayoutMessage(''); setPayoutNote(''); }}
                                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-2 text-gray-400 text-sm">
                  {loadingReferral
                    ? <p>Loading your referral code...</p>
                    : <p>Your referral code is being set up. Refresh the page in a moment.</p>
                  }
                </div>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '32px 0 0' }} />

          {/* CUSTOMER PORTAL BUTTON - 30-day minimum commitment lock */}
          {isSubscribed && (() => {
            const startedMs = subscriptionStartedAt ? new Date(subscriptionStartedAt).getTime() : null;
            const canCancel = startedMs ? (Date.now() - startedMs) >= 30 * 24 * 60 * 60 * 1000 : true;
            const cancelUnlockDate = startedMs
              ? new Date(startedMs + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
              : null;
            return (
              <div className="mt-3 text-center">
                {canCancel ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                    className="text-sm text-blue-600 hover:text-blue-800 transition underline"
                  >
                    {loadingPortal ? 'Loading...' : 'Manage Billing →'}
                  </button>
                ) : (
                  <div className="inline-block text-center">
                    <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 max-w-xs">
                      <span className="text-gray-500 font-semibold">🔒 30-Day Commitment Active</span>
                      <br />
                      <span className="text-gray-400">Billing management available {cancelUnlockDate ? `on ${cancelUnlockDate}` : 'after 30 days'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Footer Links */}
          <div className="mt-12 pt-6 border-t border-gray-200 flex justify-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition">Terms of Service</Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth/sign-in');
              }}
              className="hover:text-gray-600 transition"
            >
              Sign Out
            </button>
          </div>
          <Copyright />
        </div>
      </div>

      {/* AGENCY CLICK MODAL */}
      {showAgencyClickModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '420px', width: '90%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">🎭 Agency Click</h2>
              <button onClick={() => setShowAgencyClickModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {agencyClickView === 'confirm' && (
              <div>
                <p className="text-gray-600 mb-4 text-sm">Would you like to save your Agency Click credentials on this device for quick access?</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800">
                  ⚠️ <strong>Device-only storage:</strong> Credentials are stored locally on this device only and never sent to our servers. Do not use this on shared devices.
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setAgencyClickView('save-form')}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Save Credentials
                  </button>
                  <button
                    onClick={() => { window.open('https://www.agencyclick.com', '_blank', 'noopener,noreferrer'); setShowAgencyClickModal(false); }}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Just Open
                  </button>
                </div>
              </div>
            )}

            {agencyClickView === 'save-form' && (
              <div>
                <p className="text-gray-600 mb-4 text-sm">Enter your Agency Click credentials to save them on this device.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
                  ⚠️ <strong>Device-only:</strong> Stored in your browser's localStorage only — never sent to our servers. Clear with "Clear Credentials" when done.
                </div>
                <div className="space-y-3 mb-5">
                  <input
                    type="text"
                    placeholder="Username or Email"
                    value={agencyUsername}
                    onChange={(e) => setAgencyUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={agencyPassword}
                    onChange={(e) => setAgencyPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={saveAgencyCredentials}
                    disabled={!agencyUsername || !agencyPassword}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Save and Open Agency Click
                  </button>
                  <button
                    onClick={() => setAgencyClickView('confirm')}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {agencyClickView === 'with-saved' && (
              <div>
                <p className="text-gray-600 mb-4 text-sm">You have saved Agency Click credentials on this device.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800">
                  ⚠️ <strong>Device-only storage:</strong> These credentials exist only in your browser's localStorage and are never sent to our servers.
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { window.open('https://www.agencyclick.com', '_blank', 'noopener,noreferrer'); setShowAgencyClickModal(false); }}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Open Agency Click
                  </button>
                  <button
                    onClick={() => { setAgencyUsername(''); setAgencyPassword(''); setAgencyClickView('save-form'); }}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Update Credentials
                  </button>
                  <button
                    onClick={clearAgencyCredentials}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition"
                  >
                    Clear Credentials
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2 COMPLETION POP-UP */}
      {showSection2Popup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '90%',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>CONGRATULATIONS!</h2>
            <p style={{ color: '#4b5563', marginBottom: '16px' }}>You've completed all Section 2 training modules!</p>
            <div style={{ backgroundColor: '#f3e8ff', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'left' }}>
              <p style={{ fontWeight: '600', color: '#6b21a5', marginBottom: '8px' }}>You've mastered:</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '14px' }}>✓ Foundation</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '14px' }}>✓ Audition Technique</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '14px' }}>✓ Scene Study</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>✓ Advanced Technique</li>
              </ul>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>You're now ready to apply these professional acting techniques.</p>
            <button
              onClick={() => setShowSection2Popup(false)}
              style={{
                width: '100%',
                backgroundColor: '#7c3aed',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '12px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* SUBSCRIBE TO ACCESS MODULES MODAL */}
      {showSubscribeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px' }}>🔒</div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '16px', color: '#111827' }}>
              Subscribe to Access Modules
            </h2>
            <p style={{ color: '#6b7280', marginTop: '8px', lineHeight: '1.6', fontSize: '14px' }}>
              Get full access to all Section 1 modules, quizzes, certificates and all SetReady tools for just $9.99/month.
            </p>
            <button
              onClick={() => { setShowSubscribeModal(false); handleSection1Checkout(); }}
              disabled={loadingPayment}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                backgroundColor: '#1a1a2e',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loadingPayment ? 'not-allowed' : 'pointer',
                opacity: loadingPayment ? 0.6 : 1,
              }}
            >
              {loadingPayment ? 'Processing…' : 'Subscribe Now — $9.99/month'}
            </button>
            <button
              onClick={() => setShowSubscribeModal(false)}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2 UPGRADE MODAL */}
      {showSection2Modal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px' }}>🔒</div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '16px', color: '#111827' }}>
              Section 2 — Optional Upgrade
            </h2>
            <p style={{ color: '#6b7280', marginTop: '8px', lineHeight: '1.6', fontSize: '14px' }}>
              Advanced Acting Techniques is an optional upgrade for performers who want to pursue acting beyond background work. One-time purchase — unlocks all 4 advanced modules permanently.
            </p>
            <button
              onClick={() => { setShowSection2Modal(false); handleSection2Checkout(); }}
              disabled={loadingPayment}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loadingPayment ? 'not-allowed' : 'pointer',
                opacity: loadingPayment ? 0.6 : 1,
              }}
            >
              {loadingPayment ? 'Processing…' : 'Unlock Section 2 — $19.99'}
            </button>
            <button
              onClick={() => setShowSection2Modal(false)}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* PRE-CHECKOUT REFERRAL MODAL (Feature 4) */}
      {showCheckoutModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#1f2937' }}>🎁 Before you subscribe…</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>Do you have a referral code from a friend? You can enter it here or skip to subscribe now.</p>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={preCheckoutCode}
                onChange={(e) => { setPreCheckoutCode(e.target.value.toUpperCase()); setPreCheckoutError(''); }}
                placeholder="REFERRAL CODE (optional)"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', boxSizing: 'border-box' }}
              />
              {preCheckoutError && (
                <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '6px' }}>{preCheckoutError}</p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={applyCodeAndSubscribe}
                disabled={preCheckoutValidating || !preCheckoutCode.trim()}
                style={{ width: '100%', padding: '11px', backgroundColor: preCheckoutValidating || !preCheckoutCode.trim() ? '#9ca3af' : '#7c3aed', color: 'white', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: preCheckoutValidating || !preCheckoutCode.trim() ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
              >
                {preCheckoutValidating ? 'Validating…' : 'Apply Code and Subscribe'}
              </button>
              <button
                onClick={skipAndSubscribe}
                disabled={preCheckoutValidating}
                style={{ width: '100%', padding: '11px', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                Skip and Subscribe
              </button>
              <button
                onClick={() => setShowCheckoutModal(false)}
                disabled={preCheckoutValidating}
                style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}