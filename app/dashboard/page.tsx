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
  { icon: '📋', label: 'Work Log', action: 'link' as const, href: '/work-log' },
  { icon: '🤝', label: 'My Referrals', action: 'link' as const, href: '/referrals' },
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

  // Casting notifications
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [castingNotifs, setCastingNotifs] = useState<Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string; action_url?: string }>>([])
  const [notifUnread, setNotifUnread] = useState(0)

  // Load casting notifications on mount
  useEffect(() => {
    fetch('/api/notifications/casting')
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string; action_url?: string }>) => {
        setCastingNotifs(data)
        setNotifUnread(data.filter(n => !n.is_read).length)
      })
      .catch(() => {})
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

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '24px 0' }} />

          {/* QUICK LINKS */}
          <div id="quick-links-section">
            <h2 className="text-lg font-bold text-gray-700 mb-4">Quick Links</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>

              <button onClick={() => router.push('/work-log')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'left', width: '100%' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>Work Log</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Track earnings & vouchers</div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '18px' }}>→</span>
              </button>
              <button onClick={() => router.push('/referrals')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'left', width: '100%' }}>
                <span style={{ fontSize: '24px' }}>🤝</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>My Referrals</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Earn 20% commission</div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '18px' }}>→</span>
              </button>
              <button onClick={() => router.push('/availability')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'left', width: '100%' }}>
                <span style={{ fontSize: '24px' }}>📅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>Availability</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Manage your schedule</div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '18px' }}>→</span>
              </button>
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