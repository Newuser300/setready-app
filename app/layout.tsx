import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import PWAInstaller from '@/components/PWAInstaller';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SetReady — Background Performer Platform',
  description: 'The complete platform for Canadian background performers. Train, track, calculate and connect.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SetReady',
  },
  icons: {
    icon: '/setready-icon-192.png',
    apple: '/setready-icon-180-apple.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/setready-icon-192.png" type="image/png" />
        <meta name="theme-color" content="#F59E0B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SetReady" />
        <link rel="apple-touch-icon" href="/setready-icon-180-apple.png" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
        <PWAInstaller />
        <Analytics />
      </body>
    </html>
  );
}