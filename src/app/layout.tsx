import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AmbientPointerLight, AppBottomNav } from '@/components/ui';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Hemo Match | Nearby Blood Donor Coordination',
    template: '%s | Hemo Match',
  },
  description:
    'Hemo Match coordinates nearby potentially eligible blood donors using blood group, location and donation interval while keeping donor contact details private until acceptance.',
  applicationName: 'Hemo Match',
  keywords: [
    'blood donation',
    'district donor matching',
    'emergency blood',
    'healthcare',
    'hemo match',
  ],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hemo_match_theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#F7F7F5] dark:bg-[#0B0B0C] text-[#111111] dark:text-[#F3F4F6] transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200">
        <AmbientPointerLight />
        <div className="relative z-1 flex flex-col min-h-full flex-1">
          {children}
        </div>
        <AppBottomNav />
      </body>
    </html>
  );
}
