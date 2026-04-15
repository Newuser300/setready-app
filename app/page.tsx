'use client';

import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // If already logged in, send to dashboard
        router.push('/dashboard');
      }
      setIsLoading(false);
    }
    checkAuth();
  }, [supabase, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-blue-700">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700">
      {/* Navigation Bar */}
      <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="text-white text-2xl font-bold">
            🎬 SetReady
          </div>
          <div className="space-x-3 sm:space-x-4">
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="px-3 sm:px-4 py-2 text-white hover:bg-white/10 rounded-lg transition text-sm sm:text-base"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/auth/sign-up')}
              className="px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold text-sm sm:text-base"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6">
          Master Film Set Terminology
        </h1>
        <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
          Professional training for background actors. Learn industry terminology, 
          pass your modules, and earn your certificates.
        </p>
        <button
          onClick={() => router.push('/auth/sign-up')}
          className="px-6 sm:px-8 py-2.5 sm:py-3 bg-amber-500 text-white text-base sm:text-lg rounded-lg hover:bg-amber-600 transition font-semibold"
        >
          Start Learning Today →
        </button>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2">Learn at Your Pace</h3>
            <p className="text-blue-100 text-sm sm:text-base">
              Complete modules with professional film set terminology and industry best practices.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="text-xl font-bold mb-2">Test Your Knowledge</h3>
            <p className="text-blue-100 text-sm sm:text-base">
              Take module quizzes and earn 80% or higher to pass and advance.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-xl font-bold mb-2">Earn Certificates</h3>
            <p className="text-blue-100 text-sm sm:text-base">
              Download your certificates and showcase your professional training.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-amber-500/20 rounded-lg p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
            Ready to Start Your Acting Career?
          </h2>
          <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-base">
            Join hundreds of actors mastering film set terminology
          </p>
          <button
            onClick={() => router.push('/auth/sign-up')}
            className="px-5 sm:px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold"
          >
            Sign Up Now - Free
          </button>
        </div>
      </div>
    </div>
  );
}