// app/dashboard/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
}

interface Stats {
  totalUsers: number;
  totalRevenue: number;
  totalAffiliates: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  newUsersThisMonth: number;
  averageRevenuePerUser: number;
}

interface RevenueData {
  date: string;
  amount: number;
}

interface RFMSegment {
  segment: string;
  count: number;
  color: string;
  description: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalAffiliates: 0,
    activeUsersToday: 0,
    activeUsersThisWeek: 0,
    newUsersThisMonth: 0,
    averageRevenuePerUser: 0
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [rfmSegments, setRfmSegments] = useState<RFMSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || 'Admin');
      await loadData();
    }
    checkAuth();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userDataError) {
        console.error('Error fetching users:', userDataError);
      }

      const allUsers = userData || [];
      setUsers(allUsers.slice(0, 50));

      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(today);
      monthStart.setDate(monthStart.getDate() - 30);

      const activeToday = allUsers.filter((u: User) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= todayStart).length;
      const activeThisWeek = allUsers.filter((u: User) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= weekStart).length;
      const newThisMonth = allUsers.filter((u: User) => new Date(u.created_at) >= monthStart).length;

      let affiliateCount = 0;
      try {
        const { count, error } = await supabase
          .from('affiliates')
          .select('*', { count: 'exact', head: true });
        
        if (!error) affiliateCount = count || 0;
      } catch (err) {
        console.log('Affiliates table may not exist yet');
      }

      let totalRevenue = 0;
      let revenueByDate: Record<string, number> = {};
      
      try {
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_results')
          .select('score, completed_at');
        
        if (!quizError && quizData) {
          totalRevenue = quizData.length * 15;
          
          quizData.forEach((quiz: { score: number | null; completed_at: string | null }) => {
            if (quiz.completed_at) {
              const date = new Date(quiz.completed_at).toISOString().split('T')[0];
              revenueByDate[date] = (revenueByDate[date] || 0) + 15;
            }
          });
        }
      } catch (err) {
        console.log('Quiz results table may not exist yet');
      }

      const revenueArray = Object.entries(revenueByDate).map(([date, amount]) => ({
        date,
        amount
      })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

      setRevenueData(revenueArray);

      const rfmSegmentsData = calculateRFMSegments(allUsers);
      setRfmSegments(rfmSegmentsData);

      setStats({
        totalUsers: allUsers.length,
        totalRevenue: totalRevenue,
        totalAffiliates: affiliateCount,
        activeUsersToday: activeToday,
        activeUsersThisWeek: activeThisWeek,
        newUsersThisMonth: newThisMonth,
        averageRevenuePerUser: allUsers.length > 0 ? totalRevenue / allUsers.length : 0
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateRFMSegments(users: User[]): RFMSegment[] {
    const now = new Date();
    const segments = {
      champions: 0,
      loyal: 0,
      atRisk: 0,
      newUsers: 0,
      inactive: 0
    };

    users.forEach(user => {
      const lastActive = user.last_sign_in_at ? new Date(user.last_sign_in_at) : new Date(user.created_at);
      const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceJoined = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceJoined < 30) {
        segments.newUsers++;
      } else if (daysSinceActive <= 7) {
        segments.champions++;
      } else if (daysSinceActive <= 30) {
        segments.loyal++;
      } else if (daysSinceActive <= 90) {
        segments.atRisk++;
      } else {
        segments.inactive++;
      }
    });

    return [
      { segment: '🏆 Champions', count: segments.champions, color: 'from-emerald-500 to-green-600', description: 'Highly engaged, frequent users' },
      { segment: '⭐ Loyal', count: segments.loyal, color: 'from-blue-500 to-indigo-600', description: 'Regular active users' },
      { segment: '🆕 New Users', count: segments.newUsers, color: 'from-purple-500 to-pink-600', description: 'Joined within 30 days' },
      { segment: '⚠️ At Risk', count: segments.atRisk, color: 'from-amber-500 to-orange-600', description: 'Decreased activity, may churn' },
      { segment: '💤 Inactive', count: segments.inactive, color: 'from-gray-500 to-slate-600', description: 'No activity in 90+ days' }
    ];
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-indigo-100 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-slate-600 font-medium tracking-wide">Loading dashboard...</p>
          <p className="text-xs text-slate-400 mt-1">Fetching analytics data</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueData.map(d => d.amount), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-indigo-200 text-sm mt-1 font-light">Complete platform analytics & management suite</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-sm">
                👑 {userEmail}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="group px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300 text-sm font-medium flex items-center gap-2 border border-white/20"
              >
                <svg className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Total Registered</p>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-800 tracking-tight">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                  <span className="text-emerald-600 font-semibold">+{stats.newUsersThisMonth}</span>
                  <span>new this month</span>
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>

          {/* Total Revenue Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Total Revenue</p>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-800 tracking-tight">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">Avg <span className="font-semibold text-slate-700">${stats.averageRevenuePerUser.toFixed(2)}</span> per user</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>

          {/* Active Users Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Active Users</p>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-800 tracking-tight">{stats.activeUsersToday}</p>
                <p className="text-sm text-slate-500 mt-2">
                  <span className="font-semibold text-slate-700">{stats.activeUsersThisWeek}</span> active this week
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>

          {/* Affiliates Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full -mr-10 -mt-10"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Partners</p>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold text-slate-800 tracking-tight">{stats.totalAffiliates.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-2">Active affiliate partners</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>
        </div>

        {/* KPI Cards - Row 2 (Engagement Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Conversion Rate</p>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{(stats.totalUsers > 0 ? (stats.activeUsersToday / stats.totalUsers * 100) : 0).toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-2">Daily active users / total registered</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">User Growth</p>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{(stats.totalUsers > 0 ? (stats.newUsersThisMonth / stats.totalUsers * 100) : 0).toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-2"><span className="font-semibold text-emerald-600">{stats.newUsersThisMonth}</span> new users this month</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Revenue Per User</p>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">${stats.averageRevenuePerUser.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-2">Average lifetime value per user</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">📈 Revenue Analytics</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Track your platform earnings over time</p>
                </div>
                <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
                  <button 
                    onClick={() => setSelectedTimeframe('week')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${selectedTimeframe === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    7 Days
                  </button>
                  <button 
                    onClick={() => setSelectedTimeframe('month')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${selectedTimeframe === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    30 Days
                  </button>
                  <button 
                    onClick={() => setSelectedTimeframe('year')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${selectedTimeframe === 'year' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    90 Days
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-72 flex items-end gap-1.5">
                {revenueData.slice(selectedTimeframe === 'week' ? -7 : selectedTimeframe === 'month' ? -30 : -90).map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg transition-all duration-500 hover:from-indigo-600 hover:to-indigo-500 cursor-pointer"
                        style={{ height: `${(data.amount / maxRevenue) * 200}px` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${data.amount}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-mono">{data.date.slice(5)}</p>
                  </div>
                ))}
              </div>
              {revenueData.length === 0 && (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">No revenue data available yet</p>
                    <p className="text-xs text-slate-400 mt-1">Complete quizzes to see earnings</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RFM Segmentation Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h2 className="text-lg font-bold text-slate-800">🎯 User Segmentation</h2>
                <p className="text-xs text-slate-500 mt-0.5">RFM Analysis - Recency, Frequency, Monetary</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                {rfmSegments.map((segment, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-semibold text-slate-700">{segment.segment}</span>
                        <p className="text-xs text-slate-400 mt-0.5 italic">{segment.description}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{segment.count} users</span>
                    </div>
                    <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`absolute top-0 left-0 h-full bg-gradient-to-r ${segment.color} rounded-full transition-all duration-1000 group-hover:opacity-90`}
                        style={{ width: `${stats.totalUsers > 0 ? (segment.count / stats.totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-sm">💡</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">RFM Analysis Insight</p>
                    <p className="text-xs text-indigo-600 mt-1">Focus on retaining <span className="font-bold">"Champions"</span> and reactivating <span className="font-bold">"At Risk"</span> users to maximize lifetime value.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">👥 Recent Users</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest registered members</p>
            </div>
            <Link href="/dashboard/admin/users" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="font-medium">No users found</p>
                        <p className="text-xs">New users will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.slice(0, 8).map((user) => {
                    const daysSinceJoin = Math.floor((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    const isNew = daysSinceJoin < 30;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">{user.email?.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-sm font-medium text-slate-700">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{user.id.substring(0, 10)}...</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {isNew ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              New
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link href="/dashboard/admin/users" className="group bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">User Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">View, edit, manage users</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/admin/affiliates" className="group bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Affiliates</h3>
                <p className="text-xs text-slate-500 mt-0.5">Track performance & payouts</p>
              </div>
            </div>
          </Link>

          {/* NEW: Codes Card */}
          <Link href="/dashboard/admin/codes" className="group bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Access Codes</h3>
                <p className="text-xs text-slate-500 mt-0.5">Generate & manage e-transfer codes</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/admin/analytics" className="group bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Analytics</h3>
                <p className="text-xs text-slate-500 mt-0.5">Deep dive into metrics</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/admin/settings" className="group bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">Platform configuration</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            © 2026 SetReady Admin Dashboard • <span className="font-mono">v2.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}