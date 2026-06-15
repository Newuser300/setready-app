'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  { icon: '👤', label: 'My Profile', action: 'link' as const, href: '/profile' },
  { icon: '📖', label: 'Film Set Terms', action: 'link' as const, href: '/glossary' },
  { icon: '👔', label: 'What to Wear', action: 'link' as const, href: '/clothing' },
  { icon: '📋', label: 'Residency Docs', action: 'link' as const, href: '/residency' },
  { icon: '📋', label: 'Work Log', action: 'link' as const, href: '/work-log' },
  { icon: '📔', label: 'Journal', action: 'link' as const, href: '/journal' },
  { icon: '👥', label: 'Contacts', action: 'link' as const, href: '/contacts' },
  { icon: '🎭', label: 'Set Etiquette Simulator', action: 'link' as const, href: '/simulator' },
  { icon: '💰', label: 'Rate Calculator', action: 'link' as const, href: '/rate-calculator' },
  { icon: '⚖️', label: 'Know Your Rights', action: 'external' as const, href: 'https://ubcpactra.ca/agreements/' },
  { icon: '🤝', label: 'My Referrals', action: 'link' as const, href: '/referrals' },
  { icon: '🎬', label: 'Productions in BC', action: 'external' as const, href: 'https://ubcpactra.ca/production-list/' },
  { icon: '🍁', label: 'Find Agencies', action: 'link' as const, href: '/agencies' },
  { icon: '🎭', label: 'Agency Click', action: 'modal' as const, modal: 'agencyClick' },
  { icon: '🎬', label: 'SetReady Casting', action: 'link' as const, href: '/casting-portal' },
  { icon: '📅', label: 'Availability', action: 'link' as const, href: '/availability' },
  { icon: '🎫', label: 'Voucher Wallet', action: 'link' as const, href: '/voucher-wallet' },
  { icon: '🤳', label: 'Headshot AI', action: 'link' as const, href: '/headshot-analyzer' },
  { icon: '🎮', label: 'Games', action: 'link' as const, href: '/games' },
  { icon: '📬', label: 'Messages', action: 'link' as const, href: '/messages' },
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

  // PROMO CODE STATE
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // INSTALL MODAL STATE
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

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

  const [showIOSTip, setShowIOSTip] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // PRE-CHECKOUT REFERRAL MODAL STATE (Feature 4)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<'section1' | 'section2'>('section1');
  const [preCheckoutCode, setPreCheckoutCode] = useState('');
  const [preCheckoutError, setPreCheckoutError] = useState('');
  const [preCheckoutValidating, setPreCheckoutValidating] = useState(false);
  const [userHasReferral, setUserHasReferral] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Message center unread count
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [subscribeLoading, setSubscribeLoading] = useState(false)

  // Casting notifications
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [castingNotifs, setCastingNotifs] = useState<Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string; action_url?: string }>>([])
  const [notifUnread, setNotifUnread] = useState(0)

  // Union / voucher wallet
  const [voucherSummary, setVoucherSummary] = useState<{ totalVouchers: number; qualifyingDays: number; daysRequired: number; percentComplete: number; isQualified: boolean; unionName: string; hasUnreadMilestone: boolean } | null>(null)
  const [showUnionNotifPanel, setShowUnionNotifPanel] = useState(false)
  const [unionNotifs, setUnionNotifs] = useState<Array<{ id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }>>([])
  const [unionUnread, setUnionUnread] = useState(0)

  // Load message center unread count
  useEffect(() => {
    fetch('/api/messages/unread-count')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setUnreadMessages(d.count || 0))
      .catch(() => {})
  }, [])

  // Load casting notifications on mount
  useEffect(() => {
    fetch('/api/notifications/casting')
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string; action_url?: string }>) => {
        setCastingNotifs(data)
        setNotifUnread(data.filter(n => !n.is_read).length)
      })
      .catch(() => {})

    // Load voucher summary + union notifications
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      const token = session.access_token

      fetch('/api/voucher-wallet/summary', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setVoucherSummary(d) })
        .catch(() => {})

      fetch('/api/voucher-wallet/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then((d: Array<{ id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }>) => {
          setUnionNotifs(d)
          setUnionUnread(d.filter(n => !n.is_read).length)
        })
        .catch(() => {})
    })
  }, [])

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

  async function handleSubscribe() {
    setSubscribeLoading(true)
    try {
      const res = await fetch('/api/checkout/section1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Unable to start checkout. Please try again.')
      }
    } catch {
      alert('Something went wrong.')
    } finally {
      setSubscribeLoading(false)
    }
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
        .select('subscription_status, promo_training_expires_at')
        .eq('id', session.user.id)
        .maybeSingle();
      const hasPromo = data?.promo_training_expires_at
        ? new Date(data.promo_training_expires_at) > new Date()
        : false;
      setIsSubscribed(data?.subscription_status === 'active' || hasPromo);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  useEffect(() => {
    checkUser();
    loadModules();
    loadCertificates();
    fetchSubscriptionStatus();
    
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

  // Capture Android install prompt + control install hero banner
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const bannerDismissed = localStorage.getItem('sr-install-dismissed')
    if (!isStandalone && !bannerDismissed) {
      setShowInstallBanner(true)
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false)
      setShowInstallModal(false)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
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
    
    const { data: { session: s2session } } = await supabase.auth.getSession();
    if (!s2session?.access_token) return;

    const s2Res = await fetch(`/api/user-progress?moduleIds=${section2ModuleIds.join(',')}`, {
      headers: { Authorization: `Bearer ${s2session.access_token}` },
    });
    const progressData: Array<{ module_id: number; completed: boolean; section2_popup_shown: boolean }> | null = s2Res.ok ? await s2Res.json() : null;

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
      const { createBrowserClient } = await import('@supabase/ssr')
      const browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user }, error: userError } = await browserClient.auth.getUser()
      if (userError || !user) {
        console.error('Auth error:', userError)
        router.push('/auth/sign-in')
        return
      }
      const { data: { session } } = await browserClient.auth.getSession()
      setUser(user)

      try {
        const adminCheckRes = await fetch('/api/admin/check', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
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

      const progRes = await fetch('/api/user-progress', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const prog = progRes.ok ? await progRes.json() : [];

      const progressMap: Record<string, Progress> = {};
      prog?.forEach((p: Progress) => {
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
      const progRes = await fetch('/api/user-progress', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const prog = progRes.ok ? await progRes.json() : [];

      const progressMap: Record<string, Progress> = {};
      prog?.forEach((p: Progress) => {
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

  function handleQuickAction(item: typeof quickActions[0]) {
    if (item.action === 'link' && item.href) {
      router.push(item.href);
    } else if (item.action === 'external' && item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    } else if (item.action === 'modal' && item.modal === 'agencyClick') {
      openAgencyClickModal();
    }
  }

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
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        {/* Hero Header */}
        <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
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
                {/* Union milestone notifications */}
                <button
                  onClick={async () => {
                    setShowUnionNotifPanel(true)
                    if (unionUnread > 0) {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (session?.access_token) {
                        fetch('/api/voucher-wallet/notifications', { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}` } })
                          .then(() => setUnionUnread(0))
                      }
                    }
                  }}
                  style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(255,255,255,0.8)' }}
                  title="Union milestone notifications"
                >
                  <span style={{ fontSize: '20px' }}>🎫</span>
                  {unionUnread > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#F59E0B', color: '#1a1a2e', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', lineHeight: 1 }}>
                      {unionUnread > 9 ? '9+' : unionUnread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setShowNotifPanel(true); if (notifUnread > 0) fetch('/api/notifications/casting', { method: 'PATCH' }).then(() => setNotifUnread(0)) }}
                  style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(255,255,255,0.8)' }}
                  title="Casting notifications"
                >
                  <span style={{ fontSize: '20px' }}>🔔</span>
                  {notifUnread > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', lineHeight: 1 }}>
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </span>
                  )}
                </button>
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
                  style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '9999px', transition: 'width 0.5s ease' }}
                />
              </div>
              <p className="text-sm text-blue-100 mt-2">
                {completedCount === section1Modules.length 
                  ? '🎉 Amazing! You\'ve unlocked the secret section!' 
                  : `${section1Modules.length - completedCount} more modules to unlock the secret section`}
              </p>
            </div>

            {/* Voucher Wallet Progress Card */}
            {voucherSummary && voucherSummary.totalVouchers > 0 && (
              <div style={{ marginTop: '12px', backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #F59E0B', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', marginBottom: '6px' }}>🎫 Union Progress</div>
                  <div style={{ height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${voucherSummary.percentComplete}%`, backgroundColor: '#F59E0B', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {voucherSummary.qualifyingDays} of {voucherSummary.daysRequired} qualifying days
                    {voucherSummary.isQualified && <span style={{ color: '#16a34a', fontWeight: '700', marginLeft: '6px' }}>🎉 You qualify!</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#F59E0B', lineHeight: 1 }}>{voucherSummary.percentComplete}%</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{voucherSummary.unionName}</div>
                  {voucherSummary.isQualified ? (
                    <Link href="/voucher-wallet" style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', color: '#16a34a', fontWeight: '700', textDecoration: 'none' }}>Apply Now →</Link>
                  ) : (
                    <Link href="/voucher-wallet" style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', color: '#6b7280', textDecoration: 'none' }}>View →</Link>
                  )}
                </div>
              </div>
            )}

            {/* Install App Hero Banner */}
            {showInstallBanner && (
              <div style={{
                marginTop: '12px',
                border: '1px solid rgba(245,158,11,0.5)',
                borderRadius: '12px',
                padding: '11px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4', flex: 1 }}>
                  📲 Add SetReady to your home screen for quick access on set
                </span>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowInstallModal(true)}
                    style={{ padding: '6px 14px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', fontSize: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Install
                  </button>
                  <button
                    onClick={() => { setShowInstallBanner(false); localStorage.setItem('sr-install-dismissed', 'true'); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
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
                  position: 'relative',
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
                {item.label === 'Messages' && unreadMessages > 0 ? (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '9px', fontWeight: '800', backgroundColor: '#ef4444', color: 'white', padding: '1px 5px', borderRadius: '999px', minWidth: '16px', textAlign: 'center' }}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                ) : 'badge' in item && item.badge ? (
                  <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '8px', fontWeight: '800', backgroundColor: '#22c55e', color: 'white', padding: '1px 5px', borderRadius: '4px', lineHeight: '1.6', letterSpacing: '0.02em' }}>
                    {item.badge}
                  </span>
                ) : null}
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

          {/* iOS tip replaced by hero install banner above */}

          {/* PAYMENT STATUS CARDS */}
          {!isSubscribed && (
            <div id="subscribe-banner" style={{ backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '16px', marginBottom: '10px' }}>
              <p style={{ fontWeight: '700', fontSize: '15px', color: 'white', margin: '0 0 4px' }}>🔓 Unlock Section 1 Modules</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: '0 0 12px' }}>Subscribe for $9.99/month to access all training modules.</p>
              <button
                onClick={handleSubscribe}
                disabled={subscribeLoading}
                style={{ padding: '10px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', fontSize: '14px', border: 'none', borderRadius: '10px', cursor: 'pointer', opacity: subscribeLoading ? 0.5 : 1 }}
              >
                {subscribeLoading ? 'Processing...' : 'Subscribe Now — $9.99/month'}
              </button>
            </div>
          )}

          {!isSubscribed && (
            <div style={{ backgroundColor: '#fffbeb', border: '2px solid #F59E0B', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px' }}>
              <p style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', margin: '0 0 3px' }}>Have an access code?</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px' }}>Enter a promo or access code to unlock training modules.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={e => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoMsg(null); }}
                  placeholder="ENTER CODE"
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'white', outline: 'none' }}
                />
                <button
                  onClick={async () => {
                    if (!promoCodeInput.trim()) return;
                    setPromoApplying(true);
                    setPromoMsg(null);
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/promo/apply', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ code: promoCodeInput.trim(), userType: 'performer' }),
                    });
                    const d = await res.json();
                    setPromoApplying(false);
                    if (res.ok) {
                      setPromoMsg({ text: 'Access activated! Reloading...', ok: true });
                      setTimeout(() => window.location.reload(), 1200);
                    } else {
                      setPromoMsg({ text: d.error || 'Invalid code', ok: false });
                    }
                  }}
                  disabled={promoApplying}
                  style={{ padding: '8px 16px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '13px', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: promoApplying ? 0.5 : 1 }}
                >
                  {promoApplying ? '...' : 'Apply'}
                </button>
              </div>
              {promoMsg && (
                <p style={{ fontSize: '12px', marginTop: '6px', color: promoMsg.ok ? '#16a34a' : '#dc2626' }}>
                  {promoMsg.ok ? '✓ ' : '✗ '}{promoMsg.text}
                </p>
              )}
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

          {/* Section 1 Modules — completed modules always shown; locked only if not started AND not subscribed */}
          <div className="grid gap-4">
            {section1Modules.map((module) => {
              const isCompleted = progress[module.id]?.completed;
              const score = progress[module.id]?.score;
              const actualScore = getActualScore(score);

              // Non-subscriber AND not completed: show locked card
              if (!isSubscribed && !isCompleted) {
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

              // Completed OR subscribed: full clickable card
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

      {/* CASTING NOTIFICATIONS PANEL */}
      {showNotifPanel && (
        <div onClick={() => setShowNotifPanel(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99998, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '340px', maxWidth: '90vw', backgroundColor: 'white', height: '100%', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: '700', fontSize: '16px', margin: 0, color: '#1a1a2e' }}>🔔 Casting Updates</h3>
              <button onClick={() => setShowNotifPanel(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {castingNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎬</div>
                  <p style={{ fontSize: '14px', margin: 0 }}>No casting notifications yet.</p>
                  <p style={{ fontSize: '12px', marginTop: '6px' }}>You'll be notified when an agent submits you or your status changes.</p>
                </div>
              ) : castingNotifs.map(n => (
                <div key={n.id}
                  onClick={() => { if (n.action_url) { setShowNotifPanel(false); router.push(n.action_url) } }}
                  style={{ padding: '12px', borderRadius: '10px', marginBottom: '8px', backgroundColor: n.is_read ? '#f9fafb' : '#fffbeb', borderLeft: `3px solid ${n.is_read ? '#e5e7eb' : '#F59E0B'}`, cursor: n.action_url ? 'pointer' : 'default' }}
                >
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', marginBottom: '3px' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>{n.message}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px' }}>
                    {new Date(n.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UNION NOTIFICATIONS PANEL */}
      {showUnionNotifPanel && (
        <div onClick={() => setShowUnionNotifPanel(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99998, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '340px', maxWidth: '90vw', backgroundColor: 'white', height: '100%', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: '700', fontSize: '16px', margin: 0, color: '#1a1a2e' }}>🎫 Union Milestones</h3>
              <button onClick={() => setShowUnionNotifPanel(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {unionNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎫</div>
                  <p style={{ fontSize: '14px', margin: 0 }}>No milestones yet.</p>
                  <p style={{ fontSize: '12px', marginTop: '6px' }}>Add vouchers to your wallet to start tracking union progress.</p>
                </div>
              ) : unionNotifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => { setShowUnionNotifPanel(false); router.push('/voucher-wallet') }}
                  style={{ padding: '12px', borderRadius: '10px', marginBottom: '8px', backgroundColor: n.is_read ? '#f9fafb' : '#fffbeb', borderLeft: `3px solid ${n.is_read ? '#e5e7eb' : '#F59E0B'}`, cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', marginBottom: '3px' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>{n.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {new Date(n.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '700' }}>View Wallet →</span>
                  </div>
                </div>
              ))}
            </div>
            {unionUnread === 0 && unionNotifs.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>All caught up</span>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* INSTALL APP MODAL */}
      {showInstallModal && (() => {
        const ua = navigator.userAgent.toLowerCase()
        const isIOS = /iphone|ipad|ipod/.test(ua)
        const isAndroid = /android/.test(ua)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches

        return (
          <div
            onClick={() => setShowInstallModal(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 99999, padding: '0' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', padding: '24px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
            >
              {/* Handle bar */}
              <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', margin: '0 auto 20px' }} />

              {/* SR badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px', color: '#F59E0B', fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>SR</div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '17px', color: '#1a1a2e' }}>SetReady</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Background Performer Platform</div>
                </div>
                <button onClick={() => setShowInstallModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '22px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              {isStandalone && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 8px' }}>SetReady is already installed!</h2>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>You are using the installed app.</p>
                </div>
              )}

              {!isStandalone && isIOS && (
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 6px' }}>Add SetReady to Your Home Screen</h2>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>Follow these steps in Safari:</p>
                  {[
                    { icon: '⬆️', step: 'Tap the Share button', sub: 'At the bottom of your Safari browser' },
                    { icon: '＋', step: 'Tap "Add to Home Screen"', sub: 'Scroll down in the share menu to find it' },
                    { icon: '✓', step: 'Tap Add', sub: 'SetReady appears on your home screen instantly' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e', marginBottom: '3px' }}>Step {i + 1}: {s.step}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#92400e' }}>
                    ⚠️ Must be using <strong>Safari</strong>. Chrome on iPhone does not support home screen installation.
                  </div>
                </div>
              )}

              {!isStandalone && isAndroid && (
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 20px' }}>Install SetReady on Android</h2>
                  {deferredInstallPrompt ? (
                    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                      <button
                        onClick={async () => {
                          deferredInstallPrompt.prompt()
                          const { outcome } = await deferredInstallPrompt.userChoice
                          if (outcome === 'accepted') { setShowInstallModal(false); setShowInstallBanner(false); }
                          setDeferredInstallPrompt(null)
                        }}
                        style={{ width: '100%', padding: '16px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '16px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
                      >
                        📲 Install Now
                      </button>
                      <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>Tap to add SetReady to your home screen</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px' }}>Open Chrome and follow these steps:</p>
                      {[
                        { icon: '⋮', step: 'Open Chrome menu', sub: 'Tap the three-dot menu in the top right' },
                        { icon: '＋', step: 'Tap "Add to Home Screen"', sub: 'Scroll down in the menu to find it' },
                        { icon: '✓', step: 'Tap Install', sub: 'SetReady appears on your home screen' },
                      ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', flexShrink: 0 }}>{s.icon}</div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e', marginBottom: '3px' }}>Step {i + 1}: {s.step}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>{s.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isStandalone && !isIOS && !isAndroid && (
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 12px' }}>Install SetReady on Your Computer</h2>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px', lineHeight: '1.5' }}>
                    Look for the install icon <strong>(⊕)</strong> in your browser address bar, or use your browser menu and select <strong>"Install SetReady"</strong>.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {['✓ Chrome', '✓ Edge', '✓ Brave'].map(b => (
                      <div key={b} style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>{b}</div>
                    ))}
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>Not supported in Firefox or Safari on desktop.</div>
                  </div>
                </div>
              )}

              {!isStandalone && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.5' }}>
                  Once installed, SetReady opens like a native app — no browser needed.
                </div>
              )}
            </div>
          </div>
        )
      })()}

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