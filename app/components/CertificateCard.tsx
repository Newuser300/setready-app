'use client';

import { useState } from 'react';

interface CertificateCardProps {
  id: string;
  name: string;
  type: string;
  date: string;
  score: number;
  pdfUrl: string | null;
  onDownload?: () => void;
}

export default function CertificateCard({
  id,
  name,
  type,
  date,
  score,
  pdfUrl,
  onDownload,
}: CertificateCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [showVerifyTip, setShowVerifyTip] = useState(false);

  const handleDownload = async () => {
    if (!pdfUrl) {
      alert('PDF not available yet. Please complete the quiz again.');
      return;
    }
    
    setDownloading(true);
    try {
      // Direct download using fetch
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s/g, '_')}_Certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      if (onDownload) onDownload();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleVerify = () => {
    const verifyUrl = `${window.location.origin}/verify/${id}`;
    navigator.clipboard.writeText(verifyUrl);
    setShowVerifyTip(true);
    setTimeout(() => setShowVerifyTip(false), 3000);
  };

  const getScoreColor = () => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300">
      <div className="h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-yellow-100 p-3 rounded-full">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mb-2">{name}</h3>
        
        <div className="mb-3">
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {type}
          </span>
        </div>
        
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getScoreColor()} mb-4`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-semibold">{score}% Score</span>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading || !pdfUrl}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          
          <button
            onClick={handleVerify}
            className="px-4 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Verify certificate"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
        
        {showVerifyTip && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg text-center">
            ✓ Verification link copied!
          </div>
        )}
      </div>
    </div>
  );
}