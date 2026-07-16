import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Background Actor Rate Calculator — UBCP/ACTRA Pay',
  description:
    'Free calculator for Canadian background performers. Work out your exact pay for a day of extra work using the official 2025–2028 UBCP/ACTRA rates — base rate, overtime, wardrobe, and more.',
  alternates: { canonical: '/rate-calculator' },
  openGraph: {
    title: 'Background Actor Rate Calculator — UBCP/ACTRA Pay',
    description: 'Know your exact background-acting pay before you sign, with the official 2025–2028 UBCP/ACTRA rates built in.',
    url: '/rate-calculator',
  },
};

export default function RateCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
