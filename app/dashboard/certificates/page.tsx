'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient()

interface Certificate {
  id: string;
  module_id: string;
  module_title: string;
  module_number: number;
  completed_at: string;
  score: number;
}

export default function CertificatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        console.log('Certificates page - User found:', user.id);
      } else {
        console.error('Certificates page - No user found');
      }
      setLoading(false);
    }
    
    getUser();
  }, []);

  useEffect(() => {
    async function loadCertificates() {
      if (!userId) return;
      
      setLoading(true);
      console.log('Loading certificates for user:', userId);
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();
        
        if (profile) {
          setUserName(profile.full_name || 'Student');
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          setUserName(user?.email?.split('@')[0] || 'Student');
        }
        
        const { data: modules } = await supabase
          .from('modules')
          .select('id, title, module_number');
        
        const moduleMap = new Map();
        modules?.forEach((m: any) => {
          moduleMap.set(m.id, { title: m.title, number: m.module_number });
        });
        
        const { data: completedModules } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', true)
          .order('updated_at', { ascending: false });
        
        if (completedModules && completedModules.length > 0) {
          const certs = completedModules.map((progress: any) => {
            const moduleInfo = moduleMap.get(progress.module_id);
            return {
              id: progress.id,
              module_id: progress.module_id,
              module_title: moduleInfo?.title || `Module ${progress.module_id}`,
              module_number: moduleInfo?.number || 0,
              completed_at: progress.updated_at || progress.completed_at,
              score: progress.score || 100
            };
          });
          setCertificates(certs);
        }
      } catch (error) {
        console.error('Error loading certificates:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadCertificates();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your certificates...</p>
        </div>
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Please Sign In</h2>
          <p className="text-gray-500 mb-6">You need to be signed in to view your certificates.</p>
          <button
            onClick={() => router.push('/auth/sign-in')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 rounded-lg shadow-md p-6 mb-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
              <p className="text-amber-100">
                {userName ? `${userName}, here are your earned certificates` : 'Your completed module certificates'}
              </p>
              <p className="text-amber-200 text-sm mt-2">
                Each certificate represents a module you've passed with 80% or higher
              </p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
        
        {certificates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Certificates Yet</h2>
            <p className="text-gray-500 mb-6">
              Complete a module quiz with 80% or higher to earn your first certificate.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📜</span>
                      <h2 className="text-xl font-bold text-gray-800">Certificate of Completion</h2>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-700">{cert.module_title}</h3>
                    <p className="text-gray-500 text-sm mt-2">
                      Completed: {formatDate(cert.completed_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">{cert.score}%</div>
                    <p className="text-xs text-gray-500">Score</p>
                    <button
                      onClick={() => router.push(`/module/${cert.module_id}/quiz`)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Retake Quiz →
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-amber-800 text-sm">
                    🎓 This certifies that <strong>{userName}</strong> has successfully completed <strong>{cert.module_title}</strong> with a score of <strong>{cert.score}%</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}