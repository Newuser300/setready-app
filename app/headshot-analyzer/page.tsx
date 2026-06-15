'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AnalysisResult = {
  overallScore: number;
  lighting: { score: number; feedback: string };
  composition: { score: number; feedback: string };
  expression: { score: number; feedback: string };
  background: { score: number; feedback: string };
  professionalism: { score: number; feedback: string };
  topRecommendations: string[];
};

export default function HeadshotAnalyzer() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoaded, setCreditsLoaded] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
  }

  async function analyze() {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const res = await fetch('/api/headshot-analyzer/analyze', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
        return;
      }
      setResult(data);
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#F59E0B';
    return '#ef4444';
  }

  function getScoreLabel(score: number) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  }

  const categories = result ? [
    { key: 'lighting', label: 'Lighting', icon: '💡', data: result.lighting },
    { key: 'composition', label: 'Composition', icon: '📐', data: result.composition },
    { key: 'expression', label: 'Expression', icon: '😊', data: result.expression },
    { key: 'background', label: 'Background', icon: '🖼️', data: result.background },
    { key: 'professionalism', label: 'Professionalism', icon: '✨', data: result.professionalism },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '16px 20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '20px', padding: 0, lineHeight: 1 }}>←</button>
          <div>
            <h1 style={{ fontWeight: '800', fontSize: '18px', margin: 0 }}>🤳 Headshot Analyzer</h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>AI-powered headshot critique for performers</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Upload Area */}
        {!result && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'white',
              marginBottom: '16px',
              transition: 'border-color 0.2s',
            }}
          >
            {previewUrl ? (
              <div>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxWidth: '200px', maxHeight: '240px', borderRadius: '12px', objectFit: 'cover', margin: '0 auto 12px', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>{selectedFile?.name}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Click to change photo</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤳</div>
                <p style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e', margin: '0 0 6px' }}>Upload Your Headshot</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>Drag and drop or click to select</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>JPG, PNG, WEBP · Max 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {previewUrl && !result && (
          <button
            onClick={analyze}
            disabled={analyzing}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: analyzing ? '#9ca3af' : '#1a1a2e',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              border: 'none',
              borderRadius: '12px',
              cursor: analyzing ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
            }}
          >
            {analyzing ? '🔍 Analyzing...' : '🔍 Analyze My Headshot'}
          </button>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Overall Score */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                {previewUrl && (
                  <img src={previewUrl} alt="Analyzed" style={{ width: '80px', height: '96px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>Overall Score</p>
                  <div style={{ fontSize: '52px', fontWeight: '900', color: getScoreColor(result.overallScore), lineHeight: 1, marginBottom: '4px' }}>{result.overallScore}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: getScoreColor(result.overallScore) }}>{getScoreLabel(result.overallScore)}</div>
                </div>
              </div>

              {/* Category scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {categories.map(cat => (
                  <div key={cat.key} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{cat.icon}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: getScoreColor(cat.data.score) }}>{cat.data.score}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{cat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            {categories.map(cat => (
              <div key={cat.key} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '10px', borderLeft: `4px solid ${getScoreColor(cat.data.score)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>{cat.icon} {cat.label}</span>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: getScoreColor(cat.data.score) }}>{cat.data.score}/100</span>
                </div>
                <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>{cat.data.feedback}</p>
              </div>
            ))}

            {/* Top Recommendations */}
            {result.topRecommendations?.length > 0 && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontWeight: '700', fontSize: '14px', color: '#92400e', margin: '0 0 10px' }}>💡 Top Recommendations</p>
                {result.topRecommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#78350f' }}>
                    <span style={{ flexShrink: 0 }}>{i + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setResult(null); setSelectedFile(null); setPreviewUrl(null); setError(''); }}
              style={{ width: '100%', padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: '600', fontSize: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
            >
              Analyze Another Photo
            </button>
          </div>
        )}

        {/* Info section */}
        {!result && !previewUrl && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e', margin: '0 0 10px' }}>What we analyze:</p>
            {[
              { icon: '💡', label: 'Lighting', desc: 'Quality and direction of light on your face' },
              { icon: '📐', label: 'Composition', desc: 'Framing, crop, and rule-of-thirds alignment' },
              { icon: '😊', label: 'Expression', desc: 'Approachability, confidence, and authenticity' },
              { icon: '🖼️', label: 'Background', desc: 'Clean, professional, non-distracting setting' },
              { icon: '✨', label: 'Professionalism', desc: 'Overall industry-standard casting readiness' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a2e' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}> — {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
