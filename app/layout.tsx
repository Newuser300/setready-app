import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import PWAInstaller from '@/components/PWAInstaller';
import VisitTracker from '@/components/VisitTracker';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.setready.site';
const TITLE = 'SetReady — The App for Canadian Background Actors & Film Extras';
const DESCRIPTION =
  'SetReady is the all-in-one app for Canadian background performers (film & TV extras): log bookings, store vouchers, calculate UBCP/ACTRA pay, learn on-set terminology, and build a casting profile agencies can see. Free to start.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: 'SetReady',
  title: { default: TITLE, template: '%s · SetReady' },
  description: DESCRIPTION,
  keywords: [
    'background actor', 'film extra', 'background performer', 'how to become a film extra in Canada',
    'UBCP', 'ACTRA', 'UBCP/ACTRA rates', 'extras casting Canada', 'background acting',
    'film set glossary', 'voucher', 'background actor pay', 'casting profile', 'SetReady',
    'film work in BC', 'extras work Vancouver',
  ],
  authors: [{ name: 'SetReady' }],
  creator: 'SetReady',
  publisher: 'SetReady',
  category: 'entertainment',
  alternates: { canonical: '/' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'SetReady' },
  formatDetection: { telephone: false },
  icons: { icon: '/setready-icon-192.png', apple: '/setready-icon-180-apple.png' },
  openGraph: {
    type: 'website',
    siteName: 'SetReady',
    url: SITE,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_CA',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'SetReady — the app for Canadian background performers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'The complete toolkit for background performers in Canada: work log, vouchers, UBCP/ACTRA rate calculator, glossary, and casting profile.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#F59E0B',
  width: 'device-width',
  initialScale: 1,
};

// Structured data helps Google show rich results and helps AI assistants
// understand and cite SetReady accurately.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'SetReady',
      url: SITE,
      logo: `${SITE}/setready-icon-512.png`,
      sameAs: [
        'https://www.facebook.com/profile.php?id=61590513972019',
      ],
      description: DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: SITE,
      name: 'SetReady',
      description: DESCRIPTION,
      publisher: { '@id': `${SITE}/#organization` },
      inLanguage: 'en-CA',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/glossary?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'SetReady',
      operatingSystem: 'iOS, Android, Web',
      applicationCategory: 'LifestyleApplication',
      url: SITE,
      description: DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
      inLanguage: 'en-CA',
      publisher: { '@id': `${SITE}/#organization` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is SetReady?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SetReady is a free-to-start app for Canadian background performers (film and TV extras). It lets you log bookings, store vouchers, calculate your pay under the UBCP/ACTRA rates, learn on-set terminology and etiquette, and build a casting profile that agencies and casting directors can see.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I become a film extra (background actor) in Canada?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Register with reputable background-casting agencies, learn set terminology and etiquette, keep your availability and profile up to date, and track your bookings and vouchers. SetReady walks you through each step with training modules, a rate calculator, a glossary, and a casting profile.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is SetReady free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. SetReady is free to start and includes tools like the work log, voucher storage, rate calculator and glossary. An optional paid membership unlocks advanced features.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are UBCP/ACTRA vouchers and rates?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A voucher is the pay slip a background performer receives for a day of work; UBCP/ACTRA rates are the union pay rates for background and performer work. SetReady stores your vouchers and has the official 2025–2028 UBCP/ACTRA rates built into its rate calculator.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/setready-icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/setready-icon-180-apple.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SetReady" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
        <PWAInstaller />
        <VisitTracker />
        <Analytics />
      </body>
    </html>
  );
}
