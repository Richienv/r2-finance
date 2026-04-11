import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Mono, Bebas_Neue } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono' });
const bebas  = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas' });

export const metadata: Metadata = {
  title: 'R2·FINANCE',
  description: 'Personal budget tracker',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${bebas.variable}`}>
      <body className="bg-bg text-white">{children}</body>
    </html>
  );
}
