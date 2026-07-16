import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "What's Filming — Productions Casting Background Performers",
  description:
    "See what film and TV productions are shooting and casting background performers (extras) in Canada. A quick way for background actors to know what's filming and where.",
  alternates: { canonical: '/whats-filming' },
  openGraph: {
    title: "What's Filming — Productions Casting Background Performers",
    description: "What's shooting and casting extras in Canada, for background performers.",
    url: '/whats-filming',
  },
};

export default function WhatsFilmingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
