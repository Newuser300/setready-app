import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Film Set Glossary — A–Z Background Acting & On-Set Terms',
  description:
    'A free, searchable A–Z glossary of film-set and background-acting terminology for extras and new crew — from "background" and "holding" to "martini shot". Learn the language before day one.',
  alternates: { canonical: '/glossary' },
  openGraph: {
    title: 'Film Set Glossary — A–Z Background Acting & On-Set Terms',
    description: 'Searchable A–Z dictionary of film-set and background-acting terms for extras and crew.',
    url: '/glossary',
  },
};

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
