'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CategoryScore = { score: number; feedback: string };
type CharacterMatch = { role: string; matchPercent: number; why: string; wardrobe: string };

type AnalysisResult = {
  // Casting profile (Phase 2)
  castingType: { label: string; description: string };
  playableAgeRange: string;
  assessment: string;
  characterMatches: CharacterMatch[];
  castingStrengths: string[];
  thingsToAvoid: string[];
  backgroundWorkTips: string[];
  // Photo critique (Phase 1)
  overallScore: number;
  lighting: CategoryScore;
  composition: CategoryScore;
  expression: CategoryScore;
  background: CategoryScore;
  professionalism: CategoryScore;
  topRecommendations: string[];
  creditsRemaining?: number;
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
  const [purchasing, setPurchasing] = useState<'1' | '5' | null>(null);

  useEffect(() => { localStorage.setItem('sr-headshot-visited', '1') }, [])

  // Load credits on mount
  useEffect(() => {
    fetch('/api/headshot-analyzer/credits', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setCredits(d.credits ?? 0);
        setCreditsLoaded(true);
      })
      .catch(() => {
        setCredits(0);
        setCreditsLoaded(true);
      });
  }, []);

  // Handle purchase redirect return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchased') === 'true') {
      window.history.replaceState({}, '', '/headshot-analyzer');
      fetch('/api/headshot-analyzer/credits', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setCredits(d.credits ?? 0))
        .catch(() => {});
    }
  }, []);

  async function handlePurchase(quantity: 1 | 5) {
    setPurchasing(quantity.toString() as '1' | '5');
    try {
      const res = await fetch('/api/checkout/headshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || 'Unable to start checkout.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file (JPG, PNG, etc.)'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file (JPG, PNG, etc.)'); return; }
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
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>AI headshot critique for performers</p>
          </div>
          {creditsLoaded && credits !== null && credits > 0 && (
            <div style={{ marginLeft: 'auto', backgroundColor: 'rgba(245,158,11,0.2)', border: '1px solid #F59E0B', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700', color: '#F59E0B' }}>
              {credits} credit{credits !== 1 ? 's' : ''} left
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>

        {!creditsLoaded ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤳</div>
            <p>Loading...</p>
          </div>
        ) : credits === 0 && !result ? (
          /* ── PURCHASE GATE ── */
          <div>
            {/* What the analyzer does */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <p style={{ fontWeight: '800', fontSize: '16px', color: '#1a1a2e', margin: '0 0 6px' }}>What the AI Headshot Analyzer Does</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>Upload your headshot photo. Our AI reviews your photo and identifies:</p>

              {[
                { icon: '🎭', text: 'Your casting type (e.g. Character Actor, Leading Lady, Authority Figure)' },
                { icon: '📅', text: 'The age range you can play' },
                { icon: '🎬', text: 'Your top character matches with percentage scores (e.g. Police Officer 94%, Doctor 88%)' },
                { icon: '💡', text: 'Why each role suits your look' },
                { icon: '👔', text: 'Wardrobe tips for each character type' },
                { icon: '🌟', text: 'Your casting strengths' },
                { icon: '⚠️', text: 'What to avoid in your headshot' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{item.text}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '8px' }}>
                <p style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e', margin: '0 0 10px' }}>You also receive:</p>
                {[
                  { icon: '📝', text: 'An honest, AI-generated written assessment of your headshot' },
                  { icon: '🔍', text: 'Specific feedback on the photo itself — lighting, expression, framing' },
                  { icon: '💼', text: 'Background work tips tailored to your appearance' },
                  { icon: '📸', text: 'Recommendations for your next headshot session' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important note */}
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>
                <strong>⚠️ Important:</strong> This tool analyzes your headshot and provides written character recommendations and casting advice. It does <strong>NOT</strong> generate images of you as a character — the analysis is text-based, AI-generated, and meant as guidance — not professional casting representation or a guarantee of work.
              </p>
            </div>

            {/* Purchase options */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <p style={{ fontWeight: '800', fontSize: '16px', color: '#1a1a2e', margin: '0 0 4px' }}>Purchase Analysis Credits</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>$2.00 CAD per analysis · Credits never expire</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => handlePurchase(1)}
                  disabled={purchasing !== null}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer', opacity: purchasing !== null ? 0.5 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>{purchasing === '1' ? 'Redirecting...' : 'Purchase 1 Analysis'}</span>
                  <span style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', padding: '3px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: '800' }}>$2.00</span>
                </button>

                <button
                  onClick={() => handlePurchase(5)}
                  disabled={purchasing !== null}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer', opacity: purchasing !== null ? 0.5 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {purchasing === '5' ? 'Redirecting...' : 'Purchase 5 Analyses'}
                    <span style={{ backgroundColor: '#22c55e', color: 'white', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>BEST VALUE</span>
                  </span>
                  <span style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', padding: '3px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: '800' }}>$10.00</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── UPLOAD + RESULTS ── */
          <div>
            {/* Credits remaining indicator */}
            {credits !== null && credits > 0 && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#166534' }}>Analysis credits remaining</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: '#16a34a' }}>{credits}</span>
              </div>
            )}

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
                }}
              >
                {previewUrl ? (
                  <div>
                    <img src={previewUrl} alt="Preview" style={{ maxWidth: '200px', maxHeight: '240px', borderRadius: '12px', objectFit: 'cover', margin: '0 auto 12px', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
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
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
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
                style={{ width: '100%', padding: '14px', backgroundColor: analyzing ? '#9ca3af' : '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '16px', border: 'none', borderRadius: '12px', cursor: analyzing ? 'not-allowed' : 'pointer', marginBottom: '16px' }}
              >
                {analyzing ? '🔍 Analyzing... (uses 1 credit)' : '🔍 Analyze My Headshot — 1 Credit'}
              </button>
            )}

            {/* Results */}
            {result && (
              <div>
                {/* ── Casting Profile (headline) ── */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '800' }}>Your Casting Type</p>
                  <p style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a2e', margin: '0 0 8px', lineHeight: 1.2 }}>{result.castingType?.label}</p>
                  {result.castingType?.description && (
                    <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 14px' }}>{result.castingType.description}</p>
                  )}
                  {result.playableAgeRange && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '20px', padding: '6px 14px' }}>
                      <span style={{ fontSize: '13px' }}>📅</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#3730a3' }}>Plays age {result.playableAgeRange}</span>
                    </div>
                  )}
                </div>

                {/* ── Overall Score + photo-quality summary ── */}
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

                {/* ── Casting Director's Assessment ── */}
                {result.assessment && (
                  <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <p style={{ fontWeight: '800', fontSize: '15px', color: '#1a1a2e', margin: '0 0 8px' }}>📝 AI Casting Assessment</p>
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0 }}>{result.assessment}</p>
                  </div>
                )}

                {/* ── Top Character Matches ── */}
                {result.characterMatches?.length > 0 && (
                  <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <p style={{ fontWeight: '800', fontSize: '15px', color: '#1a1a2e', margin: '0 0 4px' }}>🎬 Top Character Matches</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>Roles you're likely to read well for in background and featured work</p>
                    {result.characterMatches.map((m, i) => {
                      const last = i === result.characterMatches.length - 1;
                      return (
                        <div key={i} style={{ marginBottom: last ? 0 : '18px', paddingBottom: last ? 0 : '18px', borderBottom: last ? 'none' : '1px solid #f3f4f6' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>{m.role}</span>
                            <span style={{ fontWeight: '800', fontSize: '15px', color: getScoreColor(m.matchPercent) }}>{m.matchPercent}%</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{ height: '100%', width: `${m.matchPercent}%`, backgroundColor: getScoreColor(m.matchPercent), borderRadius: '4px' }} />
                          </div>
                          {m.why && <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5', margin: '0 0 6px' }}>{m.why}</p>}
                          {m.wardrobe && (
                            <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: 0 }}>
                              <strong style={{ color: '#374151' }}>👔 Wardrobe:</strong> {m.wardrobe}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Casting Strengths ── */}
                {result.castingStrengths?.length > 0 && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: '#166534', margin: '0 0 10px' }}>🌟 Your Casting Strengths</p>
                    {result.castingStrengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#15803d' }}>
                        <span style={{ flexShrink: 0 }}>✓</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── What to Avoid ── */}
                {result.thingsToAvoid?.length > 0 && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: '#92400e', margin: '0 0 10px' }}>⚠️ What to Avoid</p>
                    {result.thingsToAvoid.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#78350f' }}>
                        <span style={{ flexShrink: 0 }}>•</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Detailed photo critique ── */}
                {categories.map(cat => (
                  <div key={cat.key} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '10px', borderLeft: `4px solid ${getScoreColor(cat.data.score)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>{cat.icon} {cat.label}</span>
                      <span style={{ fontWeight: '800', fontSize: '16px', color: getScoreColor(cat.data.score) }}>{cat.data.score}/100</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>{cat.data.feedback}</p>
                  </div>
                ))}

                {/* ── Background Work Tips ── */}
                {result.backgroundWorkTips?.length > 0 && (
                  <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e', margin: '0 0 10px' }}>💼 Background Work Tips</p>
                    {result.backgroundWorkTips.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#4b5563' }}>
                        <span style={{ flexShrink: 0 }}>→</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Top Recommendations ── */}
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
                  style={{ width: '100%', padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: '600', fontSize: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px' }}
                >
                  Analyze Another Photo
                </button>

                {credits === 0 && (
                  <button
                    onClick={() => handlePurchase(5)}
                    disabled={purchasing !== null}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
                  >
                    Purchase 5 More Analyses — $10.00
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
