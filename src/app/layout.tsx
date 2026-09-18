import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hemo Match | District Blood Donor Matching',
  description:
    'Rapid, privacy-preserving blood donor matching connecting patients, hospitals, and volunteer donors at the district level.',
  keywords: [
    'blood donation',
    'district donor matching',
    'emergency blood',
    'healthcare',
    'hemo match',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FAFAFA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased bg-[#FAFAFA] text-neutral-900 selection:bg-rose-100 selection:text-rose-900">
        {children}
      </body>
    </html>
  );
}
