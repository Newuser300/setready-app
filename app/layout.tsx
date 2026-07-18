import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import PWAInstaller from '@/components/PWAInstaller';
import VisitTracker from '@/components/VisitTracker';
import RebrandBanner from '@/components/RebrandBanner';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bgready.site';
const TITLE = 'BGReady — The App for Canadian Background Actors & Film Extras';
const DESCRIPTION =
  'BGReady: the all-in-one app for Canadian background performers and movie extras. Log bookings, store vouchers, and calculate UBCP/ACTRA pay. Free to start.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: 'BGReady',
  title: { default: TITLE, template: '%s · BGReady' },
  description: DESCRIPTION,
  keywords: [
    'background actor', 'film extra', 'background performer', 'how to become a film extra in Canada',
    'UBCP', 'ACTRA', 'UBCP/ACTRA rates', 'extras casting Canada', 'background acting',
    'film set glossary', 'voucher', 'background actor pay', 'casting profile', 'BGReady',
    'film work in BC', 'extras work Vancouver',
  ],
  authors: [{ name: 'BGReady' }],
  creator: 'BGReady',
  publisher: 'BGReady',
  category: 'entertainment',
  alternates: { canonical: '/' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'BGReady' },
  formatDetection: { telephone: false },
  icons: { icon: '/bgready-icon-192.png', apple: '/bgready-icon-180-apple.png' },
  openGraph: {
    type: 'website',
    siteName: 'BGReady',
    url: SITE,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_CA',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'BGReady — the app for Canadian background performers' }],
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
// understand and cite BGReady accurately.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'BGReady',
      url: SITE,
      logo: `${SITE}/bgready-icon-512.png`,
      sameAs: [
        'https://www.facebook.com/profile.php?id=61590513972019',
      ],
      description: DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: SITE,
      name: 'BGReady',
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
      name: 'BGReady',
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
          name: 'What is BGReady?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'BGReady is a free-to-start app for Canadian background performers (film and TV extras). It lets you log bookings, store vouchers, calculate your pay under the UBCP/ACTRA rates, learn on-set terminology and etiquette, and build a casting profile that agencies and casting directors can see.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I become a film extra (background actor) in Canada?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Register with reputable background-casting agencies, learn set terminology and etiquette, keep your availability and profile up to date, and track your bookings and vouchers. BGReady walks you through each step with training modules, a rate calculator, a glossary, and a casting profile.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is BGReady free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. BGReady is free to start and includes tools like the work log, voucher storage, rate calculator and glossary. An optional paid membership unlocks advanced features.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are UBCP/ACTRA vouchers and rates?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A voucher is the pay slip a background performer receives for a day of work; UBCP/ACTRA rates are the union pay rates for background and performer work. BGReady stores your vouchers and has the official 2025–2028 UBCP/ACTRA rates built into its rate calculator.',
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
        <link rel="icon" href="/bgready-icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/bgready-icon-180-apple.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BGReady" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {children}
        {/* Lives in the root layout, not on the homepage: signed-in arrivals are
            pushed straight to /dashboard, which would unmount a page-level
            banner before it could be read. */}
        <RebrandBanner />
        <Toaster position="top-right" />
        <PWAInstaller />
        <VisitTracker />
        <Analytics />
      </body>
    </html>
  );
}
