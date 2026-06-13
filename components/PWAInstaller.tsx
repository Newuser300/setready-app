'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('pwa-dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as unknown as { standalone?: boolean }).standalone;
    setIsIOS(ios);

    if (ios) {
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-[#1a1a2e] border border-[#F59E0B]/30 rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-full bg-[#F59E0B] flex-shrink-0"
            style={{ width: 40, height: 40 }}
          >
            <span className="font-bold text-[#1a1a2e] text-xs select-none">SR</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Install SetReady</p>
            {isIOS ? (
              <p className="text-gray-400 text-xs mt-0.5">
                Tap <span className="text-[#F59E0B]">Share</span> then &ldquo;Add to Home Screen&rdquo;
              </p>
            ) : (
              <p className="text-gray-400 text-xs mt-0.5">
                Add to your home screen for the best experience
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none flex-shrink-0 -mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        {!isIOS && installPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#1a1a2e] font-semibold text-sm py-2 rounded-lg transition"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
