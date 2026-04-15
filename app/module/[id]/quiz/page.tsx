'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default function QuizSummaryPage({ params }: QuizPageProps) {
  const unwrappedParams = React.use(params);
  const moduleId = unwrappedParams.id;
  const router = useRouter();

  const handleStartTest = () => {
    router.push(`/module/${moduleId}/quiz/test`);
  };

  const handleBackToModule = () => {
    router.push(`/module/${moduleId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Module Test</h1>
          <p className="text-gray-600">Test your knowledge after completing the lesson</p>
        </div>

        {/* Quiz Information Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Test Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Number of Questions</h3>
                <p className="text-gray-600">15 questions total</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Passing Score</h3>
                <p className="text-gray-600">80% (12 out of 15 correct)</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Time Limit</h3>
                <p className="text-gray-600">No time limit - take your time</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Certificate</h3>
                <p className="text-gray-600">Earn a certificate when you pass</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">5</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Retakes</h3>
                <p className="text-gray-600">Unlimited retakes if you don't pass</p>
              </div>
            </div>
          </div>
        </div>

        {/* Province Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-xl">📍</div>
            <div>
              <h3 className="font-semibold text-blue-800">Province-Specific Questions</h3>
              <p className="text-blue-700 text-sm">
                This test includes 5 questions specific to your province.
              </p>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-xl">💡</div>
            <div>
              <h3 className="font-semibold text-yellow-800">Tips for Success</h3>
              <ul className="mt-2 text-yellow-700 text-sm space-y-1">
                <li>• Review the lesson material before starting</li>
                <li>• Read each question carefully</li>
                <li>• You can review and change answers before submitting</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleBackToModule}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            ← Back to Lesson
          </button>
          <button
            onClick={handleStartTest}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
          >
            Start Test →
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Once you start the test, you must complete all questions before submitting.
        </p>
      </div>
    </div>
  );
}